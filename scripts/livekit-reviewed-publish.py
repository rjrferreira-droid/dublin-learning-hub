"""Publish reviewed source once to the existing V2 worker; never provision an agent or change secrets.
Caller must build/typecheck and audit the locked worker before invoking this script.
"""
import json
import os
import re
import subprocess
import sys
import time
import tomllib
from pathlib import Path
from urllib.parse import urlsplit

AGENT = 'CA_T9kcWtn6Xki7'
SUBDOMAIN = 'dublin-learning-hub-v2-odgkxtya'
SOURCE = os.environ.get('GITHUB_SHA', '')
PREVIOUS = os.environ.get('LH_EXPECTED_PREVIOUS', '')
report = {'scope': 'reviewed_existing_v2_worker_update', 'agentId': AGENT,
          'sourceCommit': SOURCE, 'previousVersion': None, 'newVersion': None,
          'deployCommandInvoked': False, 'deployReturnCode': None,
          'providerVersionConfirmed': False, 'providerStatus': None,
          'learnerSessionStarted': False, 'runtimeSecretsSupplied': False,
          'newAgentCreated': False, 'result': 'failed', 'phase': 'preflight'}


def field(obj, name, default=None):
    if not isinstance(obj, dict):
        return default
    return next((v for k, v in obj.items()
                 if k.replace('_', '').lower() == name.replace('_', '').lower()), default)


def read(command):
    result = subprocess.run(['lk', 'agent', command, '--id', AGENT, '--json', 'professor-agent'],
                            capture_output=True, text=True, timeout=45, check=False)
    if result.returncode or len(result.stdout) > 1_000_000:
        raise RuntimeError('status_unavailable')
    return json.loads(result.stdout)


def current():
    agents = [a for a in field(read('status'), 'agents', []) if field(a, 'agent_id') == AGENT]
    if len(agents) != 1:
        raise RuntimeError('unexpected_agent')
    rows = [r for r in field(agents[0], 'agent_deployments', [])
            if field(r, 'deployment', '') in ('', 'production')]
    if len(rows) != 1 or field(rows[0], 'region') != 'us-east':
        raise RuntimeError('unexpected_deployment')
    return rows[0], field(rows[0], 'version') or field(agents[0], 'version')


try:
    if os.environ.get('LH_REVIEWED_UPDATE_AUTHORIZED') != '1':
        raise RuntimeError('authorization_missing')
    if os.environ.get('GITHUB_REF_NAME') != 'fix/core-consolidation-2026-09-13':
        raise RuntimeError('unexpected_branch')
    if not re.fullmatch('[a-f0-9]{40}', SOURCE) or not re.fullmatch('[A-Za-z0-9_-]{1,100}', PREVIOUS):
        raise RuntimeError('source_or_version_missing')
    u = urlsplit(os.environ.get('LIVEKIT_URL', ''))
    if (u.hostname != SUBDOMAIN + '.livekit.cloud' or u.scheme not in ('wss', 'https')
            or u.username or u.password or u.query or u.fragment or u.path not in ('', '/')):
        raise RuntimeError('unexpected_project')
    if not os.environ.get('LIVEKIT_API_KEY') or not os.environ.get('LIVEKIT_API_SECRET'):
        raise RuntimeError('credentials_unavailable')
    with open('professor-agent/livekit.toml', 'rb') as handle:
        config = tomllib.load(handle)
    if config.get('project', {}).get('subdomain') != SUBDOMAIN or config.get('agent', {}).get('id') != AGENT:
        raise RuntimeError('unexpected_config')
    if any(Path('professor-agent').glob('.env*')):
        raise RuntimeError('local_secret_file_forbidden')
    with open('professor-agent/package.json') as handle:
        manifest = json.load(handle)
    if manifest.get('overrides', {}).get('@livekit/agents', {}).get('sharp') != '0.35.4':
        raise RuntimeError('reviewed_security_patch_missing')
    report['phase'] = 'remote_preflight'
    row, previous = current()
    report['previousVersion'] = previous if re.fullmatch('[A-Za-z0-9_-]{1,100}', previous or '') else None
    if previous != PREVIOUS or field(row, 'status') not in ('Running', 'Sleeping'):
        raise RuntimeError('agent_changed_or_unhealthy')
    report['phase'] = 'deploy_existing_once'
    report['deployCommandInvoked'] = True
    print('Existing V2 target and previous version verified. Publishing reviewed dependency repair once.', flush=True)
    # No create, secret/file option, room, simulation or paid model call. Existing runtime secrets remain.
    args = ['lk', 'agent', 'deploy', '--no-default-attributes',
            '--attribute', 'lh_source_commit=' + SOURCE,
            '--attribute', 'lh_scope=v2-core-consolidation',
            '--attribute', 'lh_sharp_patch=0.35.4', 'professor-agent']
    try:
        deployed = subprocess.run(args, capture_output=True, text=True, timeout=1000, check=False)
        report['deployReturnCode'] = deployed.returncode
    except subprocess.TimeoutExpired:
        report['deployReturnCode'] = 'timeout_submission_state_unknown'
    # Never repeat submission after a lost reply. Inspect the provider's current version instead.
    report['phase'] = 'confirm_provider_version'
    for _ in range(24):
        try:
            row, version = current()
            state = field(row, 'status')
            report['providerStatus'] = state if state in ('Running', 'Sleeping', 'Building', 'Updating',
                'Scheduling', 'Waking', 'Error', 'CrashLoop', 'Build Failed', 'Server Error', 'Disabled') else 'unrecognized'
            matching = [v for v in field(read('versions'), 'versions', [])
                        if field(v, 'version') == version
                        and field(v, 'attributes', {}).get('lh_source_commit') == SOURCE
                        and field(v, 'attributes', {}).get('lh_sharp_patch') == '0.35.4']
            if version != PREVIOUS and len(matching) == 1 and state in ('Running', 'Sleeping'):
                report['newVersion'] = version
                report['providerVersionConfirmed'] = True
                report['result'] = 'updated_and_provider_ready'
                report['phase'] = 'complete'
                break
            if state in ('Error', 'CrashLoop', 'Build Failed', 'Server Error', 'Disabled'):
                break
        except Exception:
            pass
        time.sleep(10)
    if not report['providerVersionConfirmed']:
        report['result'] = 'update_not_confirmed_do_not_start_validation'
except Exception:
    report['result'] = 'stopped_without_verified_update'

output = json.dumps(report, indent=2)
print('LIVEKIT_REVIEWED_WORKER_UPDATE\n' + output)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as handle:
        handle.write('## Existing V2 worker update\n```json\n' + output + '\n```\n')
sys.exit(0 if report['providerVersionConfirmed'] else 1)

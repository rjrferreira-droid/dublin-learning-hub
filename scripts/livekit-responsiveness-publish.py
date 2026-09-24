"""Publish only the reviewed evaluator candidate to the existing V2 LiveKit worker.
Never creates an agent, changes secrets, starts a room, or retries an uncertain deploy submission.
"""
import json, os, re, subprocess, sys, time, tomllib
from pathlib import Path
from urllib.parse import urlsplit
AGENT='CA_T9kcWtn6Xki7'; SUBDOMAIN='dublin-learning-hub-v2-odgkxtya'
SOURCE=os.environ.get('GITHUB_SHA',''); EXPECTED=os.environ.get('LH_EXPECTED_PREVIOUS','')
report={'scope':'spoken_evaluation_v1_existing_worker_update','agentId':AGENT,'sourceCommit':SOURCE,'previousVersion':None,'newVersion':None,'deployCommandInvoked':False,'providerVersionConfirmed':False,'providerStatus':None,'newAgentCreated':False,'learnerSessionStarted':False,'result':'failed','phase':'preflight'}
def field(obj,name,default=None):
    if not isinstance(obj,dict): return default
    return next((v for k,v in obj.items() if k.replace('_','').lower()==name.replace('_','').lower()),default)
def read(command):
    r=subprocess.run(['lk','agent',command,'--id',AGENT,'--json','professor-agent'],capture_output=True,text=True,timeout=45,check=False)
    if r.returncode or len(r.stdout)>1_000_000: raise RuntimeError('status_unavailable')
    return json.loads(r.stdout)
def current():
    agents=[a for a in field(read('status'),'agents',[]) if field(a,'agent_id')==AGENT]
    if len(agents)!=1: raise RuntimeError('unexpected_agent')
    rows=[x for x in field(agents[0],'agent_deployments',[]) if field(x,'deployment','') in ('','production')]
    if len(rows)!=1 or field(rows[0],'region')!='us-east': raise RuntimeError('unexpected_deployment')
    return rows[0],field(rows[0],'version') or field(agents[0],'version')
try:
    if os.environ.get('LH_RESPONSIVENESS_UPDATE_AUTHORIZED')!='1': raise RuntimeError('authorization_missing')
    if os.environ.get('GITHUB_REF_NAME')!='feat/professor-experience-2026-09-13': raise RuntimeError('unexpected_branch')
    if not re.fullmatch('[a-f0-9]{40}',SOURCE) or not re.fullmatch('[A-Za-z0-9_-]{1,100}',EXPECTED): raise RuntimeError('source_or_version_missing')
    u=urlsplit(os.environ.get('LIVEKIT_URL',''))
    if u.hostname!=SUBDOMAIN+'.livekit.cloud' or u.scheme not in ('wss','https') or u.username or u.password or u.query or u.fragment or u.path not in ('','/'):
        raise RuntimeError('unexpected_project')
    if not os.environ.get('LIVEKIT_API_KEY') or not os.environ.get('LIVEKIT_API_SECRET'): raise RuntimeError('credentials_unavailable')
    with open('professor-agent/livekit.toml','rb') as f: cfg=tomllib.load(f)
    if cfg.get('project',{}).get('subdomain')!=SUBDOMAIN or cfg.get('agent',{}).get('id')!=AGENT: raise RuntimeError('unexpected_config')
    if any(Path('professor-agent').glob('.env*')): raise RuntimeError('local_secret_file_forbidden')
    import hashlib
    if EXPECTED != 'zq2GAqPRCciq': raise RuntimeError('unexpected_previous_version')
    if hashlib.sha256(Path('professor-agent/src/index.ts').read_bytes()).hexdigest() != '2b22f5129a21e4a520bd18b2a27baffc36e9e0938d385d453e756ce8c22219e6': raise RuntimeError('unreviewed_worker')
    if hashlib.sha256(Path('professor-agent/src/evaluationEvidence.ts').read_bytes()).hexdigest() != '32b5e777a67739e05c40feb265ad15ce765d933232ffecb6c60fc375c3126b93': raise RuntimeError('unreviewed_evaluator')
    report['phase']='remote_preflight'
    row,previous=current(); report['previousVersion']=previous if re.fullmatch('[A-Za-z0-9_-]{1,100}',previous or '') else None
    if previous!=EXPECTED or field(row,'status') not in ('Running','Sleeping'): raise RuntimeError('agent_changed_or_unhealthy')
    report['phase']='deploy_existing_once'; report['deployCommandInvoked']=True
    args=['lk','agent','deploy','--no-default-attributes',
          '--attribute','lh_source_commit='+SOURCE,
          '--attribute','lh_scope=spoken-evaluation-2026-09-21',
          '--attribute','lh_evaluator_guard=learner-evidence-v1',
          '--attribute','lh_sharp_patch=0.35.4','professor-agent']
    try:
        submitted=subprocess.run(args,capture_output=True,text=True,timeout=1000,check=False)
        report['deployReturnCode']=submitted.returncode
    except subprocess.TimeoutExpired:
        report['deployReturnCode']='timeout_submission_state_unknown'
    report['phase']='confirm_provider_version'
    for _ in range(30):
        try:
            row,version=current(); state=field(row,'status'); report['providerStatus']=state if isinstance(state,str) else None
            versions=field(read('versions'),'versions',[])
            matches=[v for v in versions if field(v,'version')==version and field(v,'attributes',{}).get('lh_source_commit')==SOURCE and field(v,'attributes',{}).get('lh_scope')=='spoken-evaluation-2026-09-21' and field(v,'attributes',{}).get('lh_evaluator_guard')=='learner-evidence-v1']
            if version!=EXPECTED and len(matches)==1 and state in ('Running','Sleeping'):
                report['newVersion']=version; report['providerVersionConfirmed']=True; report['result']='updated_and_provider_ready'; report['phase']='complete'; break
            if state in ('Error','CrashLoop','Build Failed','Server Error','Disabled'): break
        except Exception:
            pass
        time.sleep(10)
    if not report['providerVersionConfirmed']: report['result']='update_not_confirmed_do_not_start_validation'
except Exception as exc:
    report['result']='stopped_without_verified_update'; report['errorClass']=str(exc) if str(exc) in {'authorization_missing','unexpected_branch','source_or_version_missing','unexpected_project','credentials_unavailable','unexpected_config','local_secret_file_forbidden','status_unavailable','unexpected_agent','unexpected_deployment','agent_changed_or_unhealthy'} else 'preflight_failure'
output=json.dumps(report,indent=2); print('LIVEKIT_RESPONSIVENESS_UPDATE\n'+output)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as f: f.write('## Reviewed responsiveness LiveKit update\n```json\n'+output+'\n```\n')
sys.exit(0 if report['providerVersionConfirmed'] else 1)

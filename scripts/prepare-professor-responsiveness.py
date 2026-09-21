"""Build a release directory from the published worker plus one reviewed patch.

Never imports environment credentials, changes the checkout, or contacts a provider.
"""
import hashlib
import io
import subprocess
import sys
import tarfile
from pathlib import Path

BASELINE = '07d770b53a4f3d6b77c8316541ea8dff6dcf7faf'
PATCH = Path('quality/candidates/professor-responsiveness-2026-09-21.patch')
destination = Path(sys.argv[1]).resolve()
if destination.exists():
    raise SystemExit('release_destination_must_be_new')
if hashlib.sha256(PATCH.read_bytes()).hexdigest() != '36fa1573c57699fb1590bbdcf346298aabbff0b935eea155d7a1117a1508ca1d':
    raise SystemExit('unreviewed_patch')
archive = subprocess.check_output(['git', 'archive', BASELINE, 'professor-agent'])
destination.mkdir(parents=True)
with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
    bundle.extractall(destination, filter='data')
before = {str(p.relative_to(destination)): p.read_bytes() for p in destination.rglob('*') if p.is_file()}
subprocess.run(['git', 'apply', '--check', str(PATCH.resolve())], cwd=destination, check=True)
subprocess.run(['git', 'apply', str(PATCH.resolve())], cwd=destination, check=True)
after = {str(p.relative_to(destination)): p.read_bytes() for p in destination.rglob('*') if p.is_file()}
if set(before) != set(after) or [p for p in before if before[p] != after[p]] != ['professor-agent/src/index.ts']:
    raise SystemExit('unexpected_release_delta')
if hashlib.sha256(after['professor-agent/src/index.ts']).hexdigest() != '2b22f5129a21e4a520bd18b2a27baffc36e9e0938d385d453e756ce8c22219e6':
    raise SystemExit('unreviewed_worker')
spoken_patch = Path('quality/candidates/professor-spoken-evaluation-2026-09-21.patch')
if hashlib.sha256(spoken_patch.read_bytes()).hexdigest() != 'feed93de01ae4512ef4a06b777e8094da28ca843cb4fdac207638d02bdaeccd1':
    raise SystemExit('unreviewed_spoken_patch')
subprocess.run(['git', 'apply', '--check', str(spoken_patch.resolve())], cwd=destination, check=True)
subprocess.run(['git', 'apply', str(spoken_patch.resolve())], cwd=destination, check=True)
if hashlib.sha256((destination / 'professor-agent/src/evaluationEvidence.ts').read_bytes()).hexdigest() != '32b5e777a67739e05c40feb265ad15ce765d933232ffecb6c60fc375c3126b93':
    raise SystemExit('unreviewed_spoken_evaluator')
print('Prepared published baseline plus reviewed responsiveness changes; plus spoken-evaluation guard; callbacks, models and budgets preserved.')

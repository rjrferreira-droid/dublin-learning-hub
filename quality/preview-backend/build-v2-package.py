"""Reviewed incremental V2 package, closed to Audio admission. Never an empty baseline."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
MARKER = '-- Do not silently miss an older spend-admission endpoint. A deployment review must resolve it.'

def build(destination):
    out = Path(destination)
    out.mkdir(parents=True, exist_ok=False)
    atomic = (ROOT / 'quality/candidates/premium-audio-atomic.sql').read_text()
    if atomic.count(MARKER) != 1:
        raise ValueError('isolated_patch_boundary_drift')
    # Reuse the reviewed attempt engine, with a DIFFERENT paired V2 patch below.
    # The original isolated installer still rejects every legacy entrypoint.
    engine, isolated_patch = atomic.split(MARKER)
    if 'legacy_budget_entrypoint_requires_review' not in isolated_patch:
        raise ValueError('isolated_guard_contract_missing')
    sql = ('-- Existing V2 only. Apply as one transaction; no provider activation.\n'
           + (ROOT / 'quality/preview-backend/asset-prerequisites.sql').read_text()
           + '\n' + engine + '\n'
           + (ROOT / 'quality/preview-backend/v2-shared-budget-patch.sql').read_text())
    (out / 'migration.sql').write_text(sql)
    (out / 'install.sql').write_text('\\set ON_ERROR_STOP on\nBEGIN;\n\\ir migration.sql\nCOMMIT;\n')
    manifest = dict(targetProjectRef='aazfyosqqeujureksqjs',
                    deniedProjectRefs=['qwvsrcgsfoguxdbcdrxq','zoiqchqldrgldfzjmgyl'],
                    admissionEnabled=False, publishesLessons=False,
                    preservesLegacyRoutine=True, patchesBothProfessorPaths=True,
                    sqlSha256=hashlib.sha256(sql.encode()).hexdigest())
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: build-v2-package.py NEW_OUTPUT_DIRECTORY')
    print(json.dumps(build(sys.argv[1]), indent=2))

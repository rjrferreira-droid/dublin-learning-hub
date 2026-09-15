"""Offline review package only. No credentials, network, database connection or deploy."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
FILES = {
 'inventory.sql': 'quality/preview-backend/inventory.sql',
 '01-asset-prerequisites.sql': 'quality/preview-backend/asset-prerequisites.sql',
 '02-atomic-audio.sql': 'quality/candidates/premium-audio-atomic.sql',
 'stop-admissions.sql': 'quality/preview-backend/stop-admissions.sql',
}
def build(destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=False)
    entries = []
    for name, source in FILES.items():
        data = (ROOT / source).read_bytes()
        (destination / name).write_bytes(data)
        entries.append(dict(file=name, source=source, sha256=hashlib.sha256(data).hexdigest()))
    (destination / 'install.sql').write_text(
        '-- REVIEW ONLY: no target is authorized by generating this package.\n'
        '-- psql ON_ERROR_STOP + one transaction are mandatory.\n'
        '\\set ON_ERROR_STOP on\nBEGIN;\n'
        '\\ir 01-asset-prerequisites.sql\n\\ir 02-atomic-audio.sql\nCOMMIT;\n')
    data = (destination / 'install.sql').read_bytes()
    entries.append(dict(file='install.sql', sha256=hashlib.sha256(data).hexdigest()))
    manifest = dict(status='BLOCKED_NO_APPROVED_ISOLATED_TARGET', targetProjectRef=None,
        deniedProjectRefs=['qwvsrcgsfoguxdbcdrxq','aazfyosqqeujureksqjs'],
        featureBranch='feat/professor-experience-2026-09-13',
        frozenBase='3d292fe7f913135fd4b461487cc5dffde74bc7e1',
        paidProvidersAllowed=False, lessonPublicationAllowed=False, files=entries)
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python quality/preview-backend/build-package.py NEW_OUTPUT_DIRECTORY')
    print(json.dumps(build(sys.argv[1]), indent=2))

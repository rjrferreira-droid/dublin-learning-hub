import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('builder', ROOT/'quality/preview-backend/build-package.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
class ReviewPackage(unittest.TestCase):
    def test_reproducible_closed_and_hash_verified(self):
        with tempfile.TemporaryDirectory() as tmp:
            a,b=Path(tmp)/'a',Path(tmp)/'b'
            builder.build(a);builder.build(b)
            self.assertEqual({p.name:p.read_bytes() for p in a.iterdir()},{p.name:p.read_bytes() for p in b.iterdir()})
            manifest=json.loads((a/'manifest.json').read_text())
            self.assertIsNone(manifest['targetProjectRef'])
            self.assertFalse(manifest['paidProvidersAllowed'])
            for entry in manifest['files']:
                self.assertEqual(hashlib.sha256((a/entry['file']).read_bytes()).hexdigest(),entry['sha256'])
            with self.assertRaises(FileExistsError):builder.build(a)
    def test_no_destructive_rollback(self):
        stop=(ROOT/'quality/preview-backend/stop-admissions.sql').read_text().lower()
        for command in ['drop ', 'truncate ', 'delete ', "state='cancelled'"]:
            self.assertNotIn(command,stop)
        self.assertIn("'audio_runtime_stopped'",stop)
        self.assertNotIn('create or replace function public.settle',stop)
if __name__=='__main__':unittest.main()

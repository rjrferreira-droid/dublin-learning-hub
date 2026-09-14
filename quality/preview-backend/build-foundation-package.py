"""Build a NEW isolated baseline from reviewed source, without database/network access."""
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
SOURCES=[
 'quality/preview-backend/foundation.sql',
 'supabase/migrations/20260913153700_lh_professor_completion_integrity.sql',
 'supabase/migrations/20260913154315_lh_serialize_learning_updates.sql',
 'supabase/migrations/20260913155850_lh_usage_settlement_integrity.sql',
 'supabase/migrations/20260913161005_lh_atomic_professor_start.sql',
 'supabase/migrations/20260913165704_lh_reservation_lifecycle.sql',
 'quality/preview-backend/asset-prerequisites.sql',
 'quality/candidates/premium-audio-atomic.sql',
]
def build(destination):
 out=Path(destination);out.mkdir(parents=True,exist_ok=False)
 entries=[]
 for i,source in enumerate(SOURCES):
  data=(ROOT/source).read_bytes();name=f'{i:02d}-'+Path(source).name
  (out/name).write_bytes(data);entries.append(dict(file=name,source=source,sha256=hashlib.sha256(data).hexdigest()))
 install="\\set ON_ERROR_STOP on\nBEGIN;\n"+''.join('\\ir '+x['file']+'\n' for x in entries)+'COMMIT;\n'
 (out/'install.sql').write_text(install)
 entries.append(dict(file='install.sql',sha256=hashlib.sha256(install.encode()).hexdigest()))
 (out/'manifest.json').write_text(json.dumps(dict(
  status='CANDIDATE_NOT_AUTHORIZED',purpose='new_minimal_preview_not_historical_restore',
  targetProjectRef=None,deniedProjectRefs=['qwvsrcgsfoguxdbcdrxq','aazfyosqqeujureksqjs'],
  sourceBranch='feat/professor-experience-2026-09-13',realLearners=0,publishedLessons=0,initialAiBudgetUsd=0,
  includesAuthImplementation=False,includesStorageConfiguration=False,files=entries),indent=2)+'\n')
 return entries
if __name__=='__main__':
 if len(sys.argv)!=2:raise SystemExit('Usage: build-foundation-package.py NEW_OUTPUT_DIRECTORY')
 print(json.dumps(build(sys.argv[1]),indent=2))

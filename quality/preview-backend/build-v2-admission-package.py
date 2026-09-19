"""Additive reference/preflight installation. New admission stays closed to every API role."""
import hashlib
import json
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[2]

def build(destination):
    out = Path(destination)
    out.mkdir(parents=True, exist_ok=False)
    parts = []
    for name in ('written-professor-binding.sql', 'professor-shared-preflights.sql'):
        source = (ROOT / 'quality/candidates' / name).read_text()
        lines = source.splitlines()
        assert sum(line.strip().lower() == 'begin;' for line in lines) == 1
        assert sum(line.strip().lower() == 'commit;' for line in lines) == 1
        parts.append('\n'.join(line for line in lines if line.strip().lower() not in ('begin;', 'commit;')))
    sql = '''-- Existing V2 additive installation. Never enables new session starts.
DO $guard$ BEGIN
 IF to_regprocedure('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)') IS NULL
 OR to_regclass('lh_internal.premium_audio_attempts') IS NULL THEN
  RAISE EXCEPTION 'reviewed_v2_prerequisites_missing';
 END IF;
 IF to_regclass('lh_internal.written_professor_references') IS NOT NULL
 OR to_regclass('lh_internal.professor_preflights') IS NOT NULL THEN
  RAISE EXCEPTION 'admission_already_installed_or_partial';
 END IF;
END $guard$;
''' + '\n'.join(parts) + '''
-- Override the candidate's authenticated grant within the SAME transaction.
REVOKE ALL ON FUNCTION public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)
 FROM PUBLIC, anon, authenticated, service_role;
DO $closed$ DECLARE role_name text; BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(role_name,'public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)','EXECUTE') THEN
   RAISE EXCEPTION 'new_admission_not_closed';
  END IF;
 END LOOP;
END $closed$;
'''
    (out / 'migration.sql').write_text(sql)
    (out / 'install.sql').write_text('\\set ON_ERROR_STOP on\nBEGIN;\n\\ir migration.sql\nCOMMIT;\n')
    manifest = dict(targetProjectRef='aazfyosqqeujureksqjs', admissionEnabled=False,
                    existingRowsModified=False,publishesLessons=False,
                    sqlSha256=hashlib.sha256(sql.encode()).hexdigest())
    (out / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return manifest
if __name__ == '__main__':
    print(json.dumps(build(sys.argv[1]),indent=2))

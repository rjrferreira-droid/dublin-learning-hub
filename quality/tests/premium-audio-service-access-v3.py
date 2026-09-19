"""Disposable PostgreSQL only: transactional grant tests, no providers."""
from pathlib import Path
import subprocess
source=Path('quality/candidates/premium-audio-service-access-v3.sql').read_text()
sig='public.mark_premium_audio_submitted_v3(uuid,text,integer,text)'

def run(sql):
    return subprocess.run(['psql','-X','-v','ON_ERROR_STOP=1','-q'],input=sql,text=True,capture_output=True)

# The real installer and its postconditions run, then rollback preserves fixture ACLs.
result=run(source.replace('commit;', 'rollback;'))
assert result.returncode==0,result.stderr
cases=[
 ('grant execute on function '+sig+' to authenticated;', 'function_drift'),
 ('grant execute on function '+sig+' to service_role;', 'function_drift'),
 ('alter function '+sig+' set search_path=public;', 'function_drift'),
 ('drop function '+sig+';', 'function_missing'),
 ('grant select on lh_internal.premium_audio_attempt_bindings_v3 to service_role;', 'table_drift'),
 ('grant service_role to authenticated;', 'role_drift'),
 ("do $$begin execute replace(pg_get_functiondef('"+sig+"'::regprocedure),'audio_source_changed','audio_source_mutated'); end$$;", 'function_drift'),
]
for mutation,reason in cases:
    result=run(source.replace("set local lock_timeout='5s';",mutation+"\nset local lock_timeout='5s';",1))
    assert result.returncode!=0,mutation
    assert 'audio_v3_access_'+reason in result.stderr,(mutation,result.stderr)
# Prove previous rejection cases rolled back and the exact installer remains usable.
result=run(source.replace('commit;', 'rollback;'))
assert result.returncode==0,result.stderr
print('PASS: service-only grants, browser denial, seven drift rejections and rollback preservation')

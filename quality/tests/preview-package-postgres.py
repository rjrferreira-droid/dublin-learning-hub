"""Install failure rollback and admission stop, exclusively in disposable PostgreSQL."""
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid
assert os.environ.get('PGHOST')=='127.0.0.1'
assert os.environ.get('PGDATABASE')=='learning_hub_test'
assert os.environ.get('PGUSER')=='postgres'
def sql(query):
    r=subprocess.run(['psql','-XAtq','-v','ON_ERROR_STOP=1','-c',query],capture_output=True,text=True)
    assert r.returncode==0,r.stderr
    return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''
def file(path):
    return subprocess.run(['psql','-X','-v','ON_ERROR_STOP=1','-f',str(path)],capture_output=True,text=True)
assert sql('select label from lh_internal.audio_fixture_guard')=='fictional-audio-concurrency'
package=Path(sys.argv[2])
if sys.argv[1]=='install':
    # Explicit fictional legacy stub: verifies that guard failure undoes *all* package DDL.
    sql("create function public.reserve_professor_budget(text) returns boolean language sql as $$select false$$;")
    result=file(package/'install.sql')
    assert result.returncode!=0 and 'legacy_budget_entrypoint_requires_review' in result.stderr,result.stderr
    assert sql("select count(*) from information_schema.columns where table_schema='public' and table_name='audio_assets' and column_name='generation_request_id'")=='0'
    assert sql("select to_regclass('lh_internal.premium_audio_attempts') is null")=='t'
    assert sql("select to_regclass('public.audio_assets_atomic_lesson_type_uq') is null")=='t'
    sql('drop function public.reserve_professor_budget(text);') # fictional stub only
    result=file(package/'install.sql')
    assert result.returncode==0,result.stderr
    print('PASS: entire installation rolls back on legacy guard; clean fixture installation succeeds')
elif sys.argv[1]=='stop':
    sql("truncate lh_internal.premium_audio_attempts,ai_usage_log,ai_tutor_sessions,professor_budget_reservations cascade;update learning_hub_budget_settings set ai_hard_cap_usd=10,premium_audio_cap_usd=10;")
    user=sql("select id from profiles where learner_track='rafael_finance'")
    lessons=json.loads(sql("select json_agg(l.id order by l.id) from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='rafael_finance'"))
    submitted,reserved=str(uuid.uuid4()),str(uuid.uuid4())
    for attempt,lesson in zip([submitted,reserved],lessons):
        d=json.loads(sql(f"set role service_role;select begin_premium_audio_attempt_v2('{attempt}','{user}','{lesson}',1,0.10)"))
        assert d['allowed']
    assert sql(f"set role service_role;select mark_premium_audio_submitted_v2('{submitted}')")=='t'
    before=sql("select md5(pg_get_functiondef('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'::regprocedure))")
    result=file(package/'stop-admissions.sql')
    assert result.returncode==0,result.stderr
    stopped=json.loads(sql(f"set role service_role;select begin_premium_audio_attempt_v2('{uuid.uuid4()}','{user}','{lessons[0]}',1,0.10)"))
    assert stopped==dict(allowed=False,reason='audio_runtime_stopped')
    assert sql(f"set role service_role;select mark_premium_audio_submitted_v2('{reserved}')")=='f'
    assert float(sql('select lh_internal.premium_audio_pending_usd()'))==0.2
    after=sql("select md5(pg_get_functiondef('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'::regprocedure))")
    assert before==after # Professor still counts outstanding Audio holds
    assert sql(f"set role service_role;select settle_premium_audio_attempt_v2('{submitted}',0.04,100)")=='t'
    assert sql(f"set role service_role;select settle_premium_audio_attempt_v2('{submitted}',0.04,100)")=='t'
    assert sql('select count(*) from ai_usage_log')=='1'
    assert float(sql('select lh_internal.premium_audio_pending_usd()'))==0.1
    assert sql(f"set role service_role;select close_premium_audio_attempt_v2('{reserved}')")=='cancelled'
    assert sql('select count(*) from lh_internal.premium_audio_attempts')=='2'
    assert float(sql('select lh_internal.premium_audio_pending_usd()'))==0
    print('PASS: stop blocks admission/submission, preserves Professor guard and obligations, permits one receipt and safe unused cancellation')
else:raise AssertionError('Unknown phase')

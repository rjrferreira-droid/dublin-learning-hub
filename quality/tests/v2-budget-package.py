"""Actual PostgreSQL rehearsal: populated V2-shaped fixture, never connected data."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import json
import uuid

ROOT=Path(__file__).resolve().parents[2]
assert os.environ.get('PGHOST')=='127.0.0.1'
assert os.environ.get('PGDATABASE')=='learning_hub_test'
def sql(query,ok=True):
    r=subprocess.run(['psql','-XAtq','-v','ON_ERROR_STOP=1'],input=query,text=True,capture_output=True)
    if ok: assert r.returncode==0,r.stderr
    else: assert r.returncode!=0,'Expected rejection'
    return r

spec=importlib.util.spec_from_file_location('v2_package',ROOT/'quality/preview-backend/build-v2-package.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)

# Reuse authored legacy source, never exported history. Its original subtotal is
# replaced with the already-reviewed all-period helper, as on the inventoried V2.
legacy=(ROOT/'supabase/migrations/20260904_v2_budget_policy_150.sql').read_text()
legacy=legacy[legacy.index('create or replace function public.reserve_professor_budget(p_quality_tier'):]
legacy=legacy[:legacy.index('$$;')+3]
old="""  select coalesce(sum(r.reserved_usd), 0)
    into v_reserved_before
    from public.professor_budget_reservations r
   where r.feature = 'professor_livekit'
     and r.month_start = date_trunc('month', now())::date;"""
new="""  select (lh_internal.professor_reservation_exposure(now())->>'protectedReservationUsd')::numeric
    into v_reserved_before;"""
assert legacy.count(old)==1
sql(legacy.replace(old,new))
sql('revoke all on function public.reserve_professor_budget(text) from public,anon,authenticated,service_role;')
sql("""
insert into professor_budget_reservations(user_id,reserved_usd,max_session_seconds,status)
 select id,4,1200,'unresolved' from profiles where learner_track='rafael_finance';
insert into ai_usage_log(feature,estimated_cost_usd,request_id)
 values('professor_livekit',0.1,'fictional-existing-usage');
""")
snapshot="""select jsonb_build_object('reservations',(select jsonb_agg(to_jsonb(r) order by id) from professor_budget_reservations r),
 'usage',(select jsonb_agg(to_jsonb(u) order by id) from ai_usage_log u),
 'sessions',(select jsonb_agg(to_jsonb(s) order by id) from ai_tutor_sessions s),
 'budgets',(select jsonb_agg(to_jsonb(b)) from learning_hub_budget_settings b),
 'professor',(select jsonb_agg(to_jsonb(b)) from professor_budget_settings b));"""
before=sql(snapshot).stdout
def no_partial_install():
    assert sql("select to_regclass('lh_internal.premium_audio_attempts') is null;").stdout.strip()=='t'
    assert sql("select count(*) from information_schema.columns where table_schema='public' and table_name='audio_assets' and column_name='generation_request_id';").stdout.strip()=='0'
    assert sql(snapshot).stdout==before

with tempfile.TemporaryDirectory() as tmp:
    out=Path(tmp)/'package';builder.build(out)
    migration=(out/'migration.sql').read_text()
    sql('grant execute on function public.reserve_professor_budget(text) to authenticated;')
    assert 'v2_legacy_containment_required' in sql('begin;'+migration+'commit;',False).stderr
    no_partial_install()
    sql('revoke execute on function public.reserve_professor_budget(text) from authenticated;')
    # A late failure in the second patch must roll back the first routine too.
    original_digest=sql("select md5(prosrc) from pg_proc where oid='public.reserve_professor_budget(text)'::regprocedure;").stdout
    drift=migration.replace("anchor:='held+used+reserve_amount>budget.ai_hard_cap_usd';","anchor:='missing_atomic_anchor';")
    assert 'v2_budget_lock_order_drift' in sql('begin;'+drift+'commit;',False).stderr
    no_partial_install()
    assert sql("select md5(prosrc) from pg_proc where oid='public.reserve_professor_budget(text)'::regprocedure;").stdout==original_digest
    sql('begin;'+migration+'commit;')
    assert sql(snapshot).stdout==before
    print('PASS: populated data preserved; callable legacy and late atomic drift roll back the complete package')

for role in ['anon','authenticated','service_role']:
    assert sql(f"select has_function_privilege('{role}','public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)','EXECUTE') or has_function_privilege('{role}','public.mark_premium_audio_submitted_v2(uuid)','EXECUTE') or has_function_privilege('{role}','public.reserve_professor_budget(text)','EXECUTE');").stdout.strip()=='f'
print('PASS: both retained routines exist; direct legacy and all API Audio admission remain closed')

user=sql("select id from profiles where learner_track='rafael_finance';").stdout.strip()
lesson=sql("select l.id from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='rafael_finance' order by l.id limit 1;").stdout.strip()
attempt=str(uuid.uuid4())
sql(f"insert into lh_internal.premium_audio_attempts(id,user_id,lesson_id,content_version,reserved_usd,state,lease_until) values('{attempt}','{user}','{lesson}',1,0.10,'uncertain',now()-interval '1 month');")
sql('update learning_hub_budget_settings set ai_hard_cap_usd=5.65;')
r=sql(f"set request.jwt.claim.sub='{user}';select allowed from reserve_professor_budget('standard');")
assert r.stdout.strip()=='f',r.stdout
sql('update learning_hub_budget_settings set ai_hard_cap_usd=8.15;')
r=sql(f"set request.jwt.claim.sub='{user}';set role authenticated;select start_professor_session_atomic('{uuid.uuid4()}','{lesson}','chapter_conversation','validation:lh-{uuid.uuid4()}','{'a'*64}',true);")
assert json.loads(r.stdout)['reason']=='professor_monthly_budget_reached',r.stdout
assert sql('select count(*) from professor_budget_reservations;').stdout.strip()=='1'
assert sql('select count(*) from ai_tutor_sessions;').stdout.strip()=='0'
sql('update professor_budget_settings set hard_stop_enabled=false;')
assert 'professor_budget_guard_unavailable' in sql(f"set request.jwt.claim.sub='{user}';select * from reserve_professor_budget('standard');",False).stderr
sql('update professor_budget_settings set hard_stop_enabled=true;')
print('PASS: even owner-invoked legacy and authenticated atomic startup protect unresolved Audio holds; disabled guard fails closed')

# LOCAL fixture only: enable engine for the existing concurrency/provider-free
# integration suite. The generated/connected installation stays closed by default.
sql('grant execute on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric),public.mark_premium_audio_submitted_v2(uuid) to service_role;')

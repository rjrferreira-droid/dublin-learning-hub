"""Disposable PostgreSQL acceptance only; no connected target/provider access."""
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
if os.environ.get('PGHOST') != '127.0.0.1' or os.environ.get('PGDATABASE') != 'learning_hub_test':
    raise SystemExit('disposable_database_required')

def sql(query, ok=True):
    result = subprocess.run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At'],
                            input=query, text=True, capture_output=True, check=False)
    if ok and result.returncode:
        raise AssertionError(result.stderr)
    if not ok and result.returncode == 0:
        raise AssertionError('expected rejection')
    return result

candidate = (ROOT / 'quality/candidates/v2-legacy-admission-containment.sql').read_text()
sql('''
create function public.reserve_professor_budget(text default 'standard') returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
begin raise exception 'legacy_body_must_never_run'; end $$;
revoke all on function public.reserve_professor_budget(text) from public;
grant execute on function public.reserve_professor_budget(text) to authenticated,service_role;
insert into public.professor_budget_reservations(user_id,reserved_usd,max_session_seconds,status)
 select id,4,1200,'unresolved' from profiles order by id limit 1;
insert into public.ai_tutor_sessions(user_id,lesson_id,status,budget_reservation_id)
 select r.user_id,l.id,'abandoned',r.id from professor_budget_reservations r
 cross join lessons l order by l.id limit 1;
insert into public.ai_usage_log(feature,estimated_cost_usd,request_id)
 values('professor_livekit',0.9970616,'fictional-existing-receipt');
create table public.containment_evidence as
select (select jsonb_agg(to_jsonb(r) order by id) from professor_budget_reservations r) reservations,
 (select jsonb_agg(to_jsonb(s) order by id) from ai_tutor_sessions s) sessions,
 (select jsonb_agg(to_jsonb(u) order by id) from ai_usage_log u) usage,
 (select to_jsonb(b) from learning_hub_budget_settings b where id=1) budget,
 (select to_jsonb(b) from professor_budget_settings b where feature='professor_livekit') professor_budget,
 (select md5(prosrc) from pg_proc where oid='public.reserve_professor_budget(text)'::regprocedure) legacy_source,
 (select to_jsonb(p) from pg_proc p where oid='public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'::regprocedure) atomic_routine;
''')

# Failed/rolled-back changes must not leave a half-contained permission state.
sql('begin;\n' + candidate + '\nrollback;')
assert sql("select has_function_privilege('authenticated','public.reserve_professor_budget(text)','EXECUTE') and has_function_privilege('service_role','public.reserve_professor_budget(text)','EXECUTE');").stdout.strip() == 't'

sql(candidate)
sql(candidate)  # Retry after a lost successful migration response is harmless.
for role in ('anon', 'authenticated', 'service_role'):
    result = sql(f"set role {role}; select public.reserve_professor_budget('premium');", ok=False)
    assert 'permission denied for function reserve_professor_budget' in result.stderr

sql('''do $$ begin
 if exists(select 1 from containment_evidence e where
  e.reservations is distinct from (select jsonb_agg(to_jsonb(r) order by id) from professor_budget_reservations r)
  or e.sessions is distinct from (select jsonb_agg(to_jsonb(s) order by id) from ai_tutor_sessions s)
  or e.usage is distinct from (select jsonb_agg(to_jsonb(u) order by id) from ai_usage_log u)
  or e.budget is distinct from (select to_jsonb(b) from learning_hub_budget_settings b where id=1)
  or e.professor_budget is distinct from (select to_jsonb(b) from professor_budget_settings b where feature='professor_livekit')
  or e.legacy_source is distinct from (select md5(prosrc) from pg_proc where oid='public.reserve_professor_budget(text)'::regprocedure)
  or e.atomic_routine is distinct from (select to_jsonb(p) from pg_proc p where oid='public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'::regprocedure)
 ) then raise exception 'existing_state_changed'; end if;
 if (public.professor_reservation_exposure_v2()->>'protectedReservationUsd')::numeric<>4 then
  raise exception 'unresolved_hold_not_preserved'; end if;
end $$;''')

# Verified exact inverse for the observed original direct ACL, without source restoration.
sql('grant execute on function public.reserve_professor_budget(text) to authenticated,service_role;')
for role in ('authenticated', 'service_role'):
    assert sql(f"select has_function_privilege('{role}','public.reserve_professor_budget(text)','EXECUTE');").stdout.strip() == 't'

# Unexpected inherited grants must fail closed, not be silently widened or cascaded.
sql('create role containment_group; grant containment_group to authenticated; grant execute on function public.reserve_professor_budget(text) to containment_group;')
assert 'legacy_admission_acl_drift' in sql(candidate, ok=False).stderr
assert sql("select has_function_privilege('service_role','public.reserve_professor_budget(text)','EXECUTE');").stdout.strip() == 't'
sql('revoke execute on function public.reserve_professor_budget(text) from containment_group; revoke containment_group from authenticated; drop role containment_group;')
sql('grant execute on function public.reserve_professor_budget(text) to authenticated with grant option;')
assert 'legacy_admission_acl_drift' in sql(candidate, ok=False).stderr
sql('revoke grant option for execute on function public.reserve_professor_budget(text) from authenticated;')
sql(candidate)
print('PASS: direct-role denial, preserved rows/holds/budgets/function bodies/atomic startup, rollback, retry, inverse grants, inherited and grant-option drift; providers=0')

-- Additive V2 package: read-only owner recovery, with all admission/dispatch
-- capabilities still closed. Tested before the service-only dispatch fence.
begin;
do $$
begin
 if to_regclass('lh_internal.written_professor_references') is null
  or to_regclass('lh_internal.professor_preflights') is null
  or to_regprocedure('public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)') is null
  then raise exception 'recovery_prerequisites_missing'; end if;
 if exists(select 1 from information_schema.columns where table_schema='lh_internal' and table_name='written_professor_references'
  and column_name in ('dispatch_claim_id','dispatch_payload_sha256','dispatch_claimed_at','observed_dispatch_id','dispatch_acknowledged_at'))
  or to_regprocedure('public.observe_professor_dispatch_v1(uuid,uuid)') is not null
  or to_regprocedure('public.list_professor_recovery_v1()') is not null
  or to_regprocedure('public.claim_professor_dispatch_v1(jsonb,text,text,uuid)') is not null
  or to_regprocedure('public.record_professor_dispatch_v1(uuid,uuid,uuid,text,text)') is not null
  then raise exception 'recovery_capability_already_present'; end if;
 if has_function_privilege('anon','public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)','execute')
  or has_function_privilege('authenticated','public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)','execute')
  or has_function_privilege('service_role','public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)','execute')
  then raise exception 'admission_must_remain_closed'; end if;
end $$;
alter table lh_internal.written_professor_references
 add column dispatch_claim_id uuid unique,
 add column dispatch_payload_sha256 text check(dispatch_payload_sha256 ~ '^[a-f0-9]{64}$'),
 add column dispatch_claimed_at timestamptz,
 add column observed_dispatch_id text,
 add column dispatch_acknowledged_at timestamptz,
 add constraint dispatch_claim_complete check(
  (dispatch_claim_id is null and dispatch_payload_sha256 is null and dispatch_claimed_at is null)
  or (dispatch_claim_id is not null and dispatch_payload_sha256 is not null and dispatch_claimed_at is not null and bound_session_id is not null)),
 add constraint dispatch_ack_complete check(
  (observed_dispatch_id is null and dispatch_acknowledged_at is null)
  or (observed_dispatch_id is not null and dispatch_acknowledged_at is not null and dispatch_claim_id is not null));

create function public.observe_professor_dispatch_v1(p_reference_id uuid,p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); t lh_internal.written_professor_references%rowtype;
begin
 if uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into t from lh_internal.written_professor_references where id=p_reference_id and user_id=uid;
 if not found or p_request_id is null or (t.bound_request_id is not null and t.bound_request_id<>p_request_id)
  then raise exception 'dispatch_reference_forbidden' using errcode='42501'; end if;
 return jsonb_build_object('state',case when t.bound_session_id is null then 'no_admission_observed'
  when t.dispatch_claim_id is null then 'admitted_not_claimed'
  when t.observed_dispatch_id is null then 'dispatch_unconfirmed' else 'dispatch_acknowledged' end,
  'sessionId',t.bound_session_id,'providerAdmission',false,'retryAllowed',false);
end $$;
revoke all on function public.observe_professor_dispatch_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.observe_professor_dispatch_v1(uuid,uuid) to authenticated;

-- Read-only discovery without a browser pointer. No user identifier accepted.
-- Expired references and old budget periods do not hide unresolved obligations.
create function public.list_professor_recovery_v1()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and learner_track in ('rafael_finance','viviane_payroll'))
  then raise exception 'authentication_required' using errcode='42501'; end if;
 with pending as (
  select t.id,t.bound_request_id,t.bound_session_id,t.bound_at,
   case when t.dispatch_claim_id is null then 'admitted_not_claimed'
    when t.observed_dispatch_id is null then 'dispatch_unconfirmed' else 'dispatch_acknowledged' end as state
  from lh_internal.written_professor_references t
  join public.ai_tutor_sessions s on s.id=t.bound_session_id and s.user_id=uid
  join public.professor_budget_reservations r on r.id=s.budget_reservation_id and r.user_id=uid
  where t.user_id=uid and (s.status='active' or r.status in ('active','unresolved'))
  order by t.bound_at desc,t.id limit 21
 ), visible as (select * from pending order by bound_at desc,id limit 20)
 select jsonb_build_object('attempts',coalesce((select jsonb_agg(jsonb_build_object(
  'referenceId',id,'requestId',bound_request_id,'sessionId',bound_session_id,'state',state)
  order by bound_at desc,id) from visible),'[]'::jsonb),
  'truncated',(select count(*)>20 from pending),'providerAdmission',false,'retryAllowed',false) into result;
 return result;
end $$;
revoke all on function public.list_professor_recovery_v1() from public,anon,authenticated,service_role;
grant execute on function public.list_professor_recovery_v1() to authenticated;
commit;

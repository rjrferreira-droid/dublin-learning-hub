-- UNMOUNTED PHASE-1 CANDIDATE. Disposable PostgreSQL only until separately
-- reviewed. This prunes encrypted admission ephemera and never modifies a
-- session, reservation, usage row, settlement receipt or bound reference.
begin;

do $guard$
declare recovery_columns integer;
begin
 if to_regclass('lh_internal.written_professor_references') is null
  or to_regclass('lh_internal.professor_preflights') is null
  or to_regclass('public.ai_tutor_sessions') is null
  or to_regclass('public.professor_budget_reservations') is null then
  raise exception 'professor_ephemera_retention_prerequisites_missing';
 end if;
 select count(*) into recovery_columns
 from information_schema.columns
 where table_schema='lh_internal' and table_name='written_professor_references'
  and column_name in ('dispatch_claim_id','dispatch_payload_sha256','dispatch_claimed_at',
   'observed_dispatch_id','dispatch_acknowledged_at');
 if recovery_columns<>5
  or to_regprocedure('lh_internal.prune_professor_ephemera_v1(integer)') is not null then
  raise exception 'professor_ephemera_retention_schema_drift';
 end if;
 if not (select relrowsecurity from pg_class where oid='lh_internal.written_professor_references'::regclass)
  or not (select relrowsecurity from pg_class where oid='lh_internal.professor_preflights'::regclass) then
  raise exception 'professor_ephemera_retention_requires_rls';
 end if;
end $guard$;

create index professor_preflights_retention_expiry_idx
 on lh_internal.professor_preflights(expires_at,reference_id);
create index written_professor_references_retention_unbound_idx
 on lh_internal.written_professor_references(expires_at,id)
 where bound_session_id is null;

create function lh_internal.prune_professor_ephemera_v1(p_batch_limit integer default 200)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog
as $function$
declare
 v_now timestamptz:=clock_timestamp();
 v_preflight_cutoff timestamptz;
 v_reference_cutoff timestamptz;
 v_preflight_parent_ids uuid[]:=array[]::uuid[];
 v_preflight_ids uuid[]:=array[]::uuid[];
 v_reference_ids uuid[]:=array[]::uuid[];
 v_preflights integer:=0;
 v_consumed integer:=0;
 v_unconsumed integer:=0;
 v_references integer:=0;
begin
 if p_batch_limit is null or p_batch_limit not between 1 and 500 then
  raise exception 'professor_ephemera_cleanup_batch_invalid';
 end if;
 if not pg_try_advisory_xact_lock(hashtextextended('lh_internal.prune_professor_ephemera_v1',0)) then
  return jsonb_build_object('status','skipped','reason','cleanup_already_running',
   'deletedPreflights',0,'deletedConsumedPreflights',0,
   'deletedUnconsumedPreflights',0,'deletedUnboundReferences',0);
 end if;
 v_preflight_cutoff:=v_now-interval '24 hours';
 v_reference_cutoff:=v_now-interval '7 days';

 -- Old ciphertext with inconsistent ownership, lifetime or binding is evidence
 -- to investigate, not routine retention. Fail before deleting any row.
 if exists(
  select 1
  from lh_internal.professor_preflights p
  left join lh_internal.written_professor_references t on t.id=p.reference_id
  left join public.ai_tutor_sessions s on s.id=t.bound_session_id
  left join public.professor_budget_reservations r on r.id=s.budget_reservation_id
  where p.expires_at<=v_preflight_cutoff and (
   t.id is null
   or p.user_id is distinct from t.user_id
   or p.expires_at>t.expires_at
   or (p.consumed_at is not null and p.consumed_at>p.expires_at)
   or (t.bound_session_id is null and (
    t.bound_request_id is not null or t.bound_at is not null
    or t.dispatch_claim_id is not null or t.dispatch_payload_sha256 is not null
    or t.dispatch_claimed_at is not null or t.observed_dispatch_id is not null
    or t.dispatch_acknowledged_at is not null))
   or (t.bound_session_id is not null and (
    p.consumed_at is null or t.bound_request_id is distinct from p.request_id
    or t.bound_at is null or s.id is null or s.user_id is distinct from t.user_id
    or s.lesson_id is distinct from t.lesson_id
    or s.startup_request_id is distinct from t.bound_request_id
    or r.id is null or r.user_id is distinct from t.user_id
    or r.feature is distinct from 'professor_livekit'))
  )
 ) then
  raise exception 'professor_ephemera_cleanup_integrity_drift';
 end if;

 -- Lock ONLY parents first, matching put's parent-share then insert order. A
 -- multi-relation FOR UPDATE does not promise relation lock order.
 select coalesce(array_agg(c.reference_id order by c.expires_at,c.reference_id),array[]::uuid[])
 into v_preflight_parent_ids
 from (
  select p.reference_id,p.expires_at
  from lh_internal.professor_preflights p
  join lh_internal.written_professor_references t
   on t.id=p.reference_id and t.user_id=p.user_id and p.expires_at<=t.expires_at
  left join public.ai_tutor_sessions s on s.id=t.bound_session_id
  left join public.professor_budget_reservations r on r.id=s.budget_reservation_id
  where p.expires_at<=v_preflight_cutoff
   and (p.consumed_at is null or p.consumed_at<=p.expires_at)
   and (
    (t.bound_session_id is null and t.expires_at<=v_preflight_cutoff
     and t.bound_request_id is null and t.bound_at is null
     and t.dispatch_claim_id is null and t.dispatch_payload_sha256 is null
     and t.dispatch_claimed_at is null and t.observed_dispatch_id is null
     and t.dispatch_acknowledged_at is null)
    or
    (t.bound_session_id is not null and p.consumed_at is not null
     and t.bound_request_id=p.request_id and t.bound_at is not null
     and s.id=t.bound_session_id and s.user_id=t.user_id and s.lesson_id=t.lesson_id
     and s.startup_request_id=t.bound_request_id
     and r.id=s.budget_reservation_id and r.user_id=t.user_id
     and r.feature='professor_livekit')
   )
  order by p.expires_at,p.reference_id
  limit p_batch_limit
  for update of t skip locked
 ) c;

 -- Then lock children from the already protected parent set. A concurrent
 -- consume makes its child SKIP LOCKED and remains untouched; this function
 -- never waits for it and never takes a lock the consumer needs afterwards.
 select coalesce(array_agg(c.reference_id order by c.expires_at,c.reference_id),array[]::uuid[])
 into v_preflight_ids
 from (
  select p.reference_id,p.expires_at
  from lh_internal.professor_preflights p
  where p.reference_id=any(v_preflight_parent_ids)
  order by p.expires_at,p.reference_id
  for update of p skip locked
 ) c;

 with deleted as (
  delete from lh_internal.professor_preflights p
  where p.reference_id=any(v_preflight_ids)
  returning p.consumed_at
 )
 select count(*)::integer,
  count(*) filter(where consumed_at is not null)::integer,
  count(*) filter(where consumed_at is null)::integer
 into v_preflights,v_consumed,v_unconsumed
 from deleted;

 -- An unbound reference cannot own a committed reservation from the protected
 -- path. The seven-day window retains a short diagnostic receipt after its
 -- ciphertext is gone. Bound references are deliberately never age-pruned.
 select coalesce(array_agg(c.id order by c.expires_at,c.id),array[]::uuid[])
 into v_reference_ids
 from (
  select t.id,t.expires_at
  from lh_internal.written_professor_references t
  where t.expires_at<=v_reference_cutoff
   and t.bound_session_id is null and t.bound_request_id is null and t.bound_at is null
   and t.dispatch_claim_id is null and t.dispatch_payload_sha256 is null
   and t.dispatch_claimed_at is null and t.observed_dispatch_id is null
   and t.dispatch_acknowledged_at is null
   and not exists(select 1 from lh_internal.professor_preflights p where p.reference_id=t.id)
  order by t.expires_at,t.id
  limit p_batch_limit
  for update of t skip locked
 ) c;

 with deleted as (
  delete from lh_internal.written_professor_references t
  where t.id=any(v_reference_ids)
   and t.expires_at<=v_reference_cutoff
   and t.bound_session_id is null and t.bound_request_id is null and t.bound_at is null
   and t.dispatch_claim_id is null and t.dispatch_payload_sha256 is null
   and t.dispatch_claimed_at is null and t.observed_dispatch_id is null
   and t.dispatch_acknowledged_at is null
   and not exists(select 1 from lh_internal.professor_preflights p where p.reference_id=t.id)
  returning t.id
 ) select count(*)::integer into v_references from deleted;

 return jsonb_build_object('status','completed','batchLimit',p_batch_limit,
  'preflightCutoff',v_preflight_cutoff,'referenceCutoff',v_reference_cutoff,
  'deletedPreflights',v_preflights,'deletedConsumedPreflights',v_consumed,
  'deletedUnconsumedPreflights',v_unconsumed,'deletedUnboundReferences',v_references);
end $function$;

revoke all on function lh_internal.prune_professor_ephemera_v1(integer)
 from public,anon,authenticated,service_role;
comment on function lh_internal.prune_professor_ephemera_v1(integer) is
 'Owner/cron-only bounded phase-1 retention. Deletes expired encrypted preflights and old never-bound references; never deletes bound recovery evidence or operational rows.';
commit;

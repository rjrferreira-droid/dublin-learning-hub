-- UNMOUNTED CANDIDATE. Disposable Preview validation only.
-- Finalizes an admitted reference-bound validation session only while the
-- durable dispatch fence proves that no provider claim or acknowledgement can
-- exist. It creates no usage, evaluation, feedback or learning evidence.
begin;
do $guard$
begin
 if to_regclass('lh_internal.written_professor_references') is null
  or to_regclass('lh_internal.professor_preflights') is null
  or to_regclass('lh_internal.professor_completion_receipts') is null
  or to_regclass('lh_internal.professor_settlement_receipts') is null
  or to_regprocedure('public.observe_professor_dispatch_v1(uuid,uuid)') is null
  or to_regprocedure('public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)') is null
  then raise exception 'validation_abandon_prerequisites_missing'; end if;
 if to_regprocedure('public.abandon_professor_validation_v1(uuid,uuid)') is not null
  then raise exception 'validation_abandon_capability_already_present'; end if;
 if exists(
  select 1 from (values
   ('dispatch_claim_id'),('dispatch_payload_sha256'),('dispatch_claimed_at'),
   ('observed_dispatch_id'),('dispatch_acknowledged_at')
  ) required(column_name)
  where not exists(
   select 1 from information_schema.columns c
   where c.table_schema='lh_internal' and c.table_name='written_professor_references'
    and c.column_name=required.column_name
  )
 ) then raise exception 'validation_abandon_dispatch_fence_missing'; end if;
 if not exists(
  select 1 from information_schema.columns
  where table_schema='public' and table_name='ai_tutor_sessions'
   and column_name='callback_token_hash' and is_nullable='YES'
 ) then raise exception 'validation_abandon_callback_invalidation_unavailable'; end if;
end $guard$;

create function public.abandon_professor_validation_v1(p_reference_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $fn$
declare
 uid uuid:=auth.uid();
 settings public.professor_budget_settings%rowtype;
 budget public.learning_hub_budget_settings%rowtype;
 ticket lh_internal.written_professor_references%rowtype;
 session_row public.ai_tutor_sessions%rowtype;
 reservation public.professor_budget_reservations%rowtype;
 closed_at timestamptz;
 related_evidence boolean;
 clean_session boolean;
 clean_reservation boolean;
 terminal boolean;
begin
 if uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_reference_id is null or p_request_id is null then
  raise exception 'validation_abandon_request_invalid' using errcode='22023';
 end if;

 -- Identical prefix to admission/dispatch budget locking. This serializes an
 -- abandon against a claim before either can touch the reference or session.
 select * into settings from public.professor_budget_settings
  where feature='professor_livekit' for update;
 select * into budget from public.learning_hub_budget_settings where id=1 for update;
 if settings.feature is null or budget.id is null then
  raise exception 'validation_abandon_guard_unavailable';
 end if;
 select * into ticket from lh_internal.written_professor_references
  where id=p_reference_id and user_id=uid for update;
 if not found or ticket.bound_session_id is null
  or ticket.bound_request_id is distinct from p_request_id then
  raise exception 'validation_abandon_forbidden' using errcode='42501';
 end if;
 select * into session_row from public.ai_tutor_sessions
  where id=ticket.bound_session_id for update;
 if not found then raise exception 'validation_abandon_binding_invalid'; end if;
 select * into reservation from public.professor_budget_reservations
  where id=session_row.budget_reservation_id for update;
 if not found then raise exception 'validation_abandon_binding_invalid'; end if;
 if session_row.user_id is distinct from uid or reservation.user_id is distinct from uid
  or session_row.lesson_id is distinct from ticket.lesson_id
  or session_row.startup_request_id is distinct from ticket.bound_request_id
  or session_row.budget_reservation_id is distinct from reservation.id
  or reservation.feature is distinct from 'professor_livekit' then
  raise exception 'validation_abandon_binding_invalid';
 end if;

 select exists(select 1 from public.ai_tutor_turns x where x.session_id=session_row.id)
  or exists(select 1 from public.ai_usage_log x where x.session_id=session_row.id)
  or exists(select 1 from lh_internal.professor_completion_receipts x where x.session_id=session_row.id)
  or exists(select 1 from lh_internal.professor_settlement_receipts x where x.session_id=session_row.id)
 into related_evidence;
 clean_session:=session_row.room_name like 'validation:lh-%'
  and session_row.quality_tier='premium'
  and session_row.dispatch_id is null
  and session_row.duration_seconds=0
  and session_row.transcript='[]'::jsonb
  and session_row.model_usage='[]'::jsonb
  and session_row.technical_score is null and session_row.english_score is null
  and session_row.grammar_score is null and session_row.vocabulary_score is null
  and session_row.fluency_score is null and session_row.pronunciation_score is null
  and session_row.professional_communication_score is null
  and session_row.final_feedback is null and session_row.evaluation_model is null
  and session_row.evaluation_cost_usd=0;
 clean_reservation:=reservation.actual_cost_usd=0 and reservation.settled_at is null;
 terminal:=session_row.status='abandoned' and reservation.status='abandoned'
  and session_row.completed_at is not null
  and session_row.close_reason='validation_admission_never_dispatched'
  and session_row.callback_token_hash is null;

 -- The exact state written below is replay-safe. Any partial or subsequently
 -- altered state requires reconciliation and must never release another hold.
 if terminal then
  if clean_session is distinct from true or clean_reservation is distinct from true
   or related_evidence is distinct from false
   or ticket.dispatch_claim_id is not null or ticket.dispatch_payload_sha256 is not null
   or ticket.dispatch_claimed_at is not null or ticket.observed_dispatch_id is not null
   or ticket.dispatch_acknowledged_at is not null then
   raise exception 'validation_abandon_terminal_drift';
  end if;
  return jsonb_build_object('state','validation_abandoned','referenceId',ticket.id,
   'requestId',ticket.bound_request_id,'sessionId',session_row.id,'reservationId',reservation.id,
   'providerAdmission',false,'learningEvidenceRecorded',false,'reservationReleased',true,'duplicate',true);
 end if;

 if session_row.status is distinct from 'active' or session_row.completed_at is not null
  or session_row.close_reason is not null or reservation.status is distinct from 'active'
  or clean_session is distinct from true or clean_reservation is distinct from true
  or related_evidence is distinct from false
  or session_row.callback_token_hash is null or session_row.callback_token_hash !~ '^[a-f0-9]{64}$'
  or ticket.dispatch_claim_id is not null or ticket.dispatch_payload_sha256 is not null
  or ticket.dispatch_claimed_at is not null or ticket.observed_dispatch_id is not null
  or ticket.dispatch_acknowledged_at is not null then
  raise exception 'validation_abandon_unavailable';
 end if;

 closed_at:=clock_timestamp();
 update public.ai_tutor_sessions set status='abandoned',completed_at=closed_at,
  close_reason='validation_admission_never_dispatched',callback_token_hash=null
  where id=session_row.id;
 update public.professor_budget_reservations set status='abandoned'
  where id=reservation.id;
 -- The sealed callback/context is no longer useful once its session cannot be
 -- dispatched or completed. The public reference remains for audit/recovery.
 delete from lh_internal.professor_preflights
  where reference_id=ticket.id and user_id=uid and request_id=ticket.bound_request_id;
 return jsonb_build_object('state','validation_abandoned','referenceId',ticket.id,
  'requestId',ticket.bound_request_id,'sessionId',session_row.id,'reservationId',reservation.id,
  'providerAdmission',false,'learningEvidenceRecorded',false,'reservationReleased',true,'duplicate',false);
end $fn$;
revoke all on function public.abandon_professor_validation_v1(uuid,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.abandon_professor_validation_v1(uuid,uuid) to authenticated;
comment on function public.abandon_professor_validation_v1(uuid,uuid) is
 'Owner-only explicit close for a reference-bound Preview validation admission. Releases only an active, evidence-free reservation proven unclaimed by the durable dispatch fence.';

-- Make a lost successful abandon observable through the existing exact receipt.
-- Ambiguous terminal drift is never described as an unclaimed active admission.
create or replace function public.observe_professor_dispatch_v1(p_reference_id uuid,p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $fn$
declare
 uid uuid:=auth.uid();
 ticket lh_internal.written_professor_references%rowtype;
 session_row public.ai_tutor_sessions%rowtype;
 reservation public.professor_budget_reservations%rowtype;
 state text;
 clean_terminal boolean:=false;
begin
 if uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into ticket from lh_internal.written_professor_references
  where id=p_reference_id and user_id=uid;
 if not found or p_request_id is null
  or (ticket.bound_request_id is not null and ticket.bound_request_id<>p_request_id) then
  raise exception 'dispatch_reference_forbidden' using errcode='42501';
 end if;
 if ticket.bound_session_id is null then
  state:='no_admission_observed';
 else
  select * into session_row from public.ai_tutor_sessions
   where id=ticket.bound_session_id and user_id=uid;
  if not found then raise exception 'dispatch_reference_forbidden' using errcode='42501'; end if;
  select * into reservation from public.professor_budget_reservations
   where id=session_row.budget_reservation_id and user_id=uid;
  if not found then raise exception 'dispatch_reference_forbidden' using errcode='42501'; end if;
  clean_terminal:=session_row.status='abandoned' and reservation.status='abandoned'
   and session_row.lesson_id=ticket.lesson_id
   and session_row.startup_request_id=ticket.bound_request_id
   and session_row.budget_reservation_id=reservation.id
   and reservation.feature='professor_livekit'
   and session_row.completed_at is not null
   and session_row.close_reason='validation_admission_never_dispatched'
   and session_row.callback_token_hash is null and session_row.dispatch_id is null
   and session_row.room_name like 'validation:lh-%' and session_row.quality_tier='premium'
   and session_row.duration_seconds=0 and session_row.transcript='[]'::jsonb
   and session_row.model_usage='[]'::jsonb
   and session_row.technical_score is null and session_row.english_score is null
   and session_row.grammar_score is null and session_row.vocabulary_score is null
   and session_row.fluency_score is null and session_row.pronunciation_score is null
   and session_row.professional_communication_score is null
   and session_row.final_feedback is null and session_row.evaluation_model is null
   and session_row.evaluation_cost_usd=0 and reservation.actual_cost_usd=0
   and reservation.settled_at is null and ticket.dispatch_claim_id is null
   and ticket.dispatch_payload_sha256 is null and ticket.dispatch_claimed_at is null
   and ticket.observed_dispatch_id is null and ticket.dispatch_acknowledged_at is null
   and not exists(select 1 from public.ai_tutor_turns x where x.session_id=session_row.id)
   and not exists(select 1 from public.ai_usage_log x where x.session_id=session_row.id)
   and not exists(select 1 from lh_internal.professor_completion_receipts x where x.session_id=session_row.id)
   and not exists(select 1 from lh_internal.professor_settlement_receipts x where x.session_id=session_row.id);
  state:=case when clean_terminal then 'validation_abandoned'
   when ticket.dispatch_claim_id is null and session_row.status='active' and reservation.status='active'
    then 'admitted_not_claimed'
   when ticket.dispatch_claim_id is not null and ticket.observed_dispatch_id is null
    then 'dispatch_unconfirmed'
   when ticket.observed_dispatch_id is not null then 'dispatch_acknowledged'
   else 'reconciliation_required' end;
 end if;
 return jsonb_build_object('state',state,'sessionId',ticket.bound_session_id,
  'providerAdmission',false,'retryAllowed',false);
end $fn$;
revoke all on function public.observe_professor_dispatch_v1(uuid,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.observe_professor_dispatch_v1(uuid,uuid) to authenticated;
commit;

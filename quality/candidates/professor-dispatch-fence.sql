-- NEW, UNMOUNTED CANDIDATE. Disposable CI only, after the V2 recovery package.
-- No provider, live route, historical schema or connected installation is changed.
begin;
create function public.claim_professor_dispatch_v1(p_ack jsonb,p_callback_hash text,p_payload_sha256 text,p_claim_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare t lh_internal.written_professor_references%rowtype; s public.ai_tutor_sessions%rowtype;
 r public.professor_budget_reservations%rowtype; expected jsonb;
begin
 if p_claim_id is null or p_payload_sha256 is null or p_payload_sha256 !~ '^[a-f0-9]{64}$'
  or p_callback_hash is null or p_callback_hash !~ '^[a-f0-9]{64}$' then raise exception 'dispatch_request_invalid'; end if;
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 select * into t from lh_internal.written_professor_references where id=(p_ack->'reference'->>'id')::uuid for update;
 if not found or t.bound_session_id is null or t.user_id is distinct from (p_ack->>'userId')::uuid then raise exception 'dispatch_reference_forbidden' using errcode='42501'; end if;
 select * into s from public.ai_tutor_sessions where id=t.bound_session_id for update;
 select * into r from public.professor_budget_reservations where id=s.budget_reservation_id for update;
 if s.id is null or r.id is null or s.user_id is distinct from t.user_id or r.user_id is distinct from t.user_id
  or s.lesson_id is distinct from t.lesson_id or s.startup_request_id is distinct from t.bound_request_id
  or s.callback_token_hash is distinct from p_callback_hash then raise exception 'dispatch_reference_forbidden' using errcode='42501'; end if;
 expected:=jsonb_build_object('requestId',t.bound_request_id,'userId',t.user_id,'mode',s.mode,
  'reference',jsonb_build_object('id',t.id,'sha256',t.source_sha256,'version',t.descriptor_version,'identity',t.identity),
  'sessionId',s.id,'reservationId',r.id,'roomName',s.room_name,'validationMode',true,'qualityTier','premium',
  'maxSessionSeconds',r.max_session_seconds,'providerAdmission',false);
 if p_ack is distinct from expected then raise exception 'dispatch_ack_mismatch'; end if;
 -- Never renew, reclaim, or return a second positive acknowledgement, even with
 -- the same claim ID. A lost first response cannot authorize a provider retry.
 if t.dispatch_claim_id is not null then
  return jsonb_build_object('claimed',false,'reason','dispatch_already_claimed');
 end if;
 if s.status is distinct from 'active' or s.dispatch_id is not null or s.quality_tier is distinct from 'premium'
  or s.room_name is null or s.room_name not like 'validation:lh-%' or r.status is distinct from 'active'
  or t.expires_at<=clock_timestamp() then raise exception 'dispatch_session_unavailable'; end if;
 perform lh_internal.lock_written_identity(t.user_id,t.identity);
 if t.expires_at<=clock_timestamp() then raise exception 'dispatch_session_unavailable'; end if;
 update lh_internal.written_professor_references set dispatch_claim_id=p_claim_id,dispatch_payload_sha256=p_payload_sha256,
  dispatch_claimed_at=clock_timestamp() where id=t.id;
 -- The provider may start after this commit. Protect uncertainty before calling
 -- it, including across crashes, ticket expiry and month boundaries.
 update public.professor_budget_reservations set status='unresolved' where id=r.id;
 return jsonb_build_object('claimed',true,'claim_id',p_claim_id,'payload_sha256',p_payload_sha256);
end $$;
revoke all on function public.claim_professor_dispatch_v1(jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_professor_dispatch_v1(jsonb,text,text,uuid) to service_role;

create function public.record_professor_dispatch_v1(p_reference_id uuid,p_user_id uuid,p_claim_id uuid,p_payload_sha256 text,p_dispatch_id text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare t lh_internal.written_professor_references%rowtype; s public.ai_tutor_sessions%rowtype;
begin
 if p_dispatch_id is null or p_dispatch_id !~ '^[A-Za-z0-9_-]{1,200}$' then raise exception 'dispatch_id_invalid'; end if;
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 select * into t from lh_internal.written_professor_references where id=p_reference_id and user_id=p_user_id for update;
 if not found or p_claim_id is null or t.dispatch_claim_id is distinct from p_claim_id or t.dispatch_payload_sha256 is distinct from p_payload_sha256
  then raise exception 'dispatch_claim_forbidden' using errcode='42501'; end if;
 if t.observed_dispatch_id is not null then
  if t.observed_dispatch_id<>p_dispatch_id then raise exception 'dispatch_receipt_conflict'; end if;
  return true;
 end if;
 select * into s from public.ai_tutor_sessions where id=t.bound_session_id for update;
 if not found or (s.dispatch_id is not null and s.dispatch_id<>p_dispatch_id) then raise exception 'dispatch_receipt_conflict'; end if;
 update lh_internal.written_professor_references set observed_dispatch_id=p_dispatch_id,dispatch_acknowledged_at=clock_timestamp() where id=t.id;
 update public.ai_tutor_sessions set dispatch_id=p_dispatch_id where id=s.id;
 -- A dispatch ID is not completion, usage, a zero-cost receipt or invoice.
 return true;
end $$;
revoke all on function public.record_professor_dispatch_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_professor_dispatch_v1(uuid,uuid,uuid,text,text) to service_role;
commit;

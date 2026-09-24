-- Written answers and pronunciation share the existing English assessment cap.
-- No increase to either feature or global budget. Raw answers/audio are not stored.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
alter table public.ai_usage_log drop constraint ai_usage_log_feature_check;
alter table public.ai_usage_log add constraint ai_usage_log_feature_check check (feature in (
 'case_feedback','chapter_conversation','lesson_tts','lesson_audio','transcription',
 'oral_mock','professor_livekit','professor_evaluation','other','english_audio_assessment',
 'english_written_assessment','english_pronunciation_assessment'
));
create table lh_internal.english_activity_assessment_attempts (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 lesson_id uuid not null,
 item_key text not null check (item_key ~ '^(practice:[A-Za-z0-9_-]{1,100}|speaking:([0-9]|1[0-9]))$'),
 input_sha256 text not null check (input_sha256 ~ '^[0-9a-f]{64}$'),
 state text not null check (state in ('reserved','submitted','unresolved','completed')),
 reserved_usd numeric not null check (reserved_usd=0.50),
 actual_cost_usd numeric check (actual_cost_usd is null or actual_cost_usd between 0 and 0.50),
 result jsonb,
 result_expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (state<>'completed' or actual_cost_usd is not null)
);
create index english_activity_assessment_outstanding_idx
 on lh_internal.english_activity_assessment_attempts(state,created_at)
 where state in ('reserved','submitted','unresolved');
-- A new UUID must not bypass an in-flight or uncertain provider request for
-- the same answer. Completed answers may be re-recorded by design.
create unique index english_activity_assessment_one_outstanding_answer_idx
 on lh_internal.english_activity_assessment_attempts(user_id,lesson_id,item_key)
 where state in ('reserved','submitted','unresolved');
create index english_activity_assessment_result_expiry_idx
 on lh_internal.english_activity_assessment_attempts(result_expires_at)
 where result is not null;
alter table lh_internal.english_activity_assessment_attempts enable row level security;
revoke all on lh_internal.english_activity_assessment_attempts from public,anon,authenticated;
grant select,insert,update on lh_internal.english_activity_assessment_attempts to service_role;


create or replace function lh_internal.english_audio_pending_usd()
returns numeric language sql stable security invoker set search_path=pg_catalog,lh_internal as $fn$
 select coalesce(sum(reserved_usd),0) from (
  select reserved_usd from lh_internal.english_audio_assessment_attempts where state in ('reserved','submitted','unresolved')
  union all
  select reserved_usd from lh_internal.english_activity_assessment_attempts where state in ('reserved','submitted','unresolved')
 ) holds;
$fn$;

do $patch$
declare definition text; old_expression text; new_expression text;
begin
 select pg_get_functiondef('public.begin_english_audio_assessment_v1(uuid,uuid,uuid,integer,text)'::regprocedure) into definition;
 old_expression := $old$feature='english_audio_assessment'$old$;
 new_expression := $new$feature in ('english_audio_assessment','english_written_assessment','english_pronunciation_assessment')$new$;
 if (length(definition)-length(replace(definition,old_expression,'')))<>length(old_expression) then raise exception 'activity_budget_anchor_changed'; end if;
 definition := replace(definition,old_expression,new_expression);
 old_expression := $old$select coalesce(sum(reserved_usd),0) into own_hold from lh_internal.english_audio_assessment_attempts
  where state in ('reserved','submitted','unresolved');$old$;
 new_expression := $new$own_hold := lh_internal.english_audio_pending_usd();$new$;
 if (length(definition)-length(replace(definition,old_expression,'')))<>length(old_expression) then raise exception 'activity_budget_anchor_changed'; end if;
 definition := replace(definition,old_expression,new_expression);
 execute definition;
end $patch$;
create function public.begin_english_activity_assessment_v1(
 p_attempt_id uuid,p_user_id uuid,p_lesson_id uuid,p_item_key text,p_input_sha256 text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $fn$
declare
 s lh_internal.english_audio_assessment_settings%rowtype;
 g public.learning_hub_budget_settings%rowtype;
 previous lh_internal.english_activity_assessment_attempts%rowtype;
 used numeric; professor_hold numeric; premium_hold numeric; own_hold numeric; feature_used numeric;
 month_start timestamptz := date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
begin
 if p_attempt_id is null or p_user_id is null or p_lesson_id is null or p_item_key is null
  or p_item_key !~ '^(practice:[A-Za-z0-9_-]{1,100}|speaking:([0-9]|1[0-9]))$'
  or p_input_sha256 is null or p_input_sha256 !~ '^[0-9a-f]{64}$' then
  raise exception 'invalid_assessment_identity' using errcode='22023';
 end if;
 -- The global row is the common admission lock used by Professor and Premium
 -- Audio. Every new assessment also observes their outstanding obligations.
 select * into g from public.learning_hub_budget_settings where id=1 for update;
 select * into s from lh_internal.english_audio_assessment_settings where id=1 for update;
 if g.id is null or s.id is null then return jsonb_build_object('status','budget_unavailable'); end if;
 -- Lazy cleanup runs on each authenticated assessment request. Expired results
 -- cannot be recharged under the same attempt ID, even after text is removed.
 update lh_internal.english_activity_assessment_attempts set result=null,updated_at=now()
  where state='completed' and result is not null and result_expires_at<now();
 select * into previous from lh_internal.english_activity_assessment_attempts where id=p_attempt_id for update;
 if found then
  if previous.user_id<>p_user_id or previous.lesson_id<>p_lesson_id or previous.item_key<>p_item_key
   or previous.input_sha256<>p_input_sha256
   then return jsonb_build_object('status','identity_conflict'); end if;
  if previous.state='completed' then
   if previous.result is null or previous.result_expires_at<now() then return jsonb_build_object('status','expired'); end if;
   return jsonb_build_object('status','completed','result',previous.result);
  end if;
  return jsonb_build_object('status',case when previous.state='unresolved' then 'unresolved' else 'in_progress' end);
 end if;
 -- This query and the insertion below are serialized by the shared global
 -- settings lock. The partial unique index defends the invariant as well.
 select * into previous from lh_internal.english_activity_assessment_attempts
  where user_id=p_user_id and lesson_id=p_lesson_id and item_key=p_item_key
   and state in ('reserved','submitted','unresolved')
  order by created_at limit 1 for update;
 if found then
  return jsonb_build_object('status',case when previous.state='unresolved' then 'unresolved' else 'in_progress' end);
 end if;
 if s.enabled is not true then return jsonb_build_object('status','closed'); end if;
 select coalesce(sum(estimated_cost_usd),0) into used from public.ai_usage_log where created_at>=month_start;
 select coalesce(sum(estimated_cost_usd),0) into feature_used from public.ai_usage_log
  where feature in ('english_audio_assessment','english_written_assessment','english_pronunciation_assessment') and created_at>=month_start;
 own_hold := lh_internal.english_audio_pending_usd();
 select coalesce(sum(greatest(reserved_usd,coalesce(estimated_cost_usd,0))),0) into premium_hold
  from lh_internal.premium_audio_attempts where state in ('reserved','submitted','uncertain');
 professor_hold := (lh_internal.professor_reservation_exposure(now())->>'protectedReservationUsd')::numeric;
 if used is null or feature_used is null or own_hold is null or premium_hold is null or professor_hold is null
  then return jsonb_build_object('status','budget_unavailable'); end if;
 if feature_used+own_hold+s.reservation_usd>s.monthly_cap_usd then
  return jsonb_build_object('status','budget_reached');
 end if;
 if used+professor_hold+premium_hold+own_hold+s.reservation_usd>g.ai_hard_cap_usd then
  return jsonb_build_object('status','global_budget_reached');
 end if;
 insert into lh_internal.english_activity_assessment_attempts(id,user_id,lesson_id,item_key,input_sha256,state,reserved_usd)
 values(p_attempt_id,p_user_id,p_lesson_id,p_item_key,p_input_sha256,'reserved',s.reservation_usd);
 return jsonb_build_object('status','claimed');
end $fn$;

create function public.mark_english_activity_assessment_submitted_v1(p_attempt_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
begin
 update lh_internal.english_activity_assessment_attempts set state='submitted',updated_at=now()
  where id=p_attempt_id and user_id=p_user_id and state='reserved';
 return found;
end $fn$;

-- Only an unsubmitted attempt can be discarded after a free provider access
-- check fails. No paid request can have begun in this state.
create function public.cancel_english_activity_assessment_reserved_v1(p_attempt_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
begin
 -- Keep every transition that changes outstanding exposure linearized with
 -- the global admissions, including a free preflight's release of its hold.
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 if not found then return false; end if;
 delete from lh_internal.english_activity_assessment_attempts
  where id=p_attempt_id and user_id=p_user_id and state='reserved';
 return found;
end $fn$;

-- An uncertain provider outcome keeps its hold across month boundaries.
create function public.mark_english_activity_assessment_unresolved_v1(p_attempt_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
begin
 update lh_internal.english_activity_assessment_attempts set state='unresolved',updated_at=now()
  where id=p_attempt_id and user_id=p_user_id and state in ('reserved','submitted','unresolved');
 return found;
end $fn$;

create function public.settle_english_activity_assessment_v1(
 p_attempt_id uuid,p_user_id uuid,p_actual_cost_usd numeric,p_prompt_tokens integer,
 p_audio_input_tokens integer,p_completion_tokens integer,p_result jsonb
) returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
declare a lh_internal.english_activity_assessment_attempts%rowtype;
begin
 if p_actual_cost_usd is null or p_actual_cost_usd<0 or p_actual_cost_usd>0.50
  or p_prompt_tokens is null or p_prompt_tokens<0 or p_audio_input_tokens is null or p_audio_input_tokens<0
  or p_completion_tokens is null or p_completion_tokens<0 or p_result is null
  or jsonb_typeof(p_result) is distinct from 'object' or p_result ?| array['transcript','answer','audio']
  or octet_length(p_result::text)>32768 then return false; end if;
 -- Admission reads usage and outstanding holds in separate statements. Hold
 -- the same budget row until the usage receipt and hold release commit, so a
 -- concurrent admission cannot observe only one side of this transition.
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 if not found then return false; end if;
 select * into a from lh_internal.english_activity_assessment_attempts
  where id=p_attempt_id and user_id=p_user_id for update;
 if not found then return false; end if;
 if a.state='completed' then return a.result=p_result and a.actual_cost_usd=p_actual_cost_usd; end if;
 if a.state<>'submitted' then return false; end if;
 if p_result->>'status' is distinct from 'completed'
  or p_result->>'attempt_id' is distinct from a.id::text
  or p_result->>'lesson_id' is distinct from a.lesson_id::text
  or concat(p_result->>'kind',':',p_result->>'item_id')<>a.item_key
  then return false; end if;
 insert into public.ai_usage_log(user_id,feature,model,input_tokens,audio_input_tokens,output_tokens,
  estimated_cost_usd,request_id)
 values(p_user_id,case when a.item_key like 'practice:%' then 'english_written_assessment' else 'english_pronunciation_assessment' end,case when a.item_key like 'practice:%' then 'gpt-4.1-mini' else 'gpt-audio-1.5' end,p_prompt_tokens,p_audio_input_tokens,
  p_completion_tokens,p_actual_cost_usd,'english-activity-assess:'||p_attempt_id::text);
 update lh_internal.english_activity_assessment_attempts
  set state='completed',result=p_result,result_expires_at=now()+interval '30 days',
   actual_cost_usd=p_actual_cost_usd,updated_at=now()
  where id=p_attempt_id;
 return true;
end $fn$;

revoke all on function public.begin_english_activity_assessment_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.mark_english_activity_assessment_submitted_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.cancel_english_activity_assessment_reserved_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.mark_english_activity_assessment_unresolved_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.settle_english_activity_assessment_v1(uuid,uuid,numeric,integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.begin_english_activity_assessment_v1(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.mark_english_activity_assessment_submitted_v1(uuid,uuid) to service_role;
grant execute on function public.cancel_english_activity_assessment_reserved_v1(uuid,uuid) to service_role;
grant execute on function public.mark_english_activity_assessment_unresolved_v1(uuid,uuid) to service_role;
grant execute on function public.settle_english_activity_assessment_v1(uuid,uuid,numeric,integer,integer,integer,jsonb) to service_role;

create function public.read_english_activity_results_v1(p_user_id uuid,p_lesson_id uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog,public,lh_internal as $fn$
 select coalesce(jsonb_agg(result),'[]'::jsonb) from (
  select distinct on (item_key) result from lh_internal.english_activity_assessment_attempts
  where user_id=p_user_id and lesson_id=p_lesson_id and state='completed'
   and result is not null and result_expires_at>now()
  order by item_key,created_at desc limit 100
 ) recent;
$fn$;
revoke all on function public.read_english_activity_results_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_english_activity_results_v1(uuid,uuid) to service_role;
create function public.read_english_audio_results_v1(p_user_id uuid,p_lesson_id uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog,public,lh_internal as $fn$
 select coalesce(jsonb_agg(result),'[]'::jsonb) from (
  select distinct on (question_index) result from lh_internal.english_audio_assessment_attempts
  where user_id=p_user_id and lesson_id=p_lesson_id and state='completed'
   and result is not null and result_expires_at>now()
  order by question_index,created_at desc limit 100
 ) recent;
$fn$;
revoke all on function public.read_english_audio_results_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_english_audio_results_v1(uuid,uuid) to service_role;
commit;

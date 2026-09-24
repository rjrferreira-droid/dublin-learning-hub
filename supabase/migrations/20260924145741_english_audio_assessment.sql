-- Isolated English Audio Preview. No provider call can be admitted until an
-- operator enables the private budget setting; the Edge route is also scoped
-- to the exact Preview project and the client flag defaults closed.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

alter table public.ai_usage_log drop constraint ai_usage_log_feature_check;
alter table public.ai_usage_log add constraint ai_usage_log_feature_check check (feature in (
 'case_feedback','chapter_conversation','lesson_tts','lesson_audio','transcription',
 'oral_mock','professor_livekit','professor_evaluation','other','english_audio_assessment'
));

create table lh_internal.english_audio_assessment_settings (
 id integer primary key check (id=1),
 enabled boolean not null default false,
 monthly_cap_usd numeric not null default 8 check (monthly_cap_usd between 0 and 8),
 reservation_usd numeric not null default 0.50 check (reservation_usd=0.50)
);
insert into lh_internal.english_audio_assessment_settings(id) values(1);
alter table lh_internal.english_audio_assessment_settings enable row level security;
revoke all on lh_internal.english_audio_assessment_settings from public,anon,authenticated;
grant select,update on lh_internal.english_audio_assessment_settings to service_role;

-- Audio bytes and learner transcripts never enter Storage or Postgres. Scores
-- and feedback expire after 30 days and are cleared at the next assessment
-- claim (lazy cleanup).
-- Callers cannot read or write this private table.
create table lh_internal.english_audio_assessment_attempts (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id),
 question_index smallint not null check (question_index between 0 and 4),
 audio_sha256 text not null check (audio_sha256 ~ '^[0-9a-f]{64}$'),
 state text not null check (state in ('reserved','submitted','unresolved','completed')),
 reserved_usd numeric not null check (reserved_usd=0.50),
 actual_cost_usd numeric check (actual_cost_usd is null or actual_cost_usd between 0 and 0.50),
 result jsonb,
 result_expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (state<>'completed' or actual_cost_usd is not null)
);
create index english_audio_assessment_outstanding_idx
 on lh_internal.english_audio_assessment_attempts(state,created_at)
 where state in ('reserved','submitted','unresolved');
-- A new UUID must not bypass an in-flight or uncertain provider request for
-- the same answer. Completed answers may be re-recorded by design.
create unique index english_audio_assessment_one_outstanding_answer_idx
 on lh_internal.english_audio_assessment_attempts(user_id,lesson_id,question_index)
 where state in ('reserved','submitted','unresolved');
create index english_audio_assessment_result_expiry_idx
 on lh_internal.english_audio_assessment_attempts(result_expires_at)
 where result is not null;
alter table lh_internal.english_audio_assessment_attempts enable row level security;
revoke all on lh_internal.english_audio_assessment_attempts from public,anon,authenticated;
grant select,insert,update on lh_internal.english_audio_assessment_attempts to service_role;

create function lh_internal.english_audio_pending_usd()
returns numeric language sql stable security invoker set search_path=pg_catalog,lh_internal as $fn$
 select coalesce(sum(reserved_usd),0) from lh_internal.english_audio_assessment_attempts
 where state in ('reserved','submitted','unresolved');
$fn$;
revoke all on function lh_internal.english_audio_pending_usd() from public,anon,authenticated;
grant execute on function lh_internal.english_audio_pending_usd() to service_role;

-- Other admission routes must see our unspent hold while they hold the same
-- global budget row lock. Patch only the reviewed, exact expressions; drift
-- aborts the migration rather than silently opening a cross-feature race.
do $patch$
declare signature text; definition text; old_expression text; new_expression text;
begin
 foreach signature in array array[
  'public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)',
  'public.reserve_professor_budget(text)',
  'public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'
 ] loop
  if to_regprocedure(signature) is null then raise exception 'assessment_admission_dependency_missing: %',signature; end if;
  select pg_get_functiondef(to_regprocedure(signature)) into definition;
  if signature like '%begin_premium_audio_attempt_v2%' then
   old_expression:='used+held+professor_held+p_reservation_usd>b.ai_hard_cap_usd';
   new_expression:='used+held+professor_held+lh_internal.english_audio_pending_usd()+p_reservation_usd>b.ai_hard_cap_usd';
  elsif signature like '%reserve_professor_budget%' then
   old_expression:='v_global_committed := v_reserved_before + v_logged_ai + lh_internal.premium_audio_pending_usd();';
   new_expression:='v_global_committed := v_reserved_before + v_logged_ai + lh_internal.premium_audio_pending_usd() + lh_internal.english_audio_pending_usd();';
  else
   old_expression:='held+used+reserve_amount+lh_internal.premium_audio_pending_usd()>budget.ai_hard_cap_usd';
   new_expression:='held+used+reserve_amount+lh_internal.premium_audio_pending_usd()+lh_internal.english_audio_pending_usd()>budget.ai_hard_cap_usd';
  end if;
  if (length(definition)-length(replace(definition,old_expression,'')))<>length(old_expression)
   then raise exception 'assessment_admission_anchor_changed: %',signature; end if;
  execute replace(definition,old_expression,new_expression);
 end loop;
end $patch$;

create function public.begin_english_audio_assessment_v1(
 p_attempt_id uuid,p_user_id uuid,p_lesson_id uuid,p_question_index integer,p_audio_sha256 text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $fn$
declare
 s lh_internal.english_audio_assessment_settings%rowtype;
 g public.learning_hub_budget_settings%rowtype;
 previous lh_internal.english_audio_assessment_attempts%rowtype;
 used numeric; professor_hold numeric; premium_hold numeric; own_hold numeric; feature_used numeric;
 month_start timestamptz := date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
begin
 if p_attempt_id is null or p_user_id is null or p_lesson_id is null or p_question_index is null
  or p_question_index not between 0 and 4
  or p_audio_sha256 is null or p_audio_sha256 !~ '^[0-9a-f]{64}$' then
  raise exception 'invalid_assessment_identity' using errcode='22023';
 end if;
 -- The global row is the common admission lock used by Professor and Premium
 -- Audio. Every new assessment also observes their outstanding obligations.
 select * into g from public.learning_hub_budget_settings where id=1 for update;
 select * into s from lh_internal.english_audio_assessment_settings where id=1 for update;
 if g.id is null or s.id is null then return jsonb_build_object('status','budget_unavailable'); end if;
 -- Lazy cleanup runs on each authenticated assessment request. Expired results
 -- cannot be recharged under the same attempt ID, even after text is removed.
 update lh_internal.english_audio_assessment_attempts set result=null,updated_at=now()
  where state='completed' and result is not null and result_expires_at<now();
 select * into previous from lh_internal.english_audio_assessment_attempts where id=p_attempt_id for update;
 if found then
  if previous.user_id<>p_user_id or previous.lesson_id<>p_lesson_id or previous.question_index<>p_question_index
   or previous.audio_sha256<>p_audio_sha256
   then return jsonb_build_object('status','identity_conflict'); end if;
  if previous.state='completed' then
   if previous.result is null or previous.result_expires_at<now() then return jsonb_build_object('status','expired'); end if;
   return jsonb_build_object('status','completed','result',previous.result);
  end if;
  return jsonb_build_object('status',case when previous.state='unresolved' then 'unresolved' else 'in_progress' end);
 end if;
 -- This query and the insertion below are serialized by the shared global
 -- settings lock. The partial unique index defends the invariant as well.
 select * into previous from lh_internal.english_audio_assessment_attempts
  where user_id=p_user_id and lesson_id=p_lesson_id and question_index=p_question_index
   and state in ('reserved','submitted','unresolved')
  order by created_at limit 1 for update;
 if found then
  return jsonb_build_object('status',case when previous.state='unresolved' then 'unresolved' else 'in_progress' end);
 end if;
 if s.enabled is not true then return jsonb_build_object('status','closed'); end if;
 select coalesce(sum(estimated_cost_usd),0) into used from public.ai_usage_log where created_at>=month_start;
 select coalesce(sum(estimated_cost_usd),0) into feature_used from public.ai_usage_log
  where feature='english_audio_assessment' and created_at>=month_start;
 select coalesce(sum(reserved_usd),0) into own_hold from lh_internal.english_audio_assessment_attempts
  where state in ('reserved','submitted','unresolved');
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
 insert into lh_internal.english_audio_assessment_attempts(id,user_id,lesson_id,question_index,audio_sha256,state,reserved_usd)
 values(p_attempt_id,p_user_id,p_lesson_id,p_question_index,p_audio_sha256,'reserved',s.reservation_usd);
 return jsonb_build_object('status','claimed');
end $fn$;

create function public.mark_english_audio_assessment_submitted_v1(p_attempt_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
begin
 update lh_internal.english_audio_assessment_attempts set state='submitted',updated_at=now()
  where id=p_attempt_id and user_id=p_user_id and state='reserved';
 return found;
end $fn$;

-- Only an unsubmitted attempt can be discarded after a free provider access
-- check fails. No paid request can have begun in this state.
create function public.cancel_english_audio_assessment_reserved_v1(p_attempt_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
begin
 -- Keep every transition that changes outstanding exposure linearized with
 -- the global admissions, including a free preflight's release of its hold.
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 if not found then return false; end if;
 delete from lh_internal.english_audio_assessment_attempts
  where id=p_attempt_id and user_id=p_user_id and state='reserved';
 return found;
end $fn$;

-- An uncertain provider outcome keeps its hold across month boundaries.
create function public.mark_english_audio_assessment_unresolved_v1(p_attempt_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
begin
 update lh_internal.english_audio_assessment_attempts set state='unresolved',updated_at=now()
  where id=p_attempt_id and user_id=p_user_id and state in ('reserved','submitted','unresolved');
 return found;
end $fn$;

create function public.settle_english_audio_assessment_v1(
 p_attempt_id uuid,p_user_id uuid,p_actual_cost_usd numeric,p_prompt_tokens integer,
 p_audio_input_tokens integer,p_completion_tokens integer,p_result jsonb
) returns boolean language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $fn$
declare a lh_internal.english_audio_assessment_attempts%rowtype;
begin
 if p_actual_cost_usd is null or p_actual_cost_usd<0 or p_actual_cost_usd>0.50
  or p_prompt_tokens is null or p_prompt_tokens<0 or p_audio_input_tokens is null or p_audio_input_tokens<0
  or p_completion_tokens is null or p_completion_tokens<0 or p_result is null
  or p_result->>'transcript' is distinct from ''
  or octet_length(p_result::text)>32768 then return false; end if;
 -- Admission reads usage and outstanding holds in separate statements. Hold
 -- the same budget row until the usage receipt and hold release commit, so a
 -- concurrent admission cannot observe only one side of this transition.
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 if not found then return false; end if;
 select * into a from lh_internal.english_audio_assessment_attempts
  where id=p_attempt_id and user_id=p_user_id for update;
 if not found then return false; end if;
 if a.state='completed' then return a.result=p_result and a.actual_cost_usd=p_actual_cost_usd; end if;
 if a.state<>'submitted' then return false; end if;
 insert into public.ai_usage_log(user_id,feature,model,input_tokens,audio_input_tokens,output_tokens,
  estimated_cost_usd,request_id)
 values(p_user_id,'english_audio_assessment','gpt-audio-1.5',p_prompt_tokens,p_audio_input_tokens,
  p_completion_tokens,p_actual_cost_usd,'english-audio-assess:'||p_attempt_id::text);
 update lh_internal.english_audio_assessment_attempts
  set state='completed',result=p_result,result_expires_at=now()+interval '30 days',
   actual_cost_usd=p_actual_cost_usd,updated_at=now()
  where id=p_attempt_id;
 return true;
end $fn$;

revoke all on function public.begin_english_audio_assessment_v1(uuid,uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.mark_english_audio_assessment_submitted_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.cancel_english_audio_assessment_reserved_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.mark_english_audio_assessment_unresolved_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.settle_english_audio_assessment_v1(uuid,uuid,numeric,integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.begin_english_audio_assessment_v1(uuid,uuid,uuid,integer,text) to service_role;
grant execute on function public.mark_english_audio_assessment_submitted_v1(uuid,uuid) to service_role;
grant execute on function public.cancel_english_audio_assessment_reserved_v1(uuid,uuid) to service_role;
grant execute on function public.mark_english_audio_assessment_unresolved_v1(uuid,uuid) to service_role;
grant execute on function public.settle_english_audio_assessment_v1(uuid,uuid,numeric,integer,integer,integer,jsonb) to service_role;
commit;

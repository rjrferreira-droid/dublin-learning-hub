-- CANDIDATE ONLY. Not a migration. Never applied to a connected Supabase project.
-- All consumers must use the same locks in this order: Professor settings, global settings.
-- The exact startup patch below is tested only against the repository's fictional fixture.
create table lh_internal.premium_audio_attempts (
 id uuid primary key,
 user_id uuid not null references public.profiles(id),
 lesson_id uuid not null references public.lessons(id),
 content_version integer not null check(content_version>0),
 reserved_usd numeric not null check(reserved_usd>=0.10 and reserved_usd<=10),
 state text not null check(state in ('reserved','submitted','uncertain','settled','cancelled')),
 created_at timestamptz not null default clock_timestamp(),
 lease_until timestamptz not null,
 submitted_at timestamptz,
 settled_at timestamptz,
 estimated_cost_usd numeric,
 characters integer,
 check(estimated_cost_usd is null or (estimated_cost_usd>=0 and estimated_cost_usd<=10000)),
 check(characters is null or characters between 0 and 20000)
);
alter table lh_internal.premium_audio_attempts enable row level security;
revoke all on table lh_internal.premium_audio_attempts from public,anon,authenticated,service_role;
create unique index premium_audio_one_pending_lesson on lh_internal.premium_audio_attempts(lesson_id)
 where state in ('reserved','submitted','uncertain');

create function lh_internal.premium_audio_pending_usd() returns numeric
language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(sum(reserved_usd),0) from lh_internal.premium_audio_attempts
 where state in ('reserved','submitted','uncertain');
$$;
revoke all on function lh_internal.premium_audio_pending_usd() from public,anon,authenticated;
grant execute on function lh_internal.premium_audio_pending_usd() to service_role;

create function public.begin_premium_audio_attempt_v2(
 p_attempt_id uuid,p_user_id uuid,p_lesson_id uuid,p_content_version integer,p_reservation_usd numeric
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $$
declare b public.learning_hub_budget_settings%rowtype; previous lh_internal.premium_audio_attempts%rowtype;
 profile_track text; lesson_track text; version integer; used numeric; premium_used numeric; held numeric; professor_held numeric;
begin
 if p_attempt_id is null or p_user_id is null or p_lesson_id is null or p_content_version is null or p_content_version<1
  or p_reservation_usd is null or p_reservation_usd<0.10 or p_reservation_usd>10 or p_reservation_usd='NaN'::numeric then raise exception 'invalid_audio_attempt'; end if;
 -- Same order as start_professor_session_atomic. Locks are acquired before reading any totals.
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 if not found then raise exception 'audio_budget_dependency_missing'; end if;
 select * into b from public.learning_hub_budget_settings where id=1 for update;
 if not found or b.ai_hard_cap_usd is null or b.premium_audio_cap_usd is null
  or b.ai_hard_cap_usd<0 or b.premium_audio_cap_usd<0
  or b.ai_hard_cap_usd='NaN'::numeric or b.premium_audio_cap_usd='NaN'::numeric then raise exception 'audio_budget_dependency_missing'; end if;
 select learner_track into profile_track from public.profiles where id=p_user_id;
 select c.learner_track,l.content_version into lesson_track,version from public.lessons l
 join public.modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
 where l.id=p_lesson_id and l.is_published and m.is_published and c.is_active;
 if profile_track is null or profile_track not in ('rafael_finance','viviane_payroll') or lesson_track is null
  or lesson_track not in ('rafael_finance','viviane_payroll','english_academy')
  or (lesson_track<>'english_academy' and lesson_track<>profile_track)
  or version is distinct from p_content_version then raise exception 'audio_lesson_forbidden'; end if;
 select * into previous from lh_internal.premium_audio_attempts where id=p_attempt_id;
 if found then
  if previous.user_id<>p_user_id or previous.lesson_id<>p_lesson_id or previous.content_version<>p_content_version or previous.reserved_usd<>p_reservation_usd then raise exception 'audio_attempt_conflict'; end if;
  -- A replay is never authorization for another provider invocation.
  return jsonb_build_object('allowed',false,'reason','audio_attempt_replayed','state',previous.state);
 end if;
 -- Only an attempt which has never crossed the submission fence may expire automatically.
 update lh_internal.premium_audio_attempts set state='cancelled'
 where state='reserved' and lease_until<=clock_timestamp();
 if exists(select 1 from lh_internal.premium_audio_attempts where lesson_id=p_lesson_id and state in ('reserved','submitted','uncertain')) then
  return jsonb_build_object('allowed',false,'reason','audio_generation_in_progress');
 end if;
 if exists(select 1 from public.ai_usage_log where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC'
   and (estimated_cost_usd is null or estimated_cost_usd<0 or estimated_cost_usd='NaN'::numeric)) then raise exception 'invalid_usage_cost'; end if;
 select coalesce(sum(estimated_cost_usd),0),coalesce(sum(estimated_cost_usd) filter(where feature in ('lesson_audio','lesson_tts','professor_evaluation')),0)
 into used,premium_used from public.ai_usage_log
 where created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
 held:=lh_internal.premium_audio_pending_usd();
 professor_held:=(lh_internal.professor_reservation_exposure(now())->>'protectedReservationUsd')::numeric;
 if professor_held is null or professor_held<0 then raise exception 'audio_budget_dependency_missing'; end if;
 if used+held+professor_held+p_reservation_usd>b.ai_hard_cap_usd then return jsonb_build_object('allowed',false,'reason','global_ai_budget_reached'); end if;
 if premium_used+held+p_reservation_usd>b.premium_audio_cap_usd then return jsonb_build_object('allowed',false,'reason','premium_audio_budget_reached'); end if;
 insert into lh_internal.premium_audio_attempts(id,user_id,lesson_id,content_version,reserved_usd,state,lease_until)
 values(p_attempt_id,p_user_id,p_lesson_id,p_content_version,p_reservation_usd,'reserved',clock_timestamp()+interval '180 seconds');
 return jsonb_build_object('allowed',true,'attemptId',p_attempt_id,'state','reserved','reservationUsd',p_reservation_usd);
end $$;

create function public.mark_premium_audio_submitted_v2(p_attempt_id uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $$
begin
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 update lh_internal.premium_audio_attempts a set state='submitted',submitted_at=clock_timestamp()
 where a.id=p_attempt_id and a.state='reserved' and a.lease_until>clock_timestamp()
 and exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
  join public.profiles p on p.id=a.user_id
  where l.id=a.lesson_id and l.content_version=a.content_version and l.is_published and m.is_published and c.is_active
  and p.learner_track in ('rafael_finance','viviane_payroll') and (c.learner_track=p.learner_track or c.learner_track='english_academy'));
 return found;
end $$;

create function public.close_premium_audio_attempt_v2(p_attempt_id uuid) returns text
language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $$
declare result text;
begin
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 update lh_internal.premium_audio_attempts set state=case when state='reserved' then 'cancelled' when state='submitted' then 'uncertain' else state end
 where id=p_attempt_id returning state into result;
 return result;
end $$;

create function public.settle_premium_audio_attempt_v2(p_attempt_id uuid,p_estimated_cost_usd numeric,p_characters integer) returns boolean
language plpgsql security definer set search_path=pg_catalog,public,lh_internal as $$
declare a lh_internal.premium_audio_attempts%rowtype;
begin
 if p_estimated_cost_usd is null or p_estimated_cost_usd<0 or p_estimated_cost_usd>10000 or p_estimated_cost_usd='NaN'::numeric
  or p_characters is null or p_characters<0 or p_characters>20000 then raise exception 'invalid_audio_receipt'; end if;
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 select * into a from lh_internal.premium_audio_attempts where id=p_attempt_id for update;
 if not found then raise exception 'audio_attempt_missing'; end if;
 if a.state='settled' then
  if a.estimated_cost_usd<>p_estimated_cost_usd or a.characters<>p_characters then raise exception 'audio_receipt_conflict'; end if;
  return true;
 end if;
 if a.state not in ('submitted','uncertain') then raise exception 'audio_attempt_not_submitted'; end if;
 -- One transaction replaces the hold with its application-estimated receipt. Failure keeps the hold.
 insert into public.ai_usage_log(user_id,feature,model,estimated_cost_usd,characters,request_id)
 values(a.user_id,'lesson_audio','gpt-4o-mini-tts',p_estimated_cost_usd,p_characters,'premium-audio-v2:'||a.id);
 update lh_internal.premium_audio_attempts set state='settled',estimated_cost_usd=p_estimated_cost_usd,characters=p_characters,settled_at=clock_timestamp() where id=a.id;
 return true;
end $$;

revoke all on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric),public.mark_premium_audio_submitted_v2(uuid),public.close_premium_audio_attempt_v2(uuid),public.settle_premium_audio_attempt_v2(uuid,numeric,integer) from public,anon,authenticated;
grant execute on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric),public.mark_premium_audio_submitted_v2(uuid),public.close_premium_audio_attempt_v2(uuid),public.settle_premium_audio_attempt_v2(uuid,numeric,integer) to service_role;

-- Do not silently miss an older spend-admission endpoint. A deployment review must resolve it.
do $patch$
declare definition text; anchor text:='held+used+reserve_amount>budget.ai_hard_cap_usd';
begin
 if to_regprocedure('public.reserve_professor_budget(text)') is not null then raise exception 'legacy_budget_entrypoint_requires_review'; end if;
 select pg_get_functiondef('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'::regprocedure) into definition;
 if (length(definition)-length(replace(definition,anchor,'')))<>length(anchor) then raise exception 'audio_startup_anchor_not_unique'; end if;
 if strpos(definition,'from public.professor_budget_settings where feature=''professor_livekit'' for update')=0
 or strpos(definition,'from public.learning_hub_budget_settings where id=1 for update')=0 then raise exception 'audio_startup_lock_contract_missing'; end if;
 execute replace(definition,anchor,'held+used+reserve_amount+lh_internal.premium_audio_pending_usd()>budget.ai_hard_cap_usd');
end $patch$;

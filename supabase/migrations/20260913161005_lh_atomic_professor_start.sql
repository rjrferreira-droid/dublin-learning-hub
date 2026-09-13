-- V2 additive startup path. The legacy V2 API is not switched by this migration.
alter table public.ai_tutor_sessions add column if not exists startup_request_id uuid;
create unique index if not exists professor_startup_request_uidx on public.ai_tutor_sessions(user_id,startup_request_id) where startup_request_id is not null;

create or replace function lh_internal.protect_atomic_professor_session()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if current_user in ('anon','authenticated') then
  if TG_OP='INSERT' and NEW.startup_request_id is not null then raise exception 'server_owned_session' using errcode='42501'; end if;
  if TG_OP='DELETE' and OLD.startup_request_id is not null then raise exception 'server_owned_session' using errcode='42501'; end if;
  if TG_OP='UPDATE' and (OLD.startup_request_id is not null or NEW.startup_request_id is not null) and (to_jsonb(NEW)-'dispatch_id') is distinct from (to_jsonb(OLD)-'dispatch_id') then raise exception 'server_owned_session' using errcode='42501'; end if;
 end if;
 if TG_OP='DELETE' then return OLD; end if;
 return NEW;
end $$;
revoke all on function lh_internal.protect_atomic_professor_session() from public,anon,authenticated;
drop trigger if exists protect_atomic_professor_session on public.ai_tutor_sessions;
create trigger protect_atomic_professor_session before insert or update or delete on public.ai_tutor_sessions for each row execute function lh_internal.protect_atomic_professor_session();

create or replace function public.start_professor_session_atomic(
 p_request_id uuid,p_lesson_id uuid,p_mode text,p_room_name text,p_callback_hash text,p_validation_mode boolean default false
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare uid uuid:=auth.uid(); profile_track text; lesson_track text; budget public.learning_hub_budget_settings%rowtype;
 settings public.professor_budget_settings%rowtype; previous public.ai_tutor_sessions%rowtype;
 sid uuid; rid uuid; held numeric; used numeric; professor_used numeric; reserve_amount numeric;
 v_month_start timestamptz:=date_trunc('month',now()); room text; validation boolean;
begin
 if uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_request_id is null or p_lesson_id is null or p_mode is null or p_mode not in ('chapter_conversation','case_feedback','oral_mock','english_drill','general_conversation')
  or p_callback_hash is null or p_callback_hash!~'^[a-f0-9]{64}$'
  or p_room_name is null or p_room_name!~'^(validation:)?lh-[a-f0-9-]{36}$' then raise exception 'invalid_professor_request'; end if;
 select learner_track into profile_track from public.profiles where id=uid;
 if profile_track is null or profile_track not in ('rafael_finance','viviane_payroll') then raise exception 'professor_track_forbidden' using errcode='42501'; end if;
 select c.learner_track into lesson_track from public.lessons l join public.modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
  where l.id=p_lesson_id and l.is_published and m.is_published and c.is_active;
 if lesson_track is null or (lesson_track<>'english_academy' and lesson_track<>profile_track) then raise exception 'professor_lesson_forbidden' using errcode='42501'; end if;
 select * into settings from public.professor_budget_settings where feature='professor_livekit' for update;
 select * into budget from public.learning_hub_budget_settings where id=1 for update;
 if settings.feature is null or budget.id is null or not settings.hard_stop_enabled then raise exception 'professor_budget_guard_unavailable'; end if;
 select * into previous from public.ai_tutor_sessions where user_id=uid and startup_request_id=p_request_id;
 if found then
  if previous.lesson_id<>p_lesson_id or previous.mode<>p_mode or previous.callback_token_hash<>p_callback_hash then raise exception 'startup_request_conflict'; end if;
  return jsonb_build_object('allowed',false,'reason','request_already_started','session_id',previous.id);
 end if;
 if exists(select 1 from public.ai_tutor_sessions where user_id=uid and status='active' and started_at>now()-make_interval(secs=>settings.max_session_seconds+120)) then
  return jsonb_build_object('allowed',false,'reason','professor_session_already_active');
 end if;
 if (select count(*) from public.ai_tutor_sessions where user_id=uid and started_at>now()-interval '10 minutes')>=6 then
  return jsonb_build_object('allowed',false,'reason','professor_start_rate_limited');
 end if;
 select coalesce(sum(reserved_usd),0) into held from public.professor_budget_reservations where feature='professor_livekit' and month_start=date_trunc('month',now())::date and status in ('active','unresolved');
 select coalesce(sum(estimated_cost_usd),0),coalesce(sum(estimated_cost_usd) filter(where feature='professor_livekit'),0) into used,professor_used from public.ai_usage_log where created_at>=v_month_start and created_at<v_month_start+interval '1 month';
 -- Preserve the existing premium-only policy and limits; this is not a model downgrade.
 reserve_amount:=settings.premium_reservation_usd;
 if held+professor_used+reserve_amount>least(settings.monthly_budget_usd,budget.professor_cap_usd) or held+used+reserve_amount>budget.ai_hard_cap_usd then
  return jsonb_build_object('allowed',false,'reason','professor_monthly_budget_reached');
 end if;
 validation:=coalesce(p_validation_mode,false) or p_room_name like 'validation:%' or exists(select 1 from public.professor_validation_flags where user_id=uid and expires_at>now());
 room:=(case when validation then 'validation:' else '' end)||regexp_replace(p_room_name,'^validation:','');
 insert into public.professor_budget_reservations(user_id,feature,month_start,reserved_usd,max_session_seconds,status)
 values(uid,'professor_livekit',date_trunc('month',now())::date,reserve_amount,settings.max_session_seconds,'active') returning id into rid;
 insert into public.ai_tutor_sessions(user_id,lesson_id,mode,status,room_name,quality_tier,budget_reservation_id,callback_token_hash,startup_request_id)
 values(uid,p_lesson_id,p_mode,'active',room,'premium',rid,p_callback_hash,p_request_id) returning id into sid;
 delete from public.professor_validation_flags where user_id=uid;
 return jsonb_build_object('allowed',true,'session_id',sid,'reservation_id',rid,'room_name',room,'validation_mode',validation,'quality_tier','premium',
  'reservation_usd',reserve_amount,'max_session_seconds',settings.max_session_seconds,'monthly_budget_usd',least(settings.monthly_budget_usd,budget.professor_cap_usd),
  'global_ai_cap_usd',budget.ai_hard_cap_usd,'reserved_before_usd',held+professor_used,'reserved_after_usd',held+professor_used+reserve_amount,'global_committed_before_usd',held+used);
end $$;
revoke all on function public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean) from public,anon;
grant execute on function public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean) to authenticated;
comment on function public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean) is 'Intentional narrowly scoped SECURITY DEFINER endpoint: auth UID, published lesson, ownership, rate limit and locked budget gate. Callback plaintext never enters the database or response.';

create or replace function public.flag_professor_dispatch_uncertain(p_session_id uuid,p_callback_token text)
returns void language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare s public.ai_tutor_sessions%rowtype;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 select * into s from public.ai_tutor_sessions where id=p_session_id and user_id=auth.uid() for update;
 if not found or s.startup_request_id is null or s.callback_token_hash is distinct from encode(extensions.digest(p_callback_token,'sha256'),'hex') then raise exception 'invalid_callback_credentials' using errcode='42501'; end if;
 if s.status='active' then
  update public.ai_tutor_sessions set close_reason='dispatch_uncertain' where id=s.id;
  update public.professor_budget_reservations set status='unresolved' where id=s.budget_reservation_id and user_id=s.user_id and status='active';
 end if;
 -- Keep the session callback eligible: an HTTP timeout does not prove the agent was never dispatched.
end $$;
revoke all on function public.flag_professor_dispatch_uncertain(uuid,text) from public,anon;
grant execute on function public.flag_professor_dispatch_uncertain(uuid,text) to authenticated;

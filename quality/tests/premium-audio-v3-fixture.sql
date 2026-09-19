-- Disposable extension of the minimal Audio v2 fixture. No connected target.
alter table public.lessons
  add column slug text,
  add column sequence integer;

alter table public.profiles
  add column display_name text,
  add column preferred_language text not null default 'pt-BR',
  add column timezone text not null default 'Europe/Dublin',
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();
update public.profiles
set display_name='Fictional learner ' || left(id::text,8);
delete from public.profiles where learner_track<>'rafael_finance';
alter table public.profiles
  alter column id drop default,
  alter column display_name set not null,
  alter column learner_track set not null,
  add constraint profiles_learner_track_check check (
    learner_track in ('rafael_finance','viviane_payroll','admin')
  );
create table auth.users(
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb
);
insert into auth.users(id,email,raw_user_meta_data)
select id,'rafael@example.invalid',jsonb_build_object(
  'display_name','Fictional Rafael','learner_track','rafael_finance'
) from public.profiles;
alter table public.profiles
  add constraint profiles_id_fkey foreign key(id)
    references auth.users(id) on delete cascade;

create function public.set_updated_at()
returns trigger
language plpgsql
volatile
security invoker
set search_path=public
as $fixture_updated_at$
begin
  new.updated_at = now();
  return new;
end;
$fixture_updated_at$;
grant execute on function public.set_updated_at()
  to anon,authenticated,service_role;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
volatile
security definer
set search_path=public
as $fixture_handle_new_user$
begin
  insert into public.profiles (id, display_name, learner_track, preferred_language, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''),'@',1), 'Learner'),
    case when new.raw_user_meta_data->>'learner_track' in ('rafael_finance','viviane_payroll') then new.raw_user_meta_data->>'learner_track' else 'rafael_finance' end,
    'pt-BR',
    'Europe/Dublin'
  )
  on conflict (id) do nothing;
  return new;
end;
$fixture_handle_new_user$;
revoke all on function public.handle_new_user()
  from PUBLIC,anon,authenticated,service_role;
grant execute on function public.handle_new_user() to service_role;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.audio_assets
  drop constraint audio_assets_estimated_cost_usd_check,
  drop constraint audio_assets_lesson_id_fkey,
  add constraint audio_assets_lesson_id_fkey foreign key(lesson_id)
    references public.lessons(id) on delete cascade,
  add constraint audio_assets_audio_type_check check (
    audio_type in ('commentary','lesson_summary','pronunciation')
  ),
  add constraint audio_assets_estimated_cost_usd_check check (
    estimated_cost_usd is null
    or (
      estimated_cost_usd>=0
      and estimated_cost_usd<>'NaN'::numeric
    )
  );

alter table public.ai_usage_log
  add constraint ai_usage_log_feature_check check (
    feature in (
      'case_feedback','chapter_conversation','lesson_tts','lesson_audio',
      'transcription','oral_mock','professor_livekit',
      'professor_evaluation','other'
    )
  ),
  add constraint ai_usage_log_session_id_fkey foreign key(session_id)
    references public.ai_tutor_sessions(id) on delete set null,
  add constraint ai_usage_log_user_id_fkey foreign key(user_id)
    references auth.users(id) on delete set null;

with ranked as (
  select id,row_number() over(partition by module_id order by id)+1 as lesson_sequence
  from public.lessons
)
update public.lessons l
set slug='fictional-audio-' || replace(l.id::text,'-',''),
    sequence=ranked.lesson_sequence
from ranked
where ranked.id=l.id;

update public.lessons l
set slug=case c.learner_track
  when 'rafael_finance' then
    'revenue-judgement-contracts-performance-obligations-cutoff'
  when 'viviane_payroll' then
    'rpn-pay-date-employment-id-payroll-submission'
  when 'english_academy' then
    'clarify-check-understanding-handle-meetings'
end
from public.modules m
join public.courses c on c.id=m.course_id
where l.module_id=m.id and l.sequence=2;

alter table public.lessons
  alter column slug set not null,
  alter column sequence set not null;

alter table public.audio_assets
  add column transcript_pt text,
  add column voice text,
  add column generated_at timestamptz,
  add column duration_seconds integer,
  add column created_at timestamptz not null default now();

alter table public.audio_assets
  alter column lesson_id set not null,
  alter column audio_type set not null;

alter table public.ai_usage_log
  alter column id set generated always,
  alter column feature set not null,
  alter column model set not null,
  alter column input_tokens set not null,
  alter column cached_input_tokens set not null,
  alter column output_tokens set not null,
  alter column audio_input_tokens set not null,
  alter column audio_output_tokens set not null,
  alter column audio_seconds type numeric(10,2),
  alter column audio_seconds set not null,
  alter column estimated_cost_usd type numeric(12,6),
  alter column estimated_cost_usd set not null,
  alter column characters set not null,
  alter column created_at set not null;
create index idx_ai_usage_month
  on public.ai_usage_log(created_at,feature);

-- Reproduce the retained, paired V2 topology used by the approved Preview.
-- The production candidate attests the connected hashes; the workflow derives
-- a disposable copy with only the three reviewed fixture hashes substituted.
create or replace function public.reserve_professor_budget(
  p_quality_tier text default 'standard'
) returns table (
  allowed boolean,
  reservation_id uuid,
  monthly_budget_usd numeric,
  reserved_before_usd numeric,
  reserved_after_usd numeric,
  max_session_seconds integer,
  quality_tier text,
  reservation_usd numeric,
  global_ai_cap_usd numeric,
  global_committed_before_usd numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.professor_budget_settings%rowtype;
  v_global public.learning_hub_budget_settings%rowtype;
  v_reserved_before numeric := 0;
  v_logged_ai numeric := 0;
  v_global_committed numeric := 0;
  v_reservation numeric := 0;
  v_reservation_id uuid;
  v_quality text := case when p_quality_tier = 'premium' then 'premium' else 'standard' end;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into v_settings
    from public.professor_budget_settings
   where feature = 'professor_livekit'
   for update;

  select * into v_global
    from public.learning_hub_budget_settings
   where id = 1
   for update;

  if not found or v_settings.feature is null or v_global.id is null then
    return query select false, null::uuid, 0::numeric, 0::numeric, 0::numeric, 900, v_quality, 0::numeric, 0::numeric, 0::numeric;
    return;
  end if;

  v_reservation := case when v_quality = 'premium' then v_settings.premium_reservation_usd else v_settings.reservation_usd end;

  select (lh_internal.professor_reservation_exposure(now())->>'protectedReservationUsd')::numeric
    into v_reserved_before;

  select coalesce(sum(u.estimated_cost_usd), 0)
    into v_logged_ai
    from public.ai_usage_log u
   where u.created_at >= date_trunc('month', now());

  v_global_committed := v_reserved_before + v_logged_ai + lh_internal.premium_audio_pending_usd();

  if not coalesce(v_settings.hard_stop_enabled,false) then raise exception 'professor_budget_guard_unavailable'; end if;
  if (
       v_reserved_before + v_reservation > least(v_settings.monthly_budget_usd, v_global.professor_cap_usd)
       or v_global_committed + v_reservation > v_global.ai_hard_cap_usd
     ) then
    return query select
      false,
      null::uuid,
      least(v_settings.monthly_budget_usd, v_global.professor_cap_usd),
      v_reserved_before,
      v_reserved_before,
      v_settings.max_session_seconds,
      v_quality,
      v_reservation,
      v_global.ai_hard_cap_usd,
      v_global_committed;
    return;
  end if;

  insert into public.professor_budget_reservations (
    user_id, feature, month_start, reserved_usd, max_session_seconds
  ) values (
    v_user_id, 'professor_livekit', date_trunc('month', now())::date, v_reservation, v_settings.max_session_seconds
  ) returning id into v_reservation_id;

  return query select
    true,
    v_reservation_id,
    least(v_settings.monthly_budget_usd, v_global.professor_cap_usd),
    v_reserved_before,
    v_reserved_before + v_reservation,
    v_settings.max_session_seconds,
    v_quality,
    v_reservation,
    v_global.ai_hard_cap_usd,
    v_global_committed;
end;
$$;

revoke all on function public.reserve_professor_budget(text)
  from PUBLIC, anon, authenticated, service_role;
grant execute on function public.start_professor_session_atomic(
  uuid,uuid,text,text,text,boolean
) to service_role;

alter table public.professor_budget_settings enable row level security;
alter table public.learning_hub_budget_settings enable row level security;
alter table public.professor_budget_reservations enable row level security;
alter table public.ai_usage_log enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.audio_assets enable row level security;

grant all privileges on table
  public.profiles,public.courses,public.modules,public.lessons,
  public.audio_assets
to anon,authenticated,service_role;

alter table public.professor_budget_settings
  add constraint audio_v3_fixture_professor_feature_ck
  check (feature='professor_livekit');
alter table public.learning_hub_budget_settings
  add constraint audio_v3_fixture_global_singleton_ck check (id=1);
alter table public.professor_budget_reservations
  alter column feature set not null,
  alter column status set not null,
  add constraint audio_v3_fixture_reservation_feature_fk
    foreign key (feature) references public.professor_budget_settings(feature);


-- Mirror the complete connected V2 budget CHECK inventory.
alter table public.professor_budget_settings add constraint audio_v3_fixture_budget_check_1 CHECK (max_session_seconds >= 60 AND max_session_seconds <= 1800);
alter table public.professor_budget_settings add constraint audio_v3_fixture_budget_check_2 CHECK (monthly_budget_usd > 0::numeric);
alter table public.professor_budget_settings add constraint audio_v3_fixture_budget_check_3 CHECK (premium_reservation_usd > 0::numeric);
alter table public.professor_budget_settings add constraint audio_v3_fixture_budget_check_4 CHECK (reservation_usd > 0::numeric);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_5 CHECK (absolute_total_budget_usd > 0::numeric);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_6 CHECK (ai_hard_cap_usd > 0::numeric);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_7 CHECK ((infrastructure_reserve_usd + ai_hard_cap_usd) <= absolute_total_budget_usd);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_8 CHECK (professor_cap_usd <= ai_hard_cap_usd);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_9 CHECK (premium_audio_cap_usd <= ai_hard_cap_usd);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_10 CHECK (infrastructure_reserve_usd >= 0::numeric);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_11 CHECK (premium_audio_cap_usd > 0::numeric);
alter table public.learning_hub_budget_settings add constraint audio_v3_fixture_budget_check_12 CHECK (professor_cap_usd > 0::numeric);
alter table public.professor_budget_reservations add constraint audio_v3_fixture_budget_check_13 CHECK (max_session_seconds >= 60 AND max_session_seconds <= 1800);

drop policy own_sessions on public.ai_tutor_sessions;
create policy ai_tutor_sessions_own_all
  on public.ai_tutor_sessions
  as permissive for all to authenticated
  using (auth.uid()=user_id)
  with check (auth.uid()=user_id);
create policy ai_usage_own_read
  on public.ai_usage_log
  as permissive for select to authenticated
  using (user_id=auth.uid());

create policy profiles_insert_own
  on public.profiles as permissive for insert to authenticated
  with check (auth.uid()=id);
create policy profiles_select_own
  on public.profiles as permissive for select to authenticated
  using (auth.uid()=id);
create policy profiles_update_own
  on public.profiles as permissive for update to authenticated
  using (auth.uid()=id) with check (auth.uid()=id);
create policy courses_read
  on public.courses as permissive for select to authenticated
  using (is_active=true);
create policy modules_read
  on public.modules as permissive for select to authenticated
  using (is_published=true);
create policy lessons_read
  on public.lessons as permissive for select to authenticated
  using (is_published=true);
create policy audio_assets_read
  on public.audio_assets as permissive for select to authenticated
  using (true);

-- The approved connected checkpoint has these legacy provider-fence RPCs
-- closed. V3 calls them as their postgres owner, so its guard must not require
-- reopening service_role access merely to install a still-closed candidate.
revoke execute on function
  public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric),
  public.mark_premium_audio_submitted_v2(uuid)
from service_role;

create table lh_internal.audio_v3_identity_fixture (
  lesson_id uuid primary key,
  module_id uuid not null,
  course_id uuid not null,
  lesson_slug text not null,
  lesson_sequence integer not null,
  learner_track text not null
);

insert into lh_internal.audio_v3_identity_fixture(
  lesson_id,module_id,course_id,lesson_slug,lesson_sequence,learner_track
)
select l.id,m.id,c.id,l.slug,l.sequence,c.learner_track
from public.lessons l
join public.modules m on m.id=l.module_id
join public.courses c on c.id=m.course_id;

create table lh_internal.audio_v3_fixture_guard(
  label text primary key check(label='fictional-audio-v3-source-binding')
);
insert into lh_internal.audio_v3_fixture_guard values('fictional-audio-v3-source-binding');

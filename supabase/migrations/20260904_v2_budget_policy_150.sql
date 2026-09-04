-- Learning Hub V2 budget policy: absolute user-approved ceiling USD 150/month.
-- The application hard-stops variable AI at USD 80, reserving USD 70 for infrastructure and safety buffer.

create table if not exists public.learning_hub_budget_settings (
  id integer primary key check (id = 1),
  absolute_total_budget_usd numeric not null default 150 check (absolute_total_budget_usd > 0),
  infrastructure_reserve_usd numeric not null default 70 check (infrastructure_reserve_usd >= 0),
  ai_hard_cap_usd numeric not null default 80 check (ai_hard_cap_usd > 0),
  professor_cap_usd numeric not null default 55 check (professor_cap_usd > 0),
  premium_audio_cap_usd numeric not null default 15 check (premium_audio_cap_usd > 0),
  updated_at timestamptz not null default now(),
  check (infrastructure_reserve_usd + ai_hard_cap_usd <= absolute_total_budget_usd),
  check (professor_cap_usd <= ai_hard_cap_usd),
  check (premium_audio_cap_usd <= ai_hard_cap_usd)
);

insert into public.learning_hub_budget_settings (
  id, absolute_total_budget_usd, infrastructure_reserve_usd, ai_hard_cap_usd, professor_cap_usd, premium_audio_cap_usd
)
values (1, 150, 70, 80, 55, 15)
on conflict (id) do update set
  absolute_total_budget_usd = excluded.absolute_total_budget_usd,
  infrastructure_reserve_usd = excluded.infrastructure_reserve_usd,
  ai_hard_cap_usd = excluded.ai_hard_cap_usd,
  professor_cap_usd = excluded.professor_cap_usd,
  premium_audio_cap_usd = excluded.premium_audio_cap_usd,
  updated_at = now();

alter table public.learning_hub_budget_settings enable row level security;

alter table public.professor_budget_settings
  add column if not exists premium_reservation_usd numeric not null default 4 check (premium_reservation_usd > 0);

update public.professor_budget_settings
set monthly_budget_usd = 55,
    reservation_usd = 1.5,
    premium_reservation_usd = 4,
    max_session_seconds = 900,
    hard_stop_enabled = true,
    updated_at = now()
where feature = 'professor_livekit';

revoke all on function public.reserve_professor_budget() from public, anon, authenticated;
drop function if exists public.reserve_professor_budget();

create or replace function public.reserve_professor_budget(p_quality_tier text default 'standard')
returns table (
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

  select coalesce(sum(r.reserved_usd), 0)
    into v_reserved_before
    from public.professor_budget_reservations r
   where r.feature = 'professor_livekit'
     and r.month_start = date_trunc('month', now())::date;

  select coalesce(sum(u.estimated_cost_usd), 0)
    into v_logged_ai
    from public.ai_usage_log u
   where u.created_at >= date_trunc('month', now());

  v_global_committed := v_reserved_before + v_logged_ai;

  if v_settings.hard_stop_enabled and (
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

revoke all on function public.reserve_professor_budget(text) from public, anon;
grant execute on function public.reserve_professor_budget(text) to authenticated;

comment on table public.learning_hub_budget_settings is
  'V2 budget policy: USD 150 absolute monthly envelope, USD 70 infrastructure reserve, USD 80 AI hard cap.';
comment on function public.reserve_professor_budget(text) is
  'Fail-closed authenticated Professor reservation. Premium sessions reserve USD 4; standard sessions reserve USD 1.50; all reservations respect Professor and global AI caps.';

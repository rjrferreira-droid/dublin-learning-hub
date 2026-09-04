-- Learning Hub V2 Professor cost guard.
-- V2 DEVELOPMENT ONLY until explicitly promoted after validation.

create table if not exists public.professor_budget_settings (
  feature text primary key check (feature = 'professor_livekit'),
  monthly_budget_usd numeric not null default 10 check (monthly_budget_usd > 0),
  reservation_usd numeric not null default 1 check (reservation_usd > 0),
  max_session_seconds integer not null default 900 check (max_session_seconds between 60 and 1800),
  hard_stop_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.professor_budget_settings (
  feature,
  monthly_budget_usd,
  reservation_usd,
  max_session_seconds,
  hard_stop_enabled
)
values ('professor_livekit', 10, 1, 900, true)
on conflict (feature) do nothing;

create table if not exists public.professor_budget_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null default 'professor_livekit' references public.professor_budget_settings(feature),
  month_start date not null default date_trunc('month', now())::date,
  reserved_usd numeric not null check (reserved_usd > 0),
  max_session_seconds integer not null check (max_session_seconds between 60 and 1800),
  created_at timestamptz not null default now()
);

create index if not exists professor_budget_reservations_month_idx
  on public.professor_budget_reservations (feature, month_start, created_at);

alter table public.professor_budget_settings enable row level security;
alter table public.professor_budget_reservations enable row level security;

-- No direct client write policies. Authenticated learners can reserve budget only
-- through the SECURITY DEFINER function below. The function serializes reservations
-- on the single settings row so concurrent requests cannot oversubscribe the cap.
create or replace function public.reserve_professor_budget()
returns table (
  allowed boolean,
  reservation_id uuid,
  monthly_budget_usd numeric,
  reserved_before_usd numeric,
  reserved_after_usd numeric,
  max_session_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.professor_budget_settings%rowtype;
  v_reserved_before numeric := 0;
  v_reservation_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select *
    into v_settings
    from public.professor_budget_settings
   where feature = 'professor_livekit'
   for update;

  if not found then
    return query select false, null::uuid, 0::numeric, 0::numeric, 0::numeric, 900;
    return;
  end if;

  select coalesce(sum(r.reserved_usd), 0)
    into v_reserved_before
    from public.professor_budget_reservations r
   where r.feature = 'professor_livekit'
     and r.month_start = date_trunc('month', now())::date;

  if v_settings.hard_stop_enabled
     and v_reserved_before + v_settings.reservation_usd > v_settings.monthly_budget_usd then
    return query select
      false,
      null::uuid,
      v_settings.monthly_budget_usd,
      v_reserved_before,
      v_reserved_before,
      v_settings.max_session_seconds;
    return;
  end if;

  insert into public.professor_budget_reservations (
    user_id,
    feature,
    month_start,
    reserved_usd,
    max_session_seconds
  )
  values (
    v_user_id,
    'professor_livekit',
    date_trunc('month', now())::date,
    v_settings.reservation_usd,
    v_settings.max_session_seconds
  )
  returning id into v_reservation_id;

  return query select
    true,
    v_reservation_id,
    v_settings.monthly_budget_usd,
    v_reserved_before,
    v_reserved_before + v_settings.reservation_usd,
    v_settings.max_session_seconds;
end;
$$;

revoke all on function public.reserve_professor_budget() from public;
grant execute on function public.reserve_professor_budget() to authenticated;

comment on table public.professor_budget_settings is
  'Learning Hub V2 Professor spend guard. Defaults: USD 10/month, USD 1 conservative reservation per session, 15-minute maximum session.';

comment on table public.professor_budget_reservations is
  'Conservative Professor budget reservations used to fail closed before LiveKit dispatch.';

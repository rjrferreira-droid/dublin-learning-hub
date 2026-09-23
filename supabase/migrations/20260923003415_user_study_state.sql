-- Account-synced study progress for the isolated Learning Hub V2 Preview.
-- Stores bounded aggregate state only; written answers and provider payloads are excluded.

create table if not exists public.user_study_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  namespace text not null check (namespace ~ '^[a-z0-9][a-z0-9.-]{2,63}$'),
  schema_version smallint not null default 1 check (schema_version between 1 and 10),
  payload jsonb not null default '{}'::jsonb check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 262144
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, namespace)
);

alter table public.user_study_state enable row level security;

revoke all on table public.user_study_state from public, anon, authenticated;
grant select, insert, update on table public.user_study_state to authenticated;

create policy "study_state_select_own"
  on public.user_study_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "study_state_insert_own"
  on public.user_study_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "study_state_update_own"
  on public.user_study_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.user_study_state is
  'Bounded account-owned Learning Hub Preview progress. No written responses or provider payloads.';

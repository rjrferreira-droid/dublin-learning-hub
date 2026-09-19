-- Disposable PostgreSQL fixture for profile-assignment-containment.sql.
-- No connected project, real account, credential or learner data.
do $roles$
begin
  if not exists(select 1 from pg_catalog.pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname='service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$roles$;

create schema extensions authorization postgres;
create extension pgcrypto with schema extensions;
create schema auth authorization postgres;
create schema lh_internal authorization postgres;

create function auth.uid()
returns uuid
language sql
stable
set search_path=pg_catalog
as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;

create table auth.users(
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create table public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  learner_track text not null check(
    learner_track in ('rafael_finance','viviane_payroll','admin')
  ),
  preferred_language text not null default 'pt-BR',
  timezone text not null default 'Europe/Dublin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path=public
as $updated_at$
begin
  new.updated_at = now();
  return new;
end;
$updated_at$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $handle_new_user$
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
$handle_new_user$;

revoke all on function public.handle_new_user()
  from PUBLIC,anon,authenticated,service_role;
grant execute on function public.handle_new_user() to service_role;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
grant all privileges on table public.profiles
  to anon,authenticated,service_role;
grant usage on schema auth,public,extensions to anon,authenticated,service_role;
grant execute on function auth.uid() to authenticated,service_role;

create policy profiles_insert_own
  on public.profiles as permissive for insert to authenticated
  with check(auth.uid()=id);
create policy profiles_select_own
  on public.profiles as permissive for select to authenticated
  using(auth.uid()=id);
create policy profiles_update_own
  on public.profiles as permissive for update to authenticated
  using(auth.uid()=id) with check(auth.uid()=id);

insert into auth.users(id,email,raw_user_meta_data)
values(
  '11111111-1111-4111-8111-111111111111',
  'fictional-finance@example.invalid',
  '{"display_name":"Fictional Finance","learner_track":"rafael_finance"}'
);

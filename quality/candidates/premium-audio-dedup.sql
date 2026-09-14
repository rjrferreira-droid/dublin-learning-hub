-- CANDIDATE ONLY. Not a migration file and not applied to any database.
-- Purpose: prevent concurrent Premium Audio requests from paying for duplicate provider generations.

create table if not exists lh_internal.premium_audio_generation_claims (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content_version integer not null check (content_version >= 1),
  audio_type text not null check (audio_type in ('commentary')),
  claim_token uuid not null,
  claimed_at timestamptz not null default now(),
  lease_until timestamptz not null,
  primary key (lesson_id, content_version, audio_type)
);

revoke all on table lh_internal.premium_audio_generation_claims from public, anon, authenticated;
grant select, insert, update, delete on table lh_internal.premium_audio_generation_claims to service_role;

create or replace function public.claim_premium_audio_generation_v1(
  p_lesson_id uuid,
  p_content_version integer,
  p_audio_type text,
  p_claim_token uuid,
  p_lease_seconds integer default 180
) returns text
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  v_token uuid;
begin
  if p_lesson_id is null or p_claim_token is null or p_content_version < 1
     or p_audio_type <> 'commentary' or p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'invalid_premium_audio_claim';
  end if;

  insert into lh_internal.premium_audio_generation_claims(
    lesson_id,content_version,audio_type,claim_token,claimed_at,lease_until
  ) values (
    p_lesson_id,p_content_version,p_audio_type,p_claim_token,now(),now()+make_interval(secs=>p_lease_seconds)
  )
  on conflict (lesson_id,content_version,audio_type) do update
    set claim_token=excluded.claim_token,
        claimed_at=excluded.claimed_at,
        lease_until=excluded.lease_until
    where lh_internal.premium_audio_generation_claims.lease_until < now()
  returning claim_token into v_token;

  if v_token = p_claim_token then return 'claimed'; end if;

  select claim_token into v_token
    from lh_internal.premium_audio_generation_claims
   where lesson_id=p_lesson_id and content_version=p_content_version and audio_type=p_audio_type;
  return case when v_token=p_claim_token then 'claimed' else 'busy' end;
end;
$$;

revoke all on function public.claim_premium_audio_generation_v1(uuid,integer,text,uuid,integer) from public, anon, authenticated;
grant execute on function public.claim_premium_audio_generation_v1(uuid,integer,text,uuid,integer) to service_role;

create or replace function public.release_premium_audio_generation_v1(
  p_lesson_id uuid,
  p_content_version integer,
  p_audio_type text,
  p_claim_token uuid
) returns boolean
language sql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
  with deleted as (
    delete from lh_internal.premium_audio_generation_claims
     where lesson_id=p_lesson_id
       and content_version=p_content_version
       and audio_type=p_audio_type
       and claim_token=p_claim_token
     returning 1
  ) select exists(select 1 from deleted);
$$;

revoke all on function public.release_premium_audio_generation_v1(uuid,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.release_premium_audio_generation_v1(uuid,integer,text,uuid) to service_role;

-- Current production inspection on 2026-09-14 found zero duplicate (lesson_id,audio_type) groups.
-- A future reviewed migration may therefore also add this uniqueness guard before changing persistence to upsert:
-- create unique index audio_assets_lesson_audio_type_uq on public.audio_assets(lesson_id,audio_type);

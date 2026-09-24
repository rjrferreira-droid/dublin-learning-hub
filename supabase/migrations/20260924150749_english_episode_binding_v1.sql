-- Preview-only: reviewed E1/P1 episode binding. Verify installed v2 ledger and
-- the two exact lesson rows before applying to the isolated Preview database.
-- Additive, source-bound E1/P1 episode cache. It does not update or delete the
-- existing commentary/marin assets or their Storage objects. A new
-- lesson_summary row is inserted only with a complete settled receipt.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $prerequisites$
begin
  if current_user <> 'postgres'
     or to_regclass('lh_internal.premium_audio_attempts') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.lessons') is null
     or to_regclass('public.modules') is null
     or to_regclass('public.courses') is null
     or to_regclass('public.audio_assets') is null
     or to_regclass('public.ai_usage_log') is null
     or to_regclass('public.professor_budget_settings') is null
     or to_regclass('public.learning_hub_budget_settings') is null
     or to_regclass('storage.objects') is null
     or to_regprocedure('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)') is null
     or to_regprocedure('public.mark_premium_audio_submitted_v2(uuid)') is null
     or to_regprocedure('lh_internal.premium_audio_pending_usd()') is null
     or exists (select 1 from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls))
     or not exists (select 1 from pg_roles where rolname='service_role' and rolbypassrls and not rolsuper)
     or to_regclass('lh_internal.english_episode_bindings_v1') is not null
     or to_regprocedure('public.observe_english_episode_cache_v1(uuid,uuid,integer,text,integer,text,jsonb)') is not null
  then raise exception 'english_episode_prerequisites_missing'; end if;

  -- Preview rows published by 20260924143000, never inferred from a local UI
  -- sequence (which alternates E1 and P1 as 1/2 instead of DB 101/102).
  if (select count(*) from public.lessons l
      join public.modules m on m.id=l.module_id
      join public.courses c on c.id=m.course_id
      where (l.id,l.slug,l.sequence,l.content_version) in (
        ('e1100000-2026-4e11-8e01-000000000001'::uuid,
          'preview-deep-story-past-forms-rhythm-follow-up',101,2),
        ('e2100000-2026-4e21-8e03-000000000003'::uuid,
          'preview-deep-clarify-check-understanding-handle-meetings',102,2)
      ) and c.learner_track='english_academy'
        and c.is_active and m.is_published and l.is_published) <> 2
  then raise exception 'english_episode_preview_identity_drift'; end if;

  if exists (select 1 from public.ai_usage_log
       where request_id like 'english-episode-v1:%'
       group by request_id having count(*)>1)
     or exists (select 1 from public.audio_assets
       group by storage_path having count(*)>1)
  then raise exception 'english_episode_existing_receipt_drift'; end if;
end
$prerequisites$;

create function lh_internal.english_episode_identity_valid_v1(p_identity jsonb)
returns boolean language sql immutable security invoker set search_path=pg_catalog as $$
  select coalesce(case when jsonb_typeof(p_identity)='object' then
    (select count(*)=8 from jsonb_object_keys(p_identity))
    and p_identity ?& array['lessonId','moduleId','courseId','lessonSlug',
      'contentVersion','requestedTrack','studyTrack','sequence']
    and jsonb_typeof(p_identity->'moduleId')='string'
    and (p_identity->>'moduleId') ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(p_identity->'courseId')='string'
    and (p_identity->>'courseId') ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and p_identity->'contentVersion'=to_jsonb(2)
    and p_identity->>'requestedTrack'='english_academy'
    and p_identity->>'studyTrack'='english'
    and (
      (p_identity->>'lessonId'='e1100000-2026-4e11-8e01-000000000001'
       and p_identity->>'lessonSlug'='preview-deep-story-past-forms-rhythm-follow-up'
       and p_identity->'sequence'=to_jsonb(101))
      or (p_identity->>'lessonId'='e2100000-2026-4e21-8e03-000000000003'
       and p_identity->>'lessonSlug'='preview-deep-clarify-check-understanding-handle-meetings'
       and p_identity->'sequence'=to_jsonb(102))
    )
  else false end,false)
$$;
revoke all on function lh_internal.english_episode_identity_valid_v1(jsonb)
  from PUBLIC, anon, authenticated, service_role;

-- Paid generation is closed by default and never toggled by the learner API.
-- A reviewed Preview SQL operation may enable one Rafael user for at most 30
-- minutes; expiry is checked again at the one-shot provider fence.
create table lh_internal.english_episode_generation_settings_v1 (
  id integer primary key check(id=1),
  enabled boolean not null default false,
  generator_user_id uuid references public.profiles(id) on delete restrict,
  enabled_at timestamptz,
  expires_at timestamptz,
  max_total_cost_usd numeric check(max_total_cost_usd is null or (
    max_total_cost_usd between 0.10 and 5
    and max_total_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and max_total_cost_usd=round(max_total_cost_usd,6))),
  check (
    (not enabled and generator_user_id is null and enabled_at is null
      and expires_at is null and max_total_cost_usd is null)
    or (enabled and generator_user_id is not null and enabled_at is not null
      and expires_at is not null and max_total_cost_usd is not null
      and expires_at>enabled_at
      and expires_at<=enabled_at+interval '30 minutes')
  )
);
insert into lh_internal.english_episode_generation_settings_v1(id) values (1);
alter table lh_internal.english_episode_generation_settings_v1 enable row level security;
revoke all on table lh_internal.english_episode_generation_settings_v1
  from PUBLIC, anon, authenticated, service_role;

create function lh_internal.english_episode_gate_open_v1(p_user_id uuid)
returns boolean language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $$
declare gate lh_internal.english_episode_generation_settings_v1%rowtype;
begin
  select * into gate from lh_internal.english_episode_generation_settings_v1
    where id=1 for share;
  if gate.id is null or not gate.enabled or p_user_id is null
     or gate.generator_user_id is distinct from p_user_id
     or gate.enabled_at is null or gate.expires_at is null
     or gate.max_total_cost_usd is null
     or clock_timestamp()<gate.enabled_at or clock_timestamp()>=gate.expires_at
  then return false; end if;
  return exists(select 1 from public.profiles p
                where p.id=p_user_id and p.learner_track='rafael_finance');
end $$;
revoke all on function lh_internal.english_episode_gate_open_v1(uuid)
  from PUBLIC, anon, authenticated, service_role;

create function public.english_episode_generation_allowed_v1(p_user_id uuid)
returns boolean language sql security definer
set search_path=pg_catalog,public,lh_internal as $$
  select lh_internal.english_episode_gate_open_v1(p_user_id)
$$;
revoke all on function public.english_episode_generation_allowed_v1(uuid)
  from PUBLIC, anon, authenticated, service_role;
grant execute on function public.english_episode_generation_allowed_v1(uuid)
  to service_role;

-- Every cancelled attempt stays as audit evidence. Only the settled row can
-- be served; no existing commentary row is adopted or updated.
create table lh_internal.english_episode_bindings_v1 (
  attempt_id uuid primary key references lh_internal.premium_audio_attempts(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  content_version integer not null check(content_version=2),
  lesson_identity jsonb not null check (
    lh_internal.english_episode_identity_valid_v1(lesson_identity)
    and lesson_identity->>'lessonId'=lesson_id::text
    and lesson_identity->'contentVersion'=to_jsonb(content_version)
  ),
  reserved_usd numeric not null check(
    reserved_usd between 0.10 and 10
    and reserved_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and reserved_usd=round(reserved_usd,6)
  ),
  source_fingerprint text not null check(source_fingerprint ~ '^[0-9a-f]{64}$'),
  render_revision integer not null check(render_revision=1),
  storage_path text not null check(
    storage_path='lessons/' || lesson_id::text || '/episode-v' ||
      content_version::text || '-' || source_fingerprint || '-r1.mp3'
  ),
  transcript text,
  media_sha256 text check(media_sha256 is null or media_sha256 ~ '^[0-9a-f]{64}$'),
  asset_id uuid unique references public.audio_assets(id) on delete restrict,
  receipt_request_id text unique check(
    receipt_request_id is null or receipt_request_id='english-episode-v1:' || attempt_id::text
  ),
  estimated_cost_usd numeric check(
    estimated_cost_usd is null or (
      estimated_cost_usd>=0 and estimated_cost_usd<=reserved_usd
      and estimated_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
      and estimated_cost_usd=round(estimated_cost_usd,6)
    )
  ),
  characters integer check(characters is null or characters between 1 and 20000),
  created_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz,
  check (
    (transcript is null and media_sha256 is null and asset_id is null and receipt_request_id is null
      and estimated_cost_usd is null and characters is null and settled_at is null)
    or
    (transcript is not null and media_sha256 is not null and asset_id is not null and receipt_request_id is not null
      and estimated_cost_usd is not null and characters is not null and settled_at is not null
      and char_length(transcript)=characters)
  )
);
alter table lh_internal.english_episode_bindings_v1 enable row level security;
revoke all on table lh_internal.english_episode_bindings_v1
  from PUBLIC, anon, authenticated, service_role;
create index english_episode_bindings_lesson_v1
  on lh_internal.english_episode_bindings_v1(lesson_id,created_at);
create unique index english_episode_settled_lesson_v1
  on lh_internal.english_episode_bindings_v1(lesson_id) where settled_at is not null;
create unique index english_episode_settled_path_v1
  on lh_internal.english_episode_bindings_v1(storage_path) where settled_at is not null;
create unique index english_episode_usage_receipt_v1
  on public.ai_usage_log(request_id) where request_id like 'english-episode-v1:%';

-- The existing commentary row is untouched. lesson_summary is free only on
-- these two reviewed lessons; a pre-existing row is a conflict, not an asset
-- to adopt. A future new episode revision needs an explicit migration review.
create function lh_internal.lock_english_episode_identity_v1(
  p_user_id uuid,p_lesson_id uuid,p_lesson_identity jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $$
declare current_identity jsonb;
begin
  if not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
  then return null; end if;
  -- Fixed order after budget rows: profile -> course -> module -> lesson.
  perform 1 from public.profiles where id=p_user_id for share;
  if not found then return null; end if;
  perform 1 from public.courses where id=(p_lesson_identity->>'courseId')::uuid for share;
  if not found then return null; end if;
  perform 1 from public.modules where id=(p_lesson_identity->>'moduleId')::uuid for share;
  if not found then return null; end if;
  perform 1 from public.lessons where id=p_lesson_id for share;
  if not found then return null; end if;
  select jsonb_build_object(
    'lessonId',l.id::text,'moduleId',m.id::text,'courseId',c.id::text,
    'lessonSlug',l.slug,'contentVersion',l.content_version,
    'requestedTrack',c.learner_track,'studyTrack','english','sequence',l.sequence
  ) into current_identity
  from public.profiles p
  join public.courses c on c.id=(p_lesson_identity->>'courseId')::uuid
  join public.modules m on m.id=(p_lesson_identity->>'moduleId')::uuid and m.course_id=c.id
  join public.lessons l on l.id=p_lesson_id and l.module_id=m.id
  where p.id=p_user_id and p.learner_track in ('rafael_finance','viviane_payroll')
    and c.learner_track='english_academy' and c.is_active and m.is_published and l.is_published;
  if current_identity is distinct from p_lesson_identity then return null; end if;
  return current_identity;
end $$;
revoke all on function lh_internal.lock_english_episode_identity_v1(uuid,uuid,jsonb)
  from PUBLIC, anon, authenticated, service_role;

create function lh_internal.inspect_english_episode_cache_v1(
  p_lesson_id uuid,p_content_version integer,p_source_fingerprint text,
  p_render_revision integer,p_storage_path text,p_lesson_identity jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare b lh_internal.english_episode_bindings_v1%rowtype;
        a lh_internal.premium_audio_attempts%rowtype;
        u public.ai_usage_log%rowtype;
        asset public.audio_assets%rowtype;
begin
  select * into b from lh_internal.english_episode_bindings_v1
    where lesson_id=p_lesson_id and settled_at is not null;
  if b.attempt_id is not null then
    select * into a from lh_internal.premium_audio_attempts where id=b.attempt_id;
    select * into u from public.ai_usage_log where request_id=b.receipt_request_id;
    select * into asset from public.audio_assets where id=b.asset_id;
    if b.content_version is distinct from p_content_version
       or b.lesson_identity is distinct from p_lesson_identity
       or b.source_fingerprint is distinct from p_source_fingerprint
       or b.render_revision is distinct from p_render_revision
       or b.storage_path is distinct from p_storage_path
       or a.id is null or a.state<>'settled'
       or a.user_id is distinct from b.user_id
       or a.lesson_id is distinct from b.lesson_id
       or a.content_version is distinct from b.content_version
       or a.reserved_usd is distinct from b.reserved_usd
       or a.estimated_cost_usd is distinct from b.estimated_cost_usd
       or a.characters is distinct from b.characters
       or a.settled_at is null or a.submitted_at is null
       or u.id is null or u.request_id is distinct from b.receipt_request_id
       or u.feature is distinct from 'lesson_audio'
       or u.model is distinct from 'gpt-4o-mini-tts'
       or u.user_id is distinct from b.user_id
       or u.characters is distinct from b.characters::bigint
       or u.estimated_cost_usd is distinct from b.estimated_cost_usd
       or asset.id is null or asset.lesson_id is distinct from b.lesson_id
       or asset.audio_type is distinct from 'lesson_summary'
       or asset.storage_path is distinct from b.storage_path
       or asset.generation_request_id is distinct from b.receipt_request_id
       or asset.estimated_cost_usd is distinct from b.estimated_cost_usd
       or asset.transcript_pt is distinct from b.transcript
       or asset.voice is distinct from 'multi-voice-v1'
       or not exists(select 1 from storage.objects o
                     where o.bucket_id='lesson-audio' and o.name=b.storage_path)
    then return jsonb_build_object('status','reconciliation_required'); end if;
    return jsonb_build_object('status','hit','attemptId',b.attempt_id,
      'storagePath',b.storage_path);
  end if;

  -- Orphaned object or metadata is never adopted; a later retry cannot spend
  -- again or overwrite the object to make it look like a valid cache hit.
  if exists(select 1 from storage.objects o
            where o.bucket_id='lesson-audio'
              and o.name like 'lessons/' || p_lesson_id::text || '/episode-v%')
     or exists(select 1 from public.audio_assets aa
               where aa.storage_path=p_storage_path
                  or (aa.lesson_id=p_lesson_id and aa.audio_type='lesson_summary'))
     or exists(select 1 from lh_internal.english_episode_bindings_v1 eb
               where eb.lesson_id=p_lesson_id and eb.settled_at is null
                 and (eb.source_fingerprint is distinct from p_source_fingerprint
                   or eb.lesson_identity is distinct from p_lesson_identity
                   or eb.storage_path is distinct from p_storage_path)
                 and exists(select 1 from lh_internal.premium_audio_attempts pa
                            where pa.id=eb.attempt_id and pa.state<>'cancelled'))
     or exists(select 1 from lh_internal.english_episode_bindings_v1 eb
               join lh_internal.premium_audio_attempts pa on pa.id=eb.attempt_id
               where eb.lesson_id=p_lesson_id and pa.state in ('uncertain','settled'))
  then return jsonb_build_object('status','reconciliation_required'); end if;
  if exists(select 1 from lh_internal.premium_audio_attempts pa
            join lh_internal.english_episode_bindings_v1 eb on eb.attempt_id=pa.id
            where eb.lesson_id=p_lesson_id
              and (pa.state='submitted' or (pa.state='reserved' and pa.lease_until>clock_timestamp())))
  then return jsonb_build_object('status','in_progress'); end if;
  return jsonb_build_object('status','miss');
end $$;
revoke all on function lh_internal.inspect_english_episode_cache_v1(uuid,integer,text,integer,text,jsonb)
  from PUBLIC, anon, authenticated, service_role;

create function public.observe_english_episode_cache_v1(
  p_user_id uuid,p_lesson_id uuid,p_content_version integer,
  p_source_fingerprint text,p_render_revision integer,p_storage_path text,
  p_lesson_identity jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
begin
  if p_user_id is null or p_lesson_id is null or p_content_version is distinct from 2
     or not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
     or p_lesson_identity->'contentVersion' is distinct from to_jsonb(p_content_version)
     or p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1
     or p_storage_path is distinct from 'lessons/' || p_lesson_id::text ||
       '/episode-v2-' || p_source_fingerprint || '-r1.mp3'
  then raise exception 'invalid_english_episode_identity'; end if;
  perform 1 from public.professor_budget_settings
    where feature='professor_livekit' for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  if lh_internal.lock_english_episode_identity_v1(p_user_id,p_lesson_id,p_lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  return lh_internal.inspect_english_episode_cache_v1(
    p_lesson_id,p_content_version,p_source_fingerprint,p_render_revision,
    p_storage_path,p_lesson_identity);
end $$;

create function public.begin_english_episode_attempt_v1(
  p_attempt_id uuid,p_user_id uuid,p_lesson_id uuid,p_content_version integer,
  p_reservation_usd numeric,p_source_fingerprint text,p_render_revision integer,
  p_storage_path text,p_lesson_identity jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare b lh_internal.english_episode_bindings_v1%rowtype;
        cache_state jsonb; admitted jsonb;
begin
  if p_attempt_id is null or p_user_id is null or p_lesson_id is null
     or p_content_version is distinct from 2
     or p_reservation_usd is null or p_reservation_usd < 0.10 or p_reservation_usd > 10
     or p_reservation_usd in ('NaN'::numeric,'Infinity'::numeric)
     or p_reservation_usd<>round(p_reservation_usd,6)
     or not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
     or p_lesson_identity->'contentVersion' is distinct from to_jsonb(p_content_version)
     or p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1
     or p_storage_path is distinct from 'lessons/' || p_lesson_id::text ||
       '/episode-v2-' || p_source_fingerprint || '-r1.mp3'
  then raise exception 'invalid_english_episode_attempt'; end if;

  perform 1 from public.professor_budget_settings
    where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  if lh_internal.lock_english_episode_identity_v1(p_user_id,p_lesson_id,p_lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  if not lh_internal.english_episode_gate_open_v1(p_user_id)
  then return jsonb_build_object('allowed',false,'reason','english_episode_generation_closed'); end if;

  select * into b from lh_internal.english_episode_bindings_v1
  where attempt_id=p_attempt_id for update;
  if b.attempt_id is not null then
    if b.user_id is distinct from p_user_id or b.lesson_id is distinct from p_lesson_id
       or b.content_version is distinct from p_content_version
       or b.reserved_usd is distinct from p_reservation_usd
       or b.source_fingerprint is distinct from p_source_fingerprint
       or b.render_revision is distinct from p_render_revision
       or b.storage_path is distinct from p_storage_path
       or b.lesson_identity is distinct from p_lesson_identity
    then raise exception 'english_episode_attempt_conflict'; end if;
    return jsonb_build_object('allowed',false,'reason','audio_attempt_replayed');
  end if;
  if exists(select 1 from lh_internal.premium_audio_attempts where id=p_attempt_id)
  then raise exception 'english_episode_attempt_conflict'; end if;
  -- Historical v2 expiry sweeps must never cancel rows with provider evidence.
  if exists(select 1 from lh_internal.premium_audio_attempts
            where state in ('reserved','cancelled') and
              (submitted_at is not null or settled_at is not null
               or estimated_cost_usd is not null or characters is not null))
  then return jsonb_build_object('allowed',false,'reason','audio_reconciliation_required'); end if;

  cache_state:=lh_internal.inspect_english_episode_cache_v1(
    p_lesson_id,p_content_version,p_source_fingerprint,p_render_revision,
    p_storage_path,p_lesson_identity);
  if cache_state->>'status'<>'miss' then
    return jsonb_build_object('allowed',false,'reason',case cache_state->>'status'
      when 'hit' then 'audio_cached' when 'in_progress' then 'audio_generation_in_progress'
      else 'audio_reconciliation_required' end);
  end if;
  -- v2 admission shares hard-cap locks and pending exposure with Professor and
  -- all Premium Audio paths. This wrapper never bypasses a failed admission.
  admitted:=public.begin_premium_audio_attempt_v2(
    p_attempt_id,p_user_id,p_lesson_id,p_content_version,p_reservation_usd);
  if admitted->>'allowed'='true' then
    insert into lh_internal.english_episode_bindings_v1(
      attempt_id,user_id,lesson_id,content_version,lesson_identity,reserved_usd,
      source_fingerprint,render_revision,storage_path
    ) values (p_attempt_id,p_user_id,p_lesson_id,p_content_version,p_lesson_identity,
      p_reservation_usd,p_source_fingerprint,p_render_revision,p_storage_path);
  end if;
  return admitted;
end $$;

create function public.mark_english_episode_submitted_v1(
  p_attempt_id uuid,p_source_fingerprint text,p_render_revision integer,p_storage_path text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $$
declare a lh_internal.premium_audio_attempts%rowtype;
        b lh_internal.english_episode_bindings_v1%rowtype;
begin
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  select * into a from lh_internal.premium_audio_attempts where id=p_attempt_id for update;
  select * into b from lh_internal.english_episode_bindings_v1 where attempt_id=p_attempt_id for update;
  if a.id is null or b.attempt_id is null then raise exception 'english_episode_attempt_missing'; end if;
  if a.user_id is distinct from b.user_id or a.lesson_id is distinct from b.lesson_id
     or a.content_version is distinct from b.content_version or a.reserved_usd is distinct from b.reserved_usd
     or b.source_fingerprint is distinct from p_source_fingerprint
     or b.render_revision is distinct from p_render_revision
     or b.storage_path is distinct from p_storage_path
  then raise exception 'english_episode_attempt_conflict'; end if;
  if a.state<>'reserved' or a.submitted_at is not null
     or a.estimated_cost_usd is not null or a.characters is not null
  then return jsonb_build_object('allowed',false,'reason','audio_submission_replayed'); end if;
  if lh_internal.lock_english_episode_identity_v1(a.user_id,a.lesson_id,b.lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  if not lh_internal.english_episode_gate_open_v1(a.user_id)
  then return jsonb_build_object('allowed',false,'reason','english_episode_generation_closed'); end if;
  if not public.mark_premium_audio_submitted_v2(p_attempt_id)
  then return jsonb_build_object('allowed',false,'reason','audio_submission_unavailable'); end if;
  return jsonb_build_object('allowed',true,'state','submitted');
end $$;

create function public.close_english_episode_attempt_v1(
  p_attempt_id uuid,p_source_fingerprint text,p_render_revision integer,p_storage_path text
) returns text language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $$
declare a lh_internal.premium_audio_attempts%rowtype;
        b lh_internal.english_episode_bindings_v1%rowtype;
        result text;
begin
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  select * into a from lh_internal.premium_audio_attempts where id=p_attempt_id for update;
  select * into b from lh_internal.english_episode_bindings_v1 where attempt_id=p_attempt_id for update;
  if a.id is null or b.attempt_id is null then raise exception 'english_episode_attempt_missing'; end if;
  if a.user_id is distinct from b.user_id or a.lesson_id is distinct from b.lesson_id
     or b.source_fingerprint is distinct from p_source_fingerprint
     or b.render_revision is distinct from p_render_revision
     or b.storage_path is distinct from p_storage_path
  then raise exception 'english_episode_attempt_conflict'; end if;
  update lh_internal.premium_audio_attempts set state=case
    when state='reserved' and submitted_at is null and settled_at is null
      and estimated_cost_usd is null and characters is null then 'cancelled'
    when state='reserved' or state='submitted' then 'uncertain'
    else state end
  where id=p_attempt_id returning state into result;
  return result;
end $$;

create function public.settle_english_episode_attempt_v1(
  p_attempt_id uuid,p_source_fingerprint text,p_render_revision integer,
  p_storage_path text,p_estimated_cost_usd numeric,p_characters integer,
  p_transcript text,p_media_sha256 text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare a lh_internal.premium_audio_attempts%rowtype;
        b lh_internal.english_episode_bindings_v1%rowtype;
        receipt_id text;
        new_asset_id uuid;
begin
  if p_attempt_id is null or p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1 or p_storage_path is null
     or p_estimated_cost_usd is null or p_estimated_cost_usd<0 or p_estimated_cost_usd>10
     or p_estimated_cost_usd in ('NaN'::numeric,'Infinity'::numeric)
     or p_estimated_cost_usd<>round(p_estimated_cost_usd,6)
     or p_characters is null or p_characters<1 or p_characters>20000
     or p_transcript is null or char_length(p_transcript) is distinct from p_characters
     or p_media_sha256 is null or p_media_sha256 !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid_english_episode_receipt'; end if;

  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  select * into a from lh_internal.premium_audio_attempts where id=p_attempt_id for update;
  select * into b from lh_internal.english_episode_bindings_v1 where attempt_id=p_attempt_id for update;
  if a.id is null or b.attempt_id is null then raise exception 'english_episode_attempt_missing'; end if;
  if a.user_id is distinct from b.user_id or a.lesson_id is distinct from b.lesson_id
     or a.content_version is distinct from b.content_version or a.reserved_usd is distinct from b.reserved_usd
     or b.source_fingerprint is distinct from p_source_fingerprint
     or b.render_revision is distinct from p_render_revision
     or b.storage_path is distinct from p_storage_path
     or p_estimated_cost_usd>b.reserved_usd
  then raise exception 'english_episode_attempt_conflict'; end if;
  receipt_id:='english-episode-v1:' || p_attempt_id::text;
  if a.state='settled' then
    if a.estimated_cost_usd is distinct from p_estimated_cost_usd
       or a.characters is distinct from p_characters
       or a.submitted_at is null or a.settled_at is null
       or b.transcript is distinct from p_transcript
       or b.media_sha256 is distinct from p_media_sha256
       or b.receipt_request_id is distinct from receipt_id
       or b.asset_id is null or b.settled_at is null
       or not exists(select 1 from public.audio_assets aa
                     where aa.id=b.asset_id and aa.lesson_id=b.lesson_id
                       and aa.audio_type='lesson_summary' and aa.storage_path=b.storage_path
                       and aa.voice='multi-voice-v1' and aa.transcript_pt=p_transcript
                       and aa.generation_request_id=receipt_id
                       and aa.estimated_cost_usd=p_estimated_cost_usd)
       or not exists(select 1 from public.ai_usage_log u
                     where u.request_id=receipt_id and u.user_id=b.user_id
                       and u.feature='lesson_audio' and u.model='gpt-4o-mini-tts'
                       and u.estimated_cost_usd=p_estimated_cost_usd and u.characters=p_characters)
       or not exists(select 1 from storage.objects o
                     where o.bucket_id='lesson-audio' and o.name=b.storage_path)
    then raise exception 'english_episode_reconciliation_required'; end if;
    return jsonb_build_object('settled',true,'state','settled','receiptRequestId',receipt_id);
  end if;
  if a.state not in ('submitted','uncertain') or a.submitted_at is null
     or a.settled_at is not null or b.settled_at is not null
     or b.transcript is not null or b.receipt_request_id is not null or b.asset_id is not null
     or exists(select 1 from public.ai_usage_log u where u.request_id=receipt_id)
     or exists(select 1 from public.audio_assets aa
               where aa.storage_path=b.storage_path
                  or (aa.lesson_id=b.lesson_id and aa.audio_type='lesson_summary'))
     or not exists(select 1 from storage.objects o
                   where o.bucket_id='lesson-audio' and o.name=b.storage_path)
  then raise exception 'english_episode_reconciliation_required'; end if;
  if exists(select 1 from lh_internal.english_episode_bindings_v1 old
            where old.lesson_id=b.lesson_id and old.settled_at is not null)
  then raise exception 'english_episode_reconciliation_required'; end if;
  -- Asset, receipt, source binding and release of the shared budget hold commit
  -- atomically. Any exception rolls everything back; no upsert is used.
  insert into public.audio_assets(
    lesson_id,audio_type,storage_path,transcript_pt,voice,generated_at,
    generation_request_id,estimated_cost_usd
  ) values (b.lesson_id,'lesson_summary',b.storage_path,p_transcript,
    'multi-voice-v1',clock_timestamp(),receipt_id,p_estimated_cost_usd)
  returning id into new_asset_id;
  insert into public.ai_usage_log(
    user_id,feature,model,estimated_cost_usd,characters,request_id,created_at
  ) values (b.user_id,'lesson_audio','gpt-4o-mini-tts',
    p_estimated_cost_usd,p_characters,receipt_id,clock_timestamp());
  update lh_internal.premium_audio_attempts set state='settled',
    estimated_cost_usd=p_estimated_cost_usd,characters=p_characters,
    settled_at=clock_timestamp() where id=p_attempt_id;
  update lh_internal.english_episode_bindings_v1 set
    transcript=p_transcript,media_sha256=p_media_sha256,
    asset_id=new_asset_id,
    receipt_request_id=receipt_id,estimated_cost_usd=p_estimated_cost_usd,
    characters=p_characters,settled_at=clock_timestamp()
  where attempt_id=p_attempt_id;
  return jsonb_build_object('settled',true,'state','settled','receiptRequestId',receipt_id);
end $$;

revoke all on function
  public.observe_english_episode_cache_v1(uuid,uuid,integer,text,integer,text,jsonb),
  public.begin_english_episode_attempt_v1(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb),
  public.mark_english_episode_submitted_v1(uuid,text,integer,text),
  public.close_english_episode_attempt_v1(uuid,text,integer,text),
  public.settle_english_episode_attempt_v1(uuid,text,integer,text,numeric,integer,text,text)
from PUBLIC, anon, authenticated, service_role;
grant execute on function
  public.observe_english_episode_cache_v1(uuid,uuid,integer,text,integer,text,jsonb),
  public.begin_english_episode_attempt_v1(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb),
  public.mark_english_episode_submitted_v1(uuid,text,integer,text),
  public.close_english_episode_attempt_v1(uuid,text,integer,text),
  public.settle_english_episode_attempt_v1(uuid,text,integer,text,numeric,integer,text,text)
to service_role;
commit;

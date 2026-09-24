-- Preview-only durable staging for E1/P1. Deploy together with the prior
-- default-closed binding migration, before enabling generation. The old
-- one-shot paid RPCs are withdrawn; legacy commentary remains untouched.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

do $guard$
begin
  if current_user<>'postgres'
     or to_regclass('lh_internal.english_episode_bindings_v1') is null
     or to_regclass('lh_internal.english_episode_generation_settings_v1') is null
     or to_regprocedure('public.english_episode_generation_allowed_v1(uuid)') is null
     or to_regprocedure('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)') is null
     or to_regprocedure('public.mark_premium_audio_submitted_v2(uuid)') is null
     or to_regclass('lh_internal.english_episode_jobs_v1') is not null
  then raise exception 'english_episode_cue_prerequisites_missing'; end if;
  if exists(select 1 from lh_internal.english_episode_bindings_v1)
     or exists(select 1 from public.audio_assets
               where lesson_id in ('e1100000-2026-4e11-8e01-000000000001'::uuid,
                  'e2100000-2026-4e21-8e03-000000000003'::uuid)
                 and audio_type='lesson_summary')
  then raise exception 'english_episode_one_shot_reconciliation_required'; end if;
end $guard$;

revoke all on function
  public.begin_english_episode_attempt_v1(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb),
  public.mark_english_episode_submitted_v1(uuid,text,integer,text),
  public.close_english_episode_attempt_v1(uuid,text,integer,text),
  public.settle_english_episode_attempt_v1(uuid,text,integer,text,numeric,integer,text,text)
from PUBLIC, anon, authenticated, service_role;

create function lh_internal.english_episode_plan_valid_v1(
  p_plan jsonb,p_lesson_id uuid,p_episode_fingerprint text
) returns boolean language plpgsql immutable security invoker
set search_path=pg_catalog as $$
declare item jsonb; previous_index integer:=-1; idx integer; fp text;
begin
  if jsonb_typeof(p_plan) is distinct from 'array'
     or jsonb_array_length(p_plan) not between 1 and 64
     or p_episode_fingerprint is null or p_episode_fingerprint !~ '^[0-9a-f]{64}$'
  then return false; end if;
  for item in select value from jsonb_array_elements(p_plan) loop
    if jsonb_typeof(item) is distinct from 'object'
       or (select count(*) from jsonb_object_keys(item))<>4
       or not (item ?& array['cueIndex','cueFingerprint','cuePath','characters'])
       or jsonb_typeof(item->'cueIndex') is distinct from 'number'
       or (item->>'cueIndex') !~ '^(0|[1-9][0-9]{0,2})$'
       or jsonb_typeof(item->'cueFingerprint') is distinct from 'string'
       or (item->>'cueFingerprint') !~ '^[0-9a-f]{64}$'
       or jsonb_typeof(item->'cuePath') is distinct from 'string'
       or jsonb_typeof(item->'characters') is distinct from 'number'
       or (item->>'characters') !~ '^[1-9][0-9]{0,3}$'
    then return false; end if;
    idx:=(item->>'cueIndex')::integer;fp:=item->>'cueFingerprint';
    if idx<=previous_index or idx>127 or (item->>'characters')::integer>4096
       or item->>'cuePath' is distinct from
         'lessons/'||p_lesson_id::text||'/episode-v2-'||p_episode_fingerprint||
         '-r1/cue-'||idx::text||'-'||fp||'.mp3'
    then return false; end if;
    previous_index:=idx;
  end loop;
  return true;
exception when others then return false;
end $$;
revoke all on function lh_internal.english_episode_plan_valid_v1(jsonb,uuid,text)
from PUBLIC,anon,authenticated,service_role;

create table lh_internal.english_episode_jobs_v1 (
  job_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete restrict,
  lesson_id uuid not null unique references public.lessons(id) on delete restrict,
  content_version integer not null check(content_version=2),
  lesson_identity jsonb not null check(
    lh_internal.english_episode_identity_valid_v1(lesson_identity)
    and lesson_identity->>'lessonId'=lesson_id::text
    and lesson_identity->'contentVersion'=to_jsonb(content_version)),
  source_fingerprint text not null check(source_fingerprint ~ '^[0-9a-f]{64}$'),
  render_revision integer not null check(render_revision=1),
  storage_path text not null unique check(storage_path=
    'lessons/'||lesson_id::text||'/episode-v2-'||source_fingerprint||'-r1.mp3'),
  transcript text not null check(char_length(transcript) between 1 and 20000),
  cue_plan jsonb not null check(
    lh_internal.english_episode_plan_valid_v1(cue_plan,lesson_id,source_fingerprint)),
  state text not null default 'staging' check(state in ('staging','settled')),
  media_sha256 text check(media_sha256 is null or media_sha256 ~ '^[0-9a-f]{64}$'),
  asset_id uuid unique references public.audio_assets(id) on delete restrict,
  receipt_request_id text unique check(receipt_request_id is null or
    receipt_request_id='english-episode-v1:'||job_id::text),
  created_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz,
  check((state='staging' and media_sha256 is null and asset_id is null
         and receipt_request_id is null and settled_at is null)
     or (state='settled' and media_sha256 is not null and asset_id is not null
         and receipt_request_id is not null and settled_at is not null))
);
alter table lh_internal.english_episode_jobs_v1 enable row level security;
revoke all on table lh_internal.english_episode_jobs_v1
  from PUBLIC,anon,authenticated,service_role;
create index english_episode_jobs_user_idx on lh_internal.english_episode_jobs_v1(user_id);

create table lh_internal.english_episode_cues_v1 (
  attempt_id uuid primary key references lh_internal.premium_audio_attempts(id) on delete restrict,
  job_id uuid not null references lh_internal.english_episode_jobs_v1(job_id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  cue_index integer not null check(cue_index between 0 and 127),
  cue_fingerprint text not null check(cue_fingerprint ~ '^[0-9a-f]{64}$'),
  storage_path text not null,
  reserved_usd numeric not null check(reserved_usd between 0.10 and 10
    and reserved_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and reserved_usd=round(reserved_usd,6)),
  media_sha256 text check(media_sha256 is null or media_sha256 ~ '^[0-9a-f]{64}$'),
  receipt_request_id text unique check(receipt_request_id is null or
    receipt_request_id='english-episode-cue-v1:'||attempt_id::text),
  estimated_cost_usd numeric check(estimated_cost_usd is null or
    (estimated_cost_usd between 0 and reserved_usd
      and estimated_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
      and estimated_cost_usd=round(estimated_cost_usd,6))),
  characters integer check(characters is null or characters between 1 and 4096),
  created_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz,
  check((media_sha256 is null and receipt_request_id is null
        and estimated_cost_usd is null and characters is null and settled_at is null)
    or (media_sha256 is not null and receipt_request_id is not null
        and estimated_cost_usd is not null and characters is not null and settled_at is not null))
);
alter table lh_internal.english_episode_cues_v1 enable row level security;
revoke all on table lh_internal.english_episode_cues_v1
  from PUBLIC,anon,authenticated,service_role;
create index english_episode_cues_job_idx on lh_internal.english_episode_cues_v1(job_id,cue_index);
create index english_episode_cues_user_idx on lh_internal.english_episode_cues_v1(user_id);
create index english_episode_cues_lesson_idx on lh_internal.english_episode_cues_v1(lesson_id);
create unique index english_episode_cue_settled_index_uq
  on lh_internal.english_episode_cues_v1(job_id,cue_index) where settled_at is not null;
create unique index english_episode_cue_settled_path_uq
  on lh_internal.english_episode_cues_v1(storage_path) where settled_at is not null;
create unique index english_episode_cue_usage_receipt_uq on public.ai_usage_log(request_id)
  where request_id like 'english-episode-cue-v1:%';

create function lh_internal.english_episode_plan_cue_v1(
  p_plan jsonb,p_cue_index integer
) returns jsonb language sql immutable security invoker set search_path=pg_catalog as $$
  select value from jsonb_array_elements(p_plan)
  where value->'cueIndex'=to_jsonb(p_cue_index)
$$;
revoke all on function lh_internal.english_episode_plan_cue_v1(jsonb,integer)
  from PUBLIC,anon,authenticated,service_role;

create function public.start_english_episode_job_v1(
  p_job_id uuid,p_user_id uuid,p_lesson_id uuid,p_content_version integer,
  p_source_fingerprint text,p_render_revision integer,p_storage_path text,
  p_lesson_identity jsonb,p_transcript text,p_cue_plan jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare existing lh_internal.english_episode_jobs_v1%rowtype;
begin
  if p_job_id is null or p_user_id is null or p_lesson_id is null
     or p_content_version is distinct from 2 or p_render_revision is distinct from 1
     or p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_storage_path is distinct from 'lessons/'||p_lesson_id::text||
       '/episode-v2-'||p_source_fingerprint||'-r1.mp3'
     or not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
     or p_transcript is null or char_length(p_transcript) not between 1 and 20000
     or not lh_internal.english_episode_plan_valid_v1(p_cue_plan,p_lesson_id,p_source_fingerprint)
  then raise exception 'invalid_english_episode_job'; end if;
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  if lh_internal.lock_english_episode_identity_v1(p_user_id,p_lesson_id,p_lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  if not lh_internal.english_episode_gate_open_v1(p_user_id)
  then return jsonb_build_object('allowed',false,'reason','english_episode_generation_closed'); end if;
  select * into existing from lh_internal.english_episode_jobs_v1
  where lesson_id=p_lesson_id for update;
  if existing.job_id is not null then
    if existing.job_id is distinct from p_job_id or existing.user_id is distinct from p_user_id
       or existing.content_version is distinct from p_content_version
       or existing.source_fingerprint is distinct from p_source_fingerprint
       or existing.render_revision is distinct from p_render_revision
       or existing.storage_path is distinct from p_storage_path
       or existing.lesson_identity is distinct from p_lesson_identity
       or existing.transcript is distinct from p_transcript
       or existing.cue_plan is distinct from p_cue_plan
    then raise exception 'english_episode_job_conflict'; end if;
    return jsonb_build_object('allowed',true,'state',existing.state,'jobId',existing.job_id);
  end if;
  if exists(select 1 from public.audio_assets aa where
       aa.lesson_id=p_lesson_id and aa.audio_type='lesson_summary')
     or exists(select 1 from storage.objects o where o.bucket_id='lesson-audio'
       and o.name like 'lessons/'||p_lesson_id::text||'/episode-v%')
     or exists(select 1 from lh_internal.premium_audio_attempts pa
       where pa.lesson_id=p_lesson_id and pa.state in ('reserved','submitted','uncertain'))
  then raise exception 'english_episode_reconciliation_required'; end if;
  insert into lh_internal.english_episode_jobs_v1(
    job_id,user_id,lesson_id,content_version,lesson_identity,source_fingerprint,
    render_revision,storage_path,transcript,cue_plan
  ) values (p_job_id,p_user_id,p_lesson_id,p_content_version,p_lesson_identity,
    p_source_fingerprint,p_render_revision,p_storage_path,p_transcript,p_cue_plan);
  return jsonb_build_object('allowed',true,'state','staging','jobId',p_job_id);
end $$;

create function public.observe_english_episode_cue_v1(
  p_user_id uuid,p_lesson_id uuid,p_source_fingerprint text,p_cue_index integer,
  p_cue_fingerprint text,p_storage_path text,p_lesson_identity jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare job lh_internal.english_episode_jobs_v1%rowtype;
        plan_cue jsonb; cue lh_internal.english_episode_cues_v1%rowtype;
        attempt lh_internal.premium_audio_attempts%rowtype;
        usage_row public.ai_usage_log%rowtype;
begin
  if p_user_id is null or p_lesson_id is null
     or p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_cue_index is null or p_cue_index not between 0 and 127
     or p_cue_fingerprint is null or p_cue_fingerprint !~ '^[0-9a-f]{64}$'
     or p_storage_path is distinct from 'lessons/'||p_lesson_id::text||
       '/episode-v2-'||p_source_fingerprint||'-r1/cue-'||p_cue_index::text||
       '-'||p_cue_fingerprint||'.mp3'
     or not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
  then raise exception 'invalid_english_episode_cue'; end if;
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  if lh_internal.lock_english_episode_identity_v1(p_user_id,p_lesson_id,p_lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  select * into job from lh_internal.english_episode_jobs_v1 where lesson_id=p_lesson_id;
  if job.job_id is null or job.user_id is distinct from p_user_id
     or job.lesson_identity is distinct from p_lesson_identity
     or job.source_fingerprint is distinct from p_source_fingerprint
     or job.state not in ('staging','settled')
  then return jsonb_build_object('status','reconciliation_required'); end if;
  plan_cue:=lh_internal.english_episode_plan_cue_v1(job.cue_plan,p_cue_index);
  if plan_cue is null or plan_cue->>'cueFingerprint' is distinct from p_cue_fingerprint
     or plan_cue->>'cuePath' is distinct from p_storage_path
  then return jsonb_build_object('status','reconciliation_required'); end if;

  select * into cue from lh_internal.english_episode_cues_v1
  where job_id=job.job_id and cue_index=p_cue_index and settled_at is not null;
  if cue.attempt_id is not null then
    select * into attempt from lh_internal.premium_audio_attempts where id=cue.attempt_id;
    select * into usage_row from public.ai_usage_log where request_id=cue.receipt_request_id;
    if cue.cue_fingerprint is distinct from p_cue_fingerprint
       or cue.storage_path is distinct from p_storage_path
       or cue.user_id is distinct from job.user_id
       or cue.lesson_id is distinct from job.lesson_id
       or cue.characters is distinct from (plan_cue->>'characters')::integer
       or attempt.id is null or attempt.state<>'settled'
       or attempt.user_id is distinct from cue.user_id
       or attempt.lesson_id is distinct from cue.lesson_id
       or attempt.estimated_cost_usd is distinct from cue.estimated_cost_usd
       or attempt.characters is distinct from cue.characters
       or attempt.submitted_at is null or attempt.settled_at is null
       or cue.media_sha256 is null
       or usage_row.id is null or usage_row.feature is distinct from 'lesson_audio'
       or usage_row.model is distinct from 'gpt-4o-mini-tts'
       or usage_row.user_id is distinct from cue.user_id
       or usage_row.estimated_cost_usd is distinct from cue.estimated_cost_usd
       or usage_row.characters is distinct from cue.characters::bigint
       or not exists(select 1 from storage.objects o
                     where o.bucket_id='lesson-audio' and o.name=cue.storage_path)
    then return jsonb_build_object('status','reconciliation_required'); end if;
    return jsonb_build_object('status','hit','attemptId',cue.attempt_id,
      'storagePath',cue.storage_path,'mediaSha256',cue.media_sha256);
  end if;
  if exists(select 1 from storage.objects o
            where o.bucket_id='lesson-audio' and o.name=p_storage_path)
     or exists(select 1 from lh_internal.english_episode_cues_v1 c
               join lh_internal.premium_audio_attempts a on a.id=c.attempt_id
               where c.job_id=job.job_id and c.cue_index=p_cue_index
                 and (c.cue_fingerprint is distinct from p_cue_fingerprint
                   or c.storage_path is distinct from p_storage_path
                   or a.state in ('uncertain','settled')))
  then return jsonb_build_object('status','reconciliation_required'); end if;
  if exists(select 1 from lh_internal.english_episode_cues_v1 c
            join lh_internal.premium_audio_attempts a on a.id=c.attempt_id
            where c.job_id=job.job_id and c.cue_index=p_cue_index
              and (a.state='submitted' or
                   (a.state='reserved' and a.lease_until>clock_timestamp())))
  then return jsonb_build_object('status','in_progress'); end if;
  return jsonb_build_object('status','miss');
end $$;

create function public.begin_english_episode_cue_v1(
  p_attempt_id uuid,p_user_id uuid,p_lesson_id uuid,p_reservation_usd numeric,
  p_source_fingerprint text,p_cue_index integer,p_cue_fingerprint text,
  p_storage_path text,p_lesson_identity jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare job lh_internal.english_episode_jobs_v1%rowtype;
        previous lh_internal.english_episode_cues_v1%rowtype;
        gate lh_internal.english_episode_generation_settings_v1%rowtype;
        committed_usd numeric; pending_usd numeric;
        observation jsonb; admitted jsonb;
begin
  if p_attempt_id is null or p_user_id is null or p_lesson_id is null
     or p_reservation_usd is null or p_reservation_usd<0.10 or p_reservation_usd>10
     or p_reservation_usd in ('NaN'::numeric,'Infinity'::numeric)
     or p_reservation_usd<>round(p_reservation_usd,6)
     or p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_cue_index is null or p_cue_index not between 0 and 127
     or p_cue_fingerprint is null or p_cue_fingerprint !~ '^[0-9a-f]{64}$'
     or p_storage_path is distinct from 'lessons/'||p_lesson_id::text||
       '/episode-v2-'||p_source_fingerprint||'-r1/cue-'||p_cue_index::text||
       '-'||p_cue_fingerprint||'.mp3'
     or not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
  then raise exception 'invalid_english_episode_cue'; end if;
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  if lh_internal.lock_english_episode_identity_v1(p_user_id,p_lesson_id,p_lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  if not lh_internal.english_episode_gate_open_v1(p_user_id)
  then return jsonb_build_object('allowed',false,'reason','english_episode_generation_closed'); end if;
  select * into job from lh_internal.english_episode_jobs_v1 where lesson_id=p_lesson_id for update;
  if job.job_id is null or job.state<>'staging'
     or job.user_id is distinct from p_user_id
     or job.lesson_identity is distinct from p_lesson_identity
     or job.source_fingerprint is distinct from p_source_fingerprint
     or (lh_internal.english_episode_plan_cue_v1(job.cue_plan,p_cue_index)->>'cueFingerprint')
        is distinct from p_cue_fingerprint
     or (lh_internal.english_episode_plan_cue_v1(job.cue_plan,p_cue_index)->>'cuePath')
        is distinct from p_storage_path
  then raise exception 'english_episode_job_conflict'; end if;
  select * into previous from lh_internal.english_episode_cues_v1
    where attempt_id=p_attempt_id for update;
  if previous.attempt_id is not null then
    if previous.job_id is distinct from job.job_id
       or previous.user_id is distinct from p_user_id
       or previous.lesson_id is distinct from p_lesson_id
       or previous.cue_index is distinct from p_cue_index
       or previous.cue_fingerprint is distinct from p_cue_fingerprint
       or previous.storage_path is distinct from p_storage_path
       or previous.reserved_usd is distinct from p_reservation_usd
    then raise exception 'english_episode_attempt_conflict'; end if;
    return jsonb_build_object('allowed',false,'reason','audio_attempt_replayed');
  end if;
  if exists(select 1 from lh_internal.premium_audio_attempts where id=p_attempt_id)
  then raise exception 'english_episode_attempt_conflict'; end if;
  if exists(select 1 from lh_internal.premium_audio_attempts
            where state in ('reserved','cancelled') and
              (submitted_at is not null or settled_at is not null
               or estimated_cost_usd is not null or characters is not null))
  then return jsonb_build_object('allowed',false,'reason','audio_reconciliation_required'); end if;
  observation:=public.observe_english_episode_cue_v1(p_user_id,p_lesson_id,
    p_source_fingerprint,p_cue_index,p_cue_fingerprint,p_storage_path,p_lesson_identity);
  if observation->>'status'<>'miss' then
    return jsonb_build_object('allowed',false,'reason',case observation->>'status'
      when 'hit' then 'audio_cached' when 'in_progress' then 'audio_generation_in_progress'
      else 'audio_reconciliation_required' end);
  end if;
  -- The common budget lock serializes all cue admissions. A narrow activation
  -- limit covers settled speech receipts in this activation, plus every
  -- outstanding English cue hold (including an earlier uncertain attempt).
  -- The final zero-cost composition receipt is intentionally excluded.
  select * into gate from lh_internal.english_episode_generation_settings_v1
    where id=1 for share;
  if gate.id is null or not gate.enabled or gate.generator_user_id is distinct from p_user_id
     or gate.max_total_cost_usd is null or gate.enabled_at is null
     or clock_timestamp()<gate.enabled_at or clock_timestamp()>=gate.expires_at
  then return jsonb_build_object('allowed',false,'reason','english_episode_generation_closed'); end if;
  select coalesce(sum(u.estimated_cost_usd),0) into committed_usd
  from lh_internal.english_episode_cues_v1 c
  join public.ai_usage_log u on u.request_id=c.receipt_request_id
  where c.user_id=p_user_id and u.created_at>=gate.enabled_at
    and c.settled_at is not null and u.feature='lesson_audio'
    and u.model='gpt-4o-mini-tts';
  select coalesce(sum(a.reserved_usd),0) into pending_usd
  from lh_internal.english_episode_cues_v1 c
  join lh_internal.premium_audio_attempts a on a.id=c.attempt_id
  where c.user_id=p_user_id and c.settled_at is null
    and a.state in ('reserved','submitted','uncertain');
  if committed_usd+pending_usd+p_reservation_usd>gate.max_total_cost_usd
  then return jsonb_build_object('allowed',false,'reason','english_episode_activation_cap_reached'); end if;
  admitted:=public.begin_premium_audio_attempt_v2(
    p_attempt_id,p_user_id,p_lesson_id,job.content_version,p_reservation_usd);
  if admitted->>'allowed'='true' then
    insert into lh_internal.english_episode_cues_v1(
      attempt_id,job_id,user_id,lesson_id,cue_index,cue_fingerprint,storage_path,reserved_usd
    ) values (p_attempt_id,job.job_id,p_user_id,p_lesson_id,p_cue_index,
      p_cue_fingerprint,p_storage_path,p_reservation_usd);
  end if;
  return admitted;
end $$;

create function public.mark_english_episode_cue_submitted_v1(
  p_attempt_id uuid,p_source_fingerprint text,p_cue_index integer,
  p_cue_fingerprint text,p_storage_path text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $$
declare attempt lh_internal.premium_audio_attempts%rowtype;
        cue lh_internal.english_episode_cues_v1%rowtype;
        job lh_internal.english_episode_jobs_v1%rowtype;
begin
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  select * into attempt from lh_internal.premium_audio_attempts where id=p_attempt_id for update;
  select * into cue from lh_internal.english_episode_cues_v1 where attempt_id=p_attempt_id for update;
  if attempt.id is null or cue.attempt_id is null then raise exception 'english_episode_attempt_missing'; end if;
  select * into job from lh_internal.english_episode_jobs_v1 where job_id=cue.job_id for share;
  if job.job_id is null or job.state<>'staging'
     or job.source_fingerprint is distinct from p_source_fingerprint
     or cue.cue_index is distinct from p_cue_index
     or cue.cue_fingerprint is distinct from p_cue_fingerprint
     or cue.storage_path is distinct from p_storage_path
     or attempt.user_id is distinct from cue.user_id
     or attempt.lesson_id is distinct from cue.lesson_id
     or attempt.reserved_usd is distinct from cue.reserved_usd
  then raise exception 'english_episode_attempt_conflict'; end if;
  if attempt.state<>'reserved' or attempt.submitted_at is not null
     or attempt.settled_at is not null or cue.settled_at is not null
  then return jsonb_build_object('allowed',false,'reason','audio_submission_replayed'); end if;
  if lh_internal.lock_english_episode_identity_v1(cue.user_id,cue.lesson_id,job.lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  if not lh_internal.english_episode_gate_open_v1(cue.user_id)
  then return jsonb_build_object('allowed',false,'reason','english_episode_generation_closed'); end if;
  if not public.mark_premium_audio_submitted_v2(p_attempt_id)
  then return jsonb_build_object('allowed',false,'reason','audio_submission_unavailable'); end if;
  return jsonb_build_object('allowed',true,'state','submitted');
end $$;

create function public.close_english_episode_cue_attempt_v1(
  p_attempt_id uuid,p_source_fingerprint text,p_cue_index integer,
  p_cue_fingerprint text,p_storage_path text
) returns text language plpgsql security definer
set search_path=pg_catalog,public,lh_internal as $$
declare attempt lh_internal.premium_audio_attempts%rowtype;
        cue lh_internal.english_episode_cues_v1%rowtype;
        job lh_internal.english_episode_jobs_v1%rowtype;
        result text;
begin
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  select * into attempt from lh_internal.premium_audio_attempts where id=p_attempt_id for update;
  select * into cue from lh_internal.english_episode_cues_v1 where attempt_id=p_attempt_id for update;
  if attempt.id is null or cue.attempt_id is null then raise exception 'english_episode_attempt_missing'; end if;
  select * into job from lh_internal.english_episode_jobs_v1 where job_id=cue.job_id;
  if job.source_fingerprint is distinct from p_source_fingerprint
     or cue.cue_index is distinct from p_cue_index
     or cue.cue_fingerprint is distinct from p_cue_fingerprint
     or cue.storage_path is distinct from p_storage_path
  then raise exception 'english_episode_attempt_conflict'; end if;
  update lh_internal.premium_audio_attempts set state=case
    when state='reserved' and submitted_at is null and settled_at is null
      and estimated_cost_usd is null and characters is null then 'cancelled'
    when state='reserved' or state='submitted' then 'uncertain'
    else state end
  where id=p_attempt_id returning state into result;
  return result;
end $$;

create function public.settle_english_episode_cue_v1(
  p_attempt_id uuid,p_source_fingerprint text,p_cue_index integer,
  p_cue_fingerprint text,p_storage_path text,p_estimated_cost_usd numeric,
  p_characters integer,p_media_sha256 text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare attempt lh_internal.premium_audio_attempts%rowtype;
        cue lh_internal.english_episode_cues_v1%rowtype;
        job lh_internal.english_episode_jobs_v1%rowtype;
        planned jsonb; receipt_id text;
begin
  if p_attempt_id is null or p_source_fingerprint is null
     or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_cue_index is null or p_cue_fingerprint is null
     or p_cue_fingerprint !~ '^[0-9a-f]{64}$' or p_storage_path is null
     or p_estimated_cost_usd is null or p_estimated_cost_usd<0 or p_estimated_cost_usd>10
     or p_estimated_cost_usd in ('NaN'::numeric,'Infinity'::numeric)
     or p_estimated_cost_usd<>round(p_estimated_cost_usd,6)
     or p_characters is null or p_characters not between 1 and 4096
     or p_media_sha256 is null or p_media_sha256 !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid_english_episode_cue_receipt'; end if;
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  select * into attempt from lh_internal.premium_audio_attempts where id=p_attempt_id for update;
  select * into cue from lh_internal.english_episode_cues_v1 where attempt_id=p_attempt_id for update;
  if attempt.id is null or cue.attempt_id is null then raise exception 'english_episode_attempt_missing'; end if;
  select * into job from lh_internal.english_episode_jobs_v1 where job_id=cue.job_id for share;
  planned:=lh_internal.english_episode_plan_cue_v1(job.cue_plan,p_cue_index);
  if job.job_id is null or job.source_fingerprint is distinct from p_source_fingerprint
     or cue.user_id is distinct from attempt.user_id
     or cue.lesson_id is distinct from attempt.lesson_id
     or cue.reserved_usd is distinct from attempt.reserved_usd
     or cue.cue_index is distinct from p_cue_index
     or cue.cue_fingerprint is distinct from p_cue_fingerprint
     or cue.storage_path is distinct from p_storage_path
     or planned->>'cueFingerprint' is distinct from p_cue_fingerprint
     or planned->>'cuePath' is distinct from p_storage_path
     or (planned->>'characters')::integer is distinct from p_characters
     or p_estimated_cost_usd>cue.reserved_usd
  then raise exception 'english_episode_attempt_conflict'; end if;
  receipt_id:='english-episode-cue-v1:'||p_attempt_id::text;
  if attempt.state='settled' then
    if attempt.estimated_cost_usd is distinct from p_estimated_cost_usd
       or attempt.characters is distinct from p_characters
       or cue.estimated_cost_usd is distinct from p_estimated_cost_usd
       or cue.media_sha256 is distinct from p_media_sha256
       or cue.receipt_request_id is distinct from receipt_id
       or cue.settled_at is null
       or not exists(select 1 from public.ai_usage_log u
         where u.request_id=receipt_id and u.feature='lesson_audio'
           and u.model='gpt-4o-mini-tts' and u.user_id=cue.user_id
           and u.estimated_cost_usd=p_estimated_cost_usd and u.characters=p_characters)
       or not exists(select 1 from storage.objects o
         where o.bucket_id='lesson-audio' and o.name=cue.storage_path)
    then raise exception 'english_episode_reconciliation_required'; end if;
    return jsonb_build_object('settled',true,'state','settled','receiptRequestId',receipt_id);
  end if;
  if attempt.state not in ('submitted','uncertain') or attempt.submitted_at is null
     or attempt.settled_at is not null or cue.settled_at is not null
     or cue.receipt_request_id is not null or cue.media_sha256 is not null
     or exists(select 1 from public.ai_usage_log u where u.request_id=receipt_id)
     or not exists(select 1 from storage.objects o
       where o.bucket_id='lesson-audio' and o.name=cue.storage_path)
  then raise exception 'english_episode_reconciliation_required'; end if;
  if exists(select 1 from lh_internal.english_episode_cues_v1 old
    where old.job_id=cue.job_id and old.cue_index=cue.cue_index and old.settled_at is not null)
  then raise exception 'english_episode_reconciliation_required'; end if;
  insert into public.ai_usage_log(user_id,feature,model,estimated_cost_usd,
    characters,request_id,created_at)
  values (cue.user_id,'lesson_audio','gpt-4o-mini-tts',p_estimated_cost_usd,
    p_characters,receipt_id,clock_timestamp());
  update lh_internal.premium_audio_attempts set state='settled',
    estimated_cost_usd=p_estimated_cost_usd,characters=p_characters,
    settled_at=clock_timestamp() where id=p_attempt_id;
  update lh_internal.english_episode_cues_v1 set media_sha256=p_media_sha256,
    receipt_request_id=receipt_id,estimated_cost_usd=p_estimated_cost_usd,
    characters=p_characters,settled_at=clock_timestamp() where attempt_id=p_attempt_id;
  return jsonb_build_object('settled',true,'state','settled','receiptRequestId',receipt_id);
end $$;

create function lh_internal.english_episode_plan_complete_v1(p_job_id uuid)
returns boolean language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare job lh_internal.english_episode_jobs_v1%rowtype;
        planned jsonb; cue lh_internal.english_episode_cues_v1%rowtype;
        attempt lh_internal.premium_audio_attempts%rowtype;
        usage_row public.ai_usage_log%rowtype;
begin
  select * into job from lh_internal.english_episode_jobs_v1 where job_id=p_job_id;
  if job.job_id is null then return false; end if;
  for planned in select value from jsonb_array_elements(job.cue_plan) loop
    select * into cue from lh_internal.english_episode_cues_v1
      where job_id=p_job_id and cue_index=(planned->>'cueIndex')::integer
        and settled_at is not null;
    if cue.attempt_id is null or cue.user_id is distinct from job.user_id
       or cue.lesson_id is distinct from job.lesson_id
       or cue.cue_fingerprint is distinct from planned->>'cueFingerprint'
       or cue.storage_path is distinct from planned->>'cuePath'
       or cue.characters is distinct from (planned->>'characters')::integer
       or cue.media_sha256 is null
       or cue.receipt_request_id is distinct from
          'english-episode-cue-v1:'||cue.attempt_id::text
    then return false; end if;
    select * into attempt from lh_internal.premium_audio_attempts where id=cue.attempt_id;
    select * into usage_row from public.ai_usage_log where request_id=cue.receipt_request_id;
    if attempt.id is null or attempt.state<>'settled'
       or attempt.user_id is distinct from cue.user_id
       or attempt.lesson_id is distinct from cue.lesson_id
       or attempt.estimated_cost_usd is distinct from cue.estimated_cost_usd
       or attempt.characters is distinct from cue.characters
       or attempt.submitted_at is null or attempt.settled_at is null
       or usage_row.id is null or usage_row.feature is distinct from 'lesson_audio'
       or usage_row.model is distinct from 'gpt-4o-mini-tts'
       or usage_row.user_id is distinct from cue.user_id
       or usage_row.estimated_cost_usd is distinct from cue.estimated_cost_usd
       or usage_row.characters is distinct from cue.characters::bigint
       or not exists(select 1 from storage.objects o
         where o.bucket_id='lesson-audio' and o.name=cue.storage_path)
    then return false; end if;
  end loop;
  return (select count(*) from lh_internal.english_episode_cues_v1
            where job_id=p_job_id and settled_at is not null)=jsonb_array_length(job.cue_plan);
end $$;
revoke all on function lh_internal.english_episode_plan_complete_v1(uuid)
  from PUBLIC,anon,authenticated,service_role;

create function public.finalize_english_episode_v1(
  p_user_id uuid,p_lesson_id uuid,p_source_fingerprint text,p_storage_path text,
  p_lesson_identity jsonb,p_transcript text,p_media_sha256 text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare job lh_internal.english_episode_jobs_v1%rowtype;
        new_asset_id uuid; receipt_id text;
begin
  if p_user_id is null or p_lesson_id is null or p_source_fingerprint is null
     or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_storage_path is distinct from 'lessons/'||p_lesson_id::text||
       '/episode-v2-'||p_source_fingerprint||'-r1.mp3'
     or not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
     or p_transcript is null or char_length(p_transcript) not between 1 and 20000
     or p_media_sha256 is null or p_media_sha256 !~ '^[0-9a-f]{64}$'
  then raise exception 'invalid_english_episode_finalization'; end if;
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  if lh_internal.lock_english_episode_identity_v1(p_user_id,p_lesson_id,p_lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  select * into job from lh_internal.english_episode_jobs_v1 where lesson_id=p_lesson_id for update;
  if job.job_id is null or job.user_id is distinct from p_user_id
     or job.source_fingerprint is distinct from p_source_fingerprint
     or job.storage_path is distinct from p_storage_path
     or job.lesson_identity is distinct from p_lesson_identity
     or job.transcript is distinct from p_transcript
  then raise exception 'english_episode_job_conflict'; end if;
  receipt_id:='english-episode-v1:'||job.job_id::text;
  if not lh_internal.english_episode_plan_complete_v1(job.job_id)
  then raise exception 'english_episode_cues_incomplete'; end if;
  if not exists(select 1 from storage.objects o
                where o.bucket_id='lesson-audio' and o.name=job.storage_path)
  then raise exception 'english_episode_final_object_missing'; end if;
  if job.state='settled' then
    if job.media_sha256 is distinct from p_media_sha256
       or job.asset_id is null or job.receipt_request_id is distinct from receipt_id
       or job.settled_at is null
       or not exists(select 1 from public.audio_assets aa
         where aa.id=job.asset_id and aa.lesson_id=job.lesson_id
           and aa.audio_type='lesson_summary' and aa.storage_path=job.storage_path
           and aa.transcript_pt=job.transcript and aa.voice='multi-voice-v1'
           and aa.generation_request_id=receipt_id and aa.estimated_cost_usd=0)
       or not exists(select 1 from public.ai_usage_log u
         where u.request_id=receipt_id and u.feature='lesson_audio'
           and u.model='mp3-cue-composer-v1' and u.estimated_cost_usd=0
           and u.characters=0 and u.user_id=job.user_id)
    then raise exception 'english_episode_reconciliation_required'; end if;
    return jsonb_build_object('settled',true,'state','settled','receiptRequestId',receipt_id);
  end if;
  if exists(select 1 from public.audio_assets aa
            where aa.lesson_id=job.lesson_id and aa.audio_type='lesson_summary'
               or aa.storage_path=job.storage_path)
     or exists(select 1 from public.ai_usage_log u where u.request_id=receipt_id)
  then raise exception 'english_episode_reconciliation_required'; end if;
  -- The composition receipt is zero-cost. Individual speech receipts already
  -- carry the paid estimated cost/characters and must not be counted twice.
  insert into public.audio_assets(lesson_id,audio_type,storage_path,
    transcript_pt,voice,generated_at,generation_request_id,estimated_cost_usd)
  values(job.lesson_id,'lesson_summary',job.storage_path,job.transcript,
    'multi-voice-v1',clock_timestamp(),receipt_id,0)
  returning id into new_asset_id;
  insert into public.ai_usage_log(user_id,feature,model,estimated_cost_usd,
    characters,request_id,created_at)
  values(job.user_id,'lesson_audio','mp3-cue-composer-v1',0,0,receipt_id,clock_timestamp());
  update lh_internal.english_episode_jobs_v1 set state='settled',
    media_sha256=p_media_sha256,asset_id=new_asset_id,
    receipt_request_id=receipt_id,settled_at=clock_timestamp()
  where job_id=job.job_id;
  return jsonb_build_object('settled',true,'state','settled','receiptRequestId',receipt_id);
end $$;

create or replace function public.observe_english_episode_cache_v1(
  p_user_id uuid,p_lesson_id uuid,p_content_version integer,
  p_source_fingerprint text,p_render_revision integer,p_storage_path text,
  p_lesson_identity jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,lh_internal,storage as $$
declare job lh_internal.english_episode_jobs_v1%rowtype;
        asset public.audio_assets%rowtype;
        receipt public.ai_usage_log%rowtype;
begin
  if p_user_id is null or p_lesson_id is null or p_content_version is distinct from 2
     or p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1
     or p_storage_path is distinct from 'lessons/'||p_lesson_id::text||
       '/episode-v2-'||p_source_fingerprint||'-r1.mp3'
     or not lh_internal.english_episode_identity_valid_v1(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
  then raise exception 'invalid_english_episode_identity'; end if;
  perform 1 from public.professor_budget_settings where feature='professor_livekit' for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings where id=1 for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  if lh_internal.lock_english_episode_identity_v1(p_user_id,p_lesson_id,p_lesson_identity) is null
  then raise exception 'english_episode_source_changed'; end if;
  select * into job from lh_internal.english_episode_jobs_v1 where lesson_id=p_lesson_id;
  if job.job_id is null then
    if exists(select 1 from public.audio_assets aa
      where aa.lesson_id=p_lesson_id and aa.audio_type='lesson_summary')
       or exists(select 1 from storage.objects o where o.bucket_id='lesson-audio'
         and o.name like 'lessons/'||p_lesson_id::text||'/episode-v%')
    then return jsonb_build_object('status','reconciliation_required'); end if;
    return jsonb_build_object('status','miss');
  end if;
  if job.user_id is distinct from p_user_id
     or job.lesson_identity is distinct from p_lesson_identity
     or job.source_fingerprint is distinct from p_source_fingerprint
     or job.render_revision is distinct from p_render_revision
     or job.storage_path is distinct from p_storage_path
  then return jsonb_build_object('status','reconciliation_required'); end if;
  if job.state='staging' then
    if exists(select 1 from public.audio_assets aa
      where aa.lesson_id=p_lesson_id and aa.audio_type='lesson_summary')
    then return jsonb_build_object('status','reconciliation_required'); end if;
    -- A final object uploaded before a lost finalize response is resumable:
    -- ordinary playback remains a miss, while explicit finalization must
    -- download it and compare bytes with freshly composed settled cues.
    return jsonb_build_object('status','miss');
  end if;
  select * into asset from public.audio_assets where id=job.asset_id;
  select * into receipt from public.ai_usage_log where request_id=job.receipt_request_id;
  if not lh_internal.english_episode_plan_complete_v1(job.job_id)
     or job.media_sha256 is null or job.settled_at is null
     or job.receipt_request_id is distinct from 'english-episode-v1:'||job.job_id::text
     or asset.id is null or asset.lesson_id is distinct from job.lesson_id
     or asset.audio_type is distinct from 'lesson_summary'
     or asset.storage_path is distinct from job.storage_path
     or asset.generation_request_id is distinct from job.receipt_request_id
     or asset.transcript_pt is distinct from job.transcript
     or asset.voice is distinct from 'multi-voice-v1'
     or asset.estimated_cost_usd is distinct from 0::numeric
     or receipt.id is null or receipt.request_id is distinct from job.receipt_request_id
     or receipt.feature is distinct from 'lesson_audio'
     or receipt.model is distinct from 'mp3-cue-composer-v1'
     or receipt.user_id is distinct from job.user_id
     or receipt.estimated_cost_usd is distinct from 0::numeric
     or receipt.characters is distinct from 0::bigint
     or not exists(select 1 from storage.objects o
       where o.bucket_id='lesson-audio' and o.name=job.storage_path)
  then return jsonb_build_object('status','reconciliation_required'); end if;
  return jsonb_build_object('status','hit','attemptId',job.job_id,
    'storagePath',job.storage_path);
end $$;

revoke all on function
  public.start_english_episode_job_v1(uuid,uuid,uuid,integer,text,integer,text,jsonb,text,jsonb),
  public.observe_english_episode_cue_v1(uuid,uuid,text,integer,text,text,jsonb),
  public.begin_english_episode_cue_v1(uuid,uuid,uuid,numeric,text,integer,text,text,jsonb),
  public.mark_english_episode_cue_submitted_v1(uuid,text,integer,text,text),
  public.close_english_episode_cue_attempt_v1(uuid,text,integer,text,text),
  public.settle_english_episode_cue_v1(uuid,text,integer,text,text,numeric,integer,text),
  public.finalize_english_episode_v1(uuid,uuid,text,text,jsonb,text,text)
from PUBLIC,anon,authenticated,service_role;
grant execute on function
  public.start_english_episode_job_v1(uuid,uuid,uuid,integer,text,integer,text,jsonb,text,jsonb),
  public.observe_english_episode_cue_v1(uuid,uuid,text,integer,text,text,jsonb),
  public.begin_english_episode_cue_v1(uuid,uuid,uuid,numeric,text,integer,text,text,jsonb),
  public.mark_english_episode_cue_submitted_v1(uuid,text,integer,text,text),
  public.close_english_episode_cue_attempt_v1(uuid,text,integer,text,text),
  public.settle_english_episode_cue_v1(uuid,text,integer,text,text,numeric,integer,text),
  public.finalize_english_episode_v1(uuid,uuid,text,text,jsonb,text,text)
to service_role;

-- The one-shot package was never enabled: its gate was closed by default and
-- the prerequisite guard requires an empty table. Remove dead paid entrypoints
-- so future service code cannot accidentally revive a whole-episode call.
drop function public.begin_english_episode_attempt_v1(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb);
drop function public.mark_english_episode_submitted_v1(uuid,text,integer,text);
drop function public.close_english_episode_attempt_v1(uuid,text,integer,text);
drop function public.settle_english_episode_attempt_v1(uuid,text,integer,text,numeric,integer,text,text);
drop function lh_internal.inspect_english_episode_cache_v1(uuid,integer,text,integer,text,jsonb);
drop table lh_internal.english_episode_bindings_v1;
commit;

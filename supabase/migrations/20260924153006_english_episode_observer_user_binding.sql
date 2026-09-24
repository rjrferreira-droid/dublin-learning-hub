-- Preview-only observer tightening after the durable cue migration.
-- Both observers are service_role-only and retain their existing signatures.
-- No paid generation or Storage mutation occurs in this migration.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$
begin
  if current_user<>'postgres'
     or to_regprocedure('public.observe_english_episode_cue_v1(uuid,uuid,text,integer,text,text,jsonb)') is null
     or to_regprocedure('public.observe_english_episode_cache_v1(uuid,uuid,integer,text,integer,text,jsonb)') is null
  then raise exception 'english_episode_observer_prerequisites_missing'; end if;
end $guard$;

create or replace function public.observe_english_episode_cue_v1(
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
  public.observe_english_episode_cue_v1(uuid,uuid,text,integer,text,text,jsonb),
  public.observe_english_episode_cache_v1(uuid,uuid,integer,text,integer,text,jsonb)
from PUBLIC,anon,authenticated,service_role;
grant execute on function
  public.observe_english_episode_cue_v1(uuid,uuid,text,integer,text,text,jsonb),
  public.observe_english_episode_cache_v1(uuid,uuid,integer,text,integer,text,jsonb)
to service_role;
commit;

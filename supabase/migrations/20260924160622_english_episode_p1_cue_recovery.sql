-- Preview-only, one-time recovery for P1 cue 14 after Edge memory exhaustion.
-- Keep the provider outcome uncertain and its full reservation in every budget.
-- A second provider call is possible only for this exact cue, through the
-- existing authenticated operator flow and its separately timed cost gate.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

do $guard$
declare j lh_internal.english_episode_jobs_v1%rowtype;
        c lh_internal.english_episode_cues_v1%rowtype;
        a lh_internal.premium_audio_attempts%rowtype;
begin
 if current_user<>'postgres' or
    to_regclass('lh_internal.english_episode_cue_retries_v1') is not null
 then raise exception 'p1_cue_recovery_prerequisites_missing'; end if;
 if exists(select 1 from lh_internal.english_episode_generation_settings_v1 where enabled)
 then raise exception 'p1_cue_recovery_gate_must_be_closed'; end if;
 select * into j from lh_internal.english_episode_jobs_v1
 where lesson_id='e2100000-2026-4e21-8e03-000000000003'::uuid for update;
 select * into c from lh_internal.english_episode_cues_v1
 where attempt_id='9e0902a4-b4f7-4deb-a317-93e2fc6952ab'::uuid for update;
 select * into a from lh_internal.premium_audio_attempts where id=c.attempt_id for update;
 if j.job_id is distinct from '94088ee4-4de2-5fec-b30c-3314cb1cee3d'::uuid
    or j.state<>'staging' or j.asset_id is not null
    or j.source_fingerprint<>'95dedb93f384f667c257268af228467427a1b8504d0fb1d0946cb2fe6f8e5c6a'
    or c.job_id is distinct from j.job_id or c.cue_index<>14
    or c.cue_fingerprint<>'cee6cd3773aade98e0613a69923d5f988b7b9417edfd871abcf844d1b052ed54'
    or c.settled_at is not null or c.receipt_request_id is not null
    or a.state<>'submitted' or a.reserved_usd<>0.3428
    or (select count(*) from lh_internal.english_episode_cues_v1 x
        where x.job_id=j.job_id and x.settled_at is not null)<>13
    or exists(select 1 from storage.objects o
        where o.bucket_id='lesson-audio' and o.name=c.storage_path)
    or exists(select 1 from public.ai_usage_log u
        where u.request_id='english-episode-cue-v1:'||c.attempt_id::text)
 then raise exception 'p1_cue_recovery_requires_manual_reconciliation'; end if;
end $guard$;

create table lh_internal.english_episode_cue_retries_v1(
 old_attempt_id uuid primary key references lh_internal.premium_audio_attempts(id) on delete restrict,
 job_id uuid not null references lh_internal.english_episode_jobs_v1(job_id) on delete restrict,
 cue_index integer not null check(cue_index=14),
 retry_attempt_id uuid unique references lh_internal.premium_audio_attempts(id) deferrable initially deferred,
 created_at timestamptz not null default clock_timestamp(),
 claimed_at timestamptz,
 check((retry_attempt_id is null and claimed_at is null)
    or (retry_attempt_id is not null and claimed_at is not null))
);
alter table lh_internal.english_episode_cue_retries_v1 enable row level security;
revoke all on lh_internal.english_episode_cue_retries_v1 from PUBLIC,anon,authenticated,service_role;

-- Closing a submitted call records an uncertain outcome, never a free retry.
do $close$
declare result text;
begin
 result:=public.close_english_episode_cue_attempt_v1(
  '9e0902a4-b4f7-4deb-a317-93e2fc6952ab'::uuid,
  '95dedb93f384f667c257268af228467427a1b8504d0fb1d0946cb2fe6f8e5c6a',
  14,'cee6cd3773aade98e0613a69923d5f988b7b9417edfd871abcf844d1b052ed54',
  'lessons/e2100000-2026-4e21-8e03-000000000003/episode-v2-95dedb93f384f667c257268af228467427a1b8504d0fb1d0946cb2fe6f8e5c6a-r1/cue-14-cee6cd3773aade98e0613a69923d5f988b7b9417edfd871abcf844d1b052ed54.mp3');
 if result<>'uncertain' then raise exception 'p1_cue_recovery_close_failed'; end if;
 insert into lh_internal.english_episode_cue_retries_v1(old_attempt_id,job_id,cue_index)
 values('9e0902a4-b4f7-4deb-a317-93e2fc6952ab',
        '94088ee4-4de2-5fec-b30c-3314cb1cee3d',14);
end $close$;

-- Modify only the exact guarded function bodies already installed in Preview.
-- The generic admission exemption requires a transaction-local marker set by
-- the private English cue RPC. The uncertain hold remains counted globally.
do $functions$
declare d text; needle text; replacement text;
begin
 d:=pg_get_functiondef('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)'::regprocedure);
 needle:='if exists(select 1 from lh_internal.premium_audio_attempts where lesson_id=p_lesson_id and state in (''reserved'',''submitted'',''uncertain'')) then';
 if length(d)-length(replace(d,needle,''))<>length(needle) then
   raise exception 'premium_audio_admission_definition_changed'; end if;
 replacement:=$body$if exists(select 1 from lh_internal.premium_audio_attempts active
  where active.lesson_id=p_lesson_id and active.state in ('reserved','submitted','uncertain')
    and not (active.state='uncertain' and active.id=
      nullif(current_setting('lh.english_episode_retry_old',true),'')::uuid
      and exists(select 1 from lh_internal.english_episode_cue_retries_v1 recovery
        join lh_internal.english_episode_jobs_v1 job on job.job_id=recovery.job_id
        where recovery.old_attempt_id=active.id and recovery.retry_attempt_id is null
          and job.lesson_id=p_lesson_id and job.user_id=p_user_id
          and job.state='staging'))) then$body$;
 execute replace(d,needle,replacement);

 d:=pg_get_functiondef('public.observe_english_episode_cue_v1(uuid,uuid,text,integer,text,text,jsonb)'::regprocedure);
 needle:='where c.job_id=job.job_id and c.cue_index=p_cue_index';
 if length(d)-length(replace(d,needle,''))<>2*length(needle) then
   raise exception 'english_episode_observer_definition_changed'; end if;
 replacement:=$body$where c.job_id=job.job_id and c.cue_index=p_cue_index
   and not (a.state='uncertain' and exists(
     select 1 from lh_internal.english_episode_cue_retries_v1 recovery
     where recovery.old_attempt_id=a.id and recovery.job_id=job.job_id
       and recovery.cue_index=p_cue_index))$body$;
 execute replace(d,needle,replacement);

 d:=pg_get_functiondef('public.begin_english_episode_cue_v1(uuid,uuid,uuid,numeric,text,integer,text,text,jsonb)'::regprocedure);
 needle:='observation jsonb; admitted jsonb;';
 if length(d)-length(replace(d,needle,''))<>length(needle) then
   raise exception 'english_episode_begin_declaration_changed'; end if;
 d:=replace(d,needle,needle||' retry_old uuid;');
 needle:='admitted:=public.begin_premium_audio_attempt_v2(';
 if length(d)-length(replace(d,needle,''))<>length(needle) then
   raise exception 'english_episode_begin_definition_changed'; end if;
 replacement:=$body$select recovery.old_attempt_id into retry_old
  from lh_internal.english_episode_cue_retries_v1 recovery
  join lh_internal.english_episode_cues_v1 old on old.attempt_id=recovery.old_attempt_id
  join lh_internal.premium_audio_attempts pa on pa.id=old.attempt_id
  where recovery.job_id=job.job_id and recovery.cue_index=p_cue_index
    and recovery.retry_attempt_id is null and pa.state='uncertain'
    and old.cue_fingerprint=p_cue_fingerprint and old.storage_path=p_storage_path
  for update of recovery;
  if retry_old is not null then
    perform set_config('lh.english_episode_retry_old',retry_old::text,true);
  end if;
  admitted:=public.begin_premium_audio_attempt_v2($body$;
 d:=replace(d,needle,replacement);
 needle:='if admitted->>''allowed''=''true'' then';
 if length(d)-length(replace(d,needle,''))<>length(needle) then
   raise exception 'english_episode_begin_receipt_definition_changed'; end if;
 replacement:=$body$if retry_old is not null then
    perform set_config('lh.english_episode_retry_old','',true);
  end if;
  if admitted->>'allowed'='true' then$body$;
 d:=replace(d,needle,replacement);
 needle:='  end if;
  return admitted;';
 if length(d)-length(replace(d,needle,''))<>length(needle) then
   raise exception 'english_episode_begin_finalization_changed'; end if;
 replacement:=$body$    if retry_old is not null then
      update lh_internal.english_episode_cue_retries_v1
        set retry_attempt_id=p_attempt_id,claimed_at=clock_timestamp()
      where old_attempt_id=retry_old and retry_attempt_id is null;
      if not found then raise exception 'english_episode_retry_claim_failed'; end if;
    end if;
  end if;
  return admitted;$body$;
 execute replace(d,needle,replacement);
end $functions$;

commit;

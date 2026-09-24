-- Preview-only recovery of the two memory-limited P1 cue-14 attempts.
-- Preserve 13 settled cues and both uncertain reservations. Replace the one
-- unrendered 3,428-character cue with three independently receipted turns.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$
declare j lh_internal.english_episode_jobs_v1%rowtype;
begin
 if current_user<>'postgres' or
    exists(select 1 from lh_internal.english_episode_generation_settings_v1 where enabled)
 then raise exception 'p1_tail_partition_gate_open'; end if;
 select * into j from lh_internal.english_episode_jobs_v1
  where job_id='94088ee4-4de2-5fec-b30c-3314cb1cee3d'::uuid for update;
 if j.job_id is null or j.lesson_id<>'e2100000-2026-4e21-8e03-000000000003'::uuid
    or j.source_fingerprint<>'95dedb93f384f667c257268af228467427a1b8504d0fb1d0946cb2fe6f8e5c6a'
    or j.state<>'staging' or jsonb_array_length(j.cue_plan)<>14
    or (j.cue_plan->13->>'cueIndex')::integer<>14
    or (select count(*) from lh_internal.english_episode_cues_v1 c
        where c.job_id=j.job_id and c.settled_at is not null)<>13
    or (select count(*) from lh_internal.english_episode_cues_v1 c
        join lh_internal.premium_audio_attempts a on a.id=c.attempt_id
        where c.job_id=j.job_id and c.cue_index=14 and a.state='uncertain'
          and c.settled_at is null and c.receipt_request_id is null
          and not exists(select 1 from storage.objects o
             where o.bucket_id='lesson-audio' and o.name=c.storage_path))<>2
    or exists(select 1 from storage.objects o where o.bucket_id='lesson-audio'
       and o.name=j.storage_path)
 then raise exception 'p1_tail_partition_requires_reconciliation'; end if;
end $guard$;

create table lh_internal.english_episode_plan_amendments_v1(
 job_id uuid primary key references lh_internal.english_episode_jobs_v1(job_id) on delete restrict,
 old_plan jsonb not null,new_plan jsonb not null,
 reason text not null check(reason='p1_cue14_edge_memory_twice'),
 created_at timestamptz not null default clock_timestamp()
);
alter table lh_internal.english_episode_plan_amendments_v1 enable row level security;
revoke all on lh_internal.english_episode_plan_amendments_v1 from PUBLIC,anon,authenticated,service_role;

do $amend$
declare j lh_internal.english_episode_jobs_v1%rowtype; revised jsonb;
begin
 select * into j from lh_internal.english_episode_jobs_v1
  where job_id='94088ee4-4de2-5fec-b30c-3314cb1cee3d'::uuid for update;
 revised:=(select jsonb_agg(value order by (value->>'cueIndex')::integer)
  from jsonb_array_elements(j.cue_plan) value where (value->>'cueIndex')::integer<14)
  ||jsonb_build_array(
   jsonb_build_object('cueIndex',15,'cueFingerprint','d3fdaddf94ee5389b871cf75140fc4b158236d563f93ee1106df63aaacb0c48a',
     'cuePath','lessons/e2100000-2026-4e21-8e03-000000000003/episode-v2-95dedb93f384f667c257268af228467427a1b8504d0fb1d0946cb2fe6f8e5c6a-r1/cue-15-d3fdaddf94ee5389b871cf75140fc4b158236d563f93ee1106df63aaacb0c48a.mp3','characters',1327),
   jsonb_build_object('cueIndex',16,'cueFingerprint','ea3ac0c525591a131b42edad350f81c56908a17b0f92d873f428ffb1a460e74d',
     'cuePath','lessons/e2100000-2026-4e21-8e03-000000000003/episode-v2-95dedb93f384f667c257268af228467427a1b8504d0fb1d0946cb2fe6f8e5c6a-r1/cue-16-ea3ac0c525591a131b42edad350f81c56908a17b0f92d873f428ffb1a460e74d.mp3','characters',635),
   jsonb_build_object('cueIndex',17,'cueFingerprint','ca06b7a7629856f1f50ba106dc3a9c5bd9bd653ffb748f29ec31e6cfbaa90725',
     'cuePath','lessons/e2100000-2026-4e21-8e03-000000000003/episode-v2-95dedb93f384f667c257268af228467427a1b8504d0fb1d0946cb2fe6f8e5c6a-r1/cue-17-ca06b7a7629856f1f50ba106dc3a9c5bd9bd653ffb748f29ec31e6cfbaa90725.mp3','characters',1464));
 if not lh_internal.english_episode_plan_valid_v1(revised,j.lesson_id,j.source_fingerprint)
 then raise exception 'p1_tail_partition_invalid'; end if;
 insert into lh_internal.english_episode_plan_amendments_v1(job_id,old_plan,new_plan,reason)
 values(j.job_id,j.cue_plan,revised,'p1_cue14_edge_memory_twice');
 update lh_internal.english_episode_jobs_v1 set cue_plan=revised where job_id=j.job_id;
 insert into lh_internal.english_episode_cue_retries_v1(old_attempt_id,job_id,cue_index)
 values('6a4b50ab-d667-434d-bdc5-57fed3868a08'::uuid,j.job_id,14);
end $amend$;

-- The partial unique index continues to cover every pending attempt except
-- these two exact, audited, still-budgeted P1 holds.
do $index_guard$
declare idx text;
begin
 select indexdef into idx from pg_indexes where schemaname='lh_internal'
  and tablename='premium_audio_attempts' and indexname='premium_audio_one_pending_lesson';
 if idx is distinct from
  'CREATE UNIQUE INDEX premium_audio_one_pending_lesson ON lh_internal.premium_audio_attempts USING btree (lesson_id) WHERE ((state = ANY (ARRAY[''reserved''::text, ''submitted''::text, ''uncertain''::text])) AND (id <> ''9e0902a4-b4f7-4deb-a317-93e2fc6952ab''::uuid))'
 then raise exception 'p1_tail_partition_index_changed'; end if;
end $index_guard$;
drop index lh_internal.premium_audio_one_pending_lesson;
create unique index premium_audio_one_pending_lesson
 on lh_internal.premium_audio_attempts(lesson_id)
 where state in ('reserved','submitted','uncertain')
   and id not in ('9e0902a4-b4f7-4deb-a317-93e2fc6952ab'::uuid,
                  '6a4b50ab-d667-434d-bdc5-57fed3868a08'::uuid);

do $functions$
declare d text;needle text;replacement text;
begin
 d:=pg_get_functiondef('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)'::regprocedure);
 needle:=$body$if exists(select 1 from lh_internal.premium_audio_attempts active
  where active.lesson_id=p_lesson_id and active.state in ('reserved','submitted','uncertain')
    and not (active.state='uncertain' and active.id=
      nullif(current_setting('lh.english_episode_retry_old',true),'')::uuid
      and exists(select 1 from lh_internal.english_episode_cue_retries_v1 recovery
        join lh_internal.english_episode_jobs_v1 job on job.job_id=recovery.job_id
        where recovery.old_attempt_id=active.id and recovery.retry_attempt_id is null
          and job.lesson_id=p_lesson_id and job.user_id=p_user_id
          and job.state='staging'))) then$body$;
 if length(d)-length(replace(d,needle,''))<>length(needle) then
  raise exception 'p1_tail_partition_admission_changed'; end if;
 replacement:=$body$if exists(select 1 from lh_internal.premium_audio_attempts active
  where active.lesson_id=p_lesson_id and active.state in ('reserved','submitted','uncertain')
    and not (active.state='uncertain' and exists(
      select 1 from lh_internal.english_episode_cue_retries_v1 recovery
      join lh_internal.english_episode_jobs_v1 job on job.job_id=recovery.job_id
      where recovery.old_attempt_id=active.id and job.lesson_id=p_lesson_id
        and job.user_id=p_user_id and job.state='staging'
        and ((recovery.retry_attempt_id is null and active.id=
          nullif(current_setting('lh.english_episode_retry_old',true),'')::uuid)
          or (job.job_id=
          nullif(current_setting('lh.english_episode_recovery_job',true),'')::uuid
          and recovery.cue_index=14))))) then$body$;
 execute replace(d,needle,replacement);

 d:=pg_get_functiondef('public.begin_english_episode_cue_v1(uuid,uuid,uuid,numeric,text,integer,text,text,jsonb)'::regprocedure);
 needle:='admitted:=public.begin_premium_audio_attempt_v2(';
 if length(d)-length(replace(d,needle,''))<>length(needle) then
  raise exception 'p1_tail_partition_begin_changed'; end if;
 replacement:=$body$if job.job_id='94088ee4-4de2-5fec-b30c-3314cb1cee3d'::uuid
      and p_cue_index in (15,16,17)
      and (select count(*) from lh_internal.english_episode_cue_retries_v1 r
           join lh_internal.premium_audio_attempts a on a.id=r.old_attempt_id
           where r.job_id=job.job_id and r.cue_index=14 and a.state='uncertain')=2
    then perform set_config('lh.english_episode_recovery_job',job.job_id::text,true);
    end if;
    admitted:=public.begin_premium_audio_attempt_v2($body$;
 d:=replace(d,needle,replacement);
 needle:='if retry_old is not null then
    perform set_config(''lh.english_episode_retry_old'','''',true);';
 if length(d)-length(replace(d,needle,''))<>length(needle) then
  raise exception 'p1_tail_partition_cleanup_changed'; end if;
 replacement:=$body$perform set_config('lh.english_episode_recovery_job','',true);
  if retry_old is not null then
    perform set_config('lh.english_episode_retry_old','',true);$body$;
 execute replace(d,needle,replacement);
end $functions$;
commit;

-- Keep the one-pending-attempt invariant, except for the exact old P1 cue
-- whose provider outcome is uncertain. Its reservation continues to count.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $guard$
declare idx text;
begin
 if current_user<>'postgres'
    or exists(select 1 from lh_internal.english_episode_generation_settings_v1 where enabled)
    or not exists(select 1 from lh_internal.english_episode_cue_retries_v1 r
      join lh_internal.premium_audio_attempts a on a.id=r.old_attempt_id
      where r.old_attempt_id='9e0902a4-b4f7-4deb-a317-93e2fc6952ab'::uuid
        and r.retry_attempt_id is null and a.state='uncertain'
        and a.reserved_usd=0.3428)
 then raise exception 'p1_pending_index_recovery_prerequisites_missing'; end if;
 select indexdef into idx from pg_indexes where schemaname='lh_internal'
  and tablename='premium_audio_attempts' and indexname='premium_audio_one_pending_lesson';
 if idx is distinct from
  'CREATE UNIQUE INDEX premium_audio_one_pending_lesson ON lh_internal.premium_audio_attempts USING btree (lesson_id) WHERE (state = ANY (ARRAY[''reserved''::text, ''submitted''::text, ''uncertain''::text]))'
 then raise exception 'p1_pending_index_definition_changed'; end if;
end $guard$;

drop index lh_internal.premium_audio_one_pending_lesson;
create unique index premium_audio_one_pending_lesson
 on lh_internal.premium_audio_attempts(lesson_id)
 where state in ('reserved','submitted','uncertain')
   and id<>'9e0902a4-b4f7-4deb-a317-93e2fc6952ab'::uuid;
commit;

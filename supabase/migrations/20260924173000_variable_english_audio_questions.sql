-- A reviewed English lesson may cover more or fewer than five concepts.
-- The Edge route still resolves the exact authored question and validates its
-- index. This migration changes only the private admission upper bound.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

alter table lh_internal.english_audio_assessment_attempts
 drop constraint english_audio_assessment_attempts_question_index_check;
alter table lh_internal.english_audio_assessment_attempts
 add constraint english_audio_assessment_attempts_question_index_check
 check (question_index between 0 and 99);

do $patch$
declare definition text;
begin
 if to_regprocedure('public.begin_english_audio_assessment_v1(uuid,uuid,uuid,integer,text)') is null
  then raise exception 'english_audio_admission_missing'; end if;
 select pg_get_functiondef('public.begin_english_audio_assessment_v1(uuid,uuid,uuid,integer,text)'::regprocedure)
  into definition;
 if length(definition)-length(replace(definition,'not between 0 and 4',''))<>length('not between 0 and 4')
  then raise exception 'english_audio_admission_anchor_changed'; end if;
 execute replace(definition,'not between 0 and 4','not between 0 and 99');
end $patch$;
commit;

-- V2 ONLY, privileged database test, no LLM calls. Every synthetic write is rolled back.
begin;
do $test$
declare uid uuid; lid uuid; sid uuid; vid uuid; tok text:=repeat('a',64); payload jsonb; result jsonb; ec bigint; rc bigint; sc bigint;
begin
  select id into uid from public.profiles where learner_track in ('rafael_finance','viviane_payroll') limit 1;
  select l.id into lid from public.lessons l join public.modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.learner_track='english_academy' and l.is_published limit 1;
  if uid is null or lid is null then raise exception 'missing_test_fixture'; end if;
  select count(*) into ec from public.user_error_bank;
  select count(*) into rc from public.spaced_reviews;
  select count(*) into sc from public.user_competency_scores;
  payload:=jsonb_build_object('transcript',jsonb_build_array(jsonb_build_object('role','user','text','Synthetic test only')),'durationSeconds',10,'closeReason','test','modelUsage','[]'::jsonb,'evaluation',jsonb_build_object('pronunciationScore',99,'assessmentConfidence',70,'model','synthetic-no-api','estimatedCostUsd',0,'needsSpacedReview',true,'errors',jsonb_build_array(jsonb_build_object('domain','grammar','pattern','Consolidation unique test error','normalizedPattern','consolidation unique test error','confidence',92))));
  insert into public.ai_tutor_sessions(user_id,lesson_id,room_name,callback_token_hash) values(uid,lid,'validation:lh-consolidation-test',encode(extensions.digest(tok,'sha256'),'hex')) returning id into vid;
  result:=public.complete_professor_session_v2(vid,tok,payload);
  if (result->>'validationMode')::boolean is not true or (result->>'errorBankItems')::integer<>0 then raise exception 'validation_failed'; end if;
  if (select count(*) from public.user_error_bank)<>ec or (select count(*) from public.spaced_reviews)<>rc or (select count(*) from public.user_competency_scores)<>sc then raise exception 'validation_contaminated_learning'; end if;
  if (select pronunciation_score from public.ai_tutor_sessions where id=vid) is not null then raise exception 'fabricated_pronunciation'; end if;
  insert into public.ai_tutor_sessions(user_id,lesson_id,room_name,callback_token_hash,dispatch_id) values(uid,lid,'lh-consolidation-test',encode(extensions.digest(tok,'sha256'),'hex'),'dispatch-must-survive') returning id into sid;
  result:=public.complete_professor_session_v2(sid,tok,payload);
  result:=public.complete_professor_session_v2(sid,tok,payload);
  if (result->>'duplicate')::boolean is not true then raise exception 'idempotency_failed'; end if;
  if (select count(*) from public.ai_tutor_turns where session_id=sid)<>1 then raise exception 'turns_duplicated'; end if;
  if not exists(select 1 from public.user_error_bank where user_id=uid and normalized_pattern='consolidation unique test error' and diagnostic_confidence=92 and mastery_confidence is null and frequency=1) then raise exception 'confidence_or_frequency_failed'; end if;
  if (select dispatch_id from public.ai_tutor_sessions where id=sid)<>'dispatch-must-survive' then raise exception 'dispatch_erased'; end if;
  begin perform public.complete_professor_session_v2(sid,repeat('b',64),payload); raise exception 'invalid_token_accepted'; exception when insufficient_privilege then null; end;
  begin perform public.complete_professor_session_v2(sid,tok,payload||'{"durationSeconds":11}'::jsonb); raise exception 'conflicting_replay_accepted'; exception when raise_exception then if SQLERRM<>'completion_conflict' then raise; end if; end;
  if has_function_privilege('anon','public.complete_professor_session_v2(uuid,text,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.complete_professor_session_v2(uuid,text,jsonb)','EXECUTE') then raise exception 'callback_rpc_exposed'; end if;
end $test$;
rollback;
select 'PASS: synthetic writes rolled back' as result;

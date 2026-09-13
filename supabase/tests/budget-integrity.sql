-- Run ONLY after fixture-budget.sql in a disposable local PostgreSQL. No real data or LLM calls.
begin;
set local role service_role;
do $tests$
declare uid uuid; lid uuid; sid uuid; rid uuid; token text:=repeat('d',64); usage jsonb; eval jsonb; payload jsonb; result jsonb; scenario text; checked jsonb;
begin
 select id into uid from public.profiles where learner_track='rafael_finance' limit 1;
 select l.id into lid from public.lessons l join public.modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where c.learner_track='english_academy';
 usage:='[{"type":"llm_usage","inputTokens":2000,"inputCachedTokens":400,"outputTokens":1000,"inputTextTokens":1000,"inputCachedTextTokens":200,"outputTextTokens":500,"inputAudioTokens":1000,"inputCachedAudioTokens":200,"outputAudioTokens":500}]';
 eval:='{"model":"gpt-5.6-terra","estimatedCostUsd":0.01,"assessmentConfidence":20,"errors":[],"needsSpacedReview":false}';
 foreach scenario in array array['premium','mini','missing','unknown-model','bad-cache','missing-evaluator','bad-token','missing-counter','zero-usage'] loop
  insert into public.professor_budget_reservations(user_id,reserved_usd,max_session_seconds) values(uid,4,1200) returning id into rid;
  insert into public.ai_tutor_sessions(user_id,lesson_id,room_name,quality_tier,budget_reservation_id,callback_token_hash) values(uid,lid,'validation:synthetic-'||scenario,'premium',rid,encode(extensions.digest(token,'sha256'),'hex')) returning id into sid;
  perform public.complete_professor_session_v2(sid,token,jsonb_build_object('transcript',jsonb_build_array(jsonb_build_object('role','user','text','Synthetic only')),'durationSeconds',1,'modelUsage',usage,'evaluation',eval));
  payload:=jsonb_build_object('modelUsage',usage,'realtimeModel',case when scenario='mini' then 'gpt-realtime-2.1-mini' else 'gpt-realtime-2.1' end,'evaluation',eval);
  if scenario='missing' then payload:=payload-'modelUsage'; end if;
  if scenario='unknown-model' then payload:=payload||'{"realtimeModel":"unknown"}'::jsonb; end if;
  if scenario='bad-cache' then payload:=jsonb_set(payload,'{modelUsage,0,inputCachedTextTokens}','1001'); end if;
  if scenario='missing-counter' then payload:=payload#-'{modelUsage,0,inputAudioTokens}'; end if;
  if scenario='zero-usage' then payload:=jsonb_set(payload,'{modelUsage}','[{"type":"llm_usage","inputTokens":0,"inputCachedTokens":0,"outputTokens":0,"inputTextTokens":0,"inputCachedTextTokens":0,"outputTextTokens":0,"inputAudioTokens":0,"inputCachedAudioTokens":0,"outputAudioTokens":0}]'); end if;
  if scenario='missing-evaluator' then payload:=payload-'evaluation'; end if;
  if scenario='bad-token' then
   begin perform public.settle_professor_usage_v2(sid,repeat('x',64),payload); raise exception 'bad_token_accepted'; exception when insufficient_privilege then null; end;
   continue;
  end if;
  result:=public.settle_professor_usage_v2(sid,token,payload);
  if scenario in ('premium','mini') then
   if result->>'state'<>'settled' then raise exception 'expected settled %: %',scenario,result; end if;
   if (result->>'realtimeCostUsd')::numeric<>(case when scenario='premium' then 0.072960 else 0.019752 end) then raise exception 'incorrect pricing %',result; end if;
   if (select count(*) from public.ai_usage_log where session_id=sid)<>2 then raise exception 'missing_cost_entries'; end if;
   result:=public.settle_professor_usage_v2(sid,token,payload);
   if (result->>'duplicate')::boolean is not true or (select count(*) from public.ai_usage_log where session_id=sid)<>2 then raise exception 'duplicate_billing'; end if;
   begin perform public.settle_professor_usage_v2(sid,token,payload||'{"realtimeModel":"other"}'::jsonb); raise exception 'conflicting_settlement_accepted'; exception when raise_exception then if SQLERRM<>'settlement_conflict' then raise; end if; end;
  else
   if result->>'state'<>'pending' then raise exception 'unknown falsely settled %: %',scenario,result; end if;
   if (select status from public.professor_budget_reservations where id=rid)<>'unresolved' then raise exception 'reserve_not_protected'; end if;
   if (select count(*) from public.ai_usage_log where session_id=sid)<>0 then raise exception 'partial_or_zero_cost_written'; end if;
   if scenario='missing' then
    result:=public.settle_professor_usage_v2(sid,token,jsonb_build_object('modelUsage',usage,'realtimeModel','gpt-realtime-2.1','evaluation',eval));
    if result->>'state'<>'settled' then raise exception 'late_evidence_not_reconciled'; end if;
   end if;
  end if;
 end loop;
 checked:=lh_internal.validate_professor_usage(jsonb_set(usage,'{0,inputTokens}','"2000"'),'gpt-realtime-2.1');
 if (checked->>'valid')::boolean then raise exception 'string_counter_accepted'; end if;
 checked:=lh_internal.validate_professor_usage(jsonb_set(usage,'{0,inputAudioTokens}','-1'),'gpt-realtime-2.1');
 if (checked->>'valid')::boolean then raise exception 'negative_counter_accepted'; end if;
 checked:=lh_internal.validate_professor_usage(jsonb_set(usage,'{0,inputImageTokens}','99'),'gpt-realtime-2.1');
 if (checked->>'valid')::boolean then raise exception 'image_cost_ignored'; end if;
 if has_function_privilege('anon','public.settle_professor_usage_v2(uuid,text,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.settle_professor_usage_v2(uuid,text,jsonb)','EXECUTE') then raise exception 'settlement_publicly_executable'; end if;
 raise notice 'PASS settlement: pricing, zero/missing/invalid telemetry, evaluator failure, later reconciliation, duplicates, conflicts, permissions';
end $tests$;
rollback;

begin;
create function public.fail_synthetic_session_insert() returns trigger language plpgsql as $$begin if NEW.room_name like '%000000000099' then raise exception 'synthetic_insert_failure'; end if; return NEW; end$$;
create trigger synthetic_failure before insert on public.ai_tutor_sessions for each row execute function public.fail_synthetic_session_insert();
do $tests$
declare uid uuid; other_uid uuid; lid uuid; other_lid uuid; rid uuid:=gen_random_uuid(); room text:='lh-'||gen_random_uuid(); hash text:=encode(extensions.digest(repeat('z',64),'sha256'),'hex'); r jsonb; n bigint; sid uuid;
begin
 select id into uid from public.profiles where learner_track='rafael_finance';
 select id into other_uid from public.profiles where learner_track='viviane_payroll';
 select l.id into lid from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='english_academy';
 select l.id into other_lid from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='viviane_payroll';
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.start_professor_session_atomic(rid,lid,'chapter_conversation',room,hash,true); raise exception 'anonymous_start_allowed'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 begin perform public.start_professor_session_atomic(rid,other_lid,'chapter_conversation',room,hash,true); raise exception 'cross_track_start_allowed'; exception when insufficient_privilege then null; end;
 select count(*) into n from professor_budget_reservations;
 r:=public.start_professor_session_atomic(rid,lid,'chapter_conversation',room,hash,true);
 if (r->>'allowed')::boolean is not true or r->>'quality_tier'<>'premium' or (r->>'reservation_usd')::numeric<>4 or (r->>'validation_mode')::boolean is not true then raise exception 'startup_contract_failure %',r; end if;
 sid:=(r->>'session_id')::uuid;
 if (select count(*) from professor_budget_reservations)<>n+1 then raise exception 'reservation_not_created'; end if;
 r:=public.start_professor_session_atomic(rid,lid,'chapter_conversation',room,hash,true);
 if r->>'reason'<>'request_already_started' or (select count(*) from professor_budget_reservations)<>n+1 then raise exception 'startup_replay_not_protected'; end if;
 r:=public.start_professor_session_atomic(gen_random_uuid(),lid,'chapter_conversation','lh-'||gen_random_uuid(),hash,true);
 if r->>'reason'<>'professor_session_already_active' then raise exception 'concurrent_start_allowed'; end if;
 perform set_config('role','authenticated',true);
 begin update ai_tutor_sessions set callback_token_hash=repeat('a',64) where id=sid; raise exception 'callback_tampering_allowed'; exception when insufficient_privilege then null; end;
 begin delete from ai_tutor_sessions where id=sid; raise exception 'ledger_delete_allowed'; exception when insufficient_privilege then null; end;
 update ai_tutor_sessions set dispatch_id='synthetic-dispatch' where id=sid;
 perform set_config('role','none',true);
 perform public.flag_professor_dispatch_uncertain(sid,repeat('z',64));
 if (select status from professor_budget_reservations where id=(select budget_reservation_id from ai_tutor_sessions where id=sid))<>'unresolved' then raise exception 'uncertain_dispatch_released'; end if;
 if (select status from ai_tutor_sessions where id=sid)<>'active' then raise exception 'late_callback_disabled'; end if;
 perform set_config('request.jwt.claim.sub',other_uid::text,true);
 select count(*) into n from professor_budget_reservations;
 begin perform public.start_professor_session_atomic(gen_random_uuid(),lid,'chapter_conversation','lh-00000000-0000-4000-8000-000000000099',hash,true); raise exception 'fault_injection_not_exercised'; exception when raise_exception then if SQLERRM<>'synthetic_insert_failure' then raise; end if; end;
 if (select count(*) from professor_budget_reservations)<>n then raise exception 'orphan_reservation_after_failed_insert'; end if;
 update learning_hub_budget_settings set professor_cap_usd=0 where id=1;
 r:=public.start_professor_session_atomic(gen_random_uuid(),lid,'chapter_conversation','lh-'||gen_random_uuid(),hash,true);
 if r->>'reason'<>'professor_monthly_budget_reached' or (select count(*) from professor_budget_reservations)<>n then raise exception 'professor_cap_failed'; end if;
 update learning_hub_budget_settings set professor_cap_usd=110,ai_hard_cap_usd=0 where id=1;
 r:=public.start_professor_session_atomic(gen_random_uuid(),lid,'chapter_conversation','lh-'||gen_random_uuid(),hash,true);
 if r->>'reason'<>'professor_monthly_budget_reached' then raise exception 'global_cap_failed'; end if;
 raise notice 'PASS startup: auth, cross-course isolation, premium retained, atomicity under insert failure, duplicate starts, server-owned callback fields, ambiguous dispatch retains reserve, both caps';
end $tests$;
rollback;
select 'All tests used fictional disposable data; no provider was contacted.' as result;

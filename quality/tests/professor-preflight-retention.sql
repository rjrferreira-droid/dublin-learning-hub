-- Disposable PostgreSQL proof for professor-preflight-retention.sql.
-- Run only after the reference, recovery and dispatch candidates are installed.
-- Every fixture mutation is rolled back; no provider or network path exists here.
begin;

do $test$
declare
 v_user uuid;
 v_other_user uuid;
 v_lesson uuid;
 v_old8 timestamptz:=clock_timestamp()-interval '8 days';
 v_old2 timestamptz:=clock_timestamp()-interval '2 days';
 v_future timestamptz:=clock_timestamp()+interval '1 hour';
 v_old_unconsumed uuid:=gen_random_uuid();
 v_old_consumed uuid:=gen_random_uuid();
 v_short_reference uuid:=gen_random_uuid();
 v_consumption_fence uuid:=gen_random_uuid();
 v_active_reference uuid:=gen_random_uuid();
 v_uncertain_reference uuid:=gen_random_uuid();
 v_active_request uuid:=gen_random_uuid();
 v_uncertain_request uuid:=gen_random_uuid();
 v_active_reservation uuid;
 v_uncertain_reservation uuid;
 v_active_session uuid;
 v_uncertain_session uuid;
 v_result jsonb;
 v_recovery_before jsonb;
 v_recovery_after jsonb;
 v_exposure_before jsonb;
 v_exposure_after jsonb;
 v_sessions_before text;
 v_sessions_after text;
 v_reservations_before text;
 v_reservations_after text;
 v_usage_before text;
 v_usage_after text;
 v_completion_before text;
 v_completion_after text;
 v_settlement_before text;
 v_settlement_after text;
 v_definition text;
 v_drift_reference uuid:=gen_random_uuid();
 v_safe_reference uuid:=gen_random_uuid();
 v_batch_ids uuid[]:=array[]::uuid[];
 v_id uuid;
begin
 select id into v_user from public.profiles
 where learner_track='rafael_finance' order by id limit 1;
 select id into v_other_user from public.profiles
 where learner_track='viviane_payroll' order by id limit 1;
 select l.id into v_lesson
 from public.lessons l
 join public.modules m on m.id=l.module_id
 join public.courses c on c.id=m.course_id
 where c.learner_track='rafael_finance'
 order by l.id limit 1;
 if v_user is null or v_other_user is null or v_lesson is null then
  raise exception 'retention_fixture_identity_missing';
 end if;

 if to_regprocedure('lh_internal.prune_professor_ephemera_v1(integer)') is null
  or to_regclass('lh_internal.professor_preflights_retention_expiry_idx') is null
  or to_regclass('lh_internal.written_professor_references_retention_unbound_idx') is null then
  raise exception 'retention_candidate_not_installed';
 end if;
 if has_function_privilege('anon','lh_internal.prune_professor_ephemera_v1(integer)','execute')
  or has_function_privilege('authenticated','lh_internal.prune_professor_ephemera_v1(integer)','execute')
  or has_function_privilege('service_role','lh_internal.prune_professor_ephemera_v1(integer)','execute')
  or exists(
   select 1 from pg_proc p
   cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   where p.oid='lh_internal.prune_professor_ephemera_v1(integer)'::regprocedure
    and a.grantee=0 and a.privilege_type='EXECUTE') then
  raise exception 'retention_candidate_exposed_to_api';
 end if;
 if not (select relrowsecurity from pg_class where oid='lh_internal.written_professor_references'::regclass)
  or not (select relrowsecurity from pg_class where oid='lh_internal.professor_preflights'::regclass) then
  raise exception 'retention_private_rls_missing';
 end if;
 select lower(pg_get_functiondef('lh_internal.prune_professor_ephemera_v1(integer)'::regprocedure)) into v_definition;
 if strpos(v_definition,'for update of t skip locked')=0
  or strpos(v_definition,'for update of p skip locked')=0
  or strpos(replace(v_definition,' ',''),'forupdateoft,pskiplocked')>0
  or strpos(v_definition,'pg_try_advisory_xact_lock')=0
  or (select prosecdef from pg_proc
      where oid='lh_internal.prune_professor_ephemera_v1(integer)'::regprocedure) then
  raise exception 'retention_concurrency_or_security_guard_missing';
 end if;

 -- Two old unbound references: consumed and unconsumed ciphertext are eligible.
 insert into lh_internal.written_professor_references
  (id,user_id,lesson_id,identity,source_sha256,descriptor_version,created_at,expires_at)
 values
  (v_old_unconsumed,v_user,v_lesson,'{"fixture":"old-unconsumed"}',repeat('a',64),'p1-reference-candidate-v1',v_old8-interval '5 minutes',v_old8),
  (v_old_consumed,v_user,v_lesson,'{"fixture":"old-consumed"}',repeat('b',64),'p1-reference-candidate-v1',v_old8-interval '5 minutes',v_old8),
  (v_short_reference,v_user,v_lesson,'{"fixture":"short-reference"}',repeat('c',64),'p1-reference-candidate-v1',v_old2-interval '5 minutes',v_old2),
  (v_consumption_fence,v_user,v_lesson,'{"fixture":"valid-parent-fence"}',repeat('d',64),'p1-reference-candidate-v1',clock_timestamp(),v_future);
 insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at,consumed_at)
 values
  (v_old_unconsumed,v_user,gen_random_uuid(),'fixture-old-unconsumed',v_old8,null),
  (v_old_consumed,v_user,gen_random_uuid(),'fixture-old-consumed',v_old8,v_old8-interval '1 minute'),
  (v_short_reference,v_user,gen_random_uuid(),'fixture-short-reference',v_old2,null),
  -- This deliberately old consumed child remains the durable consumption fence
  -- because its unbound parent is still valid.
  (v_consumption_fence,v_user,gen_random_uuid(),'fixture-valid-parent-fence',v_old2,v_old2-interval '1 minute');

 -- Bound active and dispatch-uncertain obligations keep their references.
 insert into public.professor_budget_reservations
  (user_id,feature,month_start,reserved_usd,max_session_seconds,status,created_at)
 values(v_user,'professor_livekit',date_trunc('month',v_old8)::date,4,1200,'active',v_old8)
 returning id into v_active_reservation;
 insert into public.ai_tutor_sessions
  (user_id,lesson_id,mode,status,started_at,room_name,quality_tier,budget_reservation_id,callback_token_hash,startup_request_id)
 values(v_user,v_lesson,'chapter_conversation','active',v_old8,'validation:lh-'||v_active_request,
  'premium',v_active_reservation,repeat('e',64),v_active_request)
 returning id into v_active_session;
 insert into lh_internal.written_professor_references
  (id,user_id,lesson_id,identity,source_sha256,descriptor_version,created_at,expires_at,
   bound_session_id,bound_request_id,bound_at)
 values(v_active_reference,v_user,v_lesson,'{"fixture":"bound-active"}',repeat('e',64),
  'p1-reference-candidate-v1',v_old8-interval '5 minutes',v_old8,
  v_active_session,v_active_request,v_old8-interval '1 minute');
 insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at,consumed_at)
 values(v_active_reference,v_user,v_active_request,'fixture-bound-active',v_old8,v_old8-interval '2 minutes');

 insert into public.professor_budget_reservations
  (user_id,feature,month_start,reserved_usd,max_session_seconds,status,created_at)
 values(v_user,'professor_livekit',date_trunc('month',v_old8)::date,4,1200,'unresolved',v_old8)
 returning id into v_uncertain_reservation;
 insert into public.ai_tutor_sessions
  (user_id,lesson_id,mode,status,started_at,room_name,quality_tier,budget_reservation_id,callback_token_hash,startup_request_id)
 values(v_user,v_lesson,'chapter_conversation','active',v_old8,'validation:lh-'||v_uncertain_request,
  'premium',v_uncertain_reservation,repeat('f',64),v_uncertain_request)
 returning id into v_uncertain_session;
 insert into lh_internal.written_professor_references
  (id,user_id,lesson_id,identity,source_sha256,descriptor_version,created_at,expires_at,
   bound_session_id,bound_request_id,bound_at,dispatch_claim_id,dispatch_payload_sha256,dispatch_claimed_at)
 values(v_uncertain_reference,v_user,v_lesson,'{"fixture":"bound-uncertain"}',repeat('f',64),
  'p1-reference-candidate-v1',v_old8-interval '5 minutes',v_old8,
  v_uncertain_session,v_uncertain_request,v_old8-interval '1 minute',gen_random_uuid(),repeat('1',64),v_old8);
 insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at,consumed_at)
 values(v_uncertain_reference,v_user,v_uncertain_request,'fixture-bound-uncertain',v_old8,v_old8-interval '2 minutes');

 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) into v_sessions_before
 from public.ai_tutor_sessions x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) into v_reservations_before
 from public.professor_budget_reservations x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) into v_usage_before
 from public.ai_usage_log x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.session_id)::text,'[]')) into v_completion_before
 from lh_internal.professor_completion_receipts x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.session_id)::text,'[]')) into v_settlement_before
 from lh_internal.professor_settlement_receipts x;
 perform set_config('request.jwt.claim.sub',v_user::text,true);
 v_recovery_before:=public.list_professor_recovery_v1();
 v_exposure_before:=lh_internal.professor_reservation_exposure(now());

 v_result:=lh_internal.prune_professor_ephemera_v1(200);
 if v_result->>'status'<>'completed'
  or (v_result->>'deletedPreflights')::integer<>5
  or (v_result->>'deletedConsumedPreflights')::integer<>3
  or (v_result->>'deletedUnconsumedPreflights')::integer<>2
  or (v_result->>'deletedUnboundReferences')::integer<>2 then
  raise exception 'retention_counts_wrong: %',v_result;
 end if;
 if exists(select 1 from lh_internal.professor_preflights where reference_id in
  (v_old_unconsumed,v_old_consumed,v_short_reference,v_active_reference,v_uncertain_reference)) then
  raise exception 'eligible_preflight_retained';
 end if;
 if exists(select 1 from lh_internal.written_professor_references where id in(v_old_unconsumed,v_old_consumed)) then
  raise exception 'old_unbound_reference_retained';
 end if;
 if not exists(select 1 from lh_internal.written_professor_references where id=v_short_reference)
  or not exists(select 1 from lh_internal.professor_preflights where reference_id=v_consumption_fence)
  or not exists(select 1 from lh_internal.written_professor_references where id in(v_active_reference,v_uncertain_reference) having count(*)=2) then
  raise exception 'diagnostic_fence_or_bound_reference_deleted';
 end if;

 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) into v_sessions_after
 from public.ai_tutor_sessions x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) into v_reservations_after
 from public.professor_budget_reservations x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.id)::text,'[]')) into v_usage_after
 from public.ai_usage_log x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.session_id)::text,'[]')) into v_completion_after
 from lh_internal.professor_completion_receipts x;
 select md5(coalesce(jsonb_agg(to_jsonb(x) order by x.session_id)::text,'[]')) into v_settlement_after
 from lh_internal.professor_settlement_receipts x;
 v_recovery_after:=public.list_professor_recovery_v1();
 v_exposure_after:=lh_internal.professor_reservation_exposure(now());
 if v_sessions_before<>v_sessions_after or v_reservations_before<>v_reservations_after
  or v_usage_before<>v_usage_after or v_completion_before<>v_completion_after
  or v_settlement_before<>v_settlement_after
  or v_recovery_before is distinct from v_recovery_after
  or v_exposure_before is distinct from v_exposure_after then
  raise exception 'operational_or_recovery_state_changed';
 end if;

 -- The limit bounds each phase independently and drains a backlog over runs.
 for i in 1..3 loop
  v_id:=gen_random_uuid();
  v_batch_ids:=array_append(v_batch_ids,v_id);
  insert into lh_internal.written_professor_references
   (id,user_id,lesson_id,identity,source_sha256,descriptor_version,created_at,expires_at)
  values(v_id,v_user,v_lesson,jsonb_build_object('fixture','batch-'||i),repeat('2',64),
   'p1-reference-candidate-v1',v_old8-interval '5 minutes',v_old8);
  insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at)
  values(v_id,v_user,gen_random_uuid(),'fixture-batch-'||i,v_old8);
 end loop;
 v_result:=lh_internal.prune_professor_ephemera_v1(2);
 if (v_result->>'deletedPreflights')::integer<>2
  or (v_result->>'deletedUnboundReferences')::integer<>2
  or (select count(*) from lh_internal.written_professor_references where id=any(v_batch_ids))<>1 then
  raise exception 'retention_batch_limit_failed: %',v_result;
 end if;
 v_result:=lh_internal.prune_professor_ephemera_v1(2);
 if (v_result->>'deletedPreflights')::integer<>1
  or (v_result->>'deletedUnboundReferences')::integer<>1
  or exists(select 1 from lh_internal.written_professor_references where id=any(v_batch_ids)) then
  raise exception 'retention_backlog_drain_failed: %',v_result;
 end if;

 begin
  perform lh_internal.prune_professor_ephemera_v1(0);
  raise exception 'invalid_batch_accepted';
 exception when raise_exception then
  if sqlerrm<>'professor_ephemera_cleanup_batch_invalid' then raise; end if;
 end;

 -- One mismatched owner blocks the whole run before a separate safe row can be
 -- deleted. Both remain available for investigation.
 insert into lh_internal.written_professor_references
  (id,user_id,lesson_id,identity,source_sha256,descriptor_version,created_at,expires_at)
 values
  (v_drift_reference,v_user,v_lesson,'{"fixture":"owner-drift"}',repeat('3',64),'p1-reference-candidate-v1',v_old8-interval '5 minutes',v_old8),
  (v_safe_reference,v_user,v_lesson,'{"fixture":"safe-neighbour"}',repeat('4',64),'p1-reference-candidate-v1',v_old8-interval '5 minutes',v_old8);
 insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at)
 values
  (v_drift_reference,v_other_user,gen_random_uuid(),'fixture-owner-drift',v_old8),
  (v_safe_reference,v_user,gen_random_uuid(),'fixture-safe-neighbour',v_old8);
 begin
  perform lh_internal.prune_professor_ephemera_v1(200);
  raise exception 'integrity_drift_accepted';
 exception when raise_exception then
  if sqlerrm<>'professor_ephemera_cleanup_integrity_drift' then raise; end if;
 end;
 if (select count(*) from lh_internal.professor_preflights where reference_id in(v_drift_reference,v_safe_reference))<>2
  or (select count(*) from lh_internal.written_professor_references where id in(v_drift_reference,v_safe_reference))<>2 then
  raise exception 'drift_failure_was_not_non_destructive';
 end if;

 raise notice 'PASS: bounded retention removes only expired ciphertext and never-bound references';
 raise notice 'PASS: valid consumed fence, bound recovery, reservations, usage and receipts are byte-stable';
 raise notice 'PASS: owner drift fails before mutation; API roles cannot execute cleanup';
end $test$;

rollback;

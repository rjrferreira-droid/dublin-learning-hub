-- Disposable localhost CI data only. No service credentials or provider calls.
begin;
do $tests$
declare uid uuid; lid uuid; rid uuid; sid uuid; snap jsonb; later jsonb; result jsonb; before_rows jsonb;
 token text:=repeat('r',64); point timestamptz:='2026-10-01T00:00:00Z';
begin
 select id into uid from profiles where learner_track='rafael_finance' limit 1;
 select l.id into lid from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='english_academy' limit 1;
 insert into professor_budget_reservations(user_id,reserved_usd,max_session_seconds,month_start,created_at,status) values
 (uid,4,1200,'2026-09-01','2026-09-30T23:59:00Z','active'),
 (uid,3,1200,'2026-08-01','2026-08-01T00:00:00Z','unresolved'),
 (uid,2,1200,'2026-10-01','2026-10-01T00:00:00Z','active'),
 (uid,99,1200,'2026-09-01','2026-09-01T00:00:00Z','settled'),
 (uid,99,1200,'2026-09-01','2026-09-01T00:00:00Z','abandoned');
 snap:=lh_internal.professor_reservation_exposure(point);
 if (snap->>'protectedReservationUsd')::numeric<>9 or (snap->>'carriedReservedUsd')::numeric<>7 or (snap->>'currentPeriodReservedUsd')::numeric<>2 then raise exception 'month_carry_failed %',snap; end if;
 if (snap->>'staleCount')::integer<>1 or (snap->>'needsReconciliationCount')::integer<>1 then raise exception 'stale_classification_failed %',snap; end if;
 later:=lh_internal.professor_reservation_exposure(point+interval '2 months');
 if (later->>'protectedReservationUsd')::numeric<>9 or (later->>'staleCount')::integer<>3 then raise exception 'time_released_unknown_reserve'; end if;
 perform set_config('TimeZone','Pacific/Kiritimati',true);
 if lh_internal.professor_reservation_exposure(point) is distinct from snap then raise exception 'timezone_changed_period'; end if;
 perform set_config('TimeZone','UTC',true);
 select jsonb_agg(to_jsonb(r) order by r.id) into before_rows from professor_budget_reservations r;
 perform lh_internal.professor_reservation_exposure(point+interval '1 year');
 if (select jsonb_agg(to_jsonb(r) order by r.id) from professor_budget_reservations r) is distinct from before_rows then raise exception 'report_rewrote_history'; end if;
 insert into professor_budget_reservations(user_id,reserved_usd,max_session_seconds,status,month_start,created_at) values(uid,4,1200,'unresolved','2026-09-01','2026-09-01T00:00:00Z') returning id into rid;
 insert into ai_tutor_sessions(user_id,lesson_id,budget_reservation_id,callback_token_hash,room_name,status) values(uid,lid,rid,encode(extensions.digest(token,'sha256'),'hex'),'validation:synthetic-cost','abandoned') returning id into sid;
 insert into lh_internal.professor_settlement_receipts(session_id,payload_hash,state,realtime_cost_usd,evaluation_cost_usd) values(sid,repeat('a',64),'pending',5.75,0.25);
 snap:=lh_internal.professor_reservation_exposure(point);
 if (snap->>'protectedReservationUsd')::numeric<>15 or (snap->>'knownCostUpliftUsd')::numeric<>2 then raise exception 'known_pending_cost_ignored %',snap; end if;
 if has_function_privilege('anon','public.professor_reservation_exposure_v2()','execute') or has_function_privilege('authenticated','public.professor_reservation_exposure_v2()','execute') then raise exception 'aggregate_exposed_to_client'; end if;
 raise notice 'PASS: UTC month carry, no expiry-to-zero, stale classification, history unchanged, known pending cost uplift, service-only access';
end $tests$;
rollback;

begin;
do $tests$
declare uid uuid; lid uuid; result jsonb; rid uuid;
begin
 select id into uid from profiles where learner_track='rafael_finance' limit 1;
 select l.id into lid from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='english_academy' limit 1;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 insert into professor_budget_reservations(user_id,reserved_usd,max_session_seconds,month_start,created_at,status)
 values(uid,108,1200,(date_trunc('month',now())-interval '1 month')::date,now()-interval '40 days','unresolved') returning id into rid;
 result:=public.start_professor_session_atomic(gen_random_uuid(),lid,'chapter_conversation','lh-'||gen_random_uuid(),encode(extensions.digest(repeat('r',64),'sha256'),'hex'),true);
 if result->>'reason'<>'professor_monthly_budget_reached' then raise exception 'old_reserve_bypassed_current_professor_cap %',result; end if;
 if (select count(*) from ai_tutor_sessions)<>0 then raise exception 'blocked_start_created_session'; end if;
 update professor_budget_reservations set reserved_usd=4 where id=rid;
 result:=public.start_professor_session_atomic(gen_random_uuid(),lid,'chapter_conversation','lh-'||gen_random_uuid(),encode(extensions.digest(repeat('r',64),'sha256'),'hex'),true);
 if (result->>'allowed')::boolean is not true or (result->>'reserved_before_usd')::numeric<>4 then raise exception 'valid_start_lost_prior_period_hold %',result; end if;
 raise notice 'PASS: actual atomic-start gate includes carried holds and still admits in-budget sessions';
end $tests$;
rollback;

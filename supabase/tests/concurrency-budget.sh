#!/usr/bin/env bash
set -euo pipefail
# Refuse any external database target. This fixture contains no personal records.
[[ "${PGHOST:-}" == "127.0.0.1" && "${PGDATABASE:-}" == "learning_hub_test" ]] || exit 90
pids=()
for i in 1 2; do
 (
 psql -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SELECT set_config('request.jwt.claim.sub',(select id::text from profiles where learner_track='rafael_finance'),true);
SELECT start_professor_session_atomic(gen_random_uuid(),(select l.id from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='english_academy'),'chapter_conversation','lh-'||gen_random_uuid(),encode(extensions.digest(repeat('p',64),'sha256'),'hex'),true);
SELECT pg_sleep(1);
COMMIT;
SQL
 ) >"/tmp/lh-start-${i}.log" 2>&1 &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
cat /tmp/lh-start-*.log
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$BEGIN
 IF (select count(*) from ai_tutor_sessions)<>1 OR (select count(*) from professor_budget_reservations)<>1 THEN RAISE EXCEPTION 'simultaneous_start_over_reserved'; END IF;
END$$;
SET ROLE service_role;
SELECT complete_professor_session_v2(id,repeat('p',64),'{"transcript":[{"role":"user","text":"Fictional CI test"}],"durationSeconds":1,"modelUsage":[],"evaluation":{"model":"gpt-5.6-terra","estimatedCostUsd":0.01,"assessmentConfidence":20,"errors":[],"needsSpacedReview":false}}'::jsonb) FROM ai_tutor_sessions;
SQL
pids=()
for i in 1 2; do
 (
 psql -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET LOCAL ROLE service_role;
SELECT settle_professor_usage_v2(id,repeat('p',64),'{"realtimeModel":"gpt-realtime-2.1","modelUsage":[{"type":"llm_usage","inputTokens":2000,"inputCachedTokens":400,"outputTokens":1000,"inputTextTokens":1000,"inputCachedTextTokens":200,"outputTextTokens":500,"inputAudioTokens":1000,"inputCachedAudioTokens":200,"outputAudioTokens":500}],"evaluation":{"model":"gpt-5.6-terra","estimatedCostUsd":0.01}}'::jsonb) FROM ai_tutor_sessions;
SELECT pg_sleep(1);
COMMIT;
SQL
 ) >"/tmp/lh-settle-${i}.log" 2>&1 &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
cat /tmp/lh-settle-*.log
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$BEGIN
 IF (select count(*) from ai_usage_log)<>2 THEN RAISE EXCEPTION 'concurrent_settlement_duplicated_costs'; END IF;
 IF (select sum(estimated_cost_usd) from ai_usage_log)<>0.082960 THEN RAISE EXCEPTION 'wrong_concurrent_cost'; END IF;
 IF (select count(*) from professor_budget_reservations where status='settled')<>1 THEN RAISE EXCEPTION 'settlement_not_final'; END IF;
 IF (select count(*) from lh_internal.professor_settlement_receipts where state='settled')<>1 THEN RAISE EXCEPTION 'duplicate_receipts'; END IF;
END$$;
SELECT 'PASS: overlapping starts create one reservation; overlapping settlements create exactly two distinct charges, once each.' AS result;
SQL

-- CANDIDATE ONLY. Reviewed isolated target required. Apply together with atomic SQL
-- in ONE transaction: an atomic precondition failure must undo these additions too.
-- Deliberately no legacy v1 claim RPC or destructive deduplication.
create unique index audio_assets_atomic_lesson_type_uq
 on public.audio_assets(lesson_id,audio_type);
create unique index ai_usage_log_atomic_feature_request_uq
 on public.ai_usage_log(feature,request_id);
alter table public.audio_assets
 add column generation_request_id text,
 add column estimated_cost_usd numeric check(estimated_cost_usd is null or
  (estimated_cost_usd>=0 and estimated_cost_usd<>'NaN'::numeric));

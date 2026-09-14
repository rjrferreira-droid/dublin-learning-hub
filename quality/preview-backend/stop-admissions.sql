-- CANDIDATE ONLY. Containment, not destructive schema rollback.
-- Apply transactionally on the separately approved isolated backend.
-- Keep pending obligations visible to Professor; preserve every receipt and asset.
-- Provider requests already submitted may finish and settle normally.
begin;
lock table public.professor_budget_settings in share row exclusive mode;
lock table public.learning_hub_budget_settings in share row exclusive mode;
create or replace function public.begin_premium_audio_attempt_v2(
 p_attempt_id uuid,p_user_id uuid,p_lesson_id uuid,p_content_version integer,p_reservation_usd numeric
) returns jsonb language sql security definer set search_path=pg_catalog as $$
 select jsonb_build_object('allowed',false,'reason','audio_runtime_stopped');
$$;
create or replace function public.mark_premium_audio_submitted_v2(p_attempt_id uuid)
returns boolean language sql security definer set search_path=pg_catalog as $$
 select false;
$$;
revoke all on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric),
 public.mark_premium_audio_submitted_v2(uuid) from public,anon,authenticated;
grant execute on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric),
 public.mark_premium_audio_submitted_v2(uuid) to service_role;
commit;

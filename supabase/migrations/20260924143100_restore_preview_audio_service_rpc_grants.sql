-- The Edge runtime invokes these SECURITY DEFINER functions with the service
-- role. No browser role receives direct execution rights.
revoke all on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric) from public, anon, authenticated;
revoke all on function public.mark_premium_audio_submitted_v2(uuid) from public, anon, authenticated;
revoke all on function public.settle_premium_audio_attempt_v2(uuid,numeric,integer) from public, anon, authenticated;
revoke all on function public.close_premium_audio_attempt_v2(uuid) from public, anon, authenticated;

grant execute on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric) to service_role;
grant execute on function public.mark_premium_audio_submitted_v2(uuid) to service_role;
grant execute on function public.settle_premium_audio_attempt_v2(uuid,numeric,integer) to service_role;
grant execute on function public.close_premium_audio_attempt_v2(uuid) to service_role;

-- Read-only existing-V2 adoption inventory. No historical SQL, credentials,
-- learner content or identifiers. Run only against aazfyosqqeujureksqjs.
-- Target identity must be checked with list_branches before executing.
-- This is evidence, not installation authorization or proof of backup recovery.
select jsonb_build_object(
 'counts',jsonb_build_object(
  'profiles',(select count(*) from public.profiles),
  'courses',(select count(*) from public.courses),
  'modules',(select count(*) from public.modules),
  'lessons',(select count(*) from public.lessons),
  'audio_assets',(select count(*) from public.audio_assets),
  'sessions',(select count(*) from public.ai_tutor_sessions),
  'usage',(select count(*) from public.ai_usage_log),
  'reservations',(select count(*) from public.professor_budget_reservations),
  'auth_accounts',(select count(*) from auth.users),
  'storage_objects',(select count(*) from storage.objects)),
 'reservations',(select jsonb_agg(x) from (
  select status,count(*) as count,sum(reserved_usd) as reserved_usd,
   sum(actual_cost_usd) as actual_cost_usd
  from public.professor_budget_reservations group by status order by status)x),
 'sessions',(select jsonb_agg(x) from (
  select status,count(*) as count from public.ai_tutor_sessions group by status order by status)x),
 'curriculum',(select jsonb_agg(x) from (
  select sequence,is_published,count(*) as count from public.lessons
  group by sequence,is_published order by sequence,is_published)x),
 'audio_receipt_columns',(select coalesce(jsonb_agg(column_name order by column_name),'[]'::jsonb)
  from information_schema.columns where table_schema='public' and table_name='audio_assets'
  and column_name in ('generation_request_id','estimated_cost_usd')),
 'asset_duplicate_groups',(select count(*) from (
  select lesson_id,audio_type from public.audio_assets group by 1,2 having count(*)>1)x),
 'usage_duplicate_groups',(select count(*) from (
  select feature,request_id from public.ai_usage_log where request_id is not null
  group by 1,2 having count(*)>1)x),
 'routines',(select jsonb_agg(jsonb_build_object(
  'signature',p.oid::regprocedure::text,'security_definer',p.prosecdef,
  'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
  'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE')) order by p.proname)
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  and p.proname in ('reserve_professor_budget','start_professor_session_atomic',
   'professor_reservation_exposure_v2')),
 'rls',(select jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity) order by c.relname)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  and c.relname in ('profiles','courses','modules','lessons','audio_assets',
   'ai_tutor_sessions','ai_usage_log','professor_budget_reservations')),
 'budgets',jsonb_build_object(
  'global',(select jsonb_build_object('ai_hard_cap_usd',ai_hard_cap_usd,
   'professor_cap_usd',professor_cap_usd,'premium_audio_cap_usd',premium_audio_cap_usd)
   from public.learning_hub_budget_settings where id=1),
  'professor',(select jsonb_build_object('monthly_budget_usd',monthly_budget_usd,
   'hard_stop_enabled',hard_stop_enabled,'reservation_usd',reservation_usd,
   'premium_reservation_usd',premium_reservation_usd)
   from public.professor_budget_settings where feature='professor_livekit'))
) as inventory;

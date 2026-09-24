-- Read-only metadata inventory; no function bodies, historical SQL, user rows or secrets.
select n.nspname as schema_name,p.proname as routine_name,
 pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef as security_definer,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','lh_internal')
 and (p.proname like '%budget%' or p.proname like '%premium_audio%'
 or p.proname in ('start_professor_session_atomic','professor_reservation_exposure_v2'))
order by 1,2,3;
select table_schema,table_name,column_name,data_type from information_schema.columns
where (table_schema='public' and table_name in
 ('audio_assets','lessons','ai_usage_log','learning_hub_budget_settings','professor_budget_settings','professor_budget_reservations'))
 or (table_schema='lh_internal' and table_name in ('premium_audio_attempts','premium_audio_generation_claims'))
order by table_schema,table_name,ordinal_position;

create schema if not exists lh_recovery;
revoke all on schema lh_recovery from public, anon, authenticated;
create table if not exists lh_recovery.snapshots (
  snapshot_name text not null,
  object_kind text not null,
  object_name text not null,
  captured_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (snapshot_name, object_kind, object_name)
);
alter table lh_recovery.snapshots enable row level security;
revoke all on lh_recovery.snapshots from public, anon, authenticated;
do $snapshot$
declare t text; v_data jsonb;
begin
  foreach t in array array['ai_tutor_sessions','ai_tutor_turns','ai_usage_log','user_competency_scores','user_error_bank','spaced_reviews','curriculum_recommendations','learning_hub_budget_settings','professor_budget_settings','professor_budget_reservations','professor_validation_flags'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from public.%I r', t) into v_data;
    insert into lh_recovery.snapshots values ('pre-core-consolidation-2026-09-13','table_data',t,now(),v_data) on conflict do nothing;
  end loop;
  insert into lh_recovery.snapshots (snapshot_name,object_kind,object_name,payload)
  select 'pre-core-consolidation-2026-09-13','function',p.oid::regprocedure::text,
    jsonb_build_object('definition',pg_get_functiondef(p.oid),'acl',p.proacl)
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind='f'
  on conflict do nothing;
  insert into lh_recovery.snapshots (snapshot_name,object_kind,object_name,payload)
  select 'pre-core-consolidation-2026-09-13','migration',version,to_jsonb(m)
  from supabase_migrations.schema_migrations m on conflict do nothing;
  insert into lh_recovery.snapshots (snapshot_name,object_kind,object_name,payload)
  select 'pre-core-consolidation-2026-09-13','policies','public',coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
  from pg_policies p where schemaname='public' on conflict do nothing;
end $snapshot$;
comment on table lh_recovery.snapshots is 'Private, non-exported recovery snapshots for the V2 consolidation. Contains learner data; never publish to GitHub. Not a substitute for an offsite database backup.';
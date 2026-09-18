-- CANDIDATE ONLY. Not a migration and never applied to a connected project.
--
-- Additive v3 binding for the already reviewed v2 Premium Audio budget ledger.
-- It deliberately does not replace or modify the installed v2 package. Every
-- public v3 API is closed to PUBLIC, anon, authenticated and service_role until
-- a separate activation decision grants the exact server role.

begin;

-- A future reviewed Preview installation must fail promptly rather than wait
-- indefinitely behind an unrelated schema writer. These settings are local to
-- this transaction and have no runtime effect after the candidate commits.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Keep absence handling separate from ACL/definition introspection. PostgreSQL
-- is free to reorder boolean expressions; this guarantees a controlled error
-- even on an empty disposable database instead of an early regprocedure/ACL
-- lookup failure.
do $presence$
begin
  if current_user <> 'postgres'
     or not exists (
       select 1 from pg_catalog.pg_roles where rolname='anon'
     )
     or not exists (
       select 1 from pg_catalog.pg_roles where rolname='authenticated'
     )
     or not exists (
       select 1 from pg_catalog.pg_roles where rolname='service_role'
     )
     or exists (
       select 1 from pg_catalog.pg_roles
       where rolname in ('anon','authenticated')
         and (rolsuper or rolbypassrls)
     )
     or exists (
       select 1
       from pg_catalog.pg_roles api_role
       join pg_catalog.pg_roles elevated_role
         on elevated_role.rolsuper
         or elevated_role.rolbypassrls
         or elevated_role.rolname='postgres'
       where api_role.rolname in ('anon','authenticated')
         and pg_catalog.pg_has_role(
           api_role.oid,elevated_role.oid,'USAGE'
         )
     )
     or exists (
       select 1
       from pg_catalog.pg_auth_members membership
       join pg_catalog.pg_roles api_role on api_role.oid=membership.member
       where api_role.rolname in ('anon','authenticated')
     )
     or not exists (
       select 1 from pg_catalog.pg_roles
       where rolname='service_role' and rolbypassrls and not rolsuper
     )
     or to_regclass('lh_internal.premium_audio_attempts') is null
     or to_regclass('public.profiles') is null
     or to_regclass('auth.users') is null
     or to_regclass('public.courses') is null
     or to_regclass('public.modules') is null
     or to_regclass('public.lessons') is null
     or to_regclass('public.audio_assets') is null
     or to_regclass('public.ai_usage_log') is null
     or to_regclass('public.ai_tutor_sessions') is null
     or to_regclass('public.professor_budget_reservations') is null
     or to_regclass('public.professor_budget_settings') is null
     or to_regclass('public.learning_hub_budget_settings') is null
     or to_regclass('lh_internal.professor_settlement_receipts') is null
     or to_regclass('lh_internal.premium_audio_one_pending_lesson') is null
     or to_regclass('public.audio_assets_atomic_lesson_type_uq') is null
     or to_regclass('public.ai_usage_log_atomic_feature_request_uq') is null
     or to_regprocedure('lh_internal.premium_audio_pending_usd()') is null
     or to_regprocedure('lh_internal.professor_reservation_exposure(timestamptz)') is null
     or to_regprocedure('public.professor_reservation_exposure_v2()') is null
     or to_regprocedure('public.reserve_professor_budget(text)') is null
     or to_regprocedure('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)') is null
     or to_regprocedure('public.settle_professor_usage_v2(uuid,text,jsonb)') is null
     or to_regprocedure('lh_internal.protect_atomic_professor_session()') is null
     or to_regprocedure('lh_internal.enforce_profile_server_assignment_v1()') is null
     or to_regprocedure('public.handle_new_user()') is null
     or to_regprocedure('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)') is null
     or to_regprocedure('public.mark_premium_audio_submitted_v2(uuid)') is null
     or to_regprocedure('public.close_premium_audio_attempt_v2(uuid)') is null
     or to_regprocedure('public.settle_premium_audio_attempt_v2(uuid,numeric,integer)') is null
     or to_regprocedure('extensions.digest(text,text)') is null
     or exists (
       select 1
       from (values
         ('public','profiles','id','uuid'),
         ('public','profiles','display_name','text'),
         ('public','profiles','learner_track','text'),
         ('public','profiles','preferred_language','text'),
         ('public','profiles','timezone','text'),
         ('public','profiles','created_at','timestamptz'),
         ('public','profiles','updated_at','timestamptz'),
         ('auth','users','id','uuid'),
         ('public','courses','id','uuid'),
         ('public','courses','learner_track','text'),
         ('public','courses','is_active','bool'),
         ('public','modules','id','uuid'),
         ('public','modules','course_id','uuid'),
         ('public','modules','is_published','bool'),
         ('public','lessons','id','uuid'),
         ('public','lessons','module_id','uuid'),
         ('public','lessons','slug','text'),
         ('public','lessons','content_version','int4'),
         ('public','lessons','sequence','int4'),
         ('public','lessons','is_published','bool'),
         ('public','audio_assets','id','uuid'),
         ('public','audio_assets','lesson_id','uuid'),
         ('public','audio_assets','audio_type','text'),
         ('public','audio_assets','storage_path','text'),
         ('public','audio_assets','generation_request_id','text'),
         ('public','audio_assets','estimated_cost_usd','numeric'),
         ('public','audio_assets','transcript_pt','text'),
         ('public','audio_assets','voice','text'),
         ('public','audio_assets','generated_at','timestamptz'),
         ('public','ai_usage_log','id','int8'),
         ('public','ai_usage_log','user_id','uuid'),
         ('public','ai_usage_log','feature','text'),
         ('public','ai_usage_log','model','text'),
         ('public','ai_usage_log','estimated_cost_usd','numeric'),
         ('public','ai_usage_log','characters','int8'),
         ('public','ai_usage_log','request_id','text'),
         ('public','ai_usage_log','created_at','timestamptz'),
         ('public','ai_tutor_sessions','id','uuid'),
         ('public','ai_tutor_sessions','user_id','uuid'),
         ('public','ai_tutor_sessions','budget_reservation_id','uuid'),
         ('public','ai_tutor_sessions','startup_request_id','uuid'),
         ('public','professor_budget_reservations','id','uuid'),
         ('public','professor_budget_reservations','user_id','uuid'),
         ('public','professor_budget_reservations','feature','text'),
         ('public','professor_budget_reservations','month_start','date'),
         ('public','professor_budget_reservations','reserved_usd','numeric'),
         ('public','professor_budget_reservations','max_session_seconds','int4'),
         ('public','professor_budget_reservations','status','text'),
         ('public','professor_budget_reservations','actual_cost_usd','numeric'),
         ('public','professor_budget_reservations','settled_at','timestamptz'),
         ('public','professor_budget_reservations','created_at','timestamptz'),
         ('lh_internal','professor_settlement_receipts','session_id','uuid'),
         ('lh_internal','professor_settlement_receipts','state','text'),
         ('lh_internal','professor_settlement_receipts','realtime_cost_usd','numeric'),
         ('lh_internal','professor_settlement_receipts','evaluation_cost_usd','numeric'),
         ('lh_internal','premium_audio_attempts','id','uuid'),
         ('lh_internal','premium_audio_attempts','user_id','uuid'),
         ('lh_internal','premium_audio_attempts','lesson_id','uuid'),
         ('lh_internal','premium_audio_attempts','content_version','int4'),
         ('lh_internal','premium_audio_attempts','reserved_usd','numeric'),
         ('lh_internal','premium_audio_attempts','state','text'),
         ('lh_internal','premium_audio_attempts','created_at','timestamptz'),
         ('lh_internal','premium_audio_attempts','lease_until','timestamptz'),
         ('lh_internal','premium_audio_attempts','submitted_at','timestamptz'),
         ('lh_internal','premium_audio_attempts','settled_at','timestamptz'),
         ('lh_internal','premium_audio_attempts','estimated_cost_usd','numeric'),
         ('lh_internal','premium_audio_attempts','characters','int4'),
         ('public','professor_budget_settings','feature','text'),
         ('public','professor_budget_settings','monthly_budget_usd','numeric'),
         ('public','professor_budget_settings','reservation_usd','numeric'),
         ('public','professor_budget_settings','premium_reservation_usd','numeric'),
         ('public','professor_budget_settings','max_session_seconds','int4'),
         ('public','professor_budget_settings','hard_stop_enabled','bool'),
         ('public','learning_hub_budget_settings','id','int4'),
         ('public','learning_hub_budget_settings','ai_hard_cap_usd','numeric'),
         ('public','learning_hub_budget_settings','professor_cap_usd','numeric'),
         ('public','learning_hub_budget_settings','premium_audio_cap_usd','numeric')
       ) expected(table_schema,table_name,column_name,udt_name)
       left join information_schema.columns actual
         on actual.table_schema=expected.table_schema
        and actual.table_name=expected.table_name
        and actual.column_name=expected.column_name
       where actual.column_name is null
          or actual.udt_name is distinct from expected.udt_name
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;
end
$presence$;

-- Freeze every row-level prerequisite while its exact topology and existing
-- obligations are checked. This also closes the installation window in which
-- a learner could change profile identity before the protection trigger exists.
lock table
  auth.users,
  public.profiles,
  public.courses,
  public.modules,
  public.lessons,
  public.audio_assets,
  public.ai_usage_log,
  public.professor_budget_settings,
  public.learning_hub_budget_settings,
  public.professor_budget_reservations,
  public.ai_tutor_sessions,
  lh_internal.professor_settlement_receipts,
  lh_internal.premium_audio_attempts
in share row exclusive mode;

do $guard$
begin
  if to_regclass('lh_internal.premium_audio_attempts') is null
     or to_regclass('public.audio_assets') is null
     or to_regclass('public.ai_usage_log') is null
     or to_regclass('public.audio_assets_atomic_lesson_type_uq') is null
     or to_regclass('public.ai_usage_log_atomic_feature_request_uq') is null
     or to_regclass('lh_internal.premium_audio_one_pending_lesson') is null
     or not exists (
       select 1 from pg_catalog.pg_index i
       where indexrelid=to_regclass('public.audio_assets_atomic_lesson_type_uq')
         and indrelid=to_regclass('public.audio_assets')
         and indisunique and indisvalid and indisready and indislive
         and indpred is null and indexprs is null
         and indnkeyatts=2
         and (
           select array_agg(a.attname::text order by indexed_column.ord)
           from unnest(i.indkey) with ordinality indexed_column(attnum,ord)
           join pg_catalog.pg_attribute a
             on a.attrelid=i.indrelid and a.attnum=indexed_column.attnum
         )=array['lesson_id','audio_type']
     )
     or not exists (
       select 1 from pg_catalog.pg_index i
       where indexrelid=to_regclass('public.ai_usage_log_atomic_feature_request_uq')
         and indrelid=to_regclass('public.ai_usage_log')
         and indisunique and indisvalid and indisready and indislive
         and indpred is null and indexprs is null
         and indnkeyatts=2
         and (
           select array_agg(a.attname::text order by indexed_column.ord)
           from unnest(i.indkey) with ordinality indexed_column(attnum,ord)
           join pg_catalog.pg_attribute a
             on a.attrelid=i.indrelid and a.attnum=indexed_column.attnum
         )=array['feature','request_id']
     )
     or not exists (
       select 1 from pg_catalog.pg_index i
       where indexrelid=to_regclass('lh_internal.premium_audio_one_pending_lesson')
         and indrelid=to_regclass('lh_internal.premium_audio_attempts')
         and indisunique and indisvalid and indisready and indislive
         and indexprs is null and indpred is not null and indnkeyatts=1
         and (
           select array_agg(a.attname::text order by indexed_column.ord)
           from unnest(i.indkey) with ordinality indexed_column(attnum,ord)
           join pg_catalog.pg_attribute a
             on a.attrelid=i.indrelid and a.attnum=indexed_column.attnum
         )=array['lesson_id']
         and regexp_replace(
           pg_catalog.pg_get_expr(i.indpred,i.indrelid),E'\\s+','','g'
         )=any(array[
           '(state=ANY(ARRAY[''reserved''::text,''submitted''::text,''uncertain''::text]))',
           'state=ANY(ARRAY[''reserved''::text,''submitted''::text,''uncertain''::text])'
         ])
     )
     or to_regprocedure('lh_internal.premium_audio_pending_usd()') is null
     or to_regprocedure('lh_internal.professor_reservation_exposure(timestamptz)') is null
     or to_regprocedure('public.professor_reservation_exposure_v2()') is null
     or to_regprocedure('public.reserve_professor_budget(text)') is null
     or to_regprocedure('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)') is null
     or to_regprocedure('public.settle_professor_usage_v2(uuid,text,jsonb)') is null
     or to_regprocedure('lh_internal.protect_atomic_professor_session()') is null
     or to_regprocedure('lh_internal.enforce_profile_server_assignment_v1()') is null
     or to_regprocedure('public.handle_new_user()') is null
     or to_regprocedure('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)') is null
     or to_regprocedure('public.mark_premium_audio_submitted_v2(uuid)') is null
     or to_regprocedure('public.close_premium_audio_attempt_v2(uuid)') is null
     or to_regprocedure('public.settle_premium_audio_attempt_v2(uuid,numeric,integer)') is null
     or exists (
       select 1
       from (values
         ('public.profiles'),
         ('public.courses'),
         ('public.modules'),
         ('public.lessons'),
         ('public.audio_assets'),
         ('public.professor_budget_settings'),
         ('public.learning_hub_budget_settings'),
         ('public.professor_budget_reservations'),
         ('public.ai_tutor_sessions'),
         ('public.ai_usage_log'),
         ('lh_internal.professor_settlement_receipts'),
         ('lh_internal.premium_audio_attempts')
       ) expected(relation_name)
       join pg_catalog.pg_class c on c.oid=to_regclass(expected.relation_name)
       where c.relkind<>'r'
          or not c.relrowsecurity or c.relforcerowsecurity
          or pg_catalog.pg_get_userbyid(c.relowner)<>'postgres'
     )
     or (select count(*) from pg_catalog.pg_policy
         where polrelid=any(array[
           to_regclass('public.professor_budget_settings'),
           to_regclass('public.learning_hub_budget_settings'),
           to_regclass('public.professor_budget_reservations'),
           to_regclass('public.ai_tutor_sessions'),
           to_regclass('public.ai_usage_log'),
           to_regclass('lh_internal.professor_settlement_receipts'),
           to_regclass('lh_internal.premium_audio_attempts')
         ]))<>2
     -- The authored identity and asset source must remain server-owned. Raw
     -- grants are harmless under RLS only while no write policy admits these
     -- API roles; any client-write policy (notably profiles.learner_track)
     -- blocks this still-closed candidate before installation.
     or exists (
       select 1
       from pg_catalog.pg_policy policy
       where policy.polrelid=any(array[
         to_regclass('public.courses'),
         to_regclass('public.modules'),
         to_regclass('public.lessons'),
         to_regclass('public.audio_assets')
       ])
         and policy.polcmd in ('*','a','w','d')
         and (
           policy.polroles='{0}'::oid[]
           or policy.polroles && array[
             (select oid from pg_catalog.pg_roles where rolname='anon'),
             (select oid from pg_catalog.pg_roles where rolname='authenticated')
           ]::oid[]
         )
     )
     or (select count(*) from pg_catalog.pg_policy
         where polrelid=to_regclass('public.profiles'))<>2
     or (select count(*) from pg_catalog.pg_policy
         where polrelid=any(array[
           to_regclass('public.courses'),
           to_regclass('public.modules'),
           to_regclass('public.lessons'),
           to_regclass('public.audio_assets')
         ]))<>4
     or exists (
       select 1
       from (values
         ('public.courses','courses_read',
          '1f7c2dacb8983c632a51cae84b52fa711136198a9925b948358db11eba42bc58'),
         ('public.modules','modules_read',
          'bf35b765383feaa21d67863917d312eb2fe5aed864d8cb9178b416f66614d64b'),
         ('public.lessons','lessons_read',
          'bf35b765383feaa21d67863917d312eb2fe5aed864d8cb9178b416f66614d64b'),
         ('public.audio_assets','audio_assets_read',
          'b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b')
       ) expected(relation_name,policy_name,qual_sha256)
       where not exists (
         select 1 from pg_catalog.pg_policy policy
         where policy.polrelid=to_regclass(expected.relation_name)
           and policy.polname=expected.policy_name
           and policy.polpermissive and policy.polcmd='r'
           and policy.polroles=array[
             (select oid from pg_catalog.pg_roles where rolname='authenticated')
           ]::oid[]
           and encode(extensions.digest(
             pg_catalog.pg_get_expr(policy.polqual,policy.polrelid),'sha256'
           ),'hex')=expected.qual_sha256
           and policy.polwithcheck is null
       )
     )
     -- Match the reviewed raw source ACL without hard-coding PostgreSQL's
     -- version-dependent table privilege count (PG17 adds MAINTAIN).
     or exists (
       select 1
       from (values
         ('public.courses'),('public.modules'),('public.lessons'),
         ('public.audio_assets')
       ) expected(relation_name)
       join pg_catalog.pg_class c on c.oid=to_regclass(expected.relation_name)
       cross join lateral aclexplode(
         coalesce(c.relacl,acldefault('r',c.relowner))
       ) acl
       left join pg_catalog.pg_roles role on role.oid=acl.grantee
       where acl.grantee=0
          or acl.grantor<>c.relowner
          or acl.is_grantable
          or (
            acl.grantee<>c.relowner
            and coalesce(role.rolname,'') not in (
              'anon','authenticated','service_role'
            )
          )
     )
     or exists (
       select 1
       from (values
         ('public.courses'),('public.modules'),('public.lessons'),
         ('public.audio_assets')
       ) expected(relation_name)
       join pg_catalog.pg_class c on c.oid=to_regclass(expected.relation_name)
       cross join (values ('anon'),('authenticated'),('service_role'))
         expected_role(role_name)
       where exists (
         select owner_acl.privilege_type
         from aclexplode(acldefault('r',c.relowner)) owner_acl
         where owner_acl.grantee=c.relowner
         except
         select actual_acl.privilege_type
         from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) actual_acl
         join pg_catalog.pg_roles actual_role on actual_role.oid=actual_acl.grantee
         where actual_role.rolname=expected_role.role_name
       )
     )
     -- Profile assignment containment is a separate prerequisite candidate.
     -- Audio v3 accepts only its exact post-state: no browser provisioning,
     -- table-level UPDATE, or track/id column grant.
     or exists (
       select 1
       from (values
         ('anon','SELECT'),('anon','INSERT'),('anon','UPDATE'),
         ('anon','DELETE'),('anon','TRUNCATE'),('anon','REFERENCES'),
         ('anon','TRIGGER'),
         ('authenticated','INSERT'),('authenticated','UPDATE'),
         ('authenticated','DELETE'),('authenticated','TRUNCATE'),
         ('authenticated','REFERENCES'),('authenticated','TRIGGER')
       ) denied(role_name,privilege_name)
       where has_table_privilege(
         denied.role_name,'public.profiles',denied.privilege_name
       )
     )
     or not has_table_privilege(
       'authenticated','public.profiles','SELECT'
     )
     or exists (
       select 1
       from pg_catalog.pg_class c
       cross join lateral aclexplode(
         coalesce(c.relacl,acldefault('r',c.relowner))
       ) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       where c.oid=to_regclass('public.profiles')
         and (
           acl.grantee=0
           or acl.grantor<>c.relowner
           or acl.is_grantable
           or coalesce(grantee.rolname,'') not in (
             'postgres','authenticated','service_role'
           )
           or (
             grantee.rolname='authenticated'
             and acl.privilege_type<>'SELECT'
           )
         )
     )
     or exists (
       select owner_acl.privilege_type
       from pg_catalog.pg_class c
       cross join lateral aclexplode(acldefault('r',c.relowner)) owner_acl
       where c.oid=to_regclass('public.profiles')
         and owner_acl.grantee=c.relowner
       except
       select service_acl.privilege_type
       from pg_catalog.pg_class c
       cross join lateral aclexplode(
         coalesce(c.relacl,acldefault('r',c.relowner))
       ) service_acl
       join pg_catalog.pg_roles role on role.oid=service_acl.grantee
       where c.oid=to_regclass('public.profiles')
         and role.rolname='service_role'
     )
     or exists (
       select 1
       from (values
         ('id'),('learner_track'),('created_at'),('updated_at')
       ) denied(column_name)
       where has_column_privilege(
         'authenticated','public.profiles',denied.column_name,'UPDATE'
       )
     )
     or exists (
       select 1
       from (values
         ('display_name'),('preferred_language'),('timezone')
       ) allowed(column_name)
       where not has_column_privilege(
         'authenticated','public.profiles',allowed.column_name,'UPDATE'
       )
     )
     or (select count(*)
         from pg_catalog.pg_attribute attribute
         cross join lateral aclexplode(attribute.attacl) acl
         where attribute.attrelid=to_regclass('public.profiles')
           and attribute.attnum>0 and not attribute.attisdropped)<>3
     or exists (
       select 1
       from pg_catalog.pg_attribute attribute
       cross join lateral aclexplode(attribute.attacl) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       left join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
       where attribute.attrelid=to_regclass('public.profiles')
         and attribute.attnum>0 and not attribute.attisdropped
         and (
           attribute.attname not in (
             'display_name','preferred_language','timezone'
           )
           or grantee.rolname<>'authenticated'
           or grantor.rolname<>'postgres'
           or acl.privilege_type<>'UPDATE'
           or acl.is_grantable
         )
     )
     or not exists (
       select 1 from pg_catalog.pg_policy policy
       where policy.polrelid=to_regclass('public.profiles')
         and policy.polname='profiles_select_own'
         and policy.polpermissive and policy.polcmd='r'
         and policy.polroles=array[
           (select oid from pg_catalog.pg_roles where rolname='authenticated')
         ]::oid[]
         and encode(extensions.digest(
           pg_catalog.pg_get_expr(policy.polqual,policy.polrelid),'sha256'
         ),'hex')='593ac56f4ca8fd31037039474d979d9151ac95a93ccad97c91e6c49ad2258f9c'
         and policy.polwithcheck is null
     )
     or not exists (
       select 1 from pg_catalog.pg_policy policy
       where policy.polrelid=to_regclass('public.profiles')
         and policy.polname='profiles_update_own'
         and policy.polpermissive and policy.polcmd='w'
         and policy.polroles=array[
           (select oid from pg_catalog.pg_roles where rolname='authenticated')
         ]::oid[]
         and encode(extensions.digest(
           pg_catalog.pg_get_expr(policy.polqual,policy.polrelid),'sha256'
         ),'hex')='593ac56f4ca8fd31037039474d979d9151ac95a93ccad97c91e6c49ad2258f9c'
         and encode(extensions.digest(
           pg_catalog.pg_get_expr(policy.polwithcheck,policy.polrelid),'sha256'
         ),'hex')='593ac56f4ca8fd31037039474d979d9151ac95a93ccad97c91e6c49ad2258f9c'
     )
     or not exists (
       select 1
       from pg_catalog.pg_policy policy
       where policy.polrelid=to_regclass('public.ai_tutor_sessions')
         and policy.polname='ai_tutor_sessions_own_all'
         and policy.polpermissive and policy.polcmd='*'
         and policy.polroles=array[
           (select oid from pg_catalog.pg_roles where rolname='authenticated')
         ]::oid[]
         and encode(extensions.digest(
           pg_catalog.pg_get_expr(policy.polqual,policy.polrelid),'sha256'
         ),'hex')='aa06a7622e21fd0ea5f47a3ca5c3ecaa67b99d6b9a6b8bc049f59a9f12f957cb'
         and encode(extensions.digest(
           pg_catalog.pg_get_expr(policy.polwithcheck,policy.polrelid),'sha256'
         ),'hex')='aa06a7622e21fd0ea5f47a3ca5c3ecaa67b99d6b9a6b8bc049f59a9f12f957cb'
     )
     or not exists (
       select 1
       from pg_catalog.pg_policy policy
       where policy.polrelid=to_regclass('public.ai_usage_log')
         and policy.polname='ai_usage_own_read'
         and policy.polpermissive and policy.polcmd='r'
         and policy.polroles=array[
           (select oid from pg_catalog.pg_roles where rolname='authenticated')
         ]::oid[]
         and encode(extensions.digest(
           pg_catalog.pg_get_expr(policy.polqual,policy.polrelid),'sha256'
         ),'hex')='d234b2aea4e8dd40276f8f9b8238302e3a0796cc3111fe8c14fc455189a7d970'
         and policy.polwithcheck is null
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid=to_regclass('public.ai_tutor_sessions')
         and trigger.tgname='protect_atomic_professor_session'
         and not trigger.tgisinternal
         and trigger.tgenabled='O'
         and trigger.tgtype=31
         and trigger.tgqual is null
         and trigger.tgnargs=0
         and trigger.tgattr::text=''
         and trigger.tgfoid=to_regprocedure(
           'lh_internal.protect_atomic_professor_session()'
         )
     )
     or (select count(*) from pg_catalog.pg_trigger
         where tgrelid=to_regclass('public.ai_tutor_sessions')
           and not tgisinternal)<>1
     or (select count(*) from pg_catalog.pg_trigger
         where tgrelid=to_regclass('public.profiles')
           and not tgisinternal)<>2
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       join pg_catalog.pg_proc p on p.oid=trigger.tgfoid
       join pg_catalog.pg_language language on language.oid=p.prolang
       where trigger.tgrelid=to_regclass('public.profiles')
         and trigger.tgname='profiles_updated_at'
         and not trigger.tgisinternal and trigger.tgenabled='O'
         and trigger.tgtype=19 and trigger.tgqual is null
         and trigger.tgnargs=0 and trigger.tgattr::text=''
         and p.oid=to_regprocedure('public.set_updated_at()')
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '3c6d6c41d6262a20e7c102dbd49bb3383bd86a4138c8a3ab6b9b04a1ec2420a5'
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and language.lanname='plpgsql' and p.provolatile='v'
         and not p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=public']::text[]
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid=to_regclass('public.profiles')
         and trigger.tgname='profiles_server_assignment_guard_v1'
         and not trigger.tgisinternal and trigger.tgenabled='O'
         and trigger.tgtype=21 and trigger.tgqual is null
         and trigger.tgnargs=0 and trigger.tgattr::text=''
         and trigger.tgfoid=to_regprocedure(
           'lh_internal.enforce_profile_server_assignment_v1()'
         )
     )
     or not exists (
       select 1
       from pg_catalog.pg_proc p
       join pg_catalog.pg_language language on language.oid=p.prolang
       where p.oid=to_regprocedure(
           'lh_internal.enforce_profile_server_assignment_v1()'
         )
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '3a79818cfc6f2e819e8bf2c4414d5a6a02f6c390203bde01033ad34a7148cd72'
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and language.lanname='plpgsql' and p.provolatile='v'
         and not p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=pg_catalog']::text[]
     )
     or exists (
       select 1
       from pg_catalog.pg_proc p
       cross join lateral aclexplode(
         coalesce(p.proacl,acldefault('f',p.proowner))
       ) acl
       where p.oid=to_regprocedure(
           'lh_internal.enforce_profile_server_assignment_v1()'
         )
         and (
           acl.grantee<>p.proowner
           or acl.grantor<>p.proowner
           or acl.privilege_type<>'EXECUTE'
           or acl.is_grantable
         )
     )
     or not exists (
       select 1
       from pg_catalog.pg_proc p
       join pg_catalog.pg_language language on language.oid=p.prolang
       where p.oid=to_regprocedure('public.handle_new_user()')
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '5cf21e46fa593a184225c19283c8b04da164f3537be6f0c407d36fb4fa99aecb'
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and language.lanname='plpgsql' and p.provolatile='v'
         and p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=public']::text[]
     )
     or exists (
       select 1
       from pg_catalog.pg_proc p
       cross join lateral aclexplode(
         coalesce(p.proacl,acldefault('f',p.proowner))
       ) acl
       where p.oid=to_regprocedure('public.handle_new_user()')
         and (
           acl.grantee<>p.proowner
           or acl.grantor<>p.proowner
           or acl.privilege_type<>'EXECUTE'
           or acl.is_grantable
         )
     )
     or exists (
       select 1 from pg_catalog.pg_trigger
       where tgrelid in (
         to_regclass('lh_internal.premium_audio_attempts'),
         to_regclass('public.ai_usage_log'),
         to_regclass('public.audio_assets'),
         to_regclass('public.professor_budget_settings'),
         to_regclass('public.learning_hub_budget_settings'),
         to_regclass('public.professor_budget_reservations'),
         to_regclass('lh_internal.professor_settlement_receipts')
       ) and not tgisinternal
     )
     or exists (
       select 1 from pg_catalog.pg_trigger
       where tgrelid=to_regclass('auth.users') and not tgisinternal
     )
     or exists (
       select 1
       from pg_catalog.pg_rewrite rewrite_rule
       where rewrite_rule.ev_class=any(array[
         to_regclass('public.profiles'),
         to_regclass('public.courses'),
         to_regclass('public.modules'),
         to_regclass('public.lessons'),
         to_regclass('public.audio_assets'),
         to_regclass('public.ai_usage_log'),
         to_regclass('public.professor_budget_settings'),
         to_regclass('public.learning_hub_budget_settings'),
         to_regclass('public.professor_budget_reservations'),
         to_regclass('public.ai_tutor_sessions'),
         to_regclass('lh_internal.professor_settlement_receipts'),
         to_regclass('lh_internal.premium_audio_attempts')
       ])
         and rewrite_rule.rulename<>'_RETURN'
     )
     or not exists (
       select 1 from pg_catalog.pg_class
       where oid=to_regclass('lh_internal.premium_audio_attempts')
         and relrowsecurity
     )
     or has_table_privilege(
       'anon','lh_internal.premium_audio_attempts',
       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
     )
     or has_table_privilege(
       'authenticated','lh_internal.premium_audio_attempts',
       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
     )
     or has_table_privilege(
       'service_role','lh_internal.premium_audio_attempts',
       'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
     )
     or exists (
       select 1
       from pg_catalog.pg_class c
       cross join lateral aclexplode(
         coalesce(c.relacl,acldefault('r',c.relowner))
       ) acl
       where c.oid=to_regclass('lh_internal.premium_audio_attempts')
         and acl.grantee=0
     )
     or exists (
       select 1
       from pg_catalog.pg_class c
       cross join lateral aclexplode(
         coalesce(c.relacl,acldefault('r',c.relowner))
       ) acl
       where c.oid=to_regclass('lh_internal.premium_audio_attempts')
         and (
           acl.grantee<>c.relowner
           or acl.grantor<>c.relowner
           or acl.is_grantable
         )
     )
     or exists (
       select 1 from pg_catalog.pg_policy
       where polrelid=to_regclass('lh_internal.premium_audio_attempts')
     )
     or has_function_privilege(
       'anon',
       'public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon','public.mark_premium_audio_submitted_v2(uuid)','EXECUTE'
     )
     or has_function_privilege(
       'authenticated','public.mark_premium_audio_submitted_v2(uuid)','EXECUTE'
     )
     or has_function_privilege(
       'service_role','public.mark_premium_audio_submitted_v2(uuid)','EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'lh_internal.professor_reservation_exposure(timestamptz)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'lh_internal.professor_reservation_exposure(timestamptz)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'lh_internal.professor_reservation_exposure(timestamptz)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon','public.close_premium_audio_attempt_v2(uuid)','EXECUTE'
     )
     or has_function_privilege(
       'authenticated','public.close_premium_audio_attempt_v2(uuid)','EXECUTE'
     )
     or not has_function_privilege(
       'service_role','public.close_premium_audio_attempt_v2(uuid)','EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.settle_premium_audio_attempt_v2(uuid,numeric,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.settle_premium_audio_attempt_v2(uuid,numeric,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.settle_premium_audio_attempt_v2(uuid,numeric,integer)',
       'EXECUTE'
     )
     -- Exact ACL topology: only the owner and the reviewed role list may
     -- execute, and no non-owner grant may carry grant option.
     or exists (
       select 1
       from (values
         ('lh_internal.premium_audio_pending_usd()',array['service_role']::text[]),
         ('lh_internal.professor_reservation_exposure(timestamptz)',array['service_role']::text[]),
         ('public.professor_reservation_exposure_v2()',array['service_role']::text[]),
         ('lh_internal.protect_atomic_professor_session()',array[]::text[]),
         ('public.settle_professor_usage_v2(uuid,text,jsonb)',array['service_role']::text[]),
         ('public.reserve_professor_budget(text)',array[]::text[]),
         ('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)',array['authenticated','service_role']::text[]),
         ('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)',array[]::text[]),
         ('public.mark_premium_audio_submitted_v2(uuid)',array[]::text[]),
         ('public.close_premium_audio_attempt_v2(uuid)',array['service_role']::text[]),
         ('public.settle_premium_audio_attempt_v2(uuid,numeric,integer)',array['service_role']::text[])
       ) expected(signature,allowed_roles)
       join pg_catalog.pg_proc p on p.oid=to_regprocedure(expected.signature)
       where exists (
         select 1
         from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
         left join pg_catalog.pg_roles role on role.oid=acl.grantee
         where acl.privilege_type<>'EXECUTE'
            or (
              acl.grantee<>p.proowner
              and (
                acl.grantor<>p.proowner
                or
                role.rolname is null
                or not role.rolname=any(expected.allowed_roles)
                or acl.is_grantable
              )
            )
       ) or exists (
         select 1
         from unnest(expected.allowed_roles) allowed(role_name)
         where not has_function_privilege(
           allowed.role_name,expected.signature,'EXECUTE'
         )
       )
     )
     -- V3 delegates budget admission and the provider fence to this exact,
     -- reviewed V2 package. Token/sentinel checks are insufficient: comments
     -- could preserve them while deleting the actual guard. Attest the whole
     -- stored body plus execution metadata before installing anything.
     or exists (
       select 1
       from (values
         ('lh_internal.premium_audio_pending_usd()',
          'fe2cf5a12c5c2a37cd561a39b9ce107d637bad4f6733f0b93837a5ef4cd543e8',
          'numeric','','sql','s','search_path=pg_catalog',true,0,null),
         ('lh_internal.professor_reservation_exposure(timestamptz)',
          '1cf4d2b31083ce4dc012b65fdced56af7481f14f2c809be5db8d65b47e1d11a5',
          'jsonb','p_as_of','sql','s','search_path=pg_catalog,public',
          false,1,'now()'),
         ('public.professor_reservation_exposure_v2()',
          '45c57ef062f1b9796918111bca8e82d6ffc3d410f4564d5ad99fad7f494c77cb',
          'jsonb','','sql','s','search_path=pg_catalog',false,0,null),
         ('lh_internal.protect_atomic_professor_session()',
          '320d019dc62a6f8cda1631e718ac5f1f91feca9e73ed58eef3cef722ed74103d',
          'trigger','','plpgsql','v','search_path=pg_catalog',false,0,null),
         ('public.settle_professor_usage_v2(uuid,text,jsonb)',
          'e47a305d456a6b152df969c6f401a3c95e4d15430d96824149c8a9cbcc41bd82',
          'jsonb','p_session_id,p_callback_token,p_payload','plpgsql','v',
          'search_path=public,extensions,pg_temp',false,0,null),
         ('public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)',
          '94029cb23911a6fc969a2c6a6c90352f7d77380e938c9a3ec384bfef4aa8ba13',
          'jsonb','p_request_id,p_lesson_id,p_mode,p_room_name,p_callback_hash,p_validation_mode',
          'plpgsql','v','search_path=pg_catalog,public,extensions',true,1,'false'),
         ('public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric)',
          '0f58c6191b641ae0c6eec8c5596343ad8235c9981904647015b42ba1bf0b2f29',
          'jsonb','p_attempt_id,p_user_id,p_lesson_id,p_content_version,p_reservation_usd',
          'plpgsql','v','search_path=pg_catalog,public,lh_internal',true,0,null),
         ('public.mark_premium_audio_submitted_v2(uuid)',
          '9e4802a4974335e1e49dc05c3331e0cdfc2f3740cf50676ea1369a19dacc18c6',
          'boolean','p_attempt_id','plpgsql','v',
          'search_path=pg_catalog,public,lh_internal',true,0,null),
         ('public.close_premium_audio_attempt_v2(uuid)',
          '44b92a4c161ef214a18eb98879111fb764f5f2fb71fcc2e9639ea385480ccda3',
          'text','p_attempt_id','plpgsql','v',
          'search_path=pg_catalog,public,lh_internal',true,0,null),
         ('public.settle_premium_audio_attempt_v2(uuid,numeric,integer)',
          '4734c461f23e858e004c2a98ca6c3e2278138e66684538caa4b22c76e2f67534',
          'boolean','p_attempt_id,p_estimated_cost_usd,p_characters',
          'plpgsql','v','search_path=pg_catalog,public,lh_internal',true,0,null)
       ) expected(
         signature,source_sha256,return_type,arg_names,
         language_name,volatility,normalized_config,security_definer,
         argument_default_count,argument_defaults
       )
       join pg_catalog.pg_proc p
         on p.oid=to_regprocedure(expected.signature)
       join pg_catalog.pg_language language on language.oid=p.prolang
       where encode(extensions.digest(p.prosrc,'sha256'),'hex')
               is distinct from expected.source_sha256
          or p.prorettype is distinct from to_regtype(expected.return_type)
          or array_to_string(coalesce(p.proargnames,array[]::text[]),',')
               is distinct from expected.arg_names
          or p.proallargtypes is not null
          or p.proargmodes is not null
          or p.pronargdefaults is distinct from expected.argument_default_count
          or pg_catalog.pg_get_expr(p.proargdefaults,0)
               is distinct from expected.argument_defaults
          or language.lanname is distinct from expected.language_name
          or p.provolatile::text is distinct from expected.volatility
          or p.prosecdef is distinct from expected.security_definer
          or p.proisstrict
          or p.proleakproof
          or p.proretset
          or p.proparallel<>'u'
          or p.prokind<>'f'
          or pg_catalog.pg_get_userbyid(p.proowner)<>'postgres'
          or array_length(p.proconfig,1) is distinct from 1
          or regexp_replace(p.proconfig[1],E'\\s+','','g')
               is distinct from expected.normalized_config
     )
     or exists (
       select 1
       from pg_catalog.pg_proc p
       join pg_catalog.pg_language language on language.oid=p.prolang
       where p.oid=to_regprocedure('public.reserve_professor_budget(text)')
         and (
           encode(extensions.digest(p.prosrc,'sha256'),'hex')
             is distinct from
               'f60b6d63cdc9fdb3ab2503fc5fc1afa15e464ff3ccb37283a36011e8fa9c214e'
           or p.prorettype is distinct from 'record'::regtype
           or not p.proretset
           or p.pronargs<>1
           or array_to_string(p.proargnames,',') is distinct from
             'p_quality_tier,allowed,reservation_id,monthly_budget_usd,reserved_before_usd,reserved_after_usd,max_session_seconds,quality_tier,reservation_usd,global_ai_cap_usd,global_committed_before_usd'
           or array_to_string(p.proargmodes,',') is distinct from
             'i,t,t,t,t,t,t,t,t,t,t'
           or p.proallargtypes is distinct from array[
             'text'::regtype::oid,'boolean'::regtype::oid,'uuid'::regtype::oid,
             'numeric'::regtype::oid,'numeric'::regtype::oid,'numeric'::regtype::oid,
             'integer'::regtype::oid,'text'::regtype::oid,'numeric'::regtype::oid,
             'numeric'::regtype::oid,'numeric'::regtype::oid
           ]::oid[]
           or p.pronargdefaults<>1
           or pg_catalog.pg_get_expr(p.proargdefaults,0)
                is distinct from '''standard''::text'
           or language.lanname<>'plpgsql'
           or p.provolatile<>'v'
           or not p.prosecdef
           or p.proisstrict or p.proleakproof
           or p.proparallel<>'u' or p.prokind<>'f'
           or pg_catalog.pg_get_userbyid(p.proowner)<>'postgres'
           or array_length(p.proconfig,1) is distinct from 1
           or regexp_replace(p.proconfig[1],E'\\s+','','g')<>'search_path=public'
         )
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='audio_assets'
         and column_name='generation_request_id'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='audio_assets'
         and column_name='estimated_cost_usd'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='audio_assets'
         and column_name='transcript_pt'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='audio_assets'
         and column_name='voice'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='lessons'
         and column_name='slug'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='lessons'
         and column_name='sequence'
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;
  if to_regclass('lh_internal.premium_audio_attempt_bindings_v3') is not null
     or to_regprocedure('public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb)') is not null
     or to_regprocedure('public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb)') is not null
     or to_regprocedure('public.mark_premium_audio_submitted_v3(uuid,text,integer,text)') is not null
     or to_regprocedure('public.close_premium_audio_attempt_v3(uuid,text,integer,text)') is not null
     or to_regprocedure('public.settle_premium_audio_attempt_v3(uuid,text,integer,text,numeric,integer)') is not null
     or to_regprocedure('lh_internal.premium_audio_identity_shape_valid_v3(jsonb)') is not null
     or to_regprocedure('lh_internal.premium_audio_expected_path_v3(uuid,integer,text,integer)') is not null
     or to_regprocedure('lh_internal.lock_premium_audio_identity_v3(uuid,uuid,jsonb)') is not null
     or to_regprocedure('lh_internal.inspect_premium_audio_cache_v3(uuid,integer,text,integer,text,jsonb)') is not null
     or to_regclass('lh_internal.premium_audio_v3_one_settled_cache_per_lesson') is not null
     or to_regclass('lh_internal.premium_audio_v3_lesson_idx') is not null
     or to_regclass('lh_internal.premium_audio_v3_user_idx') is not null
     or to_regclass('lh_internal.premium_audio_v3_asset_uq') is not null
     or to_regclass('lh_internal.premium_audio_v3_receipt_uq') is not null
     or to_regclass('lh_internal.premium_audio_v3_settled_storage_path_uq') is not null
     or to_regclass('public.premium_audio_v3_asset_storage_path_uq') is not null
     or to_regclass('public.premium_audio_v3_asset_receipt_uq') is not null
     or to_regclass('public.premium_audio_v3_usage_receipt_uq') is not null
     or exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('lh_internal.premium_audio_attempts')
         and conname='premium_audio_v3_cancelled_no_evidence'
     )
     or exists (
       select 1 from pg_catalog.pg_constraint
       where (conrelid,conname) in (
         (to_regclass('public.professor_budget_settings'),
          'premium_audio_v3_professor_settings_finite'),
         (to_regclass('public.learning_hub_budget_settings'),
          'premium_audio_v3_global_settings_finite'),
         (to_regclass('public.professor_budget_reservations'),
          'premium_audio_v3_professor_reservation_finite'),
         (to_regclass('public.ai_usage_log'),
          'premium_audio_v3_usage_cost_finite'),
         (to_regclass('lh_internal.professor_settlement_receipts'),
          'premium_audio_v3_professor_receipt_finite')
         ,(to_regclass('lh_internal.premium_audio_attempts'),
          'premium_audio_v3_cost_within_reservation')
       )
     )
  then
    raise exception 'premium_audio_v3_already_installed';
  end if;
  if exists (
    select 1 from public.audio_assets
    group by storage_path having count(*)>1
  ) or exists (
    select 1 from public.audio_assets
    where generation_request_id is not null
    group by generation_request_id having count(*)>1
  ) or exists (
    select 1 from public.ai_usage_log
    where request_id like 'premium-audio-v3:%'
    group by request_id having count(*)>1
  ) then
    raise exception 'premium_audio_v3_identity_drift';
  end if;
  if exists (
    select 1
    from lh_internal.premium_audio_attempts
    where state='cancelled'
      and (
        submitted_at is not null
        or settled_at is not null
        or estimated_cost_usd is not null
        or characters is not null
      )
  ) then
    raise exception 'premium_audio_v3_identity_drift';
  end if;
end
$guard$;

-- Exact structural invariants used by the shared lock/budget tree. Function
-- hashes alone are insufficient if a mutex ceases to be unique, a foreign key
-- is removed, or nullable/state drift lets an obligation escape exposure.
do $structure_guard$
begin
  if (select count(*) from pg_catalog.pg_attribute
      where attrelid=to_regclass('public.profiles')
        and attnum>0 and not attisdropped)<>7
     or exists (
       select 1
       from (values
         ('id','uuid',true,null::text),
         ('display_name','text',true,null::text),
         ('learner_track','text',true,null::text),
         ('preferred_language','text',true,'''pt-BR''::text'),
         ('timezone','text',true,'''Europe/Dublin''::text'),
         ('created_at','timestamp with time zone',true,'now()'),
         ('updated_at','timestamp with time zone',true,'now()')
       ) expected(column_name,data_type,is_not_null,default_expression)
       left join pg_catalog.pg_attribute attribute
         on attribute.attrelid=to_regclass('public.profiles')
        and attribute.attname=expected.column_name
        and attribute.attnum>0 and not attribute.attisdropped
       left join pg_catalog.pg_attrdef default_row
         on default_row.adrelid=attribute.attrelid
        and default_row.adnum=attribute.attnum
       where attribute.attname is null
          or pg_catalog.format_type(
               attribute.atttypid,attribute.atttypmod
             )<>expected.data_type
          or attribute.attnotnull<>expected.is_not_null
          or attribute.attidentity<>'' or attribute.attgenerated<>''
          or pg_catalog.pg_get_expr(
               default_row.adbin,default_row.adrelid
             ) is distinct from expected.default_expression
     )
     or (select count(*) from pg_catalog.pg_constraint
         where conrelid=to_regclass('public.profiles'))<>3
     or exists (
       select 1
       from (values
         ('profiles_pkey','p','PRIMARY KEY (id)'),
         ('profiles_id_fkey','f',
          'FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),
         ('profiles_learner_track_check','c',
          'CHECK (learner_track = ANY (ARRAY[''rafael_finance''::text, ''viviane_payroll''::text, ''admin''::text]))')
       ) expected(constraint_name,constraint_type,constraint_definition)
       where not exists (
         select 1 from pg_catalog.pg_constraint constraint_row
         where constraint_row.conrelid=to_regclass('public.profiles')
           and constraint_row.conname=expected.constraint_name
           and constraint_row.contype=expected.constraint_type::"char"
           and constraint_row.convalidated
           and pg_catalog.pg_get_constraintdef(constraint_row.oid,true)=
                 expected.constraint_definition
       )
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if (select count(*) from pg_catalog.pg_constraint
      where conrelid=to_regclass('public.audio_assets'))<>4
     or exists (
       select 1
       from (values
         ('PRIMARY KEY (id)'),
         ('FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE'),
         ('CHECK (audio_type = ANY (ARRAY[''commentary''::text, ''lesson_summary''::text, ''pronunciation''::text]))'),
         ('CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0::numeric AND estimated_cost_usd <> ''NaN''::numeric)')
       ) expected(constraint_definition)
       where not exists (
         select 1 from pg_catalog.pg_constraint constraint_row
         where constraint_row.conrelid=to_regclass('public.audio_assets')
           and constraint_row.convalidated
           and not constraint_row.condeferrable
           and not constraint_row.condeferred
           and pg_catalog.pg_get_constraintdef(constraint_row.oid,true)=
                 expected.constraint_definition
       )
     )
     or (select count(*) from pg_catalog.pg_constraint
         where conrelid=to_regclass('public.ai_usage_log'))<>4
     or exists (
       select 1
       from (values
         ('PRIMARY KEY (id)'),
         ('FOREIGN KEY (session_id) REFERENCES ai_tutor_sessions(id) ON DELETE SET NULL'),
         ('FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),
         ('CHECK (feature = ANY (ARRAY[''case_feedback''::text, ''chapter_conversation''::text, ''lesson_tts''::text, ''lesson_audio''::text, ''transcription''::text, ''oral_mock''::text, ''professor_livekit''::text, ''professor_evaluation''::text, ''other''::text]))')
       ) expected(constraint_definition)
       where not exists (
         select 1 from pg_catalog.pg_constraint constraint_row
         where constraint_row.conrelid=to_regclass('public.ai_usage_log')
           and constraint_row.convalidated
           and not constraint_row.condeferrable
           and not constraint_row.condeferred
           and pg_catalog.pg_get_constraintdef(constraint_row.oid,true)=
                 expected.constraint_definition
       )
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if exists (
    select 1
    from (values
      ('public.professor_budget_settings',array['feature']::text[]),
      ('public.learning_hub_budget_settings',array['id']::text[]),
      ('public.professor_budget_reservations',array['id']::text[]),
      ('public.ai_tutor_sessions',array['id']::text[]),
      ('lh_internal.professor_settlement_receipts',array['session_id']::text[]),
      ('lh_internal.premium_audio_attempts',array['id']::text[])
    ) expected(relation_name,key_columns)
    where (
      select count(*)
      from pg_catalog.pg_index index_row
      where index_row.indrelid=to_regclass(expected.relation_name)
        and index_row.indisprimary and index_row.indisunique
        and index_row.indisvalid and index_row.indisready
        and index_row.indislive and index_row.indpred is null
        and index_row.indexprs is null
        and (
          select array_agg(attribute.attname::text order by key_part.ord)
          from unnest(index_row.indkey) with ordinality key_part(attnum,ord)
          join pg_catalog.pg_attribute attribute
            on attribute.attrelid=index_row.indrelid
           and attribute.attnum=key_part.attnum
        )=expected.key_columns
    )<>1
  ) then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if (select count(*) from public.professor_budget_settings
      where feature='professor_livekit')<>1
     or (select count(*) from public.professor_budget_settings)<>1
     or (select count(*) from public.learning_hub_budget_settings
         where id=1)<>1
     or (select count(*) from public.learning_hub_budget_settings)<>1
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  -- Freeze the complete reviewed index topology of the two post-provider
  -- writes. An extra UNIQUE, expression or partial index can reject a valid
  -- asset/receipt even when every table constraint remains unchanged.
  if (select count(*) from pg_catalog.pg_index
      where indrelid=to_regclass('public.audio_assets'))<>2
     or (select count(*) from pg_catalog.pg_index
         where indrelid=to_regclass('public.ai_usage_log'))<>4
     or exists (
       select 1
       from (values
         ('public.audio_assets','audio_assets_pkey',true,true,
          array['id']::text[],null::text,
          'CREATE UNIQUE INDEX audio_assets_pkey ON public.audio_assets USING btree (id)'),
         ('public.audio_assets','audio_assets_atomic_lesson_type_uq',true,false,
          array['lesson_id','audio_type']::text[],null::text,
          'CREATE UNIQUE INDEX audio_assets_atomic_lesson_type_uq ON public.audio_assets USING btree (lesson_id, audio_type)'),
         ('public.ai_usage_log','ai_usage_log_pkey',true,true,
          array['id']::text[],null::text,
          'CREATE UNIQUE INDEX ai_usage_log_pkey ON public.ai_usage_log USING btree (id)'),
         ('public.ai_usage_log','ai_usage_log_atomic_feature_request_uq',true,false,
          array['feature','request_id']::text[],null::text,
          'CREATE UNIQUE INDEX ai_usage_log_atomic_feature_request_uq ON public.ai_usage_log USING btree (feature, request_id)'),
         ('public.ai_usage_log','ai_usage_log_request_id_uidx',true,false,
          array['request_id']::text[],'(request_idISNOTNULL)',
          'CREATE UNIQUE INDEX ai_usage_log_request_id_uidx ON public.ai_usage_log USING btree (request_id) WHERE (request_id IS NOT NULL)'),
         ('public.ai_usage_log','idx_ai_usage_month',false,false,
          array['created_at','feature']::text[],null::text,
          'CREATE INDEX idx_ai_usage_month ON public.ai_usage_log USING btree (created_at, feature)')
       ) expected(
         relation_name,index_name,is_unique,is_primary,key_columns,
         normalized_predicate,index_definition
       )
       where not exists (
         select 1
         from pg_catalog.pg_index index_row
         join pg_catalog.pg_class index_class
           on index_class.oid=index_row.indexrelid
         join pg_catalog.pg_am access_method
           on access_method.oid=index_class.relam
         where index_row.indrelid=to_regclass(expected.relation_name)
           and index_class.relname=expected.index_name
           and access_method.amname='btree'
           and index_row.indisunique=expected.is_unique
           and index_row.indisprimary=expected.is_primary
           and not index_row.indisexclusion
           and index_row.indimmediate
           and index_row.indisvalid and index_row.indisready
           and index_row.indislive
           and not index_row.indnullsnotdistinct
           and index_row.indexprs is null
           and pg_catalog.pg_get_indexdef(index_row.indexrelid)=
                 expected.index_definition
           and index_row.indnkeyatts=cardinality(expected.key_columns)
           and index_row.indnatts=cardinality(expected.key_columns)
           and (
             select array_agg(
               attribute.attname::text order by key_part.ord
             )
             from unnest(index_row.indkey)
               with ordinality key_part(attnum,ord)
             join pg_catalog.pg_attribute attribute
               on attribute.attrelid=index_row.indrelid
              and attribute.attnum=key_part.attnum
           )=expected.key_columns
           and regexp_replace(
                 pg_catalog.pg_get_expr(
                   index_row.indpred,index_row.indrelid
                 ),E'\\s+','','g'
               ) is not distinct from expected.normalized_predicate
       )
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  -- Exact full write-table inventory: omitted columns and their defaults are
  -- part of the provider fence because they run during the post-provider
  -- INSERT. Do not allow an unreviewed default/generated expression there.
  if (select count(*) from pg_catalog.pg_attribute
      where attrelid=to_regclass('public.audio_assets')
        and attnum>0 and not attisdropped)<>11
     or (select count(*) from pg_catalog.pg_attribute
         where attrelid=to_regclass('public.ai_usage_log')
           and attnum>0 and not attisdropped)<>15
     or exists (
       select 1
       from (values
         ('public.audio_assets','id','uuid',true,'',false,'gen_random_uuid()'),
         ('public.audio_assets','lesson_id','uuid',true,'',false,null::text),
         ('public.audio_assets','audio_type','text',true,'',true,null::text),
         ('public.audio_assets','storage_path','text',false,'',true,null::text),
         ('public.audio_assets','transcript_pt','text',false,'',true,null::text),
         ('public.audio_assets','duration_seconds','integer',false,'',false,null::text),
         ('public.audio_assets','voice','text',false,'',true,null::text),
         ('public.audio_assets','generated_at','timestamp with time zone',false,'',false,null::text),
         ('public.audio_assets','created_at','timestamp with time zone',true,'',false,'now()'),
         ('public.audio_assets','generation_request_id','text',false,'',true,null::text),
         ('public.audio_assets','estimated_cost_usd','numeric',false,'',false,null::text),
         ('public.ai_usage_log','id','bigint',true,'a',false,null::text),
         ('public.ai_usage_log','user_id','uuid',false,'',false,null::text),
         ('public.ai_usage_log','session_id','uuid',false,'',false,null::text),
         ('public.ai_usage_log','feature','text',true,'',true,null::text),
         ('public.ai_usage_log','model','text',true,'',true,null::text),
         ('public.ai_usage_log','input_tokens','bigint',true,'',false,'0'),
         ('public.ai_usage_log','cached_input_tokens','bigint',true,'',false,'0'),
         ('public.ai_usage_log','output_tokens','bigint',true,'',false,'0'),
         ('public.ai_usage_log','audio_input_tokens','bigint',true,'',false,'0'),
         ('public.ai_usage_log','audio_output_tokens','bigint',true,'',false,'0'),
         ('public.ai_usage_log','audio_seconds','numeric(10,2)',true,'',false,'0'),
         ('public.ai_usage_log','characters','bigint',true,'',false,'0'),
         ('public.ai_usage_log','estimated_cost_usd','numeric(12,6)',true,'',false,'0'),
         ('public.ai_usage_log','request_id','text',false,'',true,null::text),
         ('public.ai_usage_log','created_at','timestamp with time zone',true,'',false,'now()')
       ) expected(
         relation_name,column_name,type_name,is_not_null,identity_kind,
         uses_default_collation,default_expression
       )
       left join pg_catalog.pg_attribute attribute
         on attribute.attrelid=to_regclass(expected.relation_name)
        and attribute.attname=expected.column_name
        and attribute.attnum>0 and not attribute.attisdropped
       left join pg_catalog.pg_attrdef default_row
         on default_row.adrelid=attribute.attrelid
        and default_row.adnum=attribute.attnum
       where attribute.attname is null
          or pg_catalog.format_type(
               attribute.atttypid,attribute.atttypmod
             )<>expected.type_name
          or attribute.attnotnull<>expected.is_not_null
          or attribute.attidentity<>expected.identity_kind
          or attribute.attgenerated<>''
          or attribute.attcollation is distinct from case
               when expected.uses_default_collation then
                 'pg_catalog.default'::regcollation::oid
               else 0::oid
             end
          or pg_catalog.pg_get_expr(
               default_row.adbin,default_row.adrelid
             ) is distinct from expected.default_expression
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if exists (
       select 1
       from public.professor_budget_settings settings
       cross join public.learning_hub_budget_settings global_settings
       where settings.feature='professor_livekit'
         and global_settings.id=1
         and (
           settings.hard_stop_enabled is distinct from true
           or settings.monthly_budget_usd is null
           or settings.monthly_budget_usd<=0
           or settings.monthly_budget_usd='NaN'::numeric
           or settings.monthly_budget_usd='Infinity'::numeric
           or settings.reservation_usd is null
           or settings.reservation_usd<=0
           or settings.reservation_usd='NaN'::numeric
           or settings.reservation_usd='Infinity'::numeric
           or settings.premium_reservation_usd is null
           or settings.premium_reservation_usd<=0
           or settings.premium_reservation_usd='NaN'::numeric
           or settings.premium_reservation_usd='Infinity'::numeric
           or settings.max_session_seconds is null
           or settings.max_session_seconds<=0
           or global_settings.ai_hard_cap_usd is null
           or global_settings.ai_hard_cap_usd<=0
           or global_settings.ai_hard_cap_usd='NaN'::numeric
           or global_settings.ai_hard_cap_usd='Infinity'::numeric
           or global_settings.professor_cap_usd is null
           or global_settings.professor_cap_usd<=0
           or global_settings.professor_cap_usd='NaN'::numeric
           or global_settings.professor_cap_usd='Infinity'::numeric
           or global_settings.premium_audio_cap_usd is null
           or global_settings.premium_audio_cap_usd<=0
           or global_settings.premium_audio_cap_usd='NaN'::numeric
           or global_settings.premium_audio_cap_usd='Infinity'::numeric
           or global_settings.professor_cap_usd>
                global_settings.ai_hard_cap_usd
           or global_settings.premium_audio_cap_usd>
                global_settings.ai_hard_cap_usd
           or settings.monthly_budget_usd>
                global_settings.professor_cap_usd
           or settings.reservation_usd>settings.monthly_budget_usd
           or settings.premium_reservation_usd>settings.monthly_budget_usd
         )
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if exists (
    select 1
    from (values
      ('public.professor_budget_settings','feature'),
      ('public.learning_hub_budget_settings','id'),
      ('public.professor_budget_reservations','id'),
      ('public.professor_budget_reservations','feature'),
      ('public.professor_budget_reservations','reserved_usd'),
      ('public.professor_budget_reservations','status'),
      ('public.professor_budget_reservations','actual_cost_usd'),
      ('public.ai_tutor_sessions','id'),
      ('public.ai_usage_log','created_at'),
      ('lh_internal.professor_settlement_receipts','session_id'),
      ('lh_internal.professor_settlement_receipts','state'),
      ('lh_internal.premium_audio_attempts','id'),
      ('lh_internal.premium_audio_attempts','user_id'),
      ('lh_internal.premium_audio_attempts','lesson_id'),
      ('lh_internal.premium_audio_attempts','content_version'),
      ('lh_internal.premium_audio_attempts','reserved_usd'),
      ('lh_internal.premium_audio_attempts','state'),
      ('lh_internal.premium_audio_attempts','created_at'),
      ('lh_internal.premium_audio_attempts','lease_until')
    ) expected(relation_name,column_name)
    join pg_catalog.pg_attribute attribute
      on attribute.attrelid=to_regclass(expected.relation_name)
     and attribute.attname=expected.column_name
     and attribute.attnum>0 and not attribute.attisdropped
    where not attribute.attnotnull
       or attribute.attgenerated<>''
       or attribute.attidentity<>''
  ) then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if not exists (
       select 1 from pg_catalog.pg_attrdef default_row
       join pg_catalog.pg_attribute attribute
         on attribute.attrelid=default_row.adrelid
        and attribute.attnum=default_row.adnum
       where default_row.adrelid=
               to_regclass('lh_internal.premium_audio_attempts')
         and attribute.attname='created_at'
         and pg_catalog.pg_get_expr(
               default_row.adbin,default_row.adrelid
             )='clock_timestamp()'
     )
     or exists (
       select 1 from pg_catalog.pg_attrdef default_row
       join pg_catalog.pg_attribute attribute
         on attribute.attrelid=default_row.adrelid
        and attribute.attnum=default_row.adnum
       where default_row.adrelid=
               to_regclass('lh_internal.premium_audio_attempts')
         and attribute.attname in (
           'id','user_id','lesson_id','content_version','reserved_usd','state',
           'lease_until','submitted_at','settled_at','estimated_cost_usd',
           'characters'
         )
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if not exists (
       select 1 from pg_catalog.pg_attrdef default_row
       join pg_catalog.pg_attribute attribute
         on attribute.attrelid=default_row.adrelid
        and attribute.attnum=default_row.adnum
       where default_row.adrelid=to_regclass('public.ai_usage_log')
         and attribute.attname='created_at'
         and pg_catalog.pg_get_expr(
               default_row.adbin,default_row.adrelid
             )='now()'
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  -- Require the complete reviewed CHECK set, not just compatible column types.
  if (select count(*) from pg_catalog.pg_constraint
      where conrelid=to_regclass('public.professor_budget_settings')
        and contype='c' and convalidated)<>1
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('public.professor_budget_settings')
         and contype='c' and convalidated
         and regexp_replace(
           pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g'
         )='feature=''professor_livekit''::text'
     )
     or (select count(*) from pg_catalog.pg_constraint
         where conrelid=to_regclass('public.learning_hub_budget_settings')
           and contype='c' and convalidated)<>1
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('public.learning_hub_budget_settings')
         and contype='c' and convalidated
         and regexp_replace(
           pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g'
         )='id=1'
     )
     or (select count(*) from pg_catalog.pg_constraint
         where conrelid=to_regclass('public.professor_budget_reservations')
           and contype='c' and convalidated)<>2
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('public.professor_budget_reservations')
         and contype='c' and convalidated
         and regexp_replace(
           pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g'
         )='reserved_usd>0::numeric'
     )
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('public.professor_budget_reservations')
         and contype='c' and convalidated
         and regexp_replace(
           pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g'
         )='status=ANYARRAY[''active''::text,''settled''::text,''unresolved''::text,''abandoned''::text]'
     )
     or (select count(*) from pg_catalog.pg_constraint
         where conrelid=to_regclass('lh_internal.professor_settlement_receipts')
           and contype='c' and convalidated)<>1
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('lh_internal.professor_settlement_receipts')
         and contype='c' and convalidated
         and regexp_replace(
           pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g'
         )='state=ANYARRAY[''pending''::text,''settled''::text]'
     )
     or (select count(*) from pg_catalog.pg_constraint
         where conrelid=to_regclass('lh_internal.premium_audio_attempts')
           and contype='c' and convalidated)<>5
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('lh_internal.premium_audio_attempts')
         and contype='c' and convalidated
         and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g')='content_version>0'
     )
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('lh_internal.premium_audio_attempts')
         and contype='c' and convalidated
         and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g')=
           'reserved_usd>=0.10ANDreserved_usd<=10::numeric'
     )
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('lh_internal.premium_audio_attempts')
         and contype='c' and convalidated
         and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g')=
           'state=ANYARRAY[''reserved''::text,''submitted''::text,''uncertain''::text,''settled''::text,''cancelled''::text]'
     )
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('lh_internal.premium_audio_attempts')
         and contype='c' and convalidated
         and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g')=
           'estimated_cost_usdISNULLORestimated_cost_usd>=0::numericANDestimated_cost_usd<=10000::numeric'
     )
     or not exists (
       select 1 from pg_catalog.pg_constraint
       where conrelid=to_regclass('lh_internal.premium_audio_attempts')
         and contype='c' and convalidated
         and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),E'[\\s()]','','g')=
           'charactersISNULLORcharacters>=0ANDcharacters<=20000'
     )
  then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if exists (
    select 1
    from (values
      ('public.professor_budget_reservations',array['feature']::text[],
       'public.professor_budget_settings',array['feature']::text[]),
      ('lh_internal.professor_settlement_receipts',array['session_id']::text[],
       'public.ai_tutor_sessions',array['id']::text[]),
      ('lh_internal.premium_audio_attempts',array['user_id']::text[],
       'public.profiles',array['id']::text[]),
      ('lh_internal.premium_audio_attempts',array['lesson_id']::text[],
       'public.lessons',array['id']::text[])
    ) expected(source_relation,source_columns,target_relation,target_columns)
    where not exists (
      select 1 from pg_catalog.pg_constraint constraint_row
      where constraint_row.contype='f'
        and constraint_row.conrelid=to_regclass(expected.source_relation)
        and constraint_row.confrelid=to_regclass(expected.target_relation)
        and constraint_row.convalidated
        and not constraint_row.condeferrable
        and constraint_row.confupdtype='a'
        and constraint_row.confdeltype='a'
        and constraint_row.confmatchtype='s'
        and (
          select array_agg(attribute.attname::text order by key_part.ord)
          from unnest(constraint_row.conkey) with ordinality key_part(attnum,ord)
          join pg_catalog.pg_attribute attribute
            on attribute.attrelid=constraint_row.conrelid
           and attribute.attnum=key_part.attnum
        )=expected.source_columns
        and (
          select array_agg(attribute.attname::text order by key_part.ord)
          from unnest(constraint_row.confkey) with ordinality key_part(attnum,ord)
          join pg_catalog.pg_attribute attribute
            on attribute.attrelid=constraint_row.confrelid
           and attribute.attnum=key_part.attnum
        )=expected.target_columns
    )
  ) then
    raise exception 'premium_audio_v3_prerequisites_missing';
  end if;

  if exists (
       select 1 from public.professor_budget_reservations reservation
       where reservation.reserved_usd<=0
          or reservation.reserved_usd='NaN'::numeric
          or reservation.reserved_usd='Infinity'::numeric
          or reservation.actual_cost_usd<0
          or reservation.actual_cost_usd='NaN'::numeric
          or reservation.actual_cost_usd='Infinity'::numeric
     )
     or exists (
       select 1 from lh_internal.premium_audio_attempts attempt_row
       where attempt_row.estimated_cost_usd is not null
         and (
           attempt_row.estimated_cost_usd<0
           or attempt_row.estimated_cost_usd='NaN'::numeric
           or attempt_row.estimated_cost_usd='Infinity'::numeric
           or attempt_row.estimated_cost_usd>attempt_row.reserved_usd
         )
     )
     or exists (
       select 1 from public.ai_usage_log usage_row
       where usage_row.created_at is null
          or usage_row.estimated_cost_usd is null
          or usage_row.estimated_cost_usd<0
          or usage_row.estimated_cost_usd='NaN'::numeric
          or usage_row.estimated_cost_usd='Infinity'::numeric
     )
     or exists (
       select 1
       from lh_internal.professor_settlement_receipts receipt
       left join public.ai_tutor_sessions session_row
         on session_row.id=receipt.session_id
       left join public.professor_budget_reservations reservation
         on reservation.id=session_row.budget_reservation_id
       where (receipt.realtime_cost_usd is not null and (
                receipt.realtime_cost_usd<0
                or receipt.realtime_cost_usd='NaN'::numeric
                or receipt.realtime_cost_usd='Infinity'::numeric
             ))
          or (receipt.evaluation_cost_usd is not null and (
                receipt.evaluation_cost_usd<0
                or receipt.evaluation_cost_usd='NaN'::numeric
                or receipt.evaluation_cost_usd='Infinity'::numeric
             ))
          or (receipt.state='pending' and (
                session_row.id is null
                or session_row.startup_request_id is null
                or session_row.budget_reservation_id is null
                or reservation.id is null
                or reservation.user_id is distinct from session_row.user_id
                or reservation.feature is distinct from 'professor_livekit'
                or reservation.status not in ('active','unresolved')
             ))
     )
  then
    raise exception 'premium_audio_v3_identity_drift';
  end if;
end
$structure_guard$;

-- Keep the reciprocal budget proof true after installation: a later direct
-- table write cannot turn any cap, hold or receipt into NaN/+Infinity and make
-- PostgreSQL comparisons silently stop enforcing the hard limit.
alter table public.professor_budget_settings
  add constraint premium_audio_v3_professor_settings_finite check (
    monthly_budget_usd is not null
    and reservation_usd is not null
    and premium_reservation_usd is not null
    and monthly_budget_usd>0
    and reservation_usd>0
    and premium_reservation_usd>0
    and monthly_budget_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and reservation_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and premium_reservation_usd not in ('NaN'::numeric,'Infinity'::numeric)
  );

alter table public.learning_hub_budget_settings
  add constraint premium_audio_v3_global_settings_finite check (
    ai_hard_cap_usd is not null
    and professor_cap_usd is not null
    and premium_audio_cap_usd is not null
    and ai_hard_cap_usd>0 and professor_cap_usd>0 and premium_audio_cap_usd>0
    and ai_hard_cap_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and professor_cap_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and premium_audio_cap_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and professor_cap_usd<=ai_hard_cap_usd
    and premium_audio_cap_usd<=ai_hard_cap_usd
  );

alter table public.professor_budget_reservations
  add constraint premium_audio_v3_professor_reservation_finite check (
    reserved_usd>0 and actual_cost_usd>=0
    and reserved_usd not in ('NaN'::numeric,'Infinity'::numeric)
    and actual_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
  );

alter table public.ai_usage_log
  add constraint premium_audio_v3_usage_cost_finite check (
    estimated_cost_usd is not null and estimated_cost_usd>=0
    and estimated_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
  );

alter table lh_internal.professor_settlement_receipts
  add constraint premium_audio_v3_professor_receipt_finite check (
    (realtime_cost_usd is null or (
      realtime_cost_usd>=0
      and realtime_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
    ))
    and (evaluation_cost_usd is null or (
      evaluation_cost_usd>=0
      and evaluation_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
    ))
  );

alter table lh_internal.premium_audio_attempts
  add constraint premium_audio_v3_cost_within_reservation check (
    estimated_cost_usd is null
    or (
      estimated_cost_usd>=0
      and estimated_cost_usd<=reserved_usd
      and estimated_cost_usd not in ('NaN'::numeric,'Infinity'::numeric)
    )
  );

-- V2's historical expiry/close path may only cancel work with no provider or
-- receipt evidence. This additive invariant makes an unsafe legacy transition
-- fail atomically, preserving the pending hold for explicit v3 reconciliation.
alter table lh_internal.premium_audio_attempts
  add constraint premium_audio_v3_cancelled_no_evidence check (
    state<>'cancelled'
    or (
      submitted_at is null
      and settled_at is null
      and estimated_cost_usd is null
      and characters is null
    )
  );

create function lh_internal.premium_audio_identity_shape_valid_v3(
  p_identity jsonb
) returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case when jsonb_typeof(p_identity)='object' then
    (select count(*)=8 from jsonb_object_keys(p_identity))
    and p_identity ?& array[
      'lessonId','moduleId','courseId','lessonSlug','contentVersion',
      'requestedTrack','studyTrack','sequence'
    ]
    and jsonb_typeof(p_identity->'lessonId')='string'
    and (p_identity->>'lessonId') ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(p_identity->'moduleId')='string'
    and (p_identity->>'moduleId') ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(p_identity->'courseId')='string'
    and (p_identity->>'courseId') ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and jsonb_typeof(p_identity->'lessonSlug')='string'
    and btrim(p_identity->>'lessonSlug')<>''
    and jsonb_typeof(p_identity->'contentVersion')='number'
    and (p_identity->>'contentVersion') ~ '^([1-9][0-9]{0,4}|100000)$'
    and jsonb_typeof(p_identity->'sequence')='number'
    and (p_identity->>'sequence') ~ '^[2-8]$'
    and jsonb_typeof(p_identity->'requestedTrack')='string'
    and jsonb_typeof(p_identity->'studyTrack')='string'
    and (
      (p_identity->>'requestedTrack'='rafael_finance' and p_identity->>'studyTrack'='finance')
      or (p_identity->>'requestedTrack'='viviane_payroll' and p_identity->>'studyTrack'='payroll')
      or (p_identity->>'requestedTrack'='english_academy' and p_identity->>'studyTrack'='english')
    )
  else false end
$$;

create table lh_internal.premium_audio_attempt_bindings_v3 (
  attempt_id uuid primary key
    references lh_internal.premium_audio_attempts(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  content_version integer not null check (content_version > 0),
  -- This reviewed candidate admits only the three authored P1 lessons. Future
  -- sequence/slug expansion requires another explicit package review.
  lesson_identity jsonb not null check (
    lh_internal.premium_audio_identity_shape_valid_v3(lesson_identity)
    and lesson_identity->>'lessonId'=lesson_id::text
    and lesson_identity->'contentVersion'=to_jsonb(content_version)
    and lesson_identity->'sequence'=to_jsonb(2)
    and (
      (lesson_identity->>'requestedTrack'='rafael_finance'
        and lesson_identity->>'lessonSlug'=
          'revenue-judgement-contracts-performance-obligations-cutoff')
      or (lesson_identity->>'requestedTrack'='viviane_payroll'
        and lesson_identity->>'lessonSlug'=
          'rpn-pay-date-employment-id-payroll-submission')
      or (lesson_identity->>'requestedTrack'='english_academy'
        and lesson_identity->>'lessonSlug'=
          'clarify-check-understanding-handle-meetings')
    )
  ),
  reserved_usd numeric not null check (
    reserved_usd >= 0.10 and reserved_usd <= 10
    and reserved_usd <> 'NaN'::numeric
  ),
  source_fingerprint text not null check (
    source_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  render_revision integer not null check (render_revision = 1),
  storage_path text not null check (
    storage_path =
      'lessons/' || lesson_id::text || '/commentary-v' || content_version::text ||
      '-' || source_fingerprint || '-r' || render_revision::text || '.mp3'
  ),
  asset_id uuid references public.audio_assets(id) on delete restrict,
  receipt_request_id text check (
    receipt_request_id is null
    or receipt_request_id = 'premium-audio-v3:' || attempt_id::text
  ),
  created_at timestamptz not null default clock_timestamp(),
  settled_at timestamptz,
  check (
    (asset_id is null and receipt_request_id is null and settled_at is null)
    or
    (asset_id is not null and receipt_request_id is not null and settled_at is not null)
  )
);

alter table lh_internal.premium_audio_attempt_bindings_v3 enable row level security;
revoke all on table lh_internal.premium_audio_attempt_bindings_v3
  from PUBLIC, anon, authenticated, service_role;

create unique index premium_audio_v3_one_settled_cache_per_lesson
  on lh_internal.premium_audio_attempt_bindings_v3(lesson_id)
  where settled_at is not null;
create index premium_audio_v3_lesson_idx
  on lh_internal.premium_audio_attempt_bindings_v3(lesson_id,created_at);
create index premium_audio_v3_user_idx
  on lh_internal.premium_audio_attempt_bindings_v3(user_id);
create unique index premium_audio_v3_asset_uq
  on lh_internal.premium_audio_attempt_bindings_v3(asset_id)
  where asset_id is not null;
create unique index premium_audio_v3_receipt_uq
  on lh_internal.premium_audio_attempt_bindings_v3(receipt_request_id)
  where receipt_request_id is not null;
-- Cancelled, never-submitted attempts remain immutable audit rows and may share
-- the deterministic path with a later retry. Only a settled cache owns it.
create unique index premium_audio_v3_settled_storage_path_uq
  on lh_internal.premium_audio_attempt_bindings_v3(storage_path)
  where settled_at is not null;

-- These indexes turn the trusted-writer assumptions used by settlement into
-- database constraints. Installation aborts above on any legacy divergence.
create unique index premium_audio_v3_asset_storage_path_uq
  on public.audio_assets(storage_path);
create unique index premium_audio_v3_asset_receipt_uq
  on public.audio_assets(generation_request_id)
  where generation_request_id is not null;
create unique index premium_audio_v3_usage_receipt_uq
  on public.ai_usage_log(request_id)
  where request_id like 'premium-audio-v3:%';

create function lh_internal.premium_audio_expected_path_v3(
  p_lesson_id uuid,
  p_content_version integer,
  p_source_fingerprint text,
  p_render_revision integer
) returns text
language sql
immutable
strict
security definer
set search_path = pg_catalog
as $$
  select 'lessons/' || p_lesson_id::text || '/commentary-v' ||
    p_content_version::text || '-' || p_source_fingerprint || '-r' ||
    p_render_revision::text || '.mp3'
$$;

revoke all on function lh_internal.premium_audio_expected_path_v3(uuid,integer,text,integer)
  from PUBLIC, anon, authenticated, service_role;

revoke all on function lh_internal.premium_audio_identity_shape_valid_v3(jsonb)
  from PUBLIC, anon, authenticated, service_role;

-- Call only after the settings locks. The contributing identity rows are
-- locked in one documented order and held through the caller's transaction,
-- closing the final re-read -> provider-fence race.
create function lh_internal.lock_premium_audio_identity_v3(
  p_user_id uuid,
  p_lesson_id uuid,
  p_lesson_identity jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  identity_module_id uuid;
  identity_course_id uuid;
  current_identity jsonb;
begin
  if not lh_internal.premium_audio_identity_shape_valid_v3(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
  then return null; end if;
  identity_module_id := (p_lesson_identity->>'moduleId')::uuid;
  identity_course_id := (p_lesson_identity->>'courseId')::uuid;

  -- Lock order: profile -> course -> module -> lesson.
  perform 1 from public.profiles where id=p_user_id for share;
  if not found then return null; end if;
  perform 1 from public.courses where id=identity_course_id for share;
  if not found then return null; end if;
  perform 1 from public.modules where id=identity_module_id for share;
  if not found then return null; end if;
  perform 1 from public.lessons where id=p_lesson_id for share;
  if not found then return null; end if;

  select jsonb_build_object(
    'lessonId',l.id::text,
    'moduleId',m.id::text,
    'courseId',c.id::text,
    'lessonSlug',l.slug,
    'contentVersion',l.content_version,
    'requestedTrack',c.learner_track,
    'studyTrack',case c.learner_track
      when 'rafael_finance' then 'finance'
      when 'viviane_payroll' then 'payroll'
      when 'english_academy' then 'english'
    end,
    'sequence',l.sequence
  ) into current_identity
  from public.profiles p
  join public.courses c on c.id=identity_course_id
  join public.modules m on m.id=identity_module_id and m.course_id=c.id
  join public.lessons l on l.id=p_lesson_id and l.module_id=m.id
  where p.id=p_user_id
    and p.learner_track in ('rafael_finance','viviane_payroll')
    and c.learner_track in ('rafael_finance','viviane_payroll','english_academy')
    and (c.learner_track='english_academy' or c.learner_track=p.learner_track)
    and c.is_active and m.is_published and l.is_published;
  return current_identity;
end
$$;

revoke all on function lh_internal.lock_premium_audio_identity_v3(uuid,uuid,jsonb)
  from PUBLIC, anon, authenticated, service_role;

-- This helper observes only database evidence. A Storage object is reusable
-- only after the server-side store callback has returned the exact immutable
-- attempt/fingerprint/revision/path receipt and settlement has atomically bound
-- its audio_assets row and usage receipt below.
create function lh_internal.inspect_premium_audio_cache_v3(
  p_lesson_id uuid,
  p_content_version integer,
  p_source_fingerprint text,
  p_render_revision integer,
  p_storage_path text,
  p_lesson_identity jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  b lh_internal.premium_audio_attempt_bindings_v3%rowtype;
  a lh_internal.premium_audio_attempts%rowtype;
  asset public.audio_assets%rowtype;
  usage_row public.ai_usage_log%rowtype;
  receipt_count integer;
  asset_receipt_count integer;
begin
  select * into b
  from lh_internal.premium_audio_attempt_bindings_v3
  where lesson_id=p_lesson_id and settled_at is not null;

  select * into asset
  from public.audio_assets
  where lesson_id=p_lesson_id and audio_type='commentary';

  -- The immutable path is globally unique, not merely unique inside one
  -- lesson. A row owned by any other lesson/type is foreign evidence and must
  -- stop before admission/provider work; it is never adopted or overwritten.
  if exists (
    select 1 from public.audio_assets path_owner
    where path_owner.storage_path=p_storage_path
      and (
        path_owner.lesson_id is distinct from p_lesson_id
        or path_owner.audio_type is distinct from 'commentary'
      )
  ) then
    return jsonb_build_object('status','reconciliation_required');
  end if;

  if b.attempt_id is not null then
    if b.content_version is distinct from p_content_version
       or b.lesson_identity is distinct from p_lesson_identity
       or b.source_fingerprint is distinct from p_source_fingerprint
       or b.render_revision is distinct from p_render_revision
       or b.storage_path is distinct from p_storage_path
    then
      return jsonb_build_object('status','reconciliation_required');
    end if;

    select * into a
    from lh_internal.premium_audio_attempts
    where id=b.attempt_id;
    if a.id is null
       or a.user_id is distinct from b.user_id
       or a.lesson_id is distinct from b.lesson_id
       or a.content_version is distinct from b.content_version
       or a.reserved_usd is distinct from b.reserved_usd
       or a.state <> 'settled'
       or a.estimated_cost_usd is null
       or a.characters is null
       or b.asset_id is null
       or b.receipt_request_id is distinct from ('premium-audio-v3:' || b.attempt_id::text)
       or asset.id is null
       or asset.id is distinct from b.asset_id
       or asset.storage_path is distinct from b.storage_path
       or asset.generation_request_id is distinct from b.receipt_request_id
       or asset.estimated_cost_usd is distinct from a.estimated_cost_usd
       or asset.voice is distinct from 'marin'
       or char_length(asset.transcript_pt) is distinct from a.characters
    then
      return jsonb_build_object('status','reconciliation_required');
    end if;

    select count(*) into asset_receipt_count
    from public.audio_assets
    where generation_request_id=b.receipt_request_id;
    if asset_receipt_count <> 1 then
      return jsonb_build_object('status','reconciliation_required');
    end if;

    select count(*) into receipt_count
    from public.ai_usage_log
    where request_id=b.receipt_request_id;
    if receipt_count <> 1 then
      return jsonb_build_object('status','reconciliation_required');
    end if;
    select * into usage_row
    from public.ai_usage_log
    where request_id=b.receipt_request_id;
    if usage_row.feature is distinct from 'lesson_audio'
       or usage_row.user_id is distinct from b.user_id
       or usage_row.model is distinct from 'gpt-4o-mini-tts'
       or usage_row.estimated_cost_usd is distinct from a.estimated_cost_usd
       or usage_row.characters is distinct from a.characters::bigint
    then
      return jsonb_build_object('status','reconciliation_required');
    end if;
    return jsonb_build_object(
      'status','hit',
      'attemptId',b.attempt_id,
      'storagePath',b.storage_path
    );
  end if;

  -- An asset without the complete settled binding and receipt is never adopted
  -- or overwritten by this candidate.
  if asset.id is not null then
    return jsonb_build_object('status','reconciliation_required');
  end if;

  if exists (
    select 1
    from lh_internal.premium_audio_attempts pa
    join lh_internal.premium_audio_attempt_bindings_v3 pb
      on pb.attempt_id=pa.id
    where pa.lesson_id=p_lesson_id
      and (
        (pa.state='reserved' and (
          pa.submitted_at is not null
          or pa.settled_at is not null
          or pa.estimated_cost_usd is not null
          or pa.characters is not null
        ))
        or (pa.state in ('submitted','uncertain','settled') and pa.submitted_at is null)
        or (pa.state='cancelled' and (
          pa.submitted_at is not null
          or pa.settled_at is not null
          or pa.estimated_cost_usd is not null
          or pa.characters is not null
        ))
      )
  ) then
    return jsonb_build_object('status','reconciliation_required');
  end if;

  if exists (
    select 1
    from lh_internal.premium_audio_attempt_bindings_v3 pb
    join public.ai_usage_log u
      on u.request_id='premium-audio-v3:' || pb.attempt_id::text
    where pb.lesson_id=p_lesson_id and pb.settled_at is null
  ) then
    return jsonb_build_object('status','reconciliation_required');
  end if;

  if exists (
    select 1
    from lh_internal.premium_audio_attempts pa
    left join lh_internal.premium_audio_attempt_bindings_v3 pb
      on pb.attempt_id=pa.id
    where pa.lesson_id=p_lesson_id
      and (
        (pa.state='reserved' and pa.lease_until>clock_timestamp())
        or pa.state in ('submitted','uncertain','settled')
      )
      and (
        pb.attempt_id is null
        or pb.content_version is distinct from p_content_version
        or pb.lesson_identity is distinct from p_lesson_identity
        or pb.source_fingerprint is distinct from p_source_fingerprint
        or pb.render_revision is distinct from p_render_revision
        or pb.storage_path is distinct from p_storage_path
        or pa.user_id is distinct from pb.user_id
        or pa.content_version is distinct from pb.content_version
        or pa.reserved_usd is distinct from pb.reserved_usd
      )
  ) then
    return jsonb_build_object('status','reconciliation_required');
  end if;

  if exists (
    select 1
    from lh_internal.premium_audio_attempts pa
    join lh_internal.premium_audio_attempt_bindings_v3 pb
      on pb.attempt_id=pa.id
    where pa.lesson_id=p_lesson_id
      and pa.state in ('uncertain','settled')
      and pb.content_version=p_content_version
      and pb.lesson_identity=p_lesson_identity
      and pb.source_fingerprint=p_source_fingerprint
      and pb.render_revision=p_render_revision
      and pb.storage_path=p_storage_path
  ) then
    return jsonb_build_object('status','reconciliation_required');
  end if;

  if exists (
    select 1
    from lh_internal.premium_audio_attempts pa
    join lh_internal.premium_audio_attempt_bindings_v3 pb
      on pb.attempt_id=pa.id
    where pa.lesson_id=p_lesson_id
      and (
        (pa.state='reserved' and pa.lease_until>clock_timestamp())
        or pa.state='submitted'
      )
      and pb.content_version=p_content_version
      and pb.lesson_identity=p_lesson_identity
      and pb.source_fingerprint=p_source_fingerprint
      and pb.render_revision=p_render_revision
      and pb.storage_path=p_storage_path
  ) then
    return jsonb_build_object('status','in_progress');
  end if;

  return jsonb_build_object('status','miss');
end
$$;

revoke all on function lh_internal.inspect_premium_audio_cache_v3(uuid,integer,text,integer,text,jsonb)
  from PUBLIC, anon, authenticated, service_role;

create function public.observe_premium_audio_cache_v3(
  p_user_id uuid,
  p_lesson_id uuid,
  p_content_version integer,
  p_source_fingerprint text,
  p_render_revision integer,
  p_storage_path text,
  p_lesson_identity jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  current_identity jsonb;
begin
  if p_user_id is null or p_lesson_id is null
     or p_content_version is null or p_content_version < 1
     or not lh_internal.premium_audio_identity_shape_valid_v3(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
     or p_lesson_identity->'contentVersion' is distinct from to_jsonb(p_content_version)
     or p_lesson_identity->'sequence' is distinct from to_jsonb(2)
     or not (
       (p_lesson_identity->>'requestedTrack'='rafael_finance'
         and p_lesson_identity->>'lessonSlug'=
           'revenue-judgement-contracts-performance-obligations-cutoff')
       or (p_lesson_identity->>'requestedTrack'='viviane_payroll'
         and p_lesson_identity->>'lessonSlug'=
           'rpn-pay-date-employment-id-payroll-submission')
       or (p_lesson_identity->>'requestedTrack'='english_academy'
         and p_lesson_identity->>'lessonSlug'=
           'clarify-check-understanding-handle-meetings')
     )
     or p_source_fingerprint is null
     or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1
     or p_storage_path is distinct from
       lh_internal.premium_audio_expected_path_v3(
         p_lesson_id,p_content_version,p_source_fingerprint,p_render_revision
       )
  then
    raise exception 'invalid_audio_cache_identity';
  end if;

  -- Same settings order as every Premium Audio/Professor spend mutation. Share
  -- locks make one observation linearize before or after a v3 state transition.
  perform 1 from public.professor_budget_settings
    where feature='professor_livekit' for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings
    where id=1 for share;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;

  current_identity := lh_internal.lock_premium_audio_identity_v3(
    p_user_id,p_lesson_id,p_lesson_identity
  );
  if current_identity is null then
    raise exception 'audio_lesson_forbidden';
  end if;
  if current_identity is distinct from p_lesson_identity then
    raise exception 'audio_source_changed';
  end if;
  return lh_internal.inspect_premium_audio_cache_v3(
    p_lesson_id,p_content_version,p_source_fingerprint,
    p_render_revision,p_storage_path,p_lesson_identity
  );
end
$$;

create function public.begin_premium_audio_attempt_v3(
  p_attempt_id uuid,
  p_user_id uuid,
  p_lesson_id uuid,
  p_content_version integer,
  p_reservation_usd numeric,
  p_source_fingerprint text,
  p_render_revision integer,
  p_storage_path text,
  p_lesson_identity jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  previous lh_internal.premium_audio_attempts%rowtype;
  binding lh_internal.premium_audio_attempt_bindings_v3%rowtype;
  cache_state jsonb;
  admitted jsonb;
  current_identity jsonb;
begin
  if p_attempt_id is null or p_user_id is null or p_lesson_id is null
     or p_content_version is null or p_content_version < 1
     or p_reservation_usd is null or p_reservation_usd < 0.10
     or p_reservation_usd > 10 or p_reservation_usd='NaN'::numeric
     or p_reservation_usd<>round(p_reservation_usd,6)
     or not lh_internal.premium_audio_identity_shape_valid_v3(p_lesson_identity)
     or p_lesson_identity->>'lessonId' is distinct from p_lesson_id::text
     or p_lesson_identity->'contentVersion' is distinct from to_jsonb(p_content_version)
     or p_lesson_identity->'sequence' is distinct from to_jsonb(2)
     or not (
       (p_lesson_identity->>'requestedTrack'='rafael_finance'
         and p_lesson_identity->>'lessonSlug'=
           'revenue-judgement-contracts-performance-obligations-cutoff')
       or (p_lesson_identity->>'requestedTrack'='viviane_payroll'
         and p_lesson_identity->>'lessonSlug'=
           'rpn-pay-date-employment-id-payroll-submission')
       or (p_lesson_identity->>'requestedTrack'='english_academy'
         and p_lesson_identity->>'lessonSlug'=
           'clarify-check-understanding-handle-meetings')
     )
     or p_source_fingerprint is null
     or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1
     or p_storage_path is distinct from
       lh_internal.premium_audio_expected_path_v3(
         p_lesson_id,p_content_version,p_source_fingerprint,p_render_revision
       )
  then
    raise exception 'invalid_audio_attempt';
  end if;

  perform 1 from public.professor_budget_settings
    where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings
    where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;

  current_identity := lh_internal.lock_premium_audio_identity_v3(
    p_user_id,p_lesson_id,p_lesson_identity
  );
  if current_identity is null then
    raise exception 'audio_lesson_forbidden';
  end if;
  if current_identity is distinct from p_lesson_identity then
    raise exception 'audio_source_changed';
  end if;

  -- V2 performs a global expiry sweep at a later clock_timestamp(). Do not
  -- delegate while any reserved row carries provider evidence, even when its
  -- lease is still live: otherwise it could expire between this check and the
  -- V2 sweep and be cancelled. Already-cancelled evidence is likewise a lost
  -- hold and globally blocks admission until close_v3 promotes it to uncertain.
  if exists (
    select 1
    from lh_internal.premium_audio_attempts
    where state in ('reserved','cancelled')
      and (
        submitted_at is not null
        or settled_at is not null
        or estimated_cost_usd is not null
        or characters is not null
      )
  ) then
    return jsonb_build_object(
      'allowed',false,'reason','audio_reconciliation_required'
    );
  end if;

  -- Only work that never crossed the one-shot provider fence may expire. Keep
  -- its v3 binding and cancelled attempt as immutable audit evidence.
  update lh_internal.premium_audio_attempts as attempt_row
  set state='cancelled'
  where attempt_row.state='reserved' and attempt_row.submitted_at is null
    and attempt_row.settled_at is null
    and attempt_row.estimated_cost_usd is null
    and attempt_row.characters is null
    and attempt_row.lease_until<=clock_timestamp()
    and exists (
      select 1
      from lh_internal.premium_audio_attempt_bindings_v3 binding_row
      where binding_row.attempt_id=attempt_row.id
    );

  select * into previous
  from lh_internal.premium_audio_attempts
  where id=p_attempt_id
  for update;
  if previous.id is not null then
    select * into binding
    from lh_internal.premium_audio_attempt_bindings_v3
    where attempt_id=p_attempt_id
    for update;
    if binding.attempt_id is null then
      raise exception 'audio_reconciliation_required';
    end if;
    if previous.user_id is distinct from p_user_id
       or previous.lesson_id is distinct from p_lesson_id
       or previous.content_version is distinct from p_content_version
       or previous.reserved_usd is distinct from p_reservation_usd
       or binding.user_id is distinct from p_user_id
       or binding.lesson_id is distinct from p_lesson_id
       or binding.content_version is distinct from p_content_version
       or binding.lesson_identity is distinct from p_lesson_identity
       or binding.reserved_usd is distinct from p_reservation_usd
       or binding.source_fingerprint is distinct from p_source_fingerprint
       or binding.render_revision is distinct from p_render_revision
       or binding.storage_path is distinct from p_storage_path
    then
      raise exception 'audio_attempt_conflict';
    end if;
    if (previous.state='reserved' and (
          previous.submitted_at is not null
          or previous.settled_at is not null
          or previous.estimated_cost_usd is not null
          or previous.characters is not null
        ))
       or (previous.state in ('submitted','uncertain','settled')
           and previous.submitted_at is null)
       or (previous.state='cancelled' and (
          previous.submitted_at is not null
          or previous.settled_at is not null
          or previous.estimated_cost_usd is not null
          or previous.characters is not null
        ))
    then
      raise exception 'audio_reconciliation_required';
    end if;
    return jsonb_build_object(
      'allowed',false,'reason','audio_attempt_replayed','state',previous.state
    );
  end if;

  cache_state := lh_internal.inspect_premium_audio_cache_v3(
    p_lesson_id,p_content_version,p_source_fingerprint,
    p_render_revision,p_storage_path,p_lesson_identity
  );
  if cache_state->>'status'='hit' then
    return jsonb_build_object('allowed',false,'reason','audio_cached');
  elsif cache_state->>'status'='in_progress' then
    return jsonb_build_object('allowed',false,'reason','audio_generation_in_progress');
  elsif cache_state->>'status'='reconciliation_required' then
    return jsonb_build_object('allowed',false,'reason','audio_reconciliation_required');
  end if;

  admitted := public.begin_premium_audio_attempt_v2(
    p_attempt_id,p_user_id,p_lesson_id,p_content_version,p_reservation_usd
  );
  if admitted->>'allowed'='true' then
    insert into lh_internal.premium_audio_attempt_bindings_v3(
      attempt_id,user_id,lesson_id,content_version,lesson_identity,reserved_usd,
      source_fingerprint,render_revision,storage_path
    ) values (
      p_attempt_id,p_user_id,p_lesson_id,p_content_version,p_lesson_identity,p_reservation_usd,
      p_source_fingerprint,p_render_revision,p_storage_path
    );
  end if;
  return admitted;
end
$$;

create function public.mark_premium_audio_submitted_v3(
  p_attempt_id uuid,
  p_source_fingerprint text,
  p_render_revision integer,
  p_storage_path text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  a lh_internal.premium_audio_attempts%rowtype;
  b lh_internal.premium_audio_attempt_bindings_v3%rowtype;
  marked boolean;
  current_identity jsonb;
begin
  if p_attempt_id is null or p_source_fingerprint is null
     or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1 or p_storage_path is null
  then raise exception 'invalid_audio_attempt'; end if;

  perform 1 from public.professor_budget_settings
    where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings
    where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;

  select * into a from lh_internal.premium_audio_attempts
  where id=p_attempt_id for update;
  select * into b from lh_internal.premium_audio_attempt_bindings_v3
  where attempt_id=p_attempt_id for update;
  if a.id is null or b.attempt_id is null then
    raise exception 'audio_attempt_missing';
  end if;
  if a.user_id is distinct from b.user_id
     or a.lesson_id is distinct from b.lesson_id
     or a.content_version is distinct from b.content_version
     or a.reserved_usd is distinct from b.reserved_usd
     or b.source_fingerprint is distinct from p_source_fingerprint
     or b.render_revision is distinct from p_render_revision
     or b.storage_path is distinct from p_storage_path
  then
    raise exception 'audio_attempt_conflict';
  end if;
  if (a.state='reserved' and (
        a.submitted_at is not null
        or a.settled_at is not null
        or a.estimated_cost_usd is not null
        or a.characters is not null
      ))
     or (a.state in ('submitted','uncertain') and (
        a.submitted_at is null
        or a.settled_at is not null
        or a.estimated_cost_usd is not null
        or a.characters is not null
      ))
     or (a.state='settled' and (
        a.submitted_at is null
        or a.settled_at is null
        or a.estimated_cost_usd is null
        or a.characters is null
      ))
     or (a.state='cancelled' and (
        a.submitted_at is not null
        or a.settled_at is not null
        or a.estimated_cost_usd is not null
        or a.characters is not null
      ))
  then
    raise exception 'audio_reconciliation_required';
  end if;
  if a.state <> 'reserved' then
    return jsonb_build_object(
      'allowed',false,'reason','audio_submission_replayed','state',a.state
    );
  end if;
  current_identity := lh_internal.lock_premium_audio_identity_v3(
    a.user_id,a.lesson_id,b.lesson_identity
  );
  if current_identity is null
     or current_identity is distinct from b.lesson_identity then
    raise exception 'audio_source_changed';
  end if;

  marked := public.mark_premium_audio_submitted_v2(p_attempt_id);
  if not marked then
    return jsonb_build_object(
      'allowed',false,'reason','audio_submission_unavailable','state','reserved'
    );
  end if;
  return jsonb_build_object('allowed',true,'state','submitted');
end
$$;

create function public.close_premium_audio_attempt_v3(
  p_attempt_id uuid,
  p_source_fingerprint text,
  p_render_revision integer,
  p_storage_path text
) returns text
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  a lh_internal.premium_audio_attempts%rowtype;
  b lh_internal.premium_audio_attempt_bindings_v3%rowtype;
  result text;
begin
  if p_attempt_id is null or p_source_fingerprint is null
     or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1 or p_storage_path is null
  then raise exception 'invalid_audio_attempt'; end if;

  perform 1 from public.professor_budget_settings
    where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings
    where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;

  select * into a from lh_internal.premium_audio_attempts
  where id=p_attempt_id for update;
  select * into b from lh_internal.premium_audio_attempt_bindings_v3
  where attempt_id=p_attempt_id for update;
  if a.id is null or b.attempt_id is null then
    raise exception 'audio_attempt_missing';
  end if;
  if a.user_id is distinct from b.user_id
     or a.lesson_id is distinct from b.lesson_id
     or a.content_version is distinct from b.content_version
     or a.reserved_usd is distinct from b.reserved_usd
     or b.source_fingerprint is distinct from p_source_fingerprint
     or b.render_revision is distinct from p_render_revision
     or b.storage_path is distinct from p_storage_path
  then
    raise exception 'audio_attempt_conflict';
  end if;

  update lh_internal.premium_audio_attempts
  set state=case
    when state='reserved' and submitted_at is null
      and settled_at is null and estimated_cost_usd is null and characters is null
      then 'cancelled'
    when state='reserved' then 'uncertain'
    when state='cancelled' and (
      submitted_at is not null or settled_at is not null
      or estimated_cost_usd is not null or characters is not null
    ) then 'uncertain'
    when state='submitted' then 'uncertain'
    else state
  end
  where id=p_attempt_id
  returning state into result;
  return result;
end
$$;

create function public.settle_premium_audio_attempt_v3(
  p_attempt_id uuid,
  p_source_fingerprint text,
  p_render_revision integer,
  p_storage_path text,
  p_estimated_cost_usd numeric,
  p_characters integer
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, lh_internal
as $$
declare
  a lh_internal.premium_audio_attempts%rowtype;
  b lh_internal.premium_audio_attempt_bindings_v3%rowtype;
  asset public.audio_assets%rowtype;
  cache_state jsonb;
  receipt_id text;
  receipt_count integer;
  asset_receipt_count integer;
begin
  if p_attempt_id is null or p_source_fingerprint is null
     or p_source_fingerprint !~ '^[0-9a-f]{64}$'
     or p_render_revision is distinct from 1 or p_storage_path is null
     or p_estimated_cost_usd is null or p_estimated_cost_usd < 0
     or p_estimated_cost_usd > 10000
     or p_estimated_cost_usd='NaN'::numeric
     or p_estimated_cost_usd<>round(p_estimated_cost_usd,6)
     or p_characters is null or p_characters < 1 or p_characters > 20000
  then raise exception 'invalid_audio_receipt'; end if;

  perform 1 from public.professor_budget_settings
    where feature='professor_livekit' for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;
  perform 1 from public.learning_hub_budget_settings
    where id=1 for update;
  if not found then raise exception 'audio_budget_dependency_missing'; end if;

  select * into a from lh_internal.premium_audio_attempts
  where id=p_attempt_id for update;
  select * into b from lh_internal.premium_audio_attempt_bindings_v3
  where attempt_id=p_attempt_id for update;
  if a.id is null or b.attempt_id is null then
    raise exception 'audio_attempt_missing';
  end if;
  if a.user_id is distinct from b.user_id
     or a.lesson_id is distinct from b.lesson_id
     or a.content_version is distinct from b.content_version
     or a.reserved_usd is distinct from b.reserved_usd
     or b.source_fingerprint is distinct from p_source_fingerprint
     or b.render_revision is distinct from p_render_revision
     or b.storage_path is distinct from p_storage_path
  then
    raise exception 'audio_attempt_conflict';
  end if;
  if p_estimated_cost_usd > b.reserved_usd then
    raise exception 'invalid_audio_receipt';
  end if;
  receipt_id := 'premium-audio-v3:' || p_attempt_id::text;

  if a.state='settled' then
    if a.estimated_cost_usd is distinct from p_estimated_cost_usd
       or a.characters is distinct from p_characters
    then raise exception 'audio_reconciliation_required'; end if;
    cache_state := lh_internal.inspect_premium_audio_cache_v3(
      b.lesson_id,b.content_version,b.source_fingerprint,
      b.render_revision,b.storage_path,b.lesson_identity
    );
    if cache_state->>'status' <> 'hit'
    then raise exception 'audio_reconciliation_required'; end if;
    return jsonb_build_object(
      'settled',true,'state','settled','receiptRequestId',receipt_id
    );
  end if;
  if a.state not in ('submitted','uncertain') or a.submitted_at is null then
    raise exception 'audio_attempt_not_submitted';
  end if;
  if b.asset_id is not null or b.receipt_request_id is not null
     or b.settled_at is not null
  then raise exception 'audio_reconciliation_required'; end if;
  if exists (
    select 1 from lh_internal.premium_audio_attempt_bindings_v3 other
    where other.lesson_id=b.lesson_id and other.settled_at is not null
      and other.attempt_id<>b.attempt_id
  ) then raise exception 'audio_reconciliation_required'; end if;

  select * into asset
  from public.audio_assets
  where lesson_id=b.lesson_id and audio_type='commentary'
  for update;
  if asset.id is null
     or asset.storage_path is distinct from b.storage_path
     or asset.generation_request_id is distinct from receipt_id
     or asset.estimated_cost_usd is distinct from p_estimated_cost_usd
     or asset.voice is distinct from 'marin'
     or char_length(asset.transcript_pt) is distinct from p_characters
  then
    raise exception 'audio_reconciliation_required';
  end if;

  select count(*) into asset_receipt_count
  from public.audio_assets
  where generation_request_id=receipt_id;
  if asset_receipt_count <> 1 then
    raise exception 'audio_reconciliation_required';
  end if;

  select count(*) into receipt_count
  from public.ai_usage_log
  where request_id=receipt_id;
  if receipt_count <> 0 then
    raise exception 'audio_reconciliation_required';
  end if;

  -- Receipt, hold release and cache binding commit together. No ON CONFLICT or
  -- UPDATE touches an existing asset/object/receipt.
  insert into public.ai_usage_log(
    user_id,feature,model,estimated_cost_usd,characters,request_id,created_at
  ) values (
    b.user_id,'lesson_audio','gpt-4o-mini-tts',
    p_estimated_cost_usd,p_characters,receipt_id,clock_timestamp()
  );
  update lh_internal.premium_audio_attempts
  set state='settled',estimated_cost_usd=p_estimated_cost_usd,
      characters=p_characters,settled_at=clock_timestamp()
  where id=p_attempt_id;
  update lh_internal.premium_audio_attempt_bindings_v3
  set asset_id=asset.id,receipt_request_id=receipt_id,
      settled_at=clock_timestamp()
  where attempt_id=p_attempt_id;

  return jsonb_build_object(
    'settled',true,'state','settled','receiptRequestId',receipt_id
  );
end
$$;

revoke all on function
  public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb),
  public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb),
  public.mark_premium_audio_submitted_v3(uuid,text,integer,text),
  public.close_premium_audio_attempt_v3(uuid,text,integer,text),
  public.settle_premium_audio_attempt_v3(uuid,text,integer,text,numeric,integer)
from PUBLIC, anon, authenticated, service_role;

commit;

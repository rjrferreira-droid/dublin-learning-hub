-- CANDIDATE ONLY. Do not apply to a connected project without a separately
-- reviewed installation decision. This transaction changes no profile rows.
-- It removes browser self-enrolment and makes learner identity server-owned
-- while retaining owner updates to the three reviewed preference columns.
-- Rollout invariant: keep the UI sign-in-only; install this containment before
-- private Storage, Audio SQL/grants and Edge staging. Reopening registration is
-- a separate reviewed change after that chain is verified.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';
-- Auth sign-up writes auth.users before its legacy profile trigger writes
-- profiles. Take locks in that same order to avoid a lock-order inversion.
lock table auth.users in share row exclusive mode;
lock table public.profiles in share row exclusive mode;

do $profile_assignment_prerequisites$
declare
  authenticated_oid oid := (
    select oid from pg_catalog.pg_roles where rolname='authenticated'
  );
begin
  if current_user <> 'postgres'
     or to_regnamespace('lh_internal') is null
     or pg_catalog.pg_get_userbyid(
          (select nspowner from pg_catalog.pg_namespace
           where oid=to_regnamespace('lh_internal'))
        ) <> 'postgres'
     or to_regprocedure('auth.uid()') is null
     or to_regprocedure('public.handle_new_user()') is null
     or to_regprocedure(
          'lh_internal.enforce_profile_server_assignment_v1()'
        ) is not null
     or authenticated_oid is null
     or exists (
       select 1 from pg_catalog.pg_roles
       where rolname in ('anon','authenticated')
         and (rolsuper or rolbypassrls)
     )
     or (
       select count(*) from pg_catalog.pg_roles
       where rolname in ('anon','authenticated')
     ) <> 2
     or exists (
       select 1
       from pg_catalog.pg_auth_members membership
       join pg_catalog.pg_roles member on member.oid=membership.member
       where member.rolname in ('anon','authenticated')
     )
     or not exists (
       select 1 from pg_catalog.pg_roles
       where rolname='service_role' and rolbypassrls
     )
     or not exists (
       select 1 from pg_catalog.pg_class c
       where c.oid=to_regclass('public.profiles')
         and c.relkind='r'
         and c.relrowsecurity
         and not c.relforcerowsecurity
         and pg_catalog.pg_get_userbyid(c.relowner)='postgres'
     )
     -- Aggregate-only inventory: do not silently bless or repair a profile
     -- created after sign-up or assigned to an unexpected track.
     or (select count(*) from auth.users) <> 1
     or (select count(*) from public.profiles) <> 1
     or (
       select count(*) from public.profiles p
       join auth.users u on u.id=p.id
       where p.learner_track='rafael_finance'
         and p.updated_at=p.created_at
     ) <> 1
     or (
       select count(*) from pg_catalog.pg_attribute a
       where a.attrelid=to_regclass('public.profiles')
         and a.attnum>0 and not a.attisdropped
     ) <> 7
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
       left join pg_catalog.pg_attribute a
         on a.attrelid=to_regclass('public.profiles')
        and a.attname=expected.column_name
        and a.attnum>0 and not a.attisdropped
       left join pg_catalog.pg_attrdef d
         on d.adrelid=a.attrelid and d.adnum=a.attnum
       where a.attname is null
          or pg_catalog.format_type(a.atttypid,a.atttypmod)
               <> expected.data_type
          or a.attnotnull <> expected.is_not_null
          or a.attidentity <> ''
          or a.attgenerated <> ''
          or pg_catalog.pg_get_expr(d.adbin,d.adrelid)
               is distinct from expected.default_expression
     )
     or (
       select count(*) from pg_catalog.pg_constraint
       where conrelid=to_regclass('public.profiles')
     ) <> 3
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
         select 1 from pg_catalog.pg_constraint c
         where c.conrelid=to_regclass('public.profiles')
           and c.conname=expected.constraint_name
           and c.contype=expected.constraint_type::"char"
           and pg_catalog.pg_get_constraintdef(c.oid,true)
                 = expected.constraint_definition
       )
     )
     or (
       select count(*) from pg_catalog.pg_policy
       where polrelid=to_regclass('public.profiles')
     ) <> 3
     or not exists (
       select 1 from pg_catalog.pg_policy p
       where p.polrelid=to_regclass('public.profiles')
         and p.polname='profiles_insert_own'
         and p.polpermissive and p.polcmd='a'
         and p.polroles=array[authenticated_oid]::oid[]
         and p.polqual is null
         and pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid)
               ='(auth.uid() = id)'
     )
     or not exists (
       select 1 from pg_catalog.pg_policy p
       where p.polrelid=to_regclass('public.profiles')
         and p.polname='profiles_select_own'
         and p.polpermissive and p.polcmd='r'
         and p.polroles=array[authenticated_oid]::oid[]
         and pg_catalog.pg_get_expr(p.polqual,p.polrelid)
               ='(auth.uid() = id)'
         and p.polwithcheck is null
     )
     or not exists (
       select 1 from pg_catalog.pg_policy p
       where p.polrelid=to_regclass('public.profiles')
         and p.polname='profiles_update_own'
         and p.polpermissive and p.polcmd='w'
         and p.polroles=array[authenticated_oid]::oid[]
         and pg_catalog.pg_get_expr(p.polqual,p.polrelid)
               ='(auth.uid() = id)'
         and pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid)
               ='(auth.uid() = id)'
     )
     or exists (
       select 1 from pg_catalog.pg_attribute a
       where a.attrelid=to_regclass('public.profiles')
         and a.attnum>0 and not a.attisdropped and a.attacl is not null
     )
     or exists (
       select 1 from pg_catalog.pg_rewrite rule
       where rule.ev_class=to_regclass('public.profiles')
         and rule.rulename<>'_RETURN'
     )
     or exists (
       select 1
       from pg_catalog.pg_class c
       cross join lateral pg_catalog.aclexplode(c.relacl) acl
       left join pg_catalog.pg_roles role on role.oid=acl.grantee
       where c.oid=to_regclass('public.profiles')
         and (
           acl.grantee=0
           or acl.grantor<>c.relowner
           or (acl.grantee<>c.relowner and acl.is_grantable)
           or coalesce(role.rolname,'') not in (
             'postgres','anon','authenticated','service_role'
           )
         )
     )
     or exists (
       select 1
       from (values ('anon'),('authenticated'),('service_role'))
         expected_role(role_name)
       cross join lateral (
         select default_acl.privilege_type
         from pg_catalog.pg_class c
         cross join lateral pg_catalog.aclexplode(
           pg_catalog.acldefault('r',c.relowner)
         ) default_acl
         where c.oid=to_regclass('public.profiles')
           and default_acl.grantee=c.relowner
       ) expected_privilege
       where not pg_catalog.has_table_privilege(
         expected_role.role_name,'public.profiles',
         expected_privilege.privilege_type
       )
     )
     or (
       select count(*) from pg_catalog.pg_trigger t
       where t.tgrelid=to_regclass('public.profiles') and not t.tgisinternal
     ) <> 1
     or not exists (
       select 1
       from pg_catalog.pg_trigger t
       join pg_catalog.pg_proc p on p.oid=t.tgfoid
       join pg_catalog.pg_language l on l.oid=p.prolang
       where t.tgrelid=to_regclass('public.profiles')
         and t.tgname='profiles_updated_at'
         and not t.tgisinternal and t.tgenabled='O'
         and t.tgtype=19 and t.tgqual is null
         and t.tgnargs=0 and t.tgattr::text=''
         and p.oid=to_regprocedure('public.set_updated_at()')
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '3c6d6c41d6262a20e7c102dbd49bb3383bd86a4138c8a3ab6b9b04a1ec2420a5'
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and l.lanname='plpgsql' and p.provolatile='v'
         and not p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=public']::text[]
     )
     or (
       select count(*) from pg_catalog.pg_trigger t
       where t.tgfoid=to_regprocedure('public.handle_new_user()')
         and not t.tgisinternal
     ) <> 1
     or (
       select count(*) from pg_catalog.pg_trigger t
       where t.tgrelid=to_regclass('auth.users') and not t.tgisinternal
     ) <> 1
     or not exists (
       select 1
       from pg_catalog.pg_trigger t
       join pg_catalog.pg_proc p on p.oid=t.tgfoid
       join pg_catalog.pg_language l on l.oid=p.prolang
       where t.tgrelid=to_regclass('auth.users')
         and t.tgname='on_auth_user_created'
         and not t.tgisinternal and t.tgenabled='O'
         and t.tgtype=5 and t.tgqual is null
         and t.tgnargs=0 and t.tgattr::text=''
         and p.oid=to_regprocedure('public.handle_new_user()')
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '5cf21e46fa593a184225c19283c8b04da164f3537be6f0c407d36fb4fa99aecb'
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and l.lanname='plpgsql' and p.provolatile='v'
         and p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=public']::text[]
     )
     or (
       select count(*)
       from pg_catalog.pg_proc p
       cross join lateral pg_catalog.aclexplode(p.proacl) acl
       where p.oid=to_regprocedure('public.handle_new_user()')
     ) <> 2
     or exists (
       select 1
       from pg_catalog.pg_proc p
       cross join lateral pg_catalog.aclexplode(p.proacl) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       left join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
       where p.oid=to_regprocedure('public.handle_new_user()')
         and (
           coalesce(grantee.rolname,'') not in ('postgres','service_role')
           or grantor.rolname<>'postgres'
           or acl.privilege_type<>'EXECUTE'
           or acl.is_grantable
         )
     )
     or (
       select count(*)
       from pg_catalog.pg_proc p
       where (
           p.prosrc ~* E'\\minsert[[:space:]]+into[[:space:]]+public\\.profiles\\M'
           or p.prosrc ~* E'\\mupdate[[:space:]]+public\\.profiles\\M'
           or p.prosrc ~* E'\\mdelete[[:space:]]+from[[:space:]]+public\\.profiles\\M'
         )
     ) <> 1
     or not exists (
       select 1 from pg_catalog.pg_proc p
       where p.oid=to_regprocedure('public.handle_new_user()')
         and (
           p.prosrc ~* E'\\minsert[[:space:]]+into[[:space:]]+public\\.profiles\\M'
           or p.prosrc ~* E'\\mupdate[[:space:]]+public\\.profiles\\M'
           or p.prosrc ~* E'\\mdelete[[:space:]]+from[[:space:]]+public\\.profiles\\M'
         )
     )
  then
    raise exception 'profile_assignment_containment_prerequisites_missing';
  end if;
end
$profile_assignment_prerequisites$;

-- Remove every browser table privilege first. Re-add only the reviewed read
-- and preference-edit surface; timestamps continue to be maintained by the
-- existing BEFORE trigger without a client UPDATE grant.
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name,preferred_language,timezone)
  on table public.profiles to authenticated;

drop policy profiles_insert_own on public.profiles;

-- The reviewed legacy Auth trigger copied user-editable raw_user_meta_data
-- into learner_track as postgres. Keep its function dormant for a reversible
-- rollback, but remove the trigger and every non-owner EXECUTE path.
drop trigger on_auth_user_created on auth.users;
revoke all on function public.handle_new_user()
  from PUBLIC,anon,authenticated,service_role;

create function lh_internal.enforce_profile_server_assignment_v1()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog
as $profile_assignment_guard$
declare
  request_role text:=nullif(
    current_setting('request.jwt.claim.role',true),''
  );
  request_claims text:=nullif(
    current_setting('request.jwt.claims',true),''
  );
  claims_role text;
begin
  if request_claims is not null then
    begin
      claims_role:=nullif(request_claims::jsonb->>'role','');
    exception when others then
      claims_role:='__invalid__';
    end;
  end if;

  -- Direct maintenance has no request claims. A service JWT is trusted only
  -- when every supplied claim source agrees, so an authenticated request
  -- cannot tunnel through a postgres- or service_role-owned definer.
  if current_user in ('postgres','service_role')
     and request_role is null
     and request_claims is null then
    return new;
  end if;

  if current_user in ('postgres','service_role')
     and (request_role='service_role' or claims_role='service_role')
     and (request_role is null or request_role='service_role')
     and (claims_role is null or claims_role='service_role') then
    return new;
  end if;

  if tg_op='INSERT' then
    raise exception 'profile_provisioning_server_only' using errcode='42501';
  end if;

  if new.id is distinct from old.id
     or new.learner_track is distinct from old.learner_track then
    raise exception 'profile_assignment_server_only' using errcode='42501';
  end if;

  return new;
end
$profile_assignment_guard$;

alter function lh_internal.enforce_profile_server_assignment_v1()
  owner to postgres;
revoke all on function lh_internal.enforce_profile_server_assignment_v1()
  from PUBLIC,anon,authenticated,service_role;

-- AFTER observes the final row after profiles_updated_at (and any other
-- reviewed BEFORE trigger). Raising here still rolls back the whole statement.
create trigger profiles_server_assignment_guard_v1
after insert or update on public.profiles
for each row
execute function lh_internal.enforce_profile_server_assignment_v1();

do $profile_assignment_postcondition$
declare
  authenticated_oid oid := (
    select oid from pg_catalog.pg_roles where rolname='authenticated'
  );
begin
  if (
       select count(*) from pg_catalog.pg_roles
       where rolname in ('anon','authenticated')
     ) <> 2
     or exists (
       select 1 from pg_catalog.pg_roles
       where rolname in ('anon','authenticated')
         and (rolsuper or rolbypassrls)
     )
     or exists (
       select 1
       from pg_catalog.pg_auth_members membership
       join pg_catalog.pg_roles member on member.oid=membership.member
       where member.rolname in ('anon','authenticated')
     )
     or not exists (
       select 1 from pg_catalog.pg_roles
       where rolname='service_role' and rolbypassrls
     )
     or (select count(*) from auth.users) <> 1
     or (select count(*) from public.profiles) <> 1
     or (
       select count(*) from public.profiles p
       join auth.users u on u.id=p.id
       where p.learner_track='rafael_finance'
         and p.updated_at=p.created_at
     ) <> 1
     or (
       select count(*) from pg_catalog.pg_policy
       where polrelid=to_regclass('public.profiles')
     ) <> 2
     or exists (
       select 1 from pg_catalog.pg_policy p
       where p.polrelid=to_regclass('public.profiles')
         and p.polcmd in ('*','a','d')
     )
     or not exists (
       select 1 from pg_catalog.pg_policy p
       where p.polrelid=to_regclass('public.profiles')
         and p.polname='profiles_select_own'
         and p.polpermissive and p.polcmd='r'
         and p.polroles=array[authenticated_oid]::oid[]
         and pg_catalog.pg_get_expr(p.polqual,p.polrelid)
               ='(auth.uid() = id)'
         and p.polwithcheck is null
     )
     or not exists (
       select 1 from pg_catalog.pg_policy p
       where p.polrelid=to_regclass('public.profiles')
         and p.polname='profiles_update_own'
         and p.polpermissive and p.polcmd='w'
         and p.polroles=array[authenticated_oid]::oid[]
         and pg_catalog.pg_get_expr(p.polqual,p.polrelid)
               ='(auth.uid() = id)'
         and pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid)
               ='(auth.uid() = id)'
     )
     or exists (
       select 1
       from pg_catalog.pg_class c
       cross join lateral pg_catalog.aclexplode(
         pg_catalog.acldefault('r',c.relowner)
       ) denied
       where c.oid=to_regclass('public.profiles')
         and denied.grantee=c.relowner
         and (
           pg_catalog.has_table_privilege(
             'anon','public.profiles',denied.privilege_type
           )
           or (
             denied.privilege_type<>'SELECT'
             and pg_catalog.has_table_privilege(
               'authenticated','public.profiles',denied.privilege_type
             )
           )
         )
     )
     or exists (
       select 1
       from pg_catalog.pg_class c
       cross join lateral pg_catalog.aclexplode(c.relacl) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       left join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
       where c.oid=to_regclass('public.profiles')
         and (
           acl.grantee=0
           or grantor.rolname<>'postgres'
           or coalesce(grantee.rolname,'') not in (
             'postgres','authenticated','service_role'
           )
           or (grantee.rolname<>'postgres' and acl.is_grantable)
           or (
             grantee.rolname='authenticated'
             and acl.privilege_type<>'SELECT'
           )
         )
     )
     or exists (
       select 1
       from pg_catalog.pg_class c
       cross join lateral pg_catalog.aclexplode(
         pg_catalog.acldefault('r',c.relowner)
       ) expected_privilege
       where c.oid=to_regclass('public.profiles')
         and expected_privilege.grantee=c.relowner
         and not pg_catalog.has_table_privilege(
           'service_role','public.profiles',
           expected_privilege.privilege_type
         )
     )
     or not pg_catalog.has_table_privilege(
       'authenticated','public.profiles','SELECT'
     )
     or exists (
       select 1
       from (values
         ('id'),('learner_track'),('created_at'),('updated_at')
       ) denied(column_name)
       where pg_catalog.has_table_privilege(
         'authenticated','public.profiles','UPDATE'
       )
          or pg_catalog.has_column_privilege(
         'authenticated','public.profiles',denied.column_name,'UPDATE'
          )
     )
     or exists (
       select 1
       from (values
         ('display_name'),('preferred_language'),('timezone')
       ) allowed(column_name)
       where not pg_catalog.has_column_privilege(
         'authenticated','public.profiles',allowed.column_name,'UPDATE'
       )
     )
     or (
       select count(*)
       from pg_catalog.pg_attribute a
       cross join lateral pg_catalog.aclexplode(a.attacl) acl
       where a.attrelid=to_regclass('public.profiles')
         and a.attnum>0 and not a.attisdropped
     ) <> 3
     or exists (
       select 1
       from pg_catalog.pg_attribute a
       cross join lateral pg_catalog.aclexplode(a.attacl) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       left join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
       where a.attrelid=to_regclass('public.profiles')
         and a.attnum>0 and not a.attisdropped
         and (
           a.attname not in ('display_name','preferred_language','timezone')
           or grantee.rolname<>'authenticated'
           or grantor.rolname<>'postgres'
           or acl.privilege_type<>'UPDATE'
           or acl.is_grantable
         )
     )
     or exists (
       select 1 from pg_catalog.pg_rewrite rule
       where rule.ev_class=to_regclass('public.profiles')
         and rule.rulename<>'_RETURN'
     )
     or (
       select count(*) from pg_catalog.pg_trigger t
       where t.tgrelid=to_regclass('public.profiles') and not t.tgisinternal
     ) <> 2
     or not exists (
       select 1
       from pg_catalog.pg_trigger t
       join pg_catalog.pg_proc p on p.oid=t.tgfoid
       join pg_catalog.pg_language l on l.oid=p.prolang
       where t.tgrelid=to_regclass('public.profiles')
         and t.tgname='profiles_updated_at'
         and not t.tgisinternal and t.tgenabled='O'
         and t.tgtype=19 and t.tgqual is null
         and t.tgnargs=0 and t.tgattr::text=''
         and p.oid=to_regprocedure('public.set_updated_at()')
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '3c6d6c41d6262a20e7c102dbd49bb3383bd86a4138c8a3ab6b9b04a1ec2420a5'
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and l.lanname='plpgsql' and p.provolatile='v'
         and not p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=public']::text[]
     )
     or exists (
       select 1 from pg_catalog.pg_trigger t
       where t.tgrelid=to_regclass('auth.users') and not t.tgisinternal
     )
     or exists (
       select 1 from pg_catalog.pg_trigger t
       where t.tgfoid=to_regprocedure('public.handle_new_user()')
     )
     or not exists (
       select 1
       from pg_catalog.pg_proc p
       join pg_catalog.pg_language l on l.oid=p.prolang
       where p.oid=to_regprocedure('public.handle_new_user()')
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '5cf21e46fa593a184225c19283c8b04da164f3537be6f0c407d36fb4fa99aecb'
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and l.lanname='plpgsql' and p.provolatile='v'
         and p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=public']::text[]
     )
     or (
       select count(*)
       from pg_catalog.pg_proc p
       cross join lateral pg_catalog.aclexplode(p.proacl) acl
       where p.oid=to_regprocedure('public.handle_new_user()')
     ) <> 1
     or exists (
       select 1
       from pg_catalog.pg_proc p
       cross join lateral pg_catalog.aclexplode(p.proacl) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       left join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
       where p.oid=to_regprocedure('public.handle_new_user()')
         and (
           grantee.rolname<>'postgres'
           or grantor.rolname<>'postgres'
           or acl.privilege_type<>'EXECUTE'
           or acl.is_grantable
         )
     )
     or exists (
       select 1
       from pg_catalog.pg_proc p
       where (
           p.prosrc ~* E'\\minsert[[:space:]]+into[[:space:]]+public\\.profiles\\M'
           or p.prosrc ~* E'\\mupdate[[:space:]]+public\\.profiles\\M'
           or p.prosrc ~* E'\\mdelete[[:space:]]+from[[:space:]]+public\\.profiles\\M'
         )
         and (
           pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
           or pg_catalog.has_function_privilege(
             'authenticated',p.oid,'EXECUTE'
           )
         )
     )
     or not exists (
       select 1 from pg_catalog.pg_trigger t
       where t.tgrelid=to_regclass('public.profiles')
         and t.tgname='profiles_server_assignment_guard_v1'
         and not t.tgisinternal and t.tgenabled='O'
         and t.tgtype=21 and t.tgqual is null
         and t.tgnargs=0 and t.tgattr::text=''
         and t.tgfoid=to_regprocedure(
           'lh_internal.enforce_profile_server_assignment_v1()'
         )
     )
     or not exists (
       select 1
       from pg_catalog.pg_proc p
       join pg_catalog.pg_language l on l.oid=p.prolang
       where p.oid=to_regprocedure(
         'lh_internal.enforce_profile_server_assignment_v1()'
       )
         and p.prorettype='trigger'::regtype and p.pronargs=0
         and p.proargnames is null and p.proallargtypes is null
         and p.proargmodes is null and p.pronargdefaults=0
         and l.lanname='plpgsql' and p.provolatile='v'
         and not p.prosecdef and not p.proisstrict and not p.proleakproof
         and not p.proretset and p.proparallel='u' and p.prokind='f'
         and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
         and p.proconfig=array['search_path=pg_catalog']::text[]
         and encode(extensions.digest(p.prosrc,'sha256'),'hex')=
           '3a79818cfc6f2e819e8bf2c4414d5a6a02f6c390203bde01033ad34a7148cd72'
     )
     or (
       select count(*)
       from pg_catalog.pg_proc p
       cross join lateral pg_catalog.aclexplode(p.proacl) acl
       where p.oid=to_regprocedure(
         'lh_internal.enforce_profile_server_assignment_v1()'
       )
     ) <> 1
     or exists (
       select 1
       from pg_catalog.pg_proc p
       cross join lateral pg_catalog.aclexplode(p.proacl) acl
       left join pg_catalog.pg_roles grantee on grantee.oid=acl.grantee
       left join pg_catalog.pg_roles grantor on grantor.oid=acl.grantor
       where p.oid=to_regprocedure(
         'lh_internal.enforce_profile_server_assignment_v1()'
       )
         and (
           grantee.rolname<>'postgres'
           or grantor.rolname<>'postgres'
           or acl.privilege_type<>'EXECUTE'
           or acl.is_grantable
         )
     )
     or pg_catalog.has_function_privilege(
       'anon','lh_internal.enforce_profile_server_assignment_v1()','EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'lh_internal.enforce_profile_server_assignment_v1()','EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'service_role',
       'lh_internal.enforce_profile_server_assignment_v1()','EXECUTE'
     )
  then
    raise exception 'profile_assignment_containment_postcondition_failed';
  end if;
end
$profile_assignment_postcondition$;

commit;

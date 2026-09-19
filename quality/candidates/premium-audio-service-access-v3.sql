-- Reviewed service-only access. No generation/stage/lesson changes.
-- Operator target: aazfyosqqeujureksqjs only; verify closed Edge stage externally.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $access$
declare expected record; fn oid; api text; p record;
begin
  if current_user <> 'postgres' then raise exception 'audio_v3_access_owner_required'; end if;
  if not exists(select 1 from pg_roles where rolname='service_role' and not rolsuper)
     or (select count(*) from pg_roles where rolname in ('anon','authenticated') and not rolsuper and not rolbypassrls)<>2
  then raise exception 'audio_v3_access_role_drift'; end if;
  foreach api in array array['anon','authenticated'] loop
    if pg_has_role(api,'service_role','MEMBER') or pg_has_role(api,'postgres','MEMBER') then
      raise exception 'audio_v3_access_role_drift';
    end if;
  end loop;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='lh_internal' and c.relname='premium_audio_attempt_bindings_v3'
      and c.relkind='r' and c.relrowsecurity and c.relowner='postgres'::regrole
      and not exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where a.grantee<>c.relowner)
      and not exists(select 1 from pg_policy where polrelid=c.oid)) then
    raise exception 'audio_v3_access_table_drift';
  end if;
  for expected in select * from (values
    ('lh_internal.premium_audio_identity_shape_valid_v3(jsonb)','4450377f902b0697ab7bc3c2f81405c6de392836f0762368e4f74a67b2a6c5ab',false,'pg_catalog','boolean'),
    ('lh_internal.premium_audio_expected_path_v3(uuid,integer,text,integer)','97bf76d30c67522d22357752089ab2e21d6deaf88ec216f5333428e805df9cfd',true,'pg_catalog','text'),
    ('lh_internal.lock_premium_audio_identity_v3(uuid,uuid,jsonb)','2e8477c95ae27867659d9f5ec3848cf1d9bcf9ee589c4f96b995760d31e8c8a3',true,'pg_catalog, public, lh_internal','jsonb'),
    ('lh_internal.inspect_premium_audio_cache_v3(uuid,integer,text,integer,text,jsonb)','0809bdf44c902c8dc02cfe8b6d11908e6bb2dfd82dc2e541f26c5cd6a028611d',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb)','c99e0305b2950917388cb4484a71c4abc57c94cb8e4113929cc340cfc92efcb6',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb)','da2ef1e2ce2e16082f73a2c24707c64f0697432f0ac5966e22d1c2fd19bbcec2',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.mark_premium_audio_submitted_v3(uuid,text,integer,text)','4794546aa596d4f9f7c6c3dc72b00e3544ba1f665b76f59420682ad3d5b3d884',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.close_premium_audio_attempt_v3(uuid,text,integer,text)','102ce2ed633ef3ef7a513c761d03e31dde41ad3bc9982ef3a1f8244633ad3b44',true,'pg_catalog, public, lh_internal','text'),
    ('public.settle_premium_audio_attempt_v3(uuid,text,integer,text,numeric,integer)','4c138e82e0bcaa57d03416bad673b7820e378daaa9a11db1ae61d268329bde64',true,'pg_catalog, public, lh_internal','jsonb')
  ) v(signature,body_hash,definer,search_path,result_type) loop
    fn:=to_regprocedure(expected.signature);
    if fn is null then raise exception 'audio_v3_access_function_missing'; end if;
    select * into p from pg_proc where oid=fn;
    if p.proowner<>'postgres'::regrole or p.prosecdef is distinct from expected.definer
       or p.prorettype<>to_regtype(expected.result_type)
       or p.prokind<>'f' or p.proretset or p.pronargdefaults<>0
       or p.proconfig is distinct from array['search_path='||expected.search_path]
       or encode(extensions.digest(p.prosrc,'sha256'),'hex')<>expected.body_hash
       or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee<>p.proowner)
    then raise exception 'audio_v3_access_function_drift: %',expected.signature; end if;
    foreach api in array array['anon','authenticated','service_role'] loop
      if has_function_privilege(api,fn,'EXECUTE') then raise exception 'audio_v3_access_already_callable'; end if;
    end loop;
  end loop;
  grant execute on function public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb) to service_role;
  grant execute on function public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb) to service_role;
  grant execute on function public.mark_premium_audio_submitted_v3(uuid,text,integer,text) to service_role;
  grant execute on function public.close_premium_audio_attempt_v3(uuid,text,integer,text) to service_role;
  grant execute on function public.settle_premium_audio_attempt_v3(uuid,text,integer,text,numeric,integer) to service_role;
  for expected in select * from (values
    ('lh_internal.premium_audio_identity_shape_valid_v3(jsonb)','4450377f902b0697ab7bc3c2f81405c6de392836f0762368e4f74a67b2a6c5ab',false,'pg_catalog','boolean'),
    ('lh_internal.premium_audio_expected_path_v3(uuid,integer,text,integer)','97bf76d30c67522d22357752089ab2e21d6deaf88ec216f5333428e805df9cfd',true,'pg_catalog','text'),
    ('lh_internal.lock_premium_audio_identity_v3(uuid,uuid,jsonb)','2e8477c95ae27867659d9f5ec3848cf1d9bcf9ee589c4f96b995760d31e8c8a3',true,'pg_catalog, public, lh_internal','jsonb'),
    ('lh_internal.inspect_premium_audio_cache_v3(uuid,integer,text,integer,text,jsonb)','0809bdf44c902c8dc02cfe8b6d11908e6bb2dfd82dc2e541f26c5cd6a028611d',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb)','c99e0305b2950917388cb4484a71c4abc57c94cb8e4113929cc340cfc92efcb6',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb)','da2ef1e2ce2e16082f73a2c24707c64f0697432f0ac5966e22d1c2fd19bbcec2',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.mark_premium_audio_submitted_v3(uuid,text,integer,text)','4794546aa596d4f9f7c6c3dc72b00e3544ba1f665b76f59420682ad3d5b3d884',true,'pg_catalog, public, lh_internal','jsonb'),
    ('public.close_premium_audio_attempt_v3(uuid,text,integer,text)','102ce2ed633ef3ef7a513c761d03e31dde41ad3bc9982ef3a1f8244633ad3b44',true,'pg_catalog, public, lh_internal','text'),
    ('public.settle_premium_audio_attempt_v3(uuid,text,integer,text,numeric,integer)','4c138e82e0bcaa57d03416bad673b7820e378daaa9a11db1ae61d268329bde64',true,'pg_catalog, public, lh_internal','jsonb')
  ) v(signature,body_hash,definer,search_path,result_type) loop
    fn:=to_regprocedure(expected.signature);
    if has_function_privilege('anon',fn,'EXECUTE') or has_function_privilege('authenticated',fn,'EXECUTE')
      or has_function_privilege('service_role',fn,'EXECUTE') is distinct from (expected.signature like 'public.%')
      or exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.oid=fn
        and (a.grantee=0 or (a.grantee<>p.proowner and
          (a.grantee<>'service_role'::regrole or a.is_grantable or a.privilege_type<>'EXECUTE'))))
    then raise exception 'audio_v3_access_postcondition_failed'; end if;
  end loop;
end
$access$;
commit;

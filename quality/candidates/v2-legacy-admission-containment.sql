-- Existing-V2 incremental containment. Reviewed target: aazfyosqqeujureksqjs.
-- One atomic DO statement; also safe inside the migration transaction.
-- No function body read/replacement, row mutation, rename, drop or CASCADE.
-- Keep the atomic Audio legacy-entrypoint installation guard unchanged.
do $containment$
declare legacy oid; owner_id oid; role_name text;
begin
 legacy:=to_regprocedure('public.reserve_professor_budget(text)');
 if legacy is null then raise exception 'legacy_admission_missing'; end if;
 select proowner into owner_id from pg_proc where oid=legacy;
 if pg_get_userbyid(owner_id)<>'postgres' then
  raise exception 'legacy_admission_owner_drift';
 end if;
 if exists (
  select 1 from pg_proc p cross join lateral
   aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where p.oid=legacy and (a.grantor<>owner_id or a.is_grantable
   or a.grantee not in (owner_id,'authenticated'::regrole::oid,'service_role'::regrole::oid))
 ) then raise exception 'legacy_admission_acl_drift'; end if;
 -- RESTRICT never cascades into grants or unrelated objects.
 revoke execute on function public.reserve_professor_budget(text)
  from authenticated,service_role restrict;
 foreach role_name in array array['anon','authenticated','service_role'] loop
  if has_function_privilege(role_name,legacy,'EXECUTE') then
   raise exception 'legacy_admission_still_callable';
  end if;
 end loop;
end $containment$;

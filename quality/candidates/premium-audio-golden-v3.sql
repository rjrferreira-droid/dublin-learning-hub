-- Restore only the exact Finance and English original lessons in authored v3.
-- Target: isolated aazfyosqqeujureksqjs, with Edge admission closed externally.
-- No budget, attempt, receipt, asset, lesson or original-backend data changes.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $guard$
declare expected record; fn oid; p record;
begin
  if current_user<>'postgres' then raise exception 'audio_golden_owner_required'; end if;
  if to_regprocedure('lh_internal.premium_audio_scope_valid_v3(jsonb)') is not null then
    raise exception 'audio_golden_already_installed'; end if;
  if not exists(select 1 from pg_constraint where
    conrelid='lh_internal.premium_audio_attempt_bindings_v3'::regclass
    and conname='premium_audio_attempt_bindings_v3_check' and convalidated
    and encode(extensions.digest(pg_get_constraintdef(oid),'sha256'),'hex')=
      '88778a0388c4892e80d61631475540943e92522910306f55b881b77bf3e38af6') then
    raise exception 'audio_golden_constraint_drift'; end if;
  if not exists(select 1 from pg_class c where c.oid='lh_internal.premium_audio_attempt_bindings_v3'::regclass
    and c.relrowsecurity and c.relowner='postgres'::regrole
    and not exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where a.grantee<>c.relowner)
    and not exists(select 1 from pg_policy where polrelid=c.oid)) then
    raise exception 'audio_golden_table_drift'; end if;
  for expected in select * from (values
    ('lh_internal.premium_audio_identity_shape_valid_v3(jsonb)','4450377f902b0697ab7bc3c2f81405c6de392836f0762368e4f74a67b2a6c5ab',false,'pg_catalog'),
    ('lh_internal.premium_audio_expected_path_v3(uuid,integer,text,integer)','97bf76d30c67522d22357752089ab2e21d6deaf88ec216f5333428e805df9cfd',true,'pg_catalog'),
    ('lh_internal.lock_premium_audio_identity_v3(uuid,uuid,jsonb)','2e8477c95ae27867659d9f5ec3848cf1d9bcf9ee589c4f96b995760d31e8c8a3',true,'pg_catalog, public, lh_internal'),
    ('lh_internal.inspect_premium_audio_cache_v3(uuid,integer,text,integer,text,jsonb)','0809bdf44c902c8dc02cfe8b6d11908e6bb2dfd82dc2e541f26c5cd6a028611d',true,'pg_catalog, public, lh_internal'),
    ('public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb)','c99e0305b2950917388cb4484a71c4abc57c94cb8e4113929cc340cfc92efcb6',true,'pg_catalog, public, lh_internal'),
    ('public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb)','da2ef1e2ce2e16082f73a2c24707c64f0697432f0ac5966e22d1c2fd19bbcec2',true,'pg_catalog, public, lh_internal'),
    ('public.mark_premium_audio_submitted_v3(uuid,text,integer,text)','4794546aa596d4f9f7c6c3dc72b00e3544ba1f665b76f59420682ad3d5b3d884',true,'pg_catalog, public, lh_internal'),
    ('public.close_premium_audio_attempt_v3(uuid,text,integer,text)','102ce2ed633ef3ef7a513c761d03e31dde41ad3bc9982ef3a1f8244633ad3b44',true,'pg_catalog, public, lh_internal'),
    ('public.settle_premium_audio_attempt_v3(uuid,text,integer,text,numeric,integer)','4c138e82e0bcaa57d03416bad673b7820e378daaa9a11db1ae61d268329bde64',true,'pg_catalog, public, lh_internal')
  ) v(signature,body_hash,definer,search_path) loop
    fn:=to_regprocedure(expected.signature);
    if fn is null then raise exception 'audio_golden_function_missing'; end if;
    select * into p from pg_proc where oid=fn;
    if p.proowner<>'postgres'::regrole or p.prosecdef is distinct from expected.definer
      or p.proconfig is distinct from array['search_path='||expected.search_path]
      or encode(extensions.digest(p.prosrc,'sha256'),'hex')<>expected.body_hash
      or has_function_privilege('anon',fn,'EXECUTE') or has_function_privilege('authenticated',fn,'EXECUTE')
      or has_function_privilege('service_role',fn,'EXECUTE') is distinct from (expected.signature like 'public.%')
      or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where a.grantee<>p.proowner and (a.grantee<>'service_role'::regrole or a.is_grantable)) then
      raise exception 'audio_golden_function_drift: %',expected.signature; end if;
  end loop;
end
$guard$;

create function lh_internal.premium_audio_scope_valid_v3(p_identity jsonb)
returns boolean language sql immutable security invoker set search_path=pg_catalog
as $$
  select coalesce(
    (p_identity->'sequence'=to_jsonb(2) and (
      (p_identity->>'requestedTrack'='rafael_finance' and p_identity->>'lessonSlug'='revenue-judgement-contracts-performance-obligations-cutoff')
      or (p_identity->>'requestedTrack'='viviane_payroll' and p_identity->>'lessonSlug'='rpn-pay-date-employment-id-payroll-submission')
      or (p_identity->>'requestedTrack'='english_academy' and p_identity->>'lessonSlug'='clarify-check-understanding-handle-meetings')
    )) or (p_identity->'sequence'=to_jsonb(1) and (
      (p_identity->>'lessonId'='b3639582-3c32-4147-a4b3-84237d11a66e'
        and p_identity->>'requestedTrack'='rafael_finance'
        and p_identity->>'lessonSlug'='ifrs-18-group-reporting-irish-statutory')
      or (p_identity->>'lessonId'='f455a740-f50f-4eb7-95a7-9e4129ca4a68'
        and p_identity->>'requestedTrack'='english_academy'
        and p_identity->>'lessonSlug'='story-past-forms-rhythm-follow-up')
    )),false)
$$;
revoke all on function lh_internal.premium_audio_scope_valid_v3(jsonb)
  from PUBLIC,anon,authenticated,service_role;

do $expand$
declare definition text; signature text;
  old_scope constant text := $scope$or p_lesson_identity->'sequence' is distinct from to_jsonb(2)
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
     )$scope$;
begin
  -- Exact prior bodies are pinned above. Replacing only the scope predicate
  -- preserves every existing lock, cost calculation, fence, receipt and ACL.
  definition:=pg_get_functiondef('lh_internal.premium_audio_identity_shape_valid_v3(jsonb)'::regprocedure);
  if (length(definition)-length(replace(definition,'^[2-8]$','')))/length('^[2-8]$')<>1 then
    raise exception 'audio_golden_shape_replacement_mismatch'; end if;
  execute replace(definition,'^[2-8]$','^[1-8]$');
  foreach signature in array array[
    'public.observe_premium_audio_cache_v3(uuid,uuid,integer,text,integer,text,jsonb)',
    'public.begin_premium_audio_attempt_v3(uuid,uuid,uuid,integer,numeric,text,integer,text,jsonb)'
  ] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    if (length(definition)-length(replace(definition,old_scope,'')))/length(old_scope)<>1 then
      raise exception 'audio_golden_scope_replacement_mismatch'; end if;
    execute replace(definition,old_scope,'or not lh_internal.premium_audio_scope_valid_v3(p_lesson_identity)');
  end loop;
end
$expand$;

alter table lh_internal.premium_audio_attempt_bindings_v3
  drop constraint premium_audio_attempt_bindings_v3_check,
  add constraint premium_audio_attempt_bindings_v3_check check (
    lh_internal.premium_audio_identity_shape_valid_v3(lesson_identity)
    and lesson_identity->>'lessonId'=lesson_id::text
    and lesson_identity->'contentVersion'=to_jsonb(content_version)
    and lh_internal.premium_audio_scope_valid_v3(lesson_identity)
  );
commit;

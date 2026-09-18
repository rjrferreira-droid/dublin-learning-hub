-- Run only after the disposable profile fixture and containment candidate.
-- Every mutation in this test is rolled back; no provider or network is used.
\set ON_ERROR_STOP on
begin;

do $metadata$
begin
  if (select count(*) from pg_catalog.pg_policy
      where polrelid='public.profiles'::regclass) <> 2
     or exists(select 1 from pg_catalog.pg_policy
               where polrelid='public.profiles'::regclass
                 and polcmd in ('*','a','d'))
     or (select count(*) from pg_catalog.pg_trigger
         where tgrelid='public.profiles'::regclass
           and not tgisinternal) <> 2
     or not exists(
       select 1 from pg_catalog.pg_trigger
       where tgrelid='public.profiles'::regclass
         and tgname='profiles_server_assignment_guard_v1'
         and not tgisinternal and tgenabled='O' and tgtype=21
         and tgqual is null and tgnargs=0 and tgattr::text=''
     )
     or exists(select 1 from pg_catalog.pg_trigger
               where tgrelid='auth.users'::regclass and not tgisinternal)
     or pg_catalog.has_table_privilege(
          'authenticated','public.profiles','INSERT'
        )
     or pg_catalog.has_table_privilege(
          'authenticated','public.profiles','UPDATE'
        )
     or pg_catalog.has_column_privilege(
          'authenticated','public.profiles','learner_track','UPDATE'
        )
     or not pg_catalog.has_column_privilege(
          'authenticated','public.profiles','display_name','UPDATE'
        )
     or not pg_catalog.has_column_privilege(
          'authenticated','public.profiles','preferred_language','UPDATE'
        )
     or not pg_catalog.has_column_privilege(
          'authenticated','public.profiles','timezone','UPDATE'
        )
  then
    raise exception 'profile_containment_metadata_failed';
  end if;
end
$metadata$;

-- Malicious user metadata no longer creates or assigns a profile.
insert into auth.users(id,email,raw_user_meta_data)
values(
  '22222222-2222-4222-8222-222222222222',
  'fictional-malicious@example.invalid',
  '{"display_name":"Forged","learner_track":"viviane_payroll"}'
),(
  '33333333-3333-4333-8333-333333333333',
  'fictional-unassigned@example.invalid',
  '{"display_name":"Forged","learner_track":"admin"}'
);

do $no_metadata_enrolment$
begin
  if exists(
    select 1 from public.profiles
    where id in (
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333'
    )
  ) then
    raise exception 'auth_metadata_created_profile';
  end if;
end
$no_metadata_enrolment$;

-- Trusted server provisioning and a later trusted track correction remain
-- available without granting either operation to the browser roles.
set local role service_role;
insert into public.profiles(id,display_name,learner_track)
values(
  '22222222-2222-4222-8222-222222222222',
  'Fictional Service Assignment',
  'rafael_finance'
);
update public.profiles
set learner_track='viviane_payroll'
where id='22222222-2222-4222-8222-222222222222';
reset role;

do $trusted_assignment$
begin
  if not exists(
    select 1 from public.profiles
    where id='22222222-2222-4222-8222-222222222222'
      and learner_track='viviane_payroll'
  ) then
    raise exception 'trusted_profile_assignment_failed';
  end if;
end
$trusted_assignment$;

-- A direct postgres maintenance context has no request JWT and remains trusted.
update public.profiles set learner_track='viviane_payroll'
where id='11111111-1111-4111-8111-111111111111';
update public.profiles set learner_track='rafael_finance'
where id='11111111-1111-4111-8111-111111111111';

-- Deliberately exposed only inside this rolled-back fixture. It proves that an
-- authenticated request cannot tunnel through a postgres SECURITY DEFINER.
create function public.profile_writer_fixture(text,uuid)
returns void
language plpgsql
security definer
set search_path=pg_catalog,public
as $writer$
begin
  if $1='update' then
    update public.profiles set learner_track='viviane_payroll' where id=$2;
  elsif $1='insert' then
    insert into public.profiles(id,display_name,learner_track)
    values($2,'Fictional Definer Writer','viviane_payroll');
  else
    raise exception 'invalid_fixture_action';
  end if;
end
$writer$;
grant execute on function public.profile_writer_fixture(text,uuid)
  to authenticated;

set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
set local request.jwt.claim.role='authenticated';
set local request.jwt.claims='{"role":"authenticated"}';
set local role authenticated;

do $definer_update_denied$
begin
  begin
    perform public.profile_writer_fixture('update',auth.uid());
    raise exception 'definer_track_update_unexpectedly_succeeded';
  exception when insufficient_privilege then
    if sqlerrm<>'profile_assignment_server_only' then raise; end if;
  end;
end
$definer_update_denied$;

do $definer_insert_denied$
begin
  begin
    perform public.profile_writer_fixture(
      'insert','33333333-3333-4333-8333-333333333333'
    );
    raise exception 'definer_self_enrolment_unexpectedly_succeeded';
  exception when insufficient_privilege then
    if sqlerrm<>'profile_provisioning_server_only' then raise; end if;
  end;
end
$definer_insert_denied$;

-- Repeat through a service_role-owned definer: the authenticated JWT remains
-- authoritative even though the function execution user can bypass RLS.
reset role;
grant create on schema public to service_role;
alter function public.profile_writer_fixture(text,uuid)
  owner to service_role;
revoke create on schema public from service_role;
set local role authenticated;

do $service_definer_update_denied$
begin
  begin
    perform public.profile_writer_fixture(
      'update','11111111-1111-4111-8111-111111111111'
    );
    raise exception 'service_definer_track_update_unexpectedly_succeeded';
  exception when insufficient_privilege then
    if sqlerrm<>'profile_assignment_server_only' then raise; end if;
  end;
end
$service_definer_update_denied$;

do $service_definer_insert_denied$
begin
  begin
    perform public.profile_writer_fixture(
      'insert','33333333-3333-4333-8333-333333333333'
    );
    raise exception 'service_definer_self_enrolment_unexpectedly_succeeded';
  exception when insufficient_privilege then
    if sqlerrm<>'profile_provisioning_server_only' then raise; end if;
  end;
end
$service_definer_insert_denied$;

-- The owner can still edit only the three reviewed preference fields. The
-- existing BEFORE trigger owns updated_at.
update public.profiles
set display_name='Fictional Safe Update',
    preferred_language='en-IE',
    timezone='Europe/London'
where id=auth.uid();

do $safe_update$
begin
  if not exists(
    select 1 from public.profiles
    where id=auth.uid()
      and display_name='Fictional Safe Update'
      and preferred_language='en-IE'
      and timezone='Europe/London'
      and updated_at>=created_at
  ) then
    raise exception 'safe_profile_update_failed';
  end if;
end
$safe_update$;

do $forbidden_updates$
declare
  affected integer;
begin
  begin
    update public.profiles set learner_track='viviane_payroll'
    where id=auth.uid();
    raise exception 'learner_track_update_unexpectedly_succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles
    set id='44444444-4444-4444-8444-444444444444'
    where id=auth.uid();
    raise exception 'profile_id_update_unexpectedly_succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set created_at=now() where id=auth.uid();
    raise exception 'created_at_update_unexpectedly_succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set updated_at=now() where id=auth.uid();
    raise exception 'updated_at_update_unexpectedly_succeeded';
  exception when insufficient_privilege then null;
  end;

  update public.profiles set display_name='Cross-account write'
  where id='22222222-2222-4222-8222-222222222222';
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'cross_account_update_succeeded'; end if;

  begin
    execute 'truncate table public.profiles';
    raise exception 'profile_truncate_unexpectedly_succeeded';
  exception when insufficient_privilege then null;
  end;
end
$forbidden_updates$;

reset role;
set local request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
set local role authenticated;

do $self_enrolment_denied$
begin
  begin
    perform public.profile_writer_fixture('insert',auth.uid());
    raise exception 'definer_self_enrolment_unexpectedly_succeeded';
  exception when insufficient_privilege then
    if sqlerrm<>'profile_provisioning_server_only' then raise; end if;
  end;

  begin
    insert into public.profiles(id,display_name,learner_track)
    values(auth.uid(),'Fictional Self Enrolment','viviane_payroll');
    raise exception 'self_enrolment_unexpectedly_succeeded';
  exception when insufficient_privilege then null;
  end;
end
$self_enrolment_denied$;

reset role;

-- Defense in depth: even a future accidental table grant/policy cannot bypass
-- the AFTER guard. These temporary mutations disappear with this transaction.
grant insert,update on table public.profiles to authenticated;
create policy profile_fixture_insert_mutant
  on public.profiles for insert to authenticated
  with check(auth.uid()=id);

set local request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
set local role authenticated;
do $trigger_blocks_insert$
begin
  begin
    insert into public.profiles(id,display_name,learner_track)
    values(auth.uid(),'Fictional Trigger Probe','viviane_payroll');
    raise exception 'trigger_failed_to_block_self_enrolment';
  exception when insufficient_privilege then
    if sqlerrm<>'profile_provisioning_server_only' then raise; end if;
  end;
end
$trigger_blocks_insert$;

set local request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $trigger_blocks_track$
begin
  begin
    update public.profiles set learner_track='viviane_payroll'
    where id=auth.uid();
    raise exception 'trigger_failed_to_block_track_change';
  exception when insufficient_privilege then
    if sqlerrm<>'profile_assignment_server_only' then raise; end if;
  end;
end
$trigger_blocks_track$;

reset role;

do $rows_unchanged$
begin
  if exists(
    select 1 from public.profiles
    where id='11111111-1111-4111-8111-111111111111'
      and learner_track<>'rafael_finance'
  ) or exists(
    select 1 from public.profiles
    where id='33333333-3333-4333-8333-333333333333'
  ) then
    raise exception 'failed_guard_left_profile_mutation';
  end if;
end
$rows_unchanged$;

rollback;

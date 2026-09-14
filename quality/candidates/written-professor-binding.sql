-- UNMOUNTED CANDIDATE. Install separately in disposable CI only, after the authored
-- foundation. Not part of the reviewed foundation package or a connected migration.
begin;
create table lh_internal.written_professor_references(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 lesson_id uuid not null references public.lessons(id),
 identity jsonb not null check(jsonb_typeof(identity)='object'),
 source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 descriptor_version text not null check(descriptor_version='written-reference-candidate-v3'),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
 bound_session_id uuid unique references public.ai_tutor_sessions(id),
 bound_request_id uuid,
 bound_at timestamptz,
 check((bound_session_id is null and bound_request_id is null and bound_at is null)
    or (bound_session_id is not null and bound_request_id is not null and bound_at is not null))
);
alter table lh_internal.written_professor_references enable row level security;
revoke all on lh_internal.written_professor_references from public,anon,authenticated,service_role;
grant select on lh_internal.written_professor_references to service_role;
create index written_references_user_idx on lh_internal.written_professor_references(user_id);
create index written_references_lesson_idx on lh_internal.written_professor_references(lesson_id);

-- Private helper. FOR SHARE blocks ordinary version/publication updates as well as
-- ancestry changes until the enclosing transaction ends; KEY SHARE would not.
create function lh_internal.lock_written_identity(p_user_id uuid,p_identity jsonb)
returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
declare profile_track text; c public.courses%rowtype; m public.modules%rowtype; l public.lessons%rowtype; expected jsonb;
begin
 select learner_track into profile_track from public.profiles where id=p_user_id for share;
 if profile_track is null or profile_track not in ('rafael_finance','viviane_payroll') then
  raise exception 'written_reference_forbidden' using errcode='42501'; end if;
 select * into c from public.courses where id=(p_identity->>'courseId')::uuid for share;
 select * into m from public.modules where id=(p_identity->>'moduleId')::uuid for share;
 select * into l from public.lessons where id=(p_identity->>'lessonId')::uuid for share;
 if c.id is null or m.id is null or l.id is null or not c.is_active or not m.is_published or not l.is_published
  or m.course_id<>c.id or l.module_id<>m.id or l.sequence not between 3 and 8
  or (c.learner_track<>'english_academy' and c.learner_track<>profile_track) then
  raise exception 'written_reference_stale_or_forbidden' using errcode='42501'; end if;
 expected:=jsonb_build_object('lessonId',l.id,'moduleId',m.id,'courseId',c.id,'lessonSlug',l.slug,
  'contentVersion',l.content_version,'requestedTrack',c.learner_track,'sequence',l.sequence,
  'studyTrack',case c.learner_track when 'rafael_finance' then 'finance' when 'viviane_payroll' then 'payroll' when 'english_academy' then 'english' end);
 if p_identity is distinct from expected then raise exception 'written_reference_stale_or_forbidden' using errcode='42501'; end if;
end $$;
revoke all on function lh_internal.lock_written_identity(uuid,jsonb) from public,anon,authenticated,service_role;

-- Only a server service client may attest the authored source hash. The database
-- checks identity, not the semantics of authored text. A browser hash is not proof.
create function public.create_written_professor_reference_v1(p_user_id uuid,p_identity jsonb,p_source_sha256 text,p_descriptor_version text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare ticket lh_internal.written_professor_references%rowtype;
begin
 if p_source_sha256 is null or p_source_sha256 !~ '^[a-f0-9]{64}$'
  or p_descriptor_version is distinct from 'written-reference-candidate-v3' then raise exception 'written_reference_invalid'; end if;
 perform lh_internal.lock_written_identity(p_user_id,p_identity);
 insert into lh_internal.written_professor_references(user_id,lesson_id,identity,source_sha256,descriptor_version)
 values(p_user_id,(p_identity->>'lessonId')::uuid,p_identity,p_source_sha256,p_descriptor_version) returning * into ticket;
 return jsonb_build_object('reference_id',ticket.id,'expires_at',ticket.expires_at,
  'source_sha256',ticket.source_sha256,'descriptor_version',ticket.descriptor_version);
end $$;
revoke all on function public.create_written_professor_reference_v1(uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_written_professor_reference_v1(uuid,jsonb,text,text) to service_role;

create function public.start_written_professor_session_v1(p_reference_id uuid,p_request_id uuid,p_mode text,p_room_name text,p_callback_hash text,p_validation_mode boolean default false)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); ticket lh_internal.written_professor_references%rowtype;
 previous public.ai_tutor_sessions%rowtype; result jsonb;
begin
 if uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_reference_id is null or p_request_id is null or p_mode is null
  or p_mode not in ('chapter_conversation','case_feedback','oral_mock','english_drill','general_conversation')
  or p_callback_hash is null or p_callback_hash !~ '^[a-f0-9]{64}$'
  or p_room_name is null or p_room_name !~ '^(validation:)?lh-[a-f0-9-]{36}$' then raise exception 'written_request_invalid'; end if;
 -- Identical order to Professor and atomic Audio; never introduce a reverse lock.
 perform 1 from public.professor_budget_settings where feature='professor_livekit' for update;
 perform 1 from public.learning_hub_budget_settings where id=1 for update;
 select * into ticket from lh_internal.written_professor_references where id=p_reference_id and user_id=uid for update;
 if not found then raise exception 'written_reference_forbidden' using errcode='42501'; end if;
 if ticket.expires_at<=clock_timestamp() then raise exception 'written_reference_expired'; end if;
 perform lh_internal.lock_written_identity(uid,ticket.identity);
 -- Lock contention may outlast the remaining ticket lifetime.
 if ticket.expires_at<=clock_timestamp() then raise exception 'written_reference_expired'; end if;
 if ticket.bound_session_id is not null then
  select * into previous from public.ai_tutor_sessions where id=ticket.bound_session_id;
  if ticket.bound_request_id is distinct from p_request_id or previous.user_id is distinct from uid
   or previous.mode is distinct from p_mode or previous.callback_token_hash is distinct from p_callback_hash
   or regexp_replace(previous.room_name,'^validation:','') is distinct from regexp_replace(p_room_name,'^validation:','') then
   raise exception 'written_request_conflict'; end if;
  return jsonb_build_object('allowed',false,'reason','request_already_started','session_id',ticket.bound_session_id);
 end if;
 result:=public.start_professor_session_atomic(p_request_id,ticket.lesson_id,p_mode,p_room_name,p_callback_hash,p_validation_mode);
 if result->>'reason'='request_already_started' then raise exception 'written_request_conflict'; end if;
 if result->'allowed'='true'::jsonb then
  update lh_internal.written_professor_references set bound_session_id=(result->>'session_id')::uuid,
   bound_request_id=p_request_id,bound_at=clock_timestamp() where id=ticket.id;
  return result||jsonb_build_object('written_reference',jsonb_build_object('reference_id',ticket.id,
   'identity',ticket.identity,'source_sha256',ticket.source_sha256,'descriptor_version',ticket.descriptor_version));
 end if;
 return result;
end $$;
revoke all on function public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean) from public,anon,service_role;
grant execute on function public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean) to authenticated;
comment on function public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean) is 'Candidate only: server-minted reference bound at existing atomic admission; no provider dispatch or post-commit revocation guarantee. Existing legacy startup remains unchanged.';
commit;

-- Shared encrypted preflights. Install after written-professor-binding.sql.
-- Candidate tested in disposable CI; no connected installation implied.
begin;
create table lh_internal.professor_preflights (
 reference_id uuid primary key references lh_internal.written_professor_references(id),
 user_id uuid not null references public.profiles(id),
 request_id uuid not null,
 sealed text not null check(octet_length(sealed) between 1 and 90000),
 expires_at timestamptz not null,
 consumed_at timestamptz,
 unique(user_id,request_id)
);
alter table lh_internal.professor_preflights enable row level security;
revoke all on lh_internal.professor_preflights from public,anon,authenticated,service_role;
create function public.put_professor_preflight_v1(p_reference_id uuid,p_user_id uuid,p_request_id uuid,p_sealed text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare ticket lh_internal.written_professor_references%rowtype;
begin
 select * into ticket from lh_internal.written_professor_references where id=p_reference_id and user_id=p_user_id for share;
 if not found or ticket.expires_at<=clock_timestamp() or ticket.bound_session_id is not null then
  raise exception 'preflight_unavailable' using errcode='42501'; end if;
 insert into lh_internal.professor_preflights(reference_id,user_id,request_id,sealed,expires_at)
 values(p_reference_id,p_user_id,p_request_id,p_sealed,least(ticket.expires_at,clock_timestamp()+interval '4 minutes'));
 return true;
end $$;
create function public.consume_professor_preflight_v1(p_reference_id uuid,p_user_id uuid,p_request_id uuid)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare result text;
begin
 -- The committed UPDATE is the consumption fence. Never reclaim on timeout.
 update lh_internal.professor_preflights set consumed_at=clock_timestamp()
 where reference_id=p_reference_id and user_id=p_user_id and request_id=p_request_id
  and consumed_at is null and expires_at>clock_timestamp()
 returning sealed into result;
 return result;
end $$;
revoke all on function public.put_professor_preflight_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.consume_professor_preflight_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.put_professor_preflight_v1(uuid,uuid,uuid,text) to service_role;
grant execute on function public.consume_professor_preflight_v1(uuid,uuid,uuid) to service_role;
commit;

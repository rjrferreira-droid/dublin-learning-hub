-- Disposable local acceptance only. Owner checks closed ACLs and verifies denial.
do $$ begin
 if has_function_privilege('authenticated','public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)','EXECUTE')
 or has_function_privilege('service_role','public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)','EXECUTE')
 or has_function_privilege('anon','public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)','EXECUTE') then
 raise exception 'new_admission_open'; end if;
 if not has_function_privilege('authenticated','public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)','EXECUTE') then
 raise exception 'existing_admission_changed'; end if;
end $$;
begin;
set local role authenticated;
do $$ begin
 begin
  perform public.start_written_professor_session_v1(null,null,null,null,null,true);
  raise exception 'unexpected_start_permission';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
-- Only this unlinked disposable fixture opens the candidate for existing tests.
grant execute on function public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean) to authenticated;

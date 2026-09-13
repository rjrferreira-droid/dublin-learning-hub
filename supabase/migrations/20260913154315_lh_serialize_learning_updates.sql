-- Serialize concurrent completions for the same learner. Different learners remain independent.
do $patch$
declare definition text;
begin
  select pg_get_functiondef('public.complete_professor_session_v2(uuid,text,jsonb)'::regprocedure) into definition;
  if strpos(definition,'pg_advisory_xact_lock')=0 then
    if strpos(definition,'v_hash:=encode')=0 then raise exception 'completion_function_anchor_missing'; end if;
    definition:=replace(definition,'v_hash:=encode','perform pg_advisory_xact_lock(hashtextextended(s.user_id::text, 7132026));'||chr(10)||'  v_hash:=encode');
    execute definition;
  end if;
end $patch$;
-- V2-specific paired adaptation: cover BOTH retained Professor entrypoints.
-- The isolated installer and its legacy-presence rejection are unchanged.
do $patch$
declare signature text; definition text; anchor text; replacement text;
 professor_lock text; global_lock text; routine oid; role_name text;
begin
 foreach role_name in array array['anon','authenticated','service_role'] loop
  if has_function_privilege(role_name,'public.reserve_professor_budget(text)','EXECUTE') then
   raise exception 'v2_legacy_containment_required';
  end if;
 end loop;
 foreach signature in array array[
  'public.reserve_professor_budget(text)',
  'public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'
 ] loop
  routine:=to_regprocedure(signature);
  if routine is null then raise exception 'v2_budget_dependency_missing'; end if;
  if not exists(select 1 from pg_proc where oid=routine and prosecdef
   and pg_get_userbyid(proowner)='postgres') then raise exception 'v2_budget_owner_drift'; end if;
  select pg_get_functiondef(routine) into definition;
  if strpos(definition,'lh_internal.professor_reservation_exposure')=0
   or strpos(definition,'premium_audio_pending_usd')>0 then
   raise exception 'v2_budget_exposure_drift';
  end if;
  if signature='public.reserve_professor_budget(text)' then
   professor_lock:=E'where feature = ''professor_livekit''\n   for update;';
   global_lock:=E'where id = 1\n   for update;';
   anchor:='v_global_committed := v_reserved_before + v_logged_ai;';
   replacement:='v_global_committed := v_reserved_before + v_logged_ai + lh_internal.premium_audio_pending_usd();';
   -- Legacy wrappers must also stop if the guard is disabled; no permissive fallback.
   if (length(definition)-length(replace(definition,'if v_settings.hard_stop_enabled and (','')))
    <>length('if v_settings.hard_stop_enabled and (') then raise exception 'v2_legacy_hard_stop_drift'; end if;
   definition:=replace(definition,'if v_settings.hard_stop_enabled and (',
    E'if not coalesce(v_settings.hard_stop_enabled,false) then raise exception ''professor_budget_guard_unavailable''; end if;\n  if (');
  else
   professor_lock:='from public.professor_budget_settings where feature=''professor_livekit'' for update';
   global_lock:='from public.learning_hub_budget_settings where id=1 for update';
   anchor:='held+used+reserve_amount>budget.ai_hard_cap_usd';
   replacement:='held+used+reserve_amount+lh_internal.premium_audio_pending_usd()>budget.ai_hard_cap_usd';
  end if;
  if strpos(definition,professor_lock)=0 or strpos(definition,global_lock)<=strpos(definition,professor_lock)
   or strpos(definition,anchor)<=strpos(definition,global_lock) then
   raise exception 'v2_budget_lock_order_drift';
  end if;
  if (length(definition)-length(replace(definition,anchor,'')))<>length(anchor) then
   raise exception 'v2_budget_anchor_not_unique';
  end if;
  execute replace(definition,anchor,replacement);
 end loop;
end $patch$;

-- Installation is deliberately CLOSED to new Audio work, without changing caps.
-- A later reviewed activation must mount the exact server flow before granting these.
revoke execute on function public.begin_premium_audio_attempt_v2(uuid,uuid,uuid,integer,numeric),
 public.mark_premium_audio_submitted_v2(uuid) from public,anon,authenticated,service_role;

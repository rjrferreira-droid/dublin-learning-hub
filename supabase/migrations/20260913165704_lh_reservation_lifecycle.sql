-- Reservation lifecycle repair. Never releases or rewrites historical learner/cost rows.
-- Pending obligations remain protected across UTC month boundaries until reconciled.
create or replace function lh_internal.professor_reservation_exposure(p_as_of timestamptz default now())
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $fn$
with receipt_costs as (
 select s.budget_reservation_id as reservation_id,
        sum(coalesce(c.realtime_cost_usd,0)+coalesce(c.evaluation_cost_usd,0)) as known_pending_usd
 from public.ai_tutor_sessions s
 join lh_internal.professor_settlement_receipts c on c.session_id=s.id and c.state='pending'
 group by s.budget_reservation_id
), protected as (
 select r.*, greatest(r.reserved_usd,coalesce(c.known_pending_usd,0)) as protected_usd,
        r.created_at+make_interval(secs=>r.max_session_seconds+300)<=p_as_of as stale
 from public.professor_budget_reservations r
 left join receipt_costs c on c.reservation_id=r.id
 where r.feature='professor_livekit' and r.status in ('active','unresolved')
), period as (
 select date_trunc('month',p_as_of at time zone 'UTC')::date as month_start
)
select jsonb_build_object(
 'contractVersion',1,
 'periodMonth',(select month_start from period),
 'protectedReservationUsd',coalesce(sum(protected_usd),0),
 'rawReservationUsd',coalesce(sum(reserved_usd),0),
 'knownCostUpliftUsd',coalesce(sum(protected_usd-reserved_usd),0),
 'activeReservedUsd',coalesce(sum(protected_usd) filter(where status='active'),0),
 'unresolvedReservedUsd',coalesce(sum(protected_usd) filter(where status='unresolved'),0),
 'carriedReservedUsd',coalesce(sum(protected_usd) filter(where month_start<(select month_start from period)),0),
 'currentPeriodReservedUsd',coalesce(sum(protected_usd) filter(where month_start=(select month_start from period)),0),
 'futurePeriodReservedUsd',coalesce(sum(protected_usd) filter(where month_start>(select month_start from period)),0),
 'activeCount',count(*) filter(where status='active'),
 'unresolvedCount',count(*) filter(where status='unresolved'),
 'staleCount',count(*) filter(where stale),
 'needsReconciliationCount',count(*) filter(where stale or status='unresolved'),
 'oldestPendingAt',to_char(min(created_at) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
) from protected;
$fn$;
revoke all on function lh_internal.professor_reservation_exposure(timestamptz) from public,anon,authenticated;
grant execute on function lh_internal.professor_reservation_exposure(timestamptz) to service_role;

create or replace function public.professor_reservation_exposure_v2()
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
 select lh_internal.professor_reservation_exposure(now());
$$;
revoke all on function public.professor_reservation_exposure_v2() from public,anon,authenticated;
grant execute on function public.professor_reservation_exposure_v2() to service_role;

-- Exact, fail-on-drift replacement of the reservation subtotal only. No change to
-- authentication, premium policy, caps, session creation or existing grants.
do $patch$
declare signature text; definition text; old_query text; new_query text;
begin
 foreach signature in array array['public.reserve_professor_budget(text)','public.start_professor_session_atomic(uuid,uuid,text,text,text,boolean)'] loop
  if to_regprocedure(signature) is null then
   if signature like '%start_professor_session_atomic%' then raise exception 'atomic_start_dependency_missing'; end if;
   continue;
  end if;
  select pg_get_functiondef(to_regprocedure(signature)) into definition;
  if strpos(definition,'lh_internal.professor_reservation_exposure')>0 then continue; end if;
  if signature='public.reserve_professor_budget(text)' then
   old_query:=E'  select coalesce(sum(r.reserved_usd), 0)\n    into v_reserved_before\n    from public.professor_budget_reservations r\n   where r.feature = ''professor_livekit''\n     and r.month_start = date_trunc(''month'', now())::date\n     and r.status in (''active'',''unresolved'');';
   new_query:=E'  select (lh_internal.professor_reservation_exposure(now())->>''protectedReservationUsd'')::numeric\n    into v_reserved_before;';
  else
   old_query:=' select coalesce(sum(reserved_usd),0) into held from public.professor_budget_reservations where feature=''professor_livekit'' and month_start=date_trunc(''month'',now())::date and status in (''active'',''unresolved'');';
   new_query:=' select (lh_internal.professor_reservation_exposure(now())->>''protectedReservationUsd'')::numeric into held;';
  end if;
  if (length(definition)-length(replace(definition,old_query,'')))<>length(old_query) then raise exception 'reservation_subtotal_anchor_not_unique: %',signature; end if;
  execute replace(definition,old_query,new_query);
 end loop;
end $patch$;
comment on function public.professor_reservation_exposure_v2() is 'Service-only aggregate: holds from all periods; aged holds are not zero-cost and are not automatically released. Not a provider invoice.';

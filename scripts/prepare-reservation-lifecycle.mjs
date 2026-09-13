import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME!=='fix/core-consolidation-2026-09-13')throw new Error('wrong_branch');
function edit(file,before,after){const s=fs.readFileSync(file,'utf8');if(s.includes(after))return;if(s.split(before).length!==2)throw new Error(`anchor_not_unique: ${file}: ${before.slice(0,60)}`);fs.writeFileSync(file,s.replace(before,after));}
const sql='supabase/pending/lh_reservation_lifecycle.sql';
edit(sql," 'oldestPendingAt',min(created_at)"," 'oldestPendingAt',to_char(min(created_at) at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"')");
const server='supabase/functions/learning-hub-cost-center/index.ts';
edit(server,'import "jsr:@supabase/functions-js/edge-runtime.d.ts";',`import {parseReservationExposure,type ReservationExposure} from '../_shared/reservation-exposure.ts';\nimport "jsr:@supabase/functions-js/edge-runtime.d.ts";`);
edit(server,'headers: { ...cors, "Content-Type": "application/json" },','headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },');
edit(server,'    admin.from("professor_budget_reservations")\n      .select("reserved_usd,status,actual_cost_usd,created_at")\n      .eq("month_start", monthStartDay),','    admin.rpc("professor_reservation_exposure_v2"),');
edit(server,'  const professorRows = professorResult.data ?? [];',`  let exposure: ReservationExposure;\n  try { exposure=parseReservationExposure(professorResult.data,monthStartDay); }\n  catch { return json({error:'cost_center_unavailable'},503); }`);
edit(server,`  const activeRows = professorRows.filter((row) => row.status === "active");
  const unresolvedRows = professorRows.filter((row) => row.status === "unresolved");
  const activeReservationUsd = activeRows.reduce((sum, row) => sum + Number(row.reserved_usd ?? 0), 0);
  const unresolvedReservationUsd = unresolvedRows.reduce((sum, row) => sum + Number(row.reserved_usd ?? 0), 0);
  const protectedReservationUsd = activeReservationUsd + unresolvedReservationUsd;`, `  const activeReservationUsd = exposure.activeReservedUsd;
  const unresolvedReservationUsd = exposure.unresolvedReservedUsd;
  const protectedReservationUsd = exposure.protectedReservationUsd;`);
edit(server,'  const status = safetyBufferUsd >= 20 && aiRemainingUsd >= 15','  const capacityStatus = safetyBufferUsd >= 20 && aiRemainingUsd >= 15');
edit(server,'  return json({\n    month: monthStartDay,','  const status = exposure.needsReconciliationCount>0 && capacityStatus==="safe" ? "watch" : capacityStatus;\n\n  return json({\n    costBasis: "application_estimate_not_provider_invoice",\n    month: monthStartDay,');
edit(server,'      professorReservedUsd: Number(protectedReservationUsd.toFixed(6)),','      professorReservedUsd: Number(protectedReservationUsd.toFixed(6)),\n      professorCarriedReservedUsd: exposure.carriedReservedUsd,\n      professorKnownCostUpliftUsd: exposure.knownCostUpliftUsd,');
edit(server,'    professorActiveReservations: activeRows.length,','    professorActiveReservations: exposure.activeCount,');
edit(server,'    professorUnresolvedReservations: unresolvedRows.length,','    professorUnresolvedReservations: exposure.unresolvedCount,\n    professorStaleReservations: exposure.staleCount,\n    professorNeedsReconciliation: exposure.needsReconciliationCount,');
const panel='src/components/CostCenterPanel.tsx';
edit(panel,'    professorReservedUsd: number;','    professorReservedUsd: number;\n    professorCarriedReservedUsd?: number;\n    professorKnownCostUpliftUsd?: number;');
edit(panel,'  professorSessions: number;','  professorNeedsReconciliation?: number;\n  professorSessions: number;');
let p=fs.readFileSync(panel,'utf8');
p=p.replaceAll('Actual AI spend','Estimated AI usage').replaceAll('Professor voice • actual','Professor voice • estimated').replaceAll('Evaluation & Audio • actual','Evaluation & Audio • estimated').replaceAll('Live session reserve','Active reserve • all periods').replaceAll('Legacy unresolved reserve','Unresolved reserve • all periods').replaceAll(' legacy unresolved',' unresolved');fs.writeFileSync(panel,p);
edit(panel,'              <div className="cost-center-buffer">',`              {(data.professorNeedsReconciliation ?? 0)>0 && (
                <div className="cost-center-state">
                  {data.professorNeedsReconciliation} reservation(s) need reconciliation. Prior-period holds: {money(data.usage.professorCarriedReservedUsd ?? 0)}. No automatic release is assumed.
                </div>
              )}
              <div className="cost-center-buffer">`);
console.log('Prepared cross-period reservations, reconciliation visibility and truthful cost labels. No historical records or budget limits changed.');

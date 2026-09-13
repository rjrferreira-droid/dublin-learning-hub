export type ReservationExposure = {
 contractVersion:1; periodMonth:string; protectedReservationUsd:number; rawReservationUsd:number;
 knownCostUpliftUsd:number; activeReservedUsd:number; unresolvedReservedUsd:number;
 carriedReservedUsd:number; currentPeriodReservedUsd:number; futurePeriodReservedUsd:number;
 activeCount:number; unresolvedCount:number; staleCount:number; needsReconciliationCount:number;
 oldestPendingAt:string|null;
};
const moneyKeys=['protectedReservationUsd','rawReservationUsd','knownCostUpliftUsd','activeReservedUsd','unresolvedReservedUsd','carriedReservedUsd','currentPeriodReservedUsd','futurePeriodReservedUsd'] as const;
const countKeys=['activeCount','unresolvedCount','staleCount','needsReconciliationCount'] as const;
export function parseReservationExposure(value:unknown,expectedMonth:string):ReservationExposure {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('reservation_exposure_unavailable');
 const row=value as Record<string,unknown>;
 if(row.contractVersion!==1||row.periodMonth!==expectedMonth)throw new Error('reservation_exposure_period_mismatch');
 for(const key of [...moneyKeys,...countKeys])if(typeof row[key]!=='number'||!Number.isFinite(row[key])||Number(row[key])<0)throw new Error('reservation_exposure_invalid');
 for(const key of countKeys)if(!Number.isSafeInteger(row[key]))throw new Error('reservation_exposure_invalid');
 if(row.oldestPendingAt!==null&&(typeof row.oldestPendingAt!=='string'||!Number.isFinite(Date.parse(row.oldestPendingAt))))throw new Error('reservation_exposure_invalid');
 const r=row as unknown as ReservationExposure;
 const close=(a:number,b:number)=>Math.abs(a-b)<0.000001;
 if(!close(r.protectedReservationUsd,r.activeReservedUsd+r.unresolvedReservedUsd)
  ||!close(r.protectedReservationUsd,r.currentPeriodReservedUsd+r.carriedReservedUsd+r.futurePeriodReservedUsd)
  ||!close(r.protectedReservationUsd,r.rawReservationUsd+r.knownCostUpliftUsd)
  ||r.staleCount>r.activeCount+r.unresolvedCount
  ||r.needsReconciliationCount>r.activeCount+r.unresolvedCount
  ||r.needsReconciliationCount<r.staleCount||r.needsReconciliationCount<r.unresolvedCount)throw new Error('reservation_exposure_inconsistent');
 return r;
}

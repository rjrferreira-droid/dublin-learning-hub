export type SessionReceiptState='processing'|'settled'|'needs_reconciliation'|'completed_without_usage'|'not_completed';
export type SessionReceiptInput={
 session:{id:string;user_id:string;status:string;completed_at:string|null;budget_reservation_id:string|null};
 reservation:{id:string;user_id:string;status:string;reserved_usd:number|string;actual_cost_usd:number|string|null;settled_at:string|null}|null;
 usage:Array<{feature:string;estimated_cost_usd:number|string|null}>;
};
export type SessionReceipt={contractVersion:1;sessionId:string;state:SessionReceiptState;sessionCompleted:boolean;reservationStatus:string|null;reservedUsd:number|null;loggedRealtimeUsd:number;loggedEvaluationUsd:number;loggedTotalUsd:number;reservationActualUsd:number|null;settledAt:string|null;costBasis:'application_estimate_not_provider_invoice';note:string};
const money=(v:unknown):number|null=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=10000?Number(n.toFixed(6)):null;};
const validDate=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const sameMoney=(a:number,b:number)=>Math.abs(a-b)<=0.000001;
export function buildSessionReceipt(input:SessionReceiptInput):SessionReceipt{
 if(!input?.session||typeof input.session.id!=='string'||typeof input.session.user_id!=='string')throw new Error('invalid_session');
 if(input.reservation&&(input.reservation.user_id!==input.session.user_id||input.reservation.id!==input.session.budget_reservation_id))throw new Error('reservation_identity_mismatch');
 const reserved=input.reservation?money(input.reservation.reserved_usd):null;
 if(input.reservation&&reserved===null)throw new Error('invalid_reservation_amount');
 let realtime=0,evaluation=0;
 for(const row of input.usage??[]){
  if(row.feature!=='professor_livekit'&&row.feature!=='professor_evaluation')continue;
  const amount=money(row.estimated_cost_usd);if(amount===null)throw new Error('invalid_usage_amount');
  if(row.feature==='professor_livekit')realtime+=amount;else evaluation+=amount;
 }
 realtime=Number(realtime.toFixed(6));evaluation=Number(evaluation.toFixed(6));const total=Number((realtime+evaluation).toFixed(6));
 const finalStatus=['completed','abandoned'].includes(input.session.status);
 const completionTimestampValid=validDate(input.session.completed_at);
 const sessionCompleted=finalStatus&&completionTimestampValid;
 const reservationStatus=input.reservation?.status??null;
 const actual=input.reservation?money(input.reservation.actual_cost_usd):null;
 const settledAt=input.reservation?.settled_at??null;
 const linkedReservationMissing=!!input.session.budget_reservation_id&&!input.reservation;
 const finalizationInconsistent=finalStatus&&!completionTimestampValid;
 const settlementMetadataIncomplete=reservationStatus==='settled'&&(actual===null||!validDate(settledAt));
 const settlementAmountMismatch=reservationStatus==='settled'&&actual!==null&&total>0&&!sameMoney(actual,realtime);
 let state:SessionReceiptState='processing';
 if(!finalStatus)state='not_completed';
 else if(finalizationInconsistent||linkedReservationMissing)state='needs_reconciliation';
 else if(reservationStatus==='unresolved')state='needs_reconciliation';
 else if(reservationStatus==='active')state='processing';
 else if(reservationStatus==='settled'){
  if(settlementMetadataIncomplete)state='needs_reconciliation';
  else if(total===0)state=actual===0?'completed_without_usage':'needs_reconciliation';
  else state=settlementAmountMismatch?'needs_reconciliation':'settled';
 }else if(input.reservation)state='needs_reconciliation';
 else if(total>0)state='settled';
 else state='completed_without_usage';
 let reconciliationNote='Session, reservation or usage evidence is incomplete or inconsistent. Keep any protected hold until it is reconciled; do not treat it as zero cost.';
 if(reservationStatus==='unresolved')reconciliationNote='The session has an unresolved budget reservation. Keep the protected hold until reconciliation; do not treat it as zero cost.';
 else if(linkedReservationMissing)reconciliationNote='The session references a budget reservation that is not available to this receipt. Reconciliation is required before treating the session as settled.';
 else if(finalizationInconsistent)reconciliationNote='The session status says it is finalized, but its completion timestamp is missing or invalid. Reconciliation is required.';
 else if(settlementMetadataIncomplete)reconciliationNote='The reservation is marked settled, but its actual cost or settlement timestamp is missing. Reconciliation is required.';
 else if(settlementAmountMismatch)reconciliationNote='The settled reservation actual cost does not match the logged realtime estimate. Reconciliation is required before treating the session as settled.';
 const note=state==='settled'
  ?'Application-estimated usage was recorded for this session. This is not a provider invoice.'
  :state==='needs_reconciliation'
    ?reconciliationNote
    :state==='completed_without_usage'
      ?'The session is closed, but no matching usage estimate is visible in the application log yet.'
      :state==='not_completed'
        ?'The session is not finalized, so cost settlement cannot be considered complete.'
        :'Completion or usage settlement is still processing.';
 return {contractVersion:1,sessionId:input.session.id,state,sessionCompleted,reservationStatus,reservedUsd:reserved,loggedRealtimeUsd:realtime,loggedEvaluationUsd:evaluation,loggedTotalUsd:total,reservationActualUsd:actual,settledAt:validDate(settledAt)?settledAt:null,costBasis:'application_estimate_not_provider_invoice',note};
}

export type SessionReceiptState='processing'|'settled'|'needs_reconciliation'|'completed_without_usage'|'not_completed';
export type SessionReceiptInput={
 session:{id:string;user_id:string;status:string;completed_at:string|null;budget_reservation_id:string|null};
 reservation:{id:string;user_id:string;status:string;reserved_usd:number|string;actual_cost_usd:number|string|null;settled_at:string|null}|null;
 usage:Array<{feature:string;estimated_cost_usd:number|string|null}>;
};
export type SessionReceipt={contractVersion:1;sessionId:string;state:SessionReceiptState;sessionCompleted:boolean;reservationStatus:string|null;reservedUsd:number|null;loggedRealtimeUsd:number;loggedEvaluationUsd:number;loggedTotalUsd:number;reservationActualUsd:number|null;settledAt:string|null;costBasis:'application_estimate_not_provider_invoice';note:string};
const money=(v:unknown):number|null=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=10000?Number(n.toFixed(6)):null;};
export function buildSessionReceipt(input:SessionReceiptInput):SessionReceipt{
 if(!input?.session||typeof input.session.id!=='string'||typeof input.session.user_id!=='string')throw new Error('invalid_session');
 if(input.reservation&&(input.reservation.user_id!==input.session.user_id||input.reservation.id!==input.session.budget_reservation_id))throw new Error('reservation_identity_mismatch');
 let realtime=0,evaluation=0;
 for(const row of input.usage??[]){const amount=money(row.estimated_cost_usd);if(amount===null)continue;if(row.feature==='professor_livekit')realtime+=amount;if(row.feature==='professor_evaluation')evaluation+=amount;}
 realtime=Number(realtime.toFixed(6));evaluation=Number(evaluation.toFixed(6));const total=Number((realtime+evaluation).toFixed(6));
 const sessionCompleted=['completed','abandoned'].includes(input.session.status);
 const reservationStatus=input.reservation?.status??null;
 let state:SessionReceiptState='processing';
 if(!sessionCompleted)state='not_completed';
 else if(reservationStatus==='unresolved')state='needs_reconciliation';
 else if(reservationStatus==='settled'&&total>0)state='settled';
 else if(reservationStatus==='settled'&&total===0)state='completed_without_usage';
 else if(reservationStatus==='active')state='processing';
 else if(!input.reservation&&total>0)state='settled';
 else if(!input.reservation)state='completed_without_usage';
 const note=state==='settled'?'Application-estimated usage was recorded for this session. This is not a provider invoice.':state==='needs_reconciliation'?'The session has an unresolved budget reservation; do not treat the remaining hold as zero cost.':state==='completed_without_usage'?'The session is closed, but no matching usage estimate is visible in the application log yet.':state==='not_completed'?'The session is not finalized, so cost settlement cannot be considered complete.':'Completion or usage settlement is still processing.';
 return {contractVersion:1,sessionId:input.session.id,state,sessionCompleted,reservationStatus,reservedUsd:money(input.reservation?.reserved_usd),loggedRealtimeUsd:realtime,loggedEvaluationUsd:evaluation,loggedTotalUsd:total,reservationActualUsd:money(input.reservation?.actual_cost_usd),settledAt:input.reservation?.settled_at??null,costBasis:'application_estimate_not_provider_invoice',note};
}

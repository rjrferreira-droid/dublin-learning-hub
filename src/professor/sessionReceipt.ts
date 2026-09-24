export type SessionReceiptState='processing'|'settled'|'needs_reconciliation'|'completed_without_usage'|'not_completed';
export type SessionReceipt={contractVersion:1;sessionId:string;state:SessionReceiptState;sessionCompleted:boolean;reservationStatus:string|null;reservedUsd:number|null;loggedRealtimeUsd:number;loggedEvaluationUsd:number;loggedTotalUsd:number;reservationActualUsd:number|null;settledAt:string|null;costBasis:'application_estimate_not_provider_invoice';note:string};
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=10000?v:null;
export function parseSessionReceipt(raw:unknown,sessionId:string):SessionReceipt{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('invalid_receipt');const v=raw as Record<string,unknown>;
 const states=new Set(['processing','settled','needs_reconciliation','completed_without_usage','not_completed']);
 if(v.contractVersion!==1||v.sessionId!==sessionId||typeof v.state!=='string'||!states.has(v.state)||typeof v.sessionCompleted!=='boolean'||v.costBasis!=='application_estimate_not_provider_invoice'||typeof v.note!=='string')throw new Error('invalid_receipt');
 for(const key of ['loggedRealtimeUsd','loggedEvaluationUsd','loggedTotalUsd'])if(finite(v[key])===null)throw new Error('invalid_receipt');
 const reserved=v.reservedUsd===null?null:finite(v.reservedUsd),actual=v.reservationActualUsd===null?null:finite(v.reservationActualUsd);
 if(v.reservedUsd!==null&&reserved===null||v.reservationActualUsd!==null&&actual===null)throw new Error('invalid_receipt');
 return {contractVersion:1,sessionId,state:v.state as SessionReceiptState,sessionCompleted:v.sessionCompleted,reservationStatus:typeof v.reservationStatus==='string'?v.reservationStatus:null,reservedUsd:reserved,loggedRealtimeUsd:v.loggedRealtimeUsd as number,loggedEvaluationUsd:v.loggedEvaluationUsd as number,loggedTotalUsd:v.loggedTotalUsd as number,reservationActualUsd:actual,settledAt:typeof v.settledAt==='string'?v.settledAt:null,costBasis:'application_estimate_not_provider_invoice',note:v.note.slice(0,500)};
}

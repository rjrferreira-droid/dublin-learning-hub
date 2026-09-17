import {assertProfessorReferenceReceipt,isUuid,type ReferenceReceipt} from './professor-admission-contract.ts';

export type RecoveryScope={receipt:ReferenceReceipt;epoch:number};
export type ProfessorObservation={state:'no_admission_observed'|'admitted_not_claimed'|'dispatch_unconfirmed'|'dispatch_acknowledged'|'validation_abandoned'|'reconciliation_required';sessionId:string|null;providerAdmission:false;retryAllowed:false};
type Client={auth:{getUser():Promise<{data:{user:{id:string}|null};error:unknown}>};rpc(name:string,args:Record<string,string>):PromiseLike<{data:unknown;error:unknown}>};
export class ProfessorObservationUnavailable extends Error{
 readonly retryAllowed=false;
 constructor(){super('professor_observation_unavailable');}
}
export class ProfessorObservationDiscarded extends Error{
 constructor(){super('professor_observation_discarded');}
}
function validScope(scope:RecoveryScope){
 if(!Number.isSafeInteger(scope.epoch)||scope.epoch<0)throw new ProfessorObservationDiscarded();
 const r=scope.receipt;
 assertProfessorReferenceReceipt(r,{requestId:r.requestId,userId:r.userId,mode:r.mode,identity:r.reference.identity});
}
function matches(scope:RecoveryScope|null,captured:RecoveryScope){
 try{
  if(!scope||scope.epoch!==captured.epoch)return false;
  validScope(scope);
  const r=scope.receipt,e=captured.receipt;
  assertProfessorReferenceReceipt(r,{requestId:e.requestId,userId:e.userId,mode:e.mode,identity:e.reference.identity});
  return r.reference.id===e.reference.id&&r.reference.sha256===e.reference.sha256&&r.reference.version===e.reference.version;
 }catch{return false;}
}
function observation(value:unknown):ProfessorObservation{
 const v=value as ProfessorObservation;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==4
  ||!['state','sessionId','providerAdmission','retryAllowed'].every(k=>Object.hasOwn(v,k))
  ||!['no_admission_observed','admitted_not_claimed','dispatch_unconfirmed','dispatch_acknowledged','validation_abandoned','reconciliation_required'].includes(v.state)
  ||v.providerAdmission!==false||v.retryAllowed!==false
  ||(v.state==='no_admission_observed'?v.sessionId!==null:!isUuid(v.sessionId)))throw new ProfessorObservationUnavailable();
 return {...v};
}

/** UNMOUNTED browser-safe candidate: authenticated read-only RPC, no service
 * client, provider, storage, automatic retries or reservation mutation.
 * The owner must increment epoch on account/selection changes (including ABA),
 * and dispose on unmount. A scope is captured from a validated server preflight,
 * never reconstructed from arbitrary local drafts or learning evidence. */
export function createProfessorRecoveryController(db:Client,initial:RecoveryScope,current:()=>RecoveryScope|null,timeoutMs=15000){
 validScope(initial);
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new ProfessorObservationUnavailable();
 const captured=structuredClone(initial);let disposed=false,revision=0;
 let cancelPending:(()=>void)|undefined;
 function active(version:number,signal?:AbortSignal){
  if(disposed||version!==revision||signal?.aborted||!matches(current(),captured))throw new ProfessorObservationDiscarded();
 }
 async function owner(version:number,signal?:AbortSignal){
  let result:Awaited<ReturnType<Client['auth']['getUser']>>;
  try{result=await db.auth.getUser();}catch{active(version,signal);throw new ProfessorObservationUnavailable();}
  active(version,signal);
  if(result.error||result.data?.user?.id!==captured.receipt.userId)throw new ProfessorObservationDiscarded();
 }
 return {
  dispose(){disposed=true;revision++;cancelPending?.();},
  async refresh(signal?:AbortSignal):Promise<ProfessorObservation>{
   cancelPending?.();
   const version=++revision;active(version,signal);
   let cancel!:()=>void;
   const stopped=new Promise<never>((_,reject)=>{cancel=()=>reject(new ProfessorObservationDiscarded());});
   cancelPending=cancel;
   signal?.addEventListener('abort',cancel,{once:true});
   let timer:ReturnType<typeof setTimeout>;
   const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{if(version===revision)revision++;reject(new ProfessorObservationUnavailable());},timeoutMs);});
   const run=async()=>{
   await owner(version,signal);
   let response:{data:unknown;error:unknown};
   try{response=await db.rpc('observe_professor_dispatch_v1',{p_reference_id:captured.receipt.reference.id,p_request_id:captured.receipt.requestId});}
   catch{active(version,signal);throw new ProfessorObservationUnavailable();}
   active(version,signal);await owner(version,signal);
   if(response.error)throw new ProfessorObservationUnavailable();
   return observation(response.data);
   };
   try{return await Promise.race([run(),stopped,deadline]);}
   finally{clearTimeout(timer!);signal?.removeEventListener('abort',cancel);if(cancelPending===cancel)cancelPending=undefined;}
  },
 };
}

export function professorRecoveryMessage(result:ProfessorObservation){
 switch(result.state){
  case 'no_admission_observed':return 'No session was observed in this check. This does not confirm cancellation or allow a new attempt.';
  case 'admitted_not_claimed':return 'The session was reserved, but no dispatch was observed. Do not start another attempt.';
  case 'dispatch_unconfirmed':return 'The dispatch remains unconfirmed. The budget reservation remains protected; do not start another attempt.';
  case 'dispatch_acknowledged':return 'The dispatch was acknowledged. This does not confirm connection, completion or learning results.';
  case 'validation_abandoned':return 'This validation-only session closed before dispatch and its budget reservation was released. No learning result is claimed.';
  case 'reconciliation_required':return 'This session requires manual reconciliation. Do not start a new attempt. No learning result is claimed.';
 }
}

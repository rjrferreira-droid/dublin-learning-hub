import {isUuid} from '../../quality/candidates/professor-admission-contract.ts';
export type RecoveryDiscovery={attempts:{referenceId:string;requestId:string;sessionId:string;state:'admitted_not_claimed'|'dispatch_unconfirmed'|'dispatch_acknowledged'}[];truncated:boolean;providerAdmission:false;retryAllowed:false};
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
/** Explicit read-only discovery. Empty results never authorize a new attempt. */
export async function discoverRecovery(db:any,userId:string,signal:AbortSignal,timeoutMs=15000):Promise<RecoveryDiscovery>{
 if(!isUuid(userId)||signal.aborted||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('recovery_unavailable');
 let stopped=false,stop!:()=>void;
 const interrupted=new Promise<never>((_,reject)=>{stop=()=>{stopped=true;reject(Error('recovery_unavailable'));};});
 signal.addEventListener('abort',stop,{once:true});const timer=setTimeout(stop,timeoutMs);
 const active=()=>{if(stopped||signal.aborted)throw Error('recovery_unavailable');};
 const owner=async()=>{const r=await db.auth.getUser();active();if(r.error||r.data?.user?.id!==userId)throw Error('recovery_unavailable');};
 const run=async()=>{
  await owner();const r=await db.rpc('list_professor_recovery_v1');active();await owner();
  const v=r.data;
  if(r.error||!exact(v,['attempts','truncated','providerAdmission','retryAllowed'])||!Array.isArray(v.attempts)||v.attempts.length>20||typeof v.truncated!=='boolean'||v.providerAdmission!==false||v.retryAllowed!==false)throw Error('recovery_unavailable');
  const seen=new Set<string>();
  for(const a of v.attempts){
   if(!exact(a,['referenceId','requestId','sessionId','state'])||![a.referenceId,a.requestId,a.sessionId].every(isUuid)||!['admitted_not_claimed','dispatch_unconfirmed','dispatch_acknowledged'].includes(a.state)||seen.has(a.referenceId))throw Error('recovery_unavailable');
   seen.add(a.referenceId);
  }
  return structuredClone(v) as RecoveryDiscovery;
 };
 try{return await Promise.race([run(),interrupted]);}
 catch{throw Error('recovery_unavailable');}
 finally{stopped=true;clearTimeout(timer);signal.removeEventListener('abort',stop);}
}

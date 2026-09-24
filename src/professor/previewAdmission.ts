import {assertProfessorAdmissionAcknowledgement,assertProfessorReferenceReceipt,isUuid,type BoundIdentity,type ProfessorMode,type AdmissionAcknowledgement,type ReferenceReceipt} from '../../quality/candidates/professor-admission-contract.ts';

type Selection={userId:string;requestId:string;mode:ProfessorMode;identity:BoundIdentity};
type Auth={getSession():PromiseLike<{data:{session:{user:{id:string};access_token:string}|null};error:unknown}>};
export type PreviewAdmissionResult=
 |{status:'admitted';acknowledgement:AdmissionAcknowledgement;providerAdmission:false}
 |{status:'denied'|'unavailable'|'unconfirmed';retryAllowed:false;reservationMayExist:boolean};
const reasons=new Set(['professor_monthly_budget_reached','professor_session_already_active','professor_start_rate_limited','request_already_started']);

/** One controller per explicit attempt. The caller must dispose on account or
 * selection changes, including away-and-back changes. No automatic retries,
 * provider dispatch, persistence, or reservation release. Not yet mounted in UI.
 * A timeout after submission does not mean that the server cancelled the start. */
export function createPreviewAdmission(auth:Auth,selection:Selection,request:typeof fetch=fetch,timeoutMs=15000,checkpoint?:(receipt:ReferenceReceipt)=>void){
 const selected=structuredClone(selection);
 if(!isUuid(selected.userId)||!isUuid(selected.requestId)||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('invalid_admission_selection');
 let used=false,submitted=false;
 const controller=new AbortController();
 const failed=():PreviewAdmissionResult=>({status:submitted?'unconfirmed':'unavailable',retryAllowed:false,reservationMayExist:submitted});
 async function token(){
  const result=await auth.getSession();
  if(controller.signal.aborted||result.error||result.data.session?.user.id!==selected.userId||!result.data.session.access_token)throw Error('account_changed');
  return result.data.session.access_token;
 }
 async function post(body:Record<string,unknown>,bearer:string){
  if(controller.signal.aborted)throw Error('cancelled');
  const response=await request('/api/professor-admission',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${bearer}`},body:JSON.stringify(body),signal:controller.signal,cache:'no-store',redirect:'error'});
  if(controller.signal.aborted||!response.ok)throw Error('admission_unavailable');
  const value=await response.json();
  if(controller.signal.aborted)throw Error('cancelled');
  return value;
 }
 return {
  dispose(){controller.abort();},
  async start():Promise<PreviewAdmissionResult>{
   if(used||controller.signal.aborted)return failed();
   used=true;
   let stop!:()=>void;
   const cancelled=new Promise<PreviewAdmissionResult>(resolve=>{stop=()=>resolve(failed());});
   controller.signal.addEventListener('abort',stop,{once:true});
   const timer=setTimeout(()=>controller.abort(),timeoutMs);
   const run=async():Promise<PreviewAdmissionResult>=>{try{
    const bearer=await token();
    const preflight=await post({action:'preflight',kind:selected.identity.sequence===2?'p1':'written',lessonId:selected.identity.lessonId,requestedTrack:selected.identity.requestedTrack,requestId:selected.requestId,mode:selected.mode},bearer);
    const receipt=preflight?.receipt;
    assertProfessorReferenceReceipt(receipt,selected);
    // Save the public recovery pointer before a start can reach the server.
    // Storage failure stops admission; a saved pointer never authorizes retry.
    checkpoint?.(structuredClone(receipt));
    const currentBearer=await token();
    if(controller.signal.aborted)throw Error('cancelled');
    submitted=true;
    const result=await post({action:'start',referenceId:receipt.reference.id,requestId:selected.requestId},currentBearer);
    await token();
    if(result?.retryAllowed!==false)throw Error('invalid_response');
    if(result.status==='denied'&&reasons.has(result.reason))return {status:'denied',retryAllowed:false,reservationMayExist:result.reason==='request_already_started'||result.reason==='professor_session_already_active'};
    if(result.status!=='admitted')throw Error('invalid_response');
    assertProfessorAdmissionAcknowledgement(result.acknowledgement,receipt);
    return {status:'admitted',acknowledgement:structuredClone(result.acknowledgement),providerAdmission:false};
   }catch{return failed();}};
   try{return await Promise.race([run(),cancelled]);}
   finally{clearTimeout(timer);controller.signal.removeEventListener('abort',stop);controller.abort();}
  },
 };
}

import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mintP1ProfessorPreview} from './p1-professor-binding.ts';
import {mintWrittenProfessorPreview} from './mint-written-professor-preview.ts';
import {assertProfessorAdmissionAcknowledgement,isUuid,professorModes,sameBoundIdentity,type AdmissionAcknowledgement,type ProfessorMode,type ReferenceReceipt} from './professor-admission-contract.ts';
type Input={kind:'p1'|'written';lessonId:string;requestedTrack:'rafael_finance'|'viviane_payroll'|'english_academy';requestId:string;mode:ProfessorMode};
export class ProfessorAdmissionUnconfirmed extends Error{
 readonly reservationMayExist=true;
 constructor(){super('professor_admission_unconfirmed');}
}
const deniedReasons=new Set(['professor_monthly_budget_reached','professor_session_already_active','professor_start_rate_limited','request_already_started']);
function notAborted(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Admission cancelled','AbortError');}

/** Unmounted, validation-only candidate. No LiveKit, token, TTS or provider SDK.
 * Request-scoped authenticated and service clients are mandatory. A start is
 * attempted at most once per prepared object; durable replay protection is SQL.
 * Only acknowledgement is public. Private context uses a server getter so a
 * JSON serialization of the result cannot accidentally include callback secrets.
 * A future provider path still needs a separate durable one-shot dispatch fence. */
export async function prepareBoundProfessorAdmission(db:any,serviceDb:any,input:Input,env:Record<string,string|undefined>,signal?:AbortSignal){
 notAborted(signal);
 if(!input||!isUuid(input.requestId)||!professorModes.includes(input.mode)||!['p1','written'].includes(input.kind))throw Error('professor_admission_request_invalid');
 const requestId=input.requestId,mode=input.mode;
 const identityInput={lessonId:input.lessonId,requestedTrack:input.requestedTrack};
 const minted=await (input.kind==='p1'?mintP1ProfessorPreview:mintWrittenProfessorPreview)(db,serviceDb,identityInput,env);
 notAborted(signal);
 const receipt:ReferenceReceipt={requestId,userId:minted.userId,mode,reference:{id:minted.ticket.reference_id,sha256:minted.reference.descriptor.sha256,
  version:minted.reference.descriptor.version,identity:{...minted.reference.identity}}};
 const callbackToken=randomBytes(32).toString('hex'),roomName='validation:lh-'+randomUUID();
 let attempted=false;
 return {
  // A detached receipt cannot mutate the server's captured reference/request.
  receipt:structuredClone(receipt),
  async start(){
   if(attempted)throw Error('professor_admission_attempt_already_used');
   attempted=true;notAborted(signal);
   const {data:auth,error:authError}=await db.auth.getUser();notAborted(signal);
   if(authError||auth?.user?.id!==minted.userId)throw Error('professor_admission_account_changed');
   let result:any;
   try{
    result=await db.rpc('start_written_professor_session_v1',{p_reference_id:receipt.reference.id,p_request_id:requestId,p_mode:mode,p_room_name:roomName,
     p_callback_hash:createHash('sha256').update(callbackToken).digest('hex'),p_validation_mode:true});
   }catch{throw new ProfessorAdmissionUnconfirmed();}
   // A lost/invalid acknowledgement is NOT proof of rollback. Never retry, release
   // the reservation, invent a receipt or proceed towards a provider here.
   if(signal?.aborted||result?.error||!result?.data)throw new ProfessorAdmissionUnconfirmed();
   const r=result.data;
   if(r.allowed===false&&deniedReasons.has(r.reason))return {status:'denied' as const,reason:r.reason as string};
   const ref=r.written_reference;
   if(r.allowed!==true||!ref||ref.reference_id!==receipt.reference.id||ref.source_sha256!==receipt.reference.sha256
    ||ref.descriptor_version!==receipt.reference.version||!sameBoundIdentity(ref.identity,receipt.reference.identity)
    ||r.room_name!==roomName||r.validation_mode!==true||r.quality_tier!=='premium'
    ||typeof r.reservation_usd!=='number'||!Number.isFinite(r.reservation_usd)||r.reservation_usd<=0)throw new ProfessorAdmissionUnconfirmed();
   const acknowledgement:AdmissionAcknowledgement={...structuredClone(receipt),sessionId:r.session_id,reservationId:r.reservation_id,
    roomName:r.room_name,validationMode:r.validation_mode,qualityTier:r.quality_tier,maxSessionSeconds:r.max_session_seconds,providerAdmission:false};
   try{assertProfessorAdmissionAcknowledgement(acknowledgement,receipt);}catch{throw new ProfessorAdmissionUnconfirmed();}
   return {status:'admitted' as const,acknowledgement,getServerContext:()=>({callbackToken,lessonContext:minted.reference.lessonContext,reservationUsd:r.reservation_usd as number})};
  },
 };
}

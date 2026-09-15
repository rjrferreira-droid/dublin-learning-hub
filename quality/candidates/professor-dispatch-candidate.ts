import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {isP1FeaturePreview} from '../../server/p1-preview-runtime.ts';
import {assertProfessorAdmissionAcknowledgement,type AdmissionAcknowledgement} from './professor-admission-contract.ts';
type Admission={acknowledgement:AdmissionAcknowledgement;getDispatchEnvelope:()=>string};
export class ProfessorDispatchUnconfirmed extends Error{
 readonly retryAllowed=false;
 constructor(){super('professor_dispatch_unconfirmed');}
}
/** UNMOUNTED candidate. submit is supplied only by fictional tests today. It is
 * not an installed LiveKit integration. Never accept Admission from browser JSON.
 * No token/room connection is returned; the envelope is private server data. */
export async function runProfessorDispatchCandidate(serviceDb:any,admission:Admission,env:Record<string,string|undefined>,submit:(privateEnvelope:string)=>Promise<{id:string}>,signal?:AbortSignal){
 if(!isP1FeaturePreview(env))throw Error('professor_dispatch_unavailable');
 if(signal?.aborted)throw new DOMException('Dispatch cancelled','AbortError');
 const encoded=admission.getDispatchEnvelope(),envelope=JSON.parse(encoded),ack=envelope.acknowledgement;
 assertProfessorAdmissionAcknowledgement(ack,admission.acknowledgement);
 if(!isDeepStrictEqual(ack,admission.acknowledgement)||typeof envelope.callbackToken!=='string'||!/^[a-f0-9]{64}$/.test(envelope.callbackToken))throw Error('professor_dispatch_envelope_mismatch');
 const claimId=randomUUID(),payloadSha256=createHash('sha256').update(encoded).digest('hex');
 let claim:any;
 try{claim=await serviceDb.rpc('claim_professor_dispatch_v1',{p_ack:ack,p_callback_hash:createHash('sha256').update(envelope.callbackToken).digest('hex'),p_payload_sha256:payloadSha256,p_claim_id:claimId});}
 catch{throw new ProfessorDispatchUnconfirmed();}
 if(claim?.error||!claim?.data)throw new ProfessorDispatchUnconfirmed();
 if(claim.data.claimed===false&&claim.data.reason==='dispatch_already_claimed')return {state:'already_claimed' as const,retryAllowed:false};
 if(claim.data.claimed!==true||claim.data.claim_id!==claimId||claim.data.payload_sha256!==payloadSha256||signal?.aborted)throw new ProfessorDispatchUnconfirmed();
 let response:{id:string};
 try{response=await submit(encoded);}catch{throw new ProfessorDispatchUnconfirmed();}
 if(!response||typeof response.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(response.id))throw new ProfessorDispatchUnconfirmed();
 // Record observed acknowledgement even if cancellation arrives after submission.
 // Never release budget or translate an observed dispatch into learning evidence.
 let recorded:any;
 try{recorded=await serviceDb.rpc('record_professor_dispatch_v1',{p_reference_id:ack.reference.id,p_user_id:ack.userId,p_claim_id:claimId,p_payload_sha256:payloadSha256,p_dispatch_id:response.id});}
 catch{throw new ProfessorDispatchUnconfirmed();}
 if(recorded?.error||recorded?.data!==true)throw new ProfessorDispatchUnconfirmed();
 return {state:'acknowledged' as const,dispatchId:response.id,retryAllowed:false};
}

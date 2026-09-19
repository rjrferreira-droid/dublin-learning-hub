import {isDeepStrictEqual} from 'node:util';
import {assertProfessorAdmissionAcknowledgement,type AdmissionAcknowledgement} from './professor-admission-contract.ts';
type Admission={acknowledgement:AdmissionAcknowledgement;getDispatchEnvelope:()=>string};
/** UNMOUNTED local-platform wiring. No SDK/network. Only a disposable loopback
 * callback destination is accepted; hosted destination review remains separate.
 * Returned getters contain private server data and must never become HTTP JSON. */
export function prepareLocalProfessorWorkerJob(admission:Admission,config:{supabaseOrigin:string;publishableKey:string}){
 let origin:URL;
 try{origin=new URL(config.supabaseOrigin);}catch{throw Error('professor_worker_destination_forbidden');}
 if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname)||origin.port!=='54321'
  ||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error('professor_worker_destination_forbidden');
 // Local Supabase uses a legacy anon JWT. Explicitly reject service/secret keys.
 let role:string;
 try{role=JSON.parse(Buffer.from(config.publishableKey.split('.')[1],'base64url').toString()).role;}catch{throw Error('professor_worker_key_forbidden');}
 if(role!=='anon')throw Error('professor_worker_key_forbidden');
 const source=JSON.parse(admission.getDispatchEnvelope()),ack=source.acknowledgement;
 assertProfessorAdmissionAcknowledgement(ack,admission.acknowledgement);
 if(!isDeepStrictEqual(ack,admission.acknowledgement)||typeof source.callbackToken!=='string'||!/^[a-f0-9]{64}$/.test(source.callbackToken)
  ||typeof source.reservationUsd!=='number'||!Number.isFinite(source.reservationUsd)||source.reservationUsd<=0)throw Error('professor_worker_admission_invalid');
 const context=source.lessonContext;
 const stringFields=['title','technicalBrief','globalCore','irelandOverlay','workedExample','interviewAngle','practiceScenario'];
 const listFields=['objectives','vocabulary'];
 if(!context||typeof context!=='object'||Array.isArray(context)||!context.title||!context.technicalBrief
  ||Object.entries(context).some(([key,value])=>stringFields.includes(key)?typeof value!=='string':listFields.includes(key)?!Array.isArray(value)||value.some(v=>typeof v!=='string'):true))throw Error('professor_worker_context_invalid');
 const metadata=JSON.stringify({professorProfile:ack.reference.identity.studyTrack,track:ack.reference.identity.requestedTrack,
  lessonId:ack.reference.identity.lessonId,mode:ack.mode,validationMode:true,qualityTier:'premium',
  lessonContext:context,budgetReservationId:ack.reservationId,budgetReservationUsd:source.reservationUsd,maxSessionSeconds:ack.maxSessionSeconds,
  persistence:{sessionId:ack.sessionId,callbackToken:source.callbackToken,completionUrl:origin.origin+'/functions/v1/professor-session-complete',publishableKey:config.publishableKey}});
 if(Buffer.byteLength(metadata,'utf8')>32768)throw Error('professor_worker_metadata_too_large');
 const job={roomName:ack.roomName,agentName:'learning-hub-professor',metadata};
 // Claim hashes these exact bytes, including final metadata and destination.
 const encoded=JSON.stringify({acknowledgement:ack,callbackToken:source.callbackToken,workerJob:job});
 return {acknowledgement:structuredClone(ack),getDispatchEnvelope:()=>encoded,getWorkerJob:()=>structuredClone(job)};
}

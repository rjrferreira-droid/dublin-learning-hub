/** Browser-safe candidate contract. No SDK, credentials, network or voice access. */
export const professorModes=['chapter_conversation','case_feedback','oral_mock','english_drill','general_conversation'] as const;
export type ProfessorMode=typeof professorModes[number];
export type BoundIdentity={lessonId:string;moduleId:string;courseId:string;lessonSlug:string;contentVersion:number;requestedTrack:string;studyTrack:string;sequence:number};
export type ReferenceReceipt={requestId:string;userId:string;mode:ProfessorMode;reference:{id:string;sha256:string;version:string;identity:BoundIdentity}};
export type AdmissionAcknowledgement=ReferenceReceipt & {sessionId:string;reservationId:string;roomName:string;validationMode:true;qualityTier:'premium';maxSessionSeconds:number;providerAdmission:false};
export const isUuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const identityKeys=['lessonId','moduleId','courseId','lessonSlug','contentVersion','requestedTrack','studyTrack','sequence'] as const;
const exactKeys=(v:any,keys:readonly string[])=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function sameBoundIdentity(a:any,b:BoundIdentity){
 return exactKeys(a,identityKeys)&&identityKeys.every(k=>a[k]===b[k]);
}
function validReceipt(r:any):boolean{
 if(!r||!isUuid(r.requestId)||!isUuid(r.userId)||!professorModes.includes(r.mode)||!exactKeys(r.reference,['id','sha256','version','identity']))return false;
 const x=r.reference,i=x.identity;
 if(!isUuid(x.id)||typeof x.sha256!=='string'||!/^[a-f0-9]{64}$/.test(x.sha256)||!exactKeys(i,identityKeys))return false;
 if(![i.lessonId,i.moduleId,i.courseId].every(isUuid)||typeof i.lessonSlug!=='string'||!i.lessonSlug.length
  ||!Number.isSafeInteger(i.contentVersion)||i.contentVersion<1||!Number.isInteger(i.sequence)||i.sequence<2||i.sequence>8)return false;
 const tracks:Record<string,string>={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'};
 return Object.hasOwn(tracks,i.requestedTrack)&&tracks[i.requestedTrack]===i.studyTrack
  &&x.version===(i.sequence===2?'p1-reference-candidate-v1':'written-reference-candidate-v3');
}
/** Check the server preflight against the user's current catalog selection before
 * requesting admission. The catalog snapshot is a consistency check, never auth. */
export function assertProfessorReferenceReceipt(value:unknown,selected:{requestId:string;userId:string;mode:ProfessorMode;identity:BoundIdentity}):asserts value is ReferenceReceipt{
 const r=value as any;
 if(!validReceipt(r)||!exactKeys(r,['requestId','userId','mode','reference'])||r.requestId!==selected.requestId||r.userId!==selected.userId
  ||r.mode!==selected.mode||!sameBoundIdentity(r.reference.identity,selected.identity))throw Error('professor_reference_receipt_mismatch');
}
/** expected must be the captured preflight receipt for the CURRENT account,
 * selection and request, not a copy taken from the start response itself.
 * A match confirms admission identity only: it never authorizes voice access. */
export function assertProfessorAdmissionAcknowledgement(value:unknown,expected:ReferenceReceipt):asserts value is AdmissionAcknowledgement{
 const a=value as any;
 if(!validReceipt(expected)||!validReceipt(a)||!exactKeys(a,['requestId','userId','mode','reference','sessionId','reservationId','roomName','validationMode','qualityTier','maxSessionSeconds','providerAdmission'])
  ||a.requestId!==expected.requestId||a.userId!==expected.userId||a.mode!==expected.mode
  ||a.reference.id!==expected.reference.id||a.reference.sha256!==expected.reference.sha256||a.reference.version!==expected.reference.version
  ||!sameBoundIdentity(a.reference.identity,expected.reference.identity)||!isUuid(a.sessionId)||!isUuid(a.reservationId)
  ||typeof a.roomName!=='string'||!a.roomName.startsWith('validation:lh-')||!isUuid(a.roomName.slice('validation:lh-'.length))
  ||a.validationMode!==true||a.qualityTier!=='premium'||!Number.isInteger(a.maxSessionSeconds)||a.maxSessionSeconds<60||a.maxSessionSeconds>1200||a.providerAdmission!==false)
  throw Error('professor_admission_acknowledgement_mismatch');
}

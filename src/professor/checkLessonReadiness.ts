import {isUuid,type BoundIdentity} from '../../quality/candidates/professor-admission-contract.ts';

type RequestedTrack='rafael_finance'|'viviane_payroll'|'english_academy';
type Selection={userId:string;lessonId:string;lessonSlug:string;requestedTrack:RequestedTrack};
export const LESSON_READINESS_TIMEOUT_MS=15000;
const identityKeys=['lessonId','moduleId','courseId','lessonSlug','contentVersion','requestedTrack','studyTrack','sequence'];
const tracks:Record<RequestedTrack,BoundIdentity['studyTrack']>={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'};
const exact=(value:any,keys:string[])=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
/** Read-only, server-resolved consistency snapshot. It never authorizes voice,
 * Audio, admission or provider use; the admission preflight must match it. */
export async function checkLessonReadiness(auth:any,selection:Selection,signal:AbortSignal,request:typeof fetch=fetch):Promise<BoundIdentity|null>{
 if(signal.aborted)return null;
 const expected={...selection};
 const controller=new AbortController();
 let stop!:()=>void;
 const stopped=new Promise<null>(resolve=>{stop=()=>{controller.abort();resolve(null);};});
 signal.addEventListener('abort',stop,{once:true});
 const timer=setTimeout(stop,LESSON_READINESS_TIMEOUT_MS);
 const run=async()=>{try{
 const session=await auth.getSession();
 const current=session.data?.session;
 if(controller.signal.aborted||session.error||current?.user?.id!==expected.userId||!current?.access_token)return null;
  const response=await request('/api/professor-readiness',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${current.access_token}`},
   body:JSON.stringify({lessonId:expected.lessonId,requestedTrack:expected.requestedTrack}),signal:controller.signal,cache:'no-store',redirect:'error'});
  if(!response.ok||controller.signal.aborted)return null;
  const result=await response.json();
  if(controller.signal.aborted)return null;
  const latest=await auth.getSession();
  if(controller.signal.aborted||latest.error||latest.data?.session?.user?.id!==expected.userId)return null;
  const i=result?.identity;
  if(!exact(result,['status','identity','providerAdmission','premiumAudioAdmission','validationOnly'])
   ||result.status!=='reference_verified_activation_closed'||result.providerAdmission!==false||result.premiumAudioAdmission!==false||result.validationOnly!==true
   ||!exact(i,identityKeys)||i.lessonId!==expected.lessonId||i.lessonSlug!==expected.lessonSlug||i.requestedTrack!==expected.requestedTrack
   ||![i.lessonId,i.moduleId,i.courseId].every(isUuid)||!Number.isSafeInteger(i.contentVersion)||i.contentVersion<1
   ||i.studyTrack!==tracks[expected.requestedTrack]||i.sequence!==2)return null;
  return structuredClone(i) as BoundIdentity;
 }catch{return null;}};
 try{return await Promise.race([run(),stopped]);}
 finally{clearTimeout(timer);signal.removeEventListener('abort',stop);controller.abort();}
}

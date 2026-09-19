import {isUuid,sameBoundIdentity,type BoundIdentity} from '../../quality/candidates/professor-admission-contract.ts';

type Auth={getSession():PromiseLike<{data:{session:{user:{id:string};access_token:string}|null};error:unknown}>};
type Selection={userId:string;identity:BoundIdentity};
export type PremiumAudioBinding={identity:BoundIdentity;source:{language:'en'|'pt-BR';purpose:'study-guide-overview';characters:number;scriptSha256:string;sourceFingerprint:string;referenceSha256:string;expectedStoragePath:string}};
export const PREMIUM_AUDIO_READINESS_TIMEOUT_MS=15000;
const exact=(value:any,keys:readonly string[])=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const responseKeys=['status','identity','source','cacheLookupPerformed','runtimeSourceHandoff','generationAdmission','providerAdmission','validationOnly'];
const sourceKeys=['language','purpose','characters','scriptSha256','sourceFingerprint','referenceSha256','expectedStoragePath'];
const sha256=/^[a-f0-9]{64}$/;

/** One bounded, read-only verification. No cache lookup, budget reservation,
 * Audio Edge invocation, media URL or provider admission is accepted. */
export async function checkPremiumAudioReadiness(auth:Auth,selection:Selection,signal:AbortSignal,request:typeof fetch=fetch):Promise<PremiumAudioBinding|null>{
 if(signal.aborted)return null;
 const selected=structuredClone(selection);
 const tracks:Record<string,string>={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'};
 if(!isUuid(selected.userId)||!sameBoundIdentity(selected.identity,selected.identity)||![selected.identity.lessonId,selected.identity.moduleId,selected.identity.courseId].every(isUuid)
  ||!Object.hasOwn(tracks,selected.identity.requestedTrack)||tracks[selected.identity.requestedTrack]!==selected.identity.studyTrack||selected.identity.sequence!==2
  ||!Number.isSafeInteger(selected.identity.contentVersion)||selected.identity.contentVersion<1||selected.identity.contentVersion>100000||!selected.identity.lessonSlug)return null;
 const controller=new AbortController();let stop!:()=>void;
 const stopped=new Promise<null>(resolve=>{stop=()=>{controller.abort();resolve(null);};});
 signal.addEventListener('abort',stop,{once:true});
 const timer=setTimeout(stop,PREMIUM_AUDIO_READINESS_TIMEOUT_MS);
 const run=async()=>{try{
  const initial=await auth.getSession(),session=initial.data?.session;
  if(controller.signal.aborted||initial.error||session?.user?.id!==selected.userId||!session.access_token)return null;
  const response=await request('/api/premium-audio-readiness',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
   body:JSON.stringify({lessonId:selected.identity.lessonId,requestedTrack:selected.identity.requestedTrack}),signal:controller.signal,cache:'no-store',redirect:'error'});
  if(!response.ok||controller.signal.aborted)return null;
  const value=await response.json();if(controller.signal.aborted)return null;
  const latest=await auth.getSession();
  if(controller.signal.aborted||latest.error||latest.data?.session?.user?.id!==selected.userId)return null;
  const source=value?.source,expectedLanguage=selected.identity.studyTrack==='english'?'en':'pt-BR';
  if(!exact(value,responseKeys)||value.status!=='audio_reference_verified_activation_closed'||value.cacheLookupPerformed!==false||value.runtimeSourceHandoff!==false
   ||value.generationAdmission!==false||value.providerAdmission!==false||value.validationOnly!==true
   ||!sameBoundIdentity(value.identity,selected.identity)||!exact(source,sourceKeys)||source.language!==expectedLanguage||source.purpose!=='study-guide-overview'
   ||!Number.isSafeInteger(source.characters)||source.characters<1||source.characters>4000
   ||![source.scriptSha256,source.sourceFingerprint,source.referenceSha256].every((x:unknown)=>typeof x==='string'&&sha256.test(x))
   ||source.expectedStoragePath!==`lessons/${selected.identity.lessonId}/commentary-v${selected.identity.contentVersion}-${source.sourceFingerprint}-r1.mp3`)return null;
  return structuredClone({identity:value.identity,source}) as PremiumAudioBinding;
 }catch{return null;}};
 try{return await Promise.race([run(),stopped]);}
 finally{clearTimeout(timer);signal.removeEventListener('abort',stop);controller.abort();}
}

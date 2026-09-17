type Selection={userId:string;lessonId:string;lessonSlug:string;requestedTrack:string};
export const LESSON_READINESS_TIMEOUT_MS=15000;
/** Read-only check. Its result never authorizes voice, Audio or session admission. */
export async function checkLessonReadiness(auth:any,selection:Selection,signal:AbortSignal,request:typeof fetch=fetch):Promise<boolean>{
 if(signal.aborted)return false;
 const expected={...selection};
 const controller=new AbortController();
 let stop!:()=>void;
 const stopped=new Promise<false>(resolve=>{stop=()=>{controller.abort();resolve(false);};});
 signal.addEventListener('abort',stop,{once:true});
 const timer=setTimeout(stop,LESSON_READINESS_TIMEOUT_MS);
 const run=async()=>{try{
 const session=await auth.getSession();
 const current=session.data?.session;
 if(controller.signal.aborted||session.error||current?.user?.id!==expected.userId||!current?.access_token)return false;
  const response=await request('/api/professor-readiness',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${current.access_token}`},
   body:JSON.stringify({lessonId:expected.lessonId,requestedTrack:expected.requestedTrack}),signal:controller.signal,cache:'no-store',redirect:'error'});
  if(!response.ok||controller.signal.aborted)return false;
  const result=await response.json();
  if(controller.signal.aborted)return false;
  const latest=await auth.getSession();
  if(controller.signal.aborted||latest.error||latest.data?.session?.user?.id!==expected.userId)return false;
  const i=result?.identity;
  return result?.status==='reference_verified_activation_closed'&&result.providerAdmission===false&&result.premiumAudioAdmission===false&&result.validationOnly===true
   &&i?.lessonId===expected.lessonId&&i.lessonSlug===expected.lessonSlug&&i.requestedTrack===expected.requestedTrack
   &&Number.isSafeInteger(i.contentVersion)&&i.contentVersion>0;
 }catch{return false;}};
 try{return await Promise.race([run(),stopped]);}
 finally{clearTimeout(timer);signal.removeEventListener('abort',stop);controller.abort();}
}

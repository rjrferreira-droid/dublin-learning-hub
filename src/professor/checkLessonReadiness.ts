type Selection={userId:string;lessonId:string;lessonSlug:string;requestedTrack:string};
/** Read-only check. Its result never authorizes voice, Audio or session admission. */
export async function checkLessonReadiness(auth:any,selection:Selection,signal:AbortSignal,request:typeof fetch=fetch):Promise<boolean>{
 const expected={...selection};
 try{
 const session=await auth.getSession();
 const current=session.data?.session;
 if(signal.aborted||session.error||current?.user?.id!==expected.userId||!current?.access_token)return false;
  const response=await request('/api/professor-readiness',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${current.access_token}`},
   body:JSON.stringify({lessonId:expected.lessonId,requestedTrack:expected.requestedTrack}),signal,cache:'no-store',redirect:'error'});
  if(!response.ok||signal.aborted)return false;
  const result=await response.json();
  const latest=await auth.getSession();
  if(signal.aborted||latest.error||latest.data?.session?.user?.id!==expected.userId)return false;
  const i=result?.identity;
  return result?.status==='reference_verified_activation_closed'&&result.providerAdmission===false&&result.premiumAudioAdmission===false&&result.validationOnly===true
   &&i?.lessonId===expected.lessonId&&i.lessonSlug===expected.lessonSlug&&i.requestedTrack===expected.requestedTrack
   &&Number.isSafeInteger(i.contentVersion)&&i.contentVersion>0;
 }catch{return false;}
}

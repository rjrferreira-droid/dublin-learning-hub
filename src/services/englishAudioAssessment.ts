import {supabase,supabasePublishableKey,supabaseUrl} from './supabase';
import {assessmentWav} from '../audio/encodeAnswerWav';

export const ENGLISH_AUDIO_SKILLS=['comprehension','response_quality','grammar','vocabulary','pronunciation','intonation','fluency'] as const;
export type EnglishAudioSkill=typeof ENGLISH_AUDIO_SKILLS[number];
export type SkillAssessment={score:number|null;feedback:string};
export type EnglishAudioAssessment={
 status:'completed';lesson_id:string;question_index:number;attempt_id:string;transcript:string;
 skills:Record<EnglishAudioSkill,SkillAssessment>;feedback:string;estimated_cost_usd:number;
};

function parseAssessment(payload:unknown,lessonId:string,questionIndex:number,attemptId:string):EnglishAudioAssessment{
 if(!payload||typeof payload!=='object')throw Error('The assessment response could not be read.');
 const result=payload as Partial<EnglishAudioAssessment>;
 if(result.status!=='completed'||result.lesson_id!==lessonId||result.question_index!==questionIndex||result.attempt_id!==attemptId
  ||typeof result.transcript!=='string'||result.transcript.length>8_000||typeof result.feedback!=='string'||result.feedback.length>4_000
  ||!result.skills||typeof result.skills!=='object'||!Number.isFinite(result.estimated_cost_usd)||Number(result.estimated_cost_usd)<0)
  throw Error('The assessment response did not match this recording.');
 for(const skill of ENGLISH_AUDIO_SKILLS){
  const value=result.skills[skill];
  if(!value||typeof value.feedback!=='string'||value.feedback.length>2_000
   ||(value.score!==null&&(!Number.isFinite(value.score)||Number(value.score)<0||Number(value.score)>100)))
   throw Error('The assessment response is incomplete.');
 }
 return result as EnglishAudioAssessment;
}

/** The media stays in browser memory; the function receives only one answer per request. */
export async function assessEnglishAudioAnswer(lessonId:string,questionIndex:number,attemptId:string,recording:Blob):Promise<EnglishAudioAssessment>{
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token||!session.user?.id)throw Error('Sign in to assess your answers.');
 const learnerId=session.user.id;
 const audio=await assessmentWav(recording);
 const form=new FormData();
 form.set('lesson_id',lessonId);form.set('question_index',String(questionIndex));form.set('attempt_id',attemptId);form.set('audio',audio);
 let response:Response;
 try{
  response=await fetch(`${supabaseUrl}/functions/v1/english-audio-assess`,{
   method:'POST',headers:{apikey:supabasePublishableKey,Authorization:`Bearer ${session.access_token}`},body:form,cache:'no-store',redirect:'error',
  });
 }catch{throw Error('The assessment service could not be reached. Try again.');}
 const payload=await response.json().catch(()=>null);
 if(!response.ok){
  const code=payload&&typeof payload==='object'&&typeof payload.error==='string'?payload.error:'';
  if(code==='assessment_closed'||code==='assessment_preview_only'||code==='assessment_unavailable')throw Error('Voice assessment is awaiting Preview activation. Your recordings remain available in this lesson.');
  if(code==='assessment_audio_unready')throw Error('The reviewed episode is not ready yet. Listen to it before requesting assessment.');
  if(code==='assessment_result_expired')throw Error('This assessment expired after 30 days. Record this answer again to request a new assessment.');
  if(code==='assessment_unresolved'||code==='assessment_provider_failed'||code==='assessment_output_invalid')throw Error('This answer needs a manual check before it can be assessed again. Keep this recording and do not re-record yet.');
  if(code==='assessment_in_progress')throw Error('This answer is still being checked. Try again shortly with the same recording.');
  if(response.status===429)throw Error('The assessment budget is currently unavailable. Try again later.');
  if(response.status===409)throw Error('This answer needs to be checked before another assessment can start.');
  throw Error('Voice assessment could not finish. Keep this recording and try again later.');
 }
 const latest=await supabase.auth.getSession();
 if(latest.error||latest.data.session?.user?.id!==learnerId)throw Error('Your account changed during assessment. Sign in again.');
 return parseAssessment(payload,lessonId,questionIndex,attemptId);
}

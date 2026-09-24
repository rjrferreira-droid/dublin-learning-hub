import {supabase,supabasePublishableKey,supabaseUrl} from './supabase';
import {assessmentWav} from '../audio/encodeAnswerWav';
import {parseActivityFeedback,type EnglishActivityKind,type EnglishActivityResult} from '../learning/englishActivityAssessment';
export type {EnglishActivityResult} from '../learning/englishActivityAssessment';
function parseResult(value:unknown,lessonId:string):EnglishActivityResult{
 const row=value as EnglishActivityResult;
 if(!row||row.status!=='completed'||row.lesson_id!==lessonId||!['practice','speaking'].includes(row.kind)||typeof row.item_id!=='string'||typeof row.attempt_id!=='string'||!Number.isFinite(row.estimated_cost_usd)||row.estimated_cost_usd<0)throw Error('The evaluation response was incomplete.');
 return {...row,...parseActivityFeedback(row,row.kind)};
}
async function session(){const result=await supabase.auth.getSession();if(result.error||!result.data.session)throw Error('Sign in to evaluate your work.');return result.data.session;}
export async function readEnglishActivityResults(lessonId:string):Promise<EnglishActivityResult[]>{
 const current=await session();
 const response=await fetch(`${supabaseUrl}/functions/v1/english-activity-assess?lesson_id=${encodeURIComponent(lessonId)}`,{headers:{Authorization:`Bearer ${current.access_token}`,apikey:supabasePublishableKey},cache:'no-store',redirect:'error'});
 if(!response.ok)throw Error('Saved evaluations could not be loaded. Your current work is still available.');
 const body=await response.json();if(!Array.isArray(body?.results)||body.results.length>100)throw Error('Invalid evaluation history.');
 if((await session()).user.id!==current.user.id)throw Error('Your account changed.');
 return body.results.map((row:unknown)=>parseResult(row,lessonId));
}
export async function assessEnglishActivity(lessonId:string,kind:EnglishActivityKind,itemId:string,attemptId:string,input:string|Blob):Promise<EnglishActivityResult>{
 const current=await session(),form=new FormData();
 form.set('lesson_id',lessonId);form.set('kind',kind);form.set('item_id',itemId);form.set('attempt_id',attemptId);
 if(kind==='practice'&&typeof input==='string')form.set('answer',input);
 else if(kind==='speaking'&&input instanceof Blob)form.set('audio',await assessmentWav(input));
 else throw Error('Invalid activity input.');
 let response:Response;
 try{response=await fetch(`${supabaseUrl}/functions/v1/english-activity-assess`,{method:'POST',headers:{Authorization:`Bearer ${current.access_token}`,apikey:supabasePublishableKey},body:form,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(120000)});}catch{throw Error('The service did not respond. Retry this same submission to check its status.');}
 const body=await response.json().catch(()=>null);
 if(!response.ok){
  if(response.status===429)throw Error('The shared evaluation budget has reached its limit. Your work is still available.');
  if(body?.error==='assessment_unresolved')throw Error('This submission needs a service check before another evaluation. It will not be charged twice automatically.');
  if(body?.error==='assessment_in_progress')throw Error('This submission is still being analysed. Retry the same submission shortly.');
  if(body?.error==='invalid_audio')throw Error('Record a clear phrase lasting between half a second and 30 seconds.');
  if(body?.error==='forbidden')throw Error('This activity belongs to a different learner account.');
  throw Error('Evaluation is temporarily unavailable. Keep your answer and retry shortly.');
 }
 if((await session()).user.id!==current.user.id)throw Error('Your account changed during evaluation.');
 const result=parseResult(body,lessonId);
 if(result.kind!==kind||result.item_id!==itemId||result.attempt_id!==attemptId)throw Error('The evaluation did not match this submission.');
 return result;
}

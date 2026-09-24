import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts';
import {createClient} from 'jsr:@supabase/supabase-js@2.116.0';
import {englishActivitySource} from '../_shared/english-activity-source.ts';
import {audioQuestionsFor} from '../../../src/learning/audioQuestions.ts';
import {englishEpisodeSource} from '../_shared/english-episode-source.ts';
import {audioAssessmentPrompt,normalizedAssessmentKey,parseAudioAssessment,validateAnswerWav,MAX_WAV_BYTES,
 type EnglishAudioAssessment} from '../_shared/english-audio-assessment.ts';

const PREVIEW_URL='https://aazfyosqqeujureksqjs.supabase.co';
const MODEL='gpt-audio-1.5';
const MAX_MULTIPART_BYTES=2_150_000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LESSON_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});

async function boundedBody(req:Request):Promise<Uint8Array>{
 const declared=req.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_MULTIPART_BYTES))throw new Error('audio_too_large');
 if(!req.body)throw new Error('invalid_request');
 const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{
  while(true){const {value,done}=await reader.read();if(done)break;if(!value)continue;
   size+=value.byteLength;
   if(size>MAX_MULTIPART_BYTES){await reader.cancel();throw new Error('audio_too_large');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const body=new Uint8Array(size);let at=0;
 for(const chunk of chunks){body.set(chunk,at);at+=chunk.length;}
 return body;
}
function base64(bytes:Uint8Array):string{
 const chunks:string[]=[];
 for(let at=0;at<bytes.length;at+=32768)chunks.push(String.fromCharCode(...bytes.subarray(at,at+32768)));
 return btoa(chunks.join(''));
}
function estimatedCost(usage:any):{usd:number;prompt:number;audio:number;completion:number}{
 const prompt=Number(usage?.prompt_tokens),completion=Number(usage?.completion_tokens);
 if(!Number.isSafeInteger(prompt)||prompt<0||!Number.isSafeInteger(completion)||completion<0)
  return {usd:0.50,prompt:0,audio:0,completion:0};
 const detail=Number(usage?.prompt_tokens_details?.audio_tokens);
 // With missing modality details, charge all input at the more expensive audio rate.
 const audio=Number.isSafeInteger(detail)&&detail>=0&&detail<=prompt?detail:prompt;
 const usd=Math.max(0.001,(audio*32+(prompt-audio)*2.5+completion*10)/1_000_000);
 return {usd:Number(usd.toFixed(6)),prompt,audio,completion};
}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(!['GET','POST'].includes(req.method))return json({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL')??'',anon=Deno.env.get('SUPABASE_ANON_KEY')??'';
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
 const auth=req.headers.get('Authorization')??'';
 if(!/^Bearer\s+\S+$/.test(auth)||!url||!anon)return json({error:'unauthorized'},401);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:authError}=await userClient.auth.getUser();
 if(authError||!user||user.is_anonymous===true)return json({error:'unauthorized'},401);
 if(url!==PREVIEW_URL)return json({error:'assessment_preview_only'},403);
 // The private, service-only budget row is the sole activation switch and
 // defaults to disabled. The exact Preview project check above is independent.
 if(req.method==='GET'){
  if(!secret)return json({error:'assessment_unavailable'},503);
  const lessonId=new URL(req.url).searchParams.get('lesson_id')??'';
  const admin=createClient(url,secret);
  const {data:profile,error}=await admin.from('profiles').select('learner_track').eq('id',user.id).maybeSingle();
  if(error||!profile)return json({error:'forbidden'},403);
  try{englishActivitySource(lessonId,'speaking','0',profile.learner_track);}catch{return json({error:'forbidden'},403);}
  const results=await admin.rpc('read_english_audio_results_v1',{p_user_id:user.id,p_lesson_id:lessonId});
  return results.error?json({error:'assessment_unavailable'},503):json({results:results.data??[]});
 }
 const providerKey=normalizedAssessmentKey(Deno.env.get('OPENAI_API_KEY'));
 if(!secret||!providerKey)return json({error:'assessment_unavailable'},503);
 const contentType=req.headers.get('content-type')??'';
 if(!/^multipart\/form-data;\s*boundary=/i.test(contentType))return json({error:'invalid_request'},400);

 let form:FormData;
 try{
  const body=await boundedBody(req);
  form=await new Request('https://local.invalid/',{method:'POST',headers:{'Content-Type':contentType},body}).formData();
 }catch(error){return json({error:error instanceof Error&&error.message==='audio_too_large'?'audio_too_large':'invalid_request'},error instanceof Error&&error.message==='audio_too_large'?413:400);}
 const keys=[...form.keys()];
 if(keys.length!==4||new Set(keys).size!==4||!['lesson_id','question_index','attempt_id','audio'].every(key=>form.has(key)))
  return json({error:'invalid_request'},400);
 const lessonId=form.get('lesson_id'),indexRaw=form.get('question_index'),attemptId=form.get('attempt_id'),audio=form.get('audio');
 if(typeof lessonId!=='string'||!LESSON_UUID.test(lessonId)||typeof indexRaw!=='string'||/^(0|[1-9][0-9]?)$/.test(indexRaw)===false
  ||typeof attemptId!=='string'||!UUID.test(attemptId)||!(audio instanceof File))return json({error:'invalid_request'},400);
 const questionIndex=Number(indexRaw),questions=audioQuestionsFor(lessonId);
 if(!questions.length||questionIndex>=questions.length)return json({error:'lesson_not_found'},404);
 if(audio.size>MAX_WAV_BYTES)return json({error:'audio_too_large'},413);
 let wav:Uint8Array;
 try{wav=new Uint8Array(await audio.arrayBuffer());validateAnswerWav(wav);}
 catch(error){return json({error:error instanceof Error&&error.message==='audio_too_large'?'audio_too_large':error instanceof Error&&error.message==='unsupported_audio'?'unsupported_audio':'invalid_audio'},error instanceof Error&&error.message==='audio_too_large'?413:400);}

 const admin=createClient(url,secret);
 const [{data:profile,error:profileError},{data:lesson,error:lessonError}]=await Promise.all([
  admin.from('profiles').select('learner_track').eq('id',user.id).maybeSingle(),
  admin.from('lessons').select('id,module_id,slug,sequence,content_version,is_published').eq('id',lessonId).maybeSingle(),
 ]);
 if(profileError||lessonError)return json({error:'assessment_unavailable'},503);
 if(profile?.learner_track!=='rafael_finance')return json({error:'forbidden'},403);
 if(!lesson||lesson.is_published!==true)return json({error:'lesson_not_found'},404);
 const {data:module,error:moduleError}=await admin.from('modules').select('id,course_id,is_published').eq('id',lesson.module_id).maybeSingle();
 const {data:course,error:courseError}=module?.course_id?await admin.from('courses').select('id,learner_track,is_active').eq('id',module.course_id).maybeSingle():{data:null,error:null};
 if(moduleError||courseError)return json({error:'assessment_unavailable'},503);
 if(module?.is_published!==true||course?.is_active!==true||course?.learner_track!=='english_academy')
  return json({error:'forbidden'},403);
 // The read-only observer checks current authored source and the immutable
 // settled binding, every provider receipt, asset, and private Storage object.
 let source;
 try{
  source=englishEpisodeSource({lessonId,lessonSlug:lesson.slug,sequence:Number(lesson.sequence),
   contentVersion:Number(lesson.content_version),moduleId:module.id,courseId:course.id,
   profileTrack:profile.learner_track,courseTrack:course.learner_track});
 }catch{return json({error:'assessment_audio_unready'},409);}
 const observed=await admin.rpc('observe_english_episode_cache_v1',{
  p_user_id:user.id,p_lesson_id:lessonId,p_content_version:lesson.content_version,
  p_source_fingerprint:source.sourceFingerprint,p_render_revision:source.renderRevision,
  p_storage_path:source.storagePath,p_lesson_identity:source.identity,
 });
 if(observed.error)return json({error:'assessment_unavailable'},503);
 if(observed.data?.status!=='hit'||observed.data.storagePath!==source.storagePath)
  return json({error:'assessment_audio_unready'},409);

 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',wav)))
  .map(byte=>byte.toString(16).padStart(2,'0')).join('');

 const claim=await admin.rpc('begin_english_audio_assessment_v1',{
  p_attempt_id:attemptId,p_user_id:user.id,p_lesson_id:lessonId,p_question_index:questionIndex,
  p_audio_sha256:fingerprint,
 });
 if(claim.error||!claim.data||typeof claim.data.status!=='string')return json({error:'assessment_budget_unavailable'},503);
 if(claim.data.status==='completed'&&claim.data.result)return json({...claim.data.result,cached:true});
 const claimErrors:Record<string,[string,number]>={
  closed:['assessment_closed',503],budget_unavailable:['assessment_budget_unavailable',503],
  budget_reached:['assessment_budget_reached',429],global_budget_reached:['global_ai_budget_reached',429],
  in_progress:['assessment_in_progress',409],unresolved:['assessment_unresolved',409],identity_conflict:['invalid_request',400],
  expired:['assessment_result_expired',410],
 };
 if(claim.data.status!=='claimed'){
  const [error,status]=claimErrors[claim.data.status]??['assessment_budget_unavailable',503];return json({error},status);
 }

 // A free model retrieval checks the normalized credential and this project's
 // model access before the paid audio request. Failed checks release only the
 // unsubmitted hold, so they cannot strand an answer as provider-uncertain.
 let providerReady=false;
 try{
  const check=await fetch(`https://api.openai.com/v1/models/${MODEL}`,{
   method:'GET',signal:AbortSignal.timeout(10_000),redirect:'error',
   headers:{Authorization:`Bearer ${providerKey}`},
  });
  if(check.ok){const metadata=await check.json();providerReady=metadata?.id===MODEL;}
  else await check.body?.cancel().catch(()=>undefined);
 }catch{/* No audio was sent; the reserved hold can still be released. */}
 if(!providerReady){
  const released=await admin.rpc('cancel_english_audio_assessment_reserved_v1',{
   p_attempt_id:attemptId,p_user_id:user.id,
  });
  if(released.error||released.data!==true)console.error('Unsubmitted audio assessment hold needs reconciliation',attemptId);
  return json({error:'assessment_unavailable'},503);
 }

 const submitted=await admin.rpc('mark_english_audio_assessment_submitted_v1',{p_attempt_id:attemptId,p_user_id:user.id});
 if(submitted.error||submitted.data!==true){
  // No POST has occurred. A lost RPC response might mean it is already in
  // `submitted`; cancellation deliberately touches only `reserved` rows.
  const released=await admin.rpc('cancel_english_audio_assessment_reserved_v1',{
   p_attempt_id:attemptId,p_user_id:user.id,
  });
  if(released.error||released.data!==true)console.error('Unsubmitted audio assessment hold needs reconciliation',attemptId);
  return json({error:'assessment_unavailable'},503);
 }
 // From this point, a transport failure could still incur provider cost. Preserve
 // the hold rather than allowing a retry to charge a second time.
 try{
  const provider=await fetch('https://api.openai.com/v1/chat/completions',{
   method:'POST',signal:AbortSignal.timeout(100_000),redirect:'error',
   headers:{Authorization:`Bearer ${providerKey}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:MODEL,store:false,modalities:['text'],max_completion_tokens:900,
    messages:[{role:'system',content:'You are a careful, fair English listening and speech coach. Return only valid JSON.'},
     {role:'user',content:[{type:'text',text:audioAssessmentPrompt(questions[questionIndex].question,questions[questionIndex].reference)},
      {type:'input_audio',input_audio:{data:base64(wav),format:'wav'}}]}]}),
  });
  if(!provider.ok){await provider.body?.cancel().catch(()=>undefined);throw new Error('assessment_provider_failed');}
  // No raw audio, prompt, transcript, credential or provider body is logged.
  const providerData=await provider.json();
  const raw=providerData?.choices?.[0]?.message?.content;
  if(typeof raw!=='string'||raw.length>16_000)throw new Error('assessment_output_invalid');
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{throw new Error('assessment_output_invalid');}
  const result=parseAudioAssessment(parsed);
  const usage=estimatedCost(providerData.usage);
  if(usage.usd>0.50)throw new Error('assessment_budget_unavailable');
  const assessment:EnglishAudioAssessment={
   status:'completed',lesson_id:lessonId,question_index:questionIndex,attempt_id:attemptId,
   ...result,estimated_cost_usd:usage.usd,
  };
  // The transcript is returned once to the open lesson. Idempotency keeps
  // feedback and scores but never persists a transcript of the learner's voice.
  const cachedAssessment={...assessment,transcript:''};
  const settled=await admin.rpc('settle_english_audio_assessment_v1',{
   p_attempt_id:attemptId,p_user_id:user.id,p_actual_cost_usd:usage.usd,p_prompt_tokens:usage.prompt,
   p_audio_input_tokens:usage.audio,p_completion_tokens:usage.completion,p_result:cachedAssessment,
  });
  if(settled.error||settled.data!==true)throw new Error('assessment_budget_unavailable');
  return json(assessment);
 }catch(error){
  const held=await admin.rpc('mark_english_audio_assessment_unresolved_v1',{p_attempt_id:attemptId,p_user_id:user.id});
  if(held.error||held.data!==true)console.error('Audio assessment reservation reconciliation required',attemptId);
  const code=error instanceof Error&&error.message==='assessment_output_invalid'?'assessment_output_invalid':
   error instanceof Error&&error.message==='assessment_budget_unavailable'?'assessment_budget_unavailable':'assessment_provider_failed';
  return json({error:code},code==='assessment_provider_failed'?502:503);
 }
});

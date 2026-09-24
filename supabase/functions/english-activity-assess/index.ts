import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts';
import {createClient} from 'jsr:@supabase/supabase-js@2.116.0';
import {englishActivitySource} from '../_shared/english-activity-source.ts';
import {normalizedAssessmentKey,validateAnswerWav} from '../_shared/english-audio-assessment.ts';
import {activityAssessmentPrompt,parseActivityFeedback,type EnglishActivityKind} from '../../../src/learning/englishActivityAssessment.ts';

const PREVIEW='https://aazfyosqqeujureksqjs.supabase.co';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bytesToBase64=(bytes:Uint8Array)=>{let value='';for(let i=0;i<bytes.length;i+=32768)value+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(value);};
async function boundedBody(req:Request){
 const reader=req.body?.getReader();if(!reader)throw Error('invalid_request');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1_950_000){await reader.cancel();throw Error('input_too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 const body=new Uint8Array(size);let at=0;for(const chunk of chunks){body.set(chunk,at);at+=chunk.length;}return body;
}
function usageCost(usage:any,kind:EnglishActivityKind){
 const input=usage?.prompt_tokens,output=usage?.completion_tokens;
 if(!Number.isSafeInteger(input)||input<0||!Number.isSafeInteger(output)||output<0)throw Error('usage_unavailable');
 const detail=usage?.prompt_tokens_details?.audio_tokens;
 const audio=kind==='speaking'?(Number.isSafeInteger(detail)&&detail>=0&&detail<=input?detail:input):0;
 const usd=kind==='speaking'?(audio*32+(input-audio)*2.5+output*10)/1e6:(input*.4+output*1.6)/1e6;
 if(!Number.isFinite(usd)||usd>.5)throw Error('usage_unavailable');
 return {input,output,audio,usd:Math.max(.000001,Number(usd.toFixed(6)))};
}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(!['GET','POST'].includes(req.method))return json({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL')??'',anon=Deno.env.get('SUPABASE_ANON_KEY')??'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
 const authorization=req.headers.get('Authorization')??'';
 if(!/^Bearer\s+\S+$/.test(authorization)||!anon||!service)return json({error:'unauthorized'},401);
 if(url!==PREVIEW)return json({error:'assessment_preview_only'},403);
 const {data:{user},error:authError}=await createClient(url,anon,{global:{headers:{Authorization:authorization}}}).auth.getUser();
 if(authError||!user||user.is_anonymous)return json({error:'unauthorized'},401);
 const admin=createClient(url,service);
 const {data:profile,error:profileError}=await admin.from('profiles').select('learner_track').eq('id',user.id).maybeSingle();
 if(profileError||!profile)return json({error:'forbidden'},403);
 if(req.method==='GET'){
  const lessonId=new URL(req.url).searchParams.get('lesson_id')??'';
  try{englishActivitySource(lessonId,'speaking','0',profile.learner_track);}catch{return json({error:'forbidden'},403);}
  const rows=await admin.rpc('read_english_activity_results_v1',{p_user_id:user.id,p_lesson_id:lessonId});
  return rows.error?json({error:'assessment_unavailable'},503):json({results:rows.data??[]});
 }
 const providerKey=normalizedAssessmentKey(Deno.env.get('OPENAI_API_KEY'));
 if(!providerKey)return json({error:'assessment_unavailable'},503);
 const contentType=req.headers.get('content-type')??'';
 if(!/^multipart\/form-data;\s*boundary=/i.test(contentType))return json({error:'invalid_request'},400);
 let form:FormData;
 try{form=await new Request('https://local.invalid/',{method:'POST',headers:{'Content-Type':contentType},body:await boundedBody(req)}).formData();}catch{return json({error:'invalid_request'},400);}
 const kind=form.get('kind'),lessonId=form.get('lesson_id'),itemId=form.get('item_id'),attemptId=form.get('attempt_id');
 if((kind!=='practice'&&kind!=='speaking')||typeof lessonId!=='string'||!UUID.test(lessonId)||typeof itemId!=='string'||itemId.length>100||typeof attemptId!=='string'||!UUID.test(attemptId))return json({error:'invalid_request'},400);
 const field=kind==='practice'?'answer':'audio';
 if([...form.keys()].length!==5||!['kind','lesson_id','item_id','attempt_id',field].every(key=>form.has(key)))return json({error:'invalid_request'},400);
 let source;
 try{source=englishActivitySource(lessonId,kind,itemId,profile.learner_track);}catch{return json({error:'forbidden'},403);}
 let input:Uint8Array,answer='';
 const supplied=form.get(field);
 if(kind==='practice'){
  if(typeof supplied!=='string'||supplied.trim().length<3||supplied.length>6000)return json({error:'invalid_answer'},400);
  answer=supplied.trim();input=new TextEncoder().encode(answer);
 }else{
  if(!(supplied instanceof File))return json({error:'invalid_audio'},400);
  try{input=new Uint8Array(await supplied.arrayBuffer());if(validateAnswerWav(input).seconds>30)throw Error();}catch{return json({error:'invalid_audio'},400);}
 }
 const identity=new TextEncoder().encode(JSON.stringify({lessonId,itemId,kind,source}));
 const digestInput=new Uint8Array(identity.length+input.length);digestInput.set(identity);digestInput.set(input,identity.length);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',digestInput))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const claim=await admin.rpc('begin_english_activity_assessment_v1',{p_attempt_id:attemptId,p_user_id:user.id,p_lesson_id:lessonId,p_item_key:`${kind}:${itemId}`,p_input_sha256:fingerprint});
 if(claim.error)return json({error:'assessment_unavailable'},503);
 if(claim.data?.status==='completed')return json(claim.data.result);
 if(claim.data?.status!=='claimed')return json({error:`assessment_${claim.data?.status??'unavailable'}`},['budget_reached','global_budget_reached'].includes(claim.data?.status)?429:409);
 const model=kind==='practice'?'gpt-4.1-mini':'gpt-audio-1.5';
 try{
  const check=await fetch(`https://api.openai.com/v1/models/${model}`,{headers:{Authorization:`Bearer ${providerKey}`},redirect:'error',signal:AbortSignal.timeout(10000)});
  const ready=check.ok&&(await check.json()).id===model;if(!ready)throw Error();
 }catch{await admin.rpc('cancel_english_activity_assessment_reserved_v1',{p_attempt_id:attemptId,p_user_id:user.id});return json({error:'assessment_unavailable'},503);}
 const mark=await admin.rpc('mark_english_activity_assessment_submitted_v1',{p_attempt_id:attemptId,p_user_id:user.id});
 if(mark.error||mark.data!==true){await admin.rpc('cancel_english_activity_assessment_reserved_v1',{p_attempt_id:attemptId,p_user_id:user.id});return json({error:'assessment_unavailable'},503);}
 try{
  const prompt=activityAssessmentPrompt(kind,source.question,source.reference,source.context);
  const content=kind==='practice'?JSON.stringify({learner_answer:answer}):[{type:'input_audio',input_audio:{data:bytesToBase64(input),format:'wav'}}];
  const provider=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',redirect:'error',signal:AbortSignal.timeout(100000),headers:{Authorization:`Bearer ${providerKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,max_completion_tokens:1300,...(kind==='speaking'?{modalities:['text']}:{response_format:{type:'json_object'}}),messages:[{role:'system',content:prompt},{role:'user',content}]})});
  if(!provider.ok){await provider.body?.cancel();throw Error('provider_failed');}
  const data=await provider.json(),raw=data?.choices?.[0]?.message?.content;
  if(typeof raw!=='string'||raw.length>16000)throw Error('assessment_output_invalid');
  const feedback=parseActivityFeedback(JSON.parse(raw),kind),usage=usageCost(data.usage,kind);
  const result={status:'completed',lesson_id:lessonId,item_id:itemId,attempt_id:attemptId,...feedback,estimated_cost_usd:usage.usd};
  const settled=await admin.rpc('settle_english_activity_assessment_v1',{p_attempt_id:attemptId,p_user_id:user.id,p_actual_cost_usd:usage.usd,p_prompt_tokens:usage.input,p_audio_input_tokens:usage.audio,p_completion_tokens:usage.output,p_result:result});
  if(settled.error||settled.data!==true)throw Error('settlement_failed');
  return json(result);
 }catch{
  await admin.rpc('mark_english_activity_assessment_unresolved_v1',{p_attempt_id:attemptId,p_user_id:user.id});
  return json({error:'assessment_unresolved'},503);
 }
});

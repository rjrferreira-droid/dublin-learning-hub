import {createHash} from 'node:crypto';
import {englishEpisodeSource} from './english-episode-source.ts';
import {composeMp3Cues,validateEpisodeSpeechMp3,type Mp3CuePart} from './mp3-cue-composer.ts';
import {parseReservationExposure} from './reservation-exposure.ts';
import {premiumAudioBudgetDecision} from './premium-audio-budget.ts';

type Source=ReturnType<typeof englishEpisodeSource>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256=/^[a-f0-9]{64}$/;
const exactKeys=(value:unknown,keys:readonly string[])=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const mediaHash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const admissionReasons=new Set(['audio_generation_in_progress','audio_reconciliation_required',
 'audio_cached','global_ai_budget_reached','premium_audio_budget_reached',
 'english_episode_activation_cap_reached','english_episode_generation_closed']);
const statusForAdmission=(reason:string)=>reason==='english_episode_generation_closed'?403:
 reason==='english_episode_activation_cap_reached'||reason==='global_ai_budget_reached'
 ||reason==='premium_audio_budget_reached'?429:409;

export async function serveEnglishEpisodeAction(input:{
 admin:any;body:any;userId:string;lessonId:string;source:Source;openaiKey:string|undefined;
 maxBytes:number;json:(body:unknown,status?:number)=>Response;
 audioReply:(path:string,payload:Record<string,unknown>)=>Promise<Response>;
 readMp3:(response:Response,minBytes?:number)=>Promise<Uint8Array>;
}):Promise<Response>{
 const {admin,body,userId,lessonId,source,openaiKey,maxBytes,json,audioReply,readMp3}=input;
 const speechPlan=source.cuePlan;
 const nextAfter=(cueIndex:number)=>speechPlan.find(cue=>cue.cueIndex>cueIndex)?.cueIndex??null;
 if(body.action==='review_english_episode_plan')
  return json({status:'plan',total:speechPlan.length,next_cue_index:speechPlan[0]?.cueIndex??null,
   source_fingerprint:source.sourceFingerprint,storage_path:source.storagePath,
   render_revision:source.renderRevision,job_id:source.jobId});
 if(body.action!=='generate_reviewed_english_cue'&&body.action!=='finalize_reviewed_english_episode')
  return json({error:'audio_not_generated'},404);

 const cueObserverArgs=(cue:(typeof speechPlan)[number])=>({p_user_id:userId,p_lesson_id:lessonId,
  p_source_fingerprint:source.sourceFingerprint,p_cue_index:cue.cueIndex,
  p_cue_fingerprint:cue.cueFingerprint,p_storage_path:cue.cuePath,p_lesson_identity:source.identity});
 const cueHit=(data:unknown,cue:(typeof speechPlan)[number],attemptId?:string)=>
  exactKeys(data,['status','attemptId','storagePath','mediaSha256'])
  &&(data as any).status==='hit'&&(data as any).storagePath===cue.cuePath
  &&typeof (data as any).attemptId==='string'&&uuid.test((data as any).attemptId)
  &&typeof (data as any).mediaSha256==='string'&&sha256.test((data as any).mediaSha256)
  &&(!attemptId||(data as any).attemptId===attemptId);
 const observeCue=async(cue:(typeof speechPlan)[number])=>admin.rpc('observe_english_episode_cue_v1',cueObserverArgs(cue));
 const revalidateSource=async()=>{
  const [profileCheck,lessonCheck]=await Promise.all([
   admin.from('profiles').select('learner_track').eq('id',userId).maybeSingle(),
   admin.from('lessons').select('id,module_id,slug,is_published,content_version,sequence')
    .eq('id',lessonId).eq('is_published',true).maybeSingle(),
  ]);
  if(profileCheck.error||lessonCheck.error||!profileCheck.data||!lessonCheck.data)throw Error('audio_source_recheck_failed');
  const moduleCheck=await admin.from('modules').select('id,course_id,is_published')
   .eq('id',lessonCheck.data.module_id).eq('is_published',true).maybeSingle();
  if(moduleCheck.error||!moduleCheck.data)throw Error('audio_source_recheck_failed');
  const courseCheck=await admin.from('courses').select('id,learner_track,is_active')
   .eq('id',moduleCheck.data.course_id).eq('is_active',true).maybeSingle();
  if(courseCheck.error||!courseCheck.data||lessonCheck.data.id!==lessonId
   ||lessonCheck.data.module_id!==moduleCheck.data.id||moduleCheck.data.course_id!==courseCheck.data.id)
   throw Error('audio_source_recheck_failed');
  let latest:Source;
  try{latest=englishEpisodeSource({lessonId,lessonSlug:lessonCheck.data.slug,
   sequence:Number(lessonCheck.data.sequence),contentVersion:lessonCheck.data.content_version,
   moduleId:moduleCheck.data.id,courseId:courseCheck.data.id,
   profileTrack:profileCheck.data.learner_track,courseTrack:courseCheck.data.learner_track});}
  catch{throw Error('audio_source_changed');}
  if(latest.sourceFingerprint!==source.sourceFingerprint||latest.storagePath!==source.storagePath
   ||JSON.stringify(latest.cuePlan)!==JSON.stringify(source.cuePlan))throw Error('audio_source_changed');
 };
 const storage=admin.storage.from('lesson-audio');
 const existingObject=async(path:string)=>{
  const slash=path.lastIndexOf('/');
  const listed=await storage.list(path.slice(0,slash),{limit:20,search:path.slice(slash+1)});
  if(listed.error||!Array.isArray(listed.data))throw Error('audio_cache_unavailable');
  return listed.data.some((object:any)=>object?.name===path.slice(slash+1));
 };
 const assertUpload=async(path:string,bytes:Uint8Array)=>{
  const uploaded=await storage.upload(path,bytes,{contentType:'audio/mpeg',upsert:false,cacheControl:'31536000'});
  if(uploaded.error)throw Error('audio_upload_failed');
  if(!uploaded.data||typeof uploaded.data!=='object'||Array.isArray(uploaded.data)
   ||typeof uploaded.data.id!=='string'||!uuid.test(uploaded.data.id)
   ||uploaded.data.path!==path||uploaded.data.fullPath!==`lesson-audio/${path}`)
   throw Error('audio_upload_ack_invalid');
 };
 const downloadChecked=async(path:string,digest:string)=>{
  const result=await storage.download(path);
  if(result.error||!result.data||typeof result.data.arrayBuffer!=='function')throw Error('audio_cache_unavailable');
  const bytes=new Uint8Array(await result.data.arrayBuffer());
  if(mediaHash(bytes)!==digest)throw Error('audio_reconciliation_required');
  validateEpisodeSpeechMp3(bytes);
  return bytes;
 };

 if(body.action==='finalize_reviewed_english_episode'){
  try{
   await revalidateSource();
   const rendered=new Array<Uint8Array|undefined>(source.renderCues.length);
   for(const cue of speechPlan){
    const observed=await observeCue(cue);
    if(observed.error||!cueHit(observed.data,cue))throw Error('english_episode_cues_incomplete');
    rendered[cue.cueIndex]=await downloadChecked(cue.cuePath,(observed.data as any).mediaSha256);
   }
   const parts:Mp3CuePart[]=source.renderCues.map((cue,index)=>cue.kind==='silence'
    ?{kind:'silence',durationMs:cue.durationMs}:{kind:'speech',bytes:rendered[index]!});
   const complete=composeMp3Cues(parts,maxBytes),digest=mediaHash(complete);
   if(await existingObject(source.storagePath)){
    const existing=await storage.download(source.storagePath);
    if(existing.error||!existing.data||typeof existing.data.arrayBuffer!=='function')throw Error('audio_reconciliation_required');
    if(mediaHash(new Uint8Array(await existing.data.arrayBuffer()))!==digest)throw Error('audio_reconciliation_required');
   }else await assertUpload(source.storagePath,complete);
   const receipt=await admin.rpc('finalize_english_episode_v1',{p_user_id:userId,p_lesson_id:lessonId,
    p_source_fingerprint:source.sourceFingerprint,p_storage_path:source.storagePath,
    p_lesson_identity:source.identity,p_transcript:source.transcript,p_media_sha256:digest});
   if(receipt.error||!exactKeys(receipt.data,['settled','state','receiptRequestId'])
    ||(receipt.data as any).settled!==true||(receipt.data as any).state!=='settled'
    ||(receipt.data as any).receiptRequestId!==`english-episode-v1:${source.jobId}`)
    throw Error('audio_reconciliation_required');
   const verified=await admin.rpc('observe_english_episode_cache_v1',{
    p_user_id:userId,p_lesson_id:lessonId,p_content_version:source.identity.contentVersion,
    p_source_fingerprint:source.sourceFingerprint,p_render_revision:source.renderRevision,
    p_storage_path:source.storagePath,p_lesson_identity:source.identity});
   if(verified.error||!exactKeys(verified.data,['status','attemptId','storagePath'])
    ||(verified.data as any).status!=='hit'||(verified.data as any).attemptId!==source.jobId
    ||(verified.data as any).storagePath!==source.storagePath)throw Error('audio_reconciliation_required');
   return audioReply(source.storagePath,{status:'finalized',cached:false,voice:'multi-voice-v1',
    source_fingerprint:source.sourceFingerprint,render_revision:source.renderRevision});
  }catch(cause){
   const code=cause instanceof Error?cause.message:'english_episode_finalize_unavailable';
   const known=['audio_source_changed','audio_source_recheck_failed','audio_cache_unavailable',
    'audio_reconciliation_required','english_episode_cues_incomplete','audio_upload_failed','audio_upload_ack_invalid'];
   return json({error:known.includes(code)?code:'english_episode_finalize_unavailable'},
    code==='audio_reconciliation_required'||code==='audio_source_changed'?409:503);
  }
 }

 const cueIndex=body.cue_index;
 const cuePlan=Number.isSafeInteger(cueIndex)?speechPlan.find(cue=>cue.cueIndex===cueIndex):undefined;
 if(!cuePlan)return json({error:'english_episode_cue_invalid'},400);
 const cue=source.renderCues[cuePlan.cueIndex];
 if(cue.kind!=='speech')return json({error:'english_episode_cue_invalid'},400);
 const generationGate=await admin.rpc('english_episode_generation_allowed_v1',{p_user_id:userId});
 if(generationGate.error||generationGate.data!==true){
  // A closed cost gate still permits a read of an already-settled cue. This
  // lets the operator reach the zero-cost final assembly without reopening
  // paid generation or changing the one-call-per-cue admission rule.
  const cached=await observeCue(cuePlan);
  if(!cached.error&&cueHit(cached.data,cuePlan))
   return json({status:'cue_complete',cue_index:cueIndex,total:speechPlan.length,
    next_cue_index:nextAfter(cueIndex),cached:true});
  return json({error:'english_episode_generation_closed'},403);
 }
 const job=await admin.rpc('start_english_episode_job_v1',{p_job_id:source.jobId,p_user_id:userId,
  p_lesson_id:lessonId,p_content_version:source.identity.contentVersion,
  p_source_fingerprint:source.sourceFingerprint,p_render_revision:source.renderRevision,
  p_storage_path:source.storagePath,p_lesson_identity:source.identity,
  p_transcript:source.transcript,p_cue_plan:speechPlan});
 if(!job.error&&(job.data as any)?.allowed===false
  &&(job.data as any)?.reason==='english_episode_generation_closed')
  return json({error:'english_episode_generation_closed'},403);
 if(job.error||!exactKeys(job.data,['allowed','state','jobId'])
  ||(job.data as any).allowed!==true||(job.data as any).state!=='staging'
  ||(job.data as any).jobId!==source.jobId)return json({error:'english_episode_job_unavailable'},503);
 const observed=await observeCue(cuePlan);
 if(observed.error)return json({error:'audio_cache_unavailable'},503);
 if((observed.data as any)?.status==='hit'){
  if(!cueHit(observed.data,cuePlan))return json({error:'audio_reconciliation_required'},409);
  return json({status:'cue_complete',cue_index:cueIndex,total:speechPlan.length,
   next_cue_index:nextAfter(cueIndex),cached:true});
 }
 if(!exactKeys(observed.data,['status'])||(observed.data as any).status!=='miss')
  return json({error:(observed.data as any)?.status==='in_progress'?'audio_generation_in_progress':'audio_reconciliation_required'},409);
 if(!openaiKey)return json({error:'openai_not_configured'},503);

 // A separate capped reservation and receipt belongs to this one provider
 // call. A timeout can hold one cue uncertain without losing completed cues.
 const words=cue.text.split(/\s+/).filter(Boolean).length;
 const estimatedCost=Number(Math.max(0.001,words/125*0.015*1.30,cuePlan.characters*0.000025).toFixed(6));
 const reservationUsd=Number(Math.max(0.10,estimatedCost*3,cuePlan.characters*0.00010).toFixed(6));
 const now=new Date(),monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
 const [budgetResult,usageResult,professorResult]=await Promise.all([
  admin.from('learning_hub_budget_settings').select('ai_hard_cap_usd,premium_audio_cap_usd').eq('id',1).maybeSingle(),
  admin.from('ai_usage_log').select('feature,estimated_cost_usd').gte('created_at',monthStart),
  admin.rpc('professor_reservation_exposure_v2'),
 ]);
 if(budgetResult.error||!budgetResult.data||usageResult.error||!Array.isArray(usageResult.data)||professorResult.error)
  return json({error:'v2_budget_guard_unavailable'},503);
 let decision;
 try{decision=premiumAudioBudgetDecision({usageRows:usageResult.data,
  exposure:parseReservationExposure(professorResult.data,monthStart.slice(0,10)),
  aiHardCapUsd:budgetResult.data.ai_hard_cap_usd,premiumAudioCapUsd:budgetResult.data.premium_audio_cap_usd,
  reservationUsd});}
 catch{return json({error:'v2_budget_guard_unavailable'},503);}
 if(!decision.allowed)return json({error:decision.reason},429);

 const attemptId=crypto.randomUUID();
 const claimArgs={p_attempt_id:attemptId,p_source_fingerprint:source.sourceFingerprint,
  p_cue_index:cueIndex,p_cue_fingerprint:cuePlan.cueFingerprint,p_storage_path:cuePlan.cuePath};
 let admitted=false,settled=false,admissionUncertain=false;
 try{
  admissionUncertain=true;
  const begin=await admin.rpc('begin_english_episode_cue_v1',{...claimArgs,p_user_id:userId,
   p_lesson_id:lessonId,p_reservation_usd:reservationUsd,p_lesson_identity:source.identity});
  if(begin.error)throw Error('english_episode_admission_unavailable');
  if((begin.data as any)?.allowed===false){
   admissionUncertain=false;
   const reason=(begin.data as any)?.reason;
   throw Error(typeof reason==='string'&&admissionReasons.has(reason)?reason:'english_episode_admission_unavailable');
  }
  if(!exactKeys(begin.data,['allowed','attemptId','state','reservationUsd'])
   ||(begin.data as any).allowed!==true||(begin.data as any).attemptId!==attemptId
   ||(begin.data as any).state!=='reserved'||Number((begin.data as any).reservationUsd)!==reservationUsd)
   throw Error('english_episode_admission_invalid');
  admitted=true;admissionUncertain=false;
  await revalidateSource();
  if(await existingObject(cuePlan.cuePath))throw Error('audio_reconciliation_required');
  const submitted=await admin.rpc('mark_english_episode_cue_submitted_v1',claimArgs);
  if(submitted.error||!exactKeys(submitted.data,['allowed','state'])
   ||(submitted.data as any).allowed!==true||(submitted.data as any).state!=='submitted')
   throw Error('audio_submission_unconfirmed');
  let bytes:Uint8Array;
  let phase='transport',status:number|null=null;
  try{
   const response=await fetch(source.recipe.endpoint,{method:'POST',signal:AbortSignal.timeout(90000),
    headers:{Authorization:`Bearer ${openaiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:source.recipe.model,voice:cue.voice,input:cue.text,
     instructions:source.recipe.instructions,response_format:source.recipe.responseFormat,speed:source.recipe.speed})});
   status=response.status;phase='http';
   if(!response.ok){await response.body?.cancel().catch(()=>undefined);throw Error('tts_failed');}
   phase='media_type';
   const mediaType=(response.headers.get('content-type')??'').split(';',1)[0].trim().toLowerCase();
   if(mediaType!=='audio/mpeg'&&mediaType!=='audio/mp3'){
    await response.body?.cancel().catch(()=>undefined);throw Error('tts_failed');
   }
   phase='media_validation';bytes=await readMp3(response,512);validateEpisodeSpeechMp3(bytes);
  }catch{
   console.error(JSON.stringify({event:'english_episode_provider_failure',attemptId,phase,httpStatus:status}));
   throw Error('tts_failed');
  }
  await assertUpload(cuePlan.cuePath,bytes);
  const receipt=await admin.rpc('settle_english_episode_cue_v1',{...claimArgs,
   p_estimated_cost_usd:estimatedCost,p_characters:cuePlan.characters,p_media_sha256:mediaHash(bytes)});
  if(receipt.error||!exactKeys(receipt.data,['settled','state','receiptRequestId'])
   ||(receipt.data as any).settled!==true||(receipt.data as any).state!=='settled'
   ||(receipt.data as any).receiptRequestId!==`english-episode-cue-v1:${attemptId}`)
   throw Error('audio_receipt_unconfirmed');
  settled=true;
  const verified=await observeCue(cuePlan);
  if(verified.error||!cueHit(verified.data,cuePlan,attemptId))throw Error('audio_reconciliation_required');
  return json({status:'cue_complete',cue_index:cueIndex,total:speechPlan.length,
   next_cue_index:nextAfter(cueIndex),cached:false,
   estimated_cost_usd:estimatedCost,cost_basis:'application_estimate_not_provider_invoice'});
 }catch(cause){
  const code=cause instanceof Error?cause.message:'english_episode_attempt_unavailable';
  const known=['audio_generation_in_progress','audio_source_changed','audio_source_recheck_failed',
   'audio_cache_unavailable','audio_reconciliation_required','audio_submission_unconfirmed',
   'audio_upload_failed','audio_upload_ack_invalid','audio_receipt_unconfirmed','tts_failed',
   'english_episode_admission_unavailable','english_episode_admission_invalid',
   ...admissionReasons];
  return json({error:known.includes(code)?code:'english_episode_attempt_unavailable'},
   admissionReasons.has(code)?statusForAdmission(code):
   code==='audio_source_changed'?409:503);
 }finally{
  if(!settled&&(admitted||admissionUncertain)){
   try{await admin.rpc('close_english_episode_cue_attempt_v1',claimArgs);}catch{/* Unknown provider outcome retains its hold. */}
  }
 }
}

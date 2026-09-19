import {runPremiumAudioAttempt,runPremiumAudioAttemptV3} from '../_shared/premium-audio-attempt-flow.ts';
import "jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.116.0";
import {parseReservationExposure} from '../_shared/reservation-exposure.ts';
import {premiumAudioBudgetDecision} from '../_shared/premium-audio-budget.ts';

import {p1AudioIdentity,p1PremiumAudioGate} from '../_shared/p1-premium-audio-gate.ts';
import {p1SlugFor} from '../../../src/learning/p1RuntimeRegistry.ts';
import {p1ModuleFor} from '../../../src/learning/p1RuntimeModulesData.ts';
import {resolveP1ProfessorHandoff} from '../../../server/p1-professor-handoff.ts';
import {buildWrittenAudioPreviewSource} from '../../../quality/candidates/written-audio-preview.ts';
import {createPremiumAudioSourceContract,resolvePremiumAudioRenderRecipe} from '../../../quality/candidates/premium-audio-source-contract.ts';

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
// Match the reviewed lesson-audio bucket limit so paid output is rejected
// before an upload that Storage is guaranteed to refuse.
const MAX_PREMIUM_AUDIO_BYTES=15_728_640;
const MIN_PREMIUM_AUDIO_BYTES=4_096;
const isExactPrivatePremiumAudioBucket=(value:unknown)=>{
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const bucket=value as Record<string,unknown>;
  return bucket.id==='lesson-audio'&&bucket.name==='lesson-audio'&&bucket.public===false
    &&bucket.file_size_limit===MAX_PREMIUM_AUDIO_BYTES
    &&Array.isArray(bucket.allowed_mime_types)&&bucket.allowed_mime_types.length===1
    &&bucket.allowed_mime_types[0]==='audio/mpeg';
};
const hasMpegFrameHeader=(bytes:Uint8Array,offset:number)=>offset>=0&&offset+3<bytes.length
  &&bytes[offset]===0xff&&(bytes[offset+1]&0xe0)===0xe0
  // Reserved MPEG version/layer, free/bad bitrate and reserved sample rate are
  // not valid evidence that a provider response is an MP3 frame.
  &&(bytes[offset+1]&0x18)!==0x08&&(bytes[offset+1]&0x06)!==0
  &&(bytes[offset+2]&0xf0)!==0&&(bytes[offset+2]&0xf0)!==0xf0
  &&(bytes[offset+2]&0x0c)!==0x0c;
const hasPlausibleMp3Frames=(bytes:Uint8Array)=>{
  if(bytes.length<MIN_PREMIUM_AUDIO_BYTES)return false;
  let first=0;
  if(bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33){
    if(bytes.length<10||bytes[3]<2||bytes[3]>4||[6,7,8,9].some(index=>(bytes[index]&0x80)!==0))return false;
    const tagSize=(bytes[6]<<21)|(bytes[7]<<14)|(bytes[8]<<7)|bytes[9];
    first=10+tagSize+((bytes[5]&0x10)!==0?10:0);
  }
  if(!hasMpegFrameHeader(bytes,first))return false;
  // A second frame header makes a truncated ID3 tag or isolated magic bytes
  // insufficient to create a permanent cache entry. Exact decoding remains the
  // media client's job; this is the server-side admission boundary.
  const scanEnd=Math.min(bytes.length-4,first+4_096);
  for(let offset=first+24;offset<=scanEnd;offset++)if(hasMpegFrameHeader(bytes,offset))return true;
  return false;
};
const readBoundedPremiumMp3=async(response:Response)=>{
  const declared=response.headers.get('content-length');
  if(declared!==null&&(!/^[0-9]+$/.test(declared)||!Number.isSafeInteger(Number(declared))||Number(declared)>MAX_PREMIUM_AUDIO_BYTES)){
    await response.body?.cancel().catch(()=>undefined);throw new Error('tts_failed');
  }
  if(!response.body)throw new Error('tts_failed');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      if(!value)continue;
      total+=value.byteLength;
      if(total>MAX_PREMIUM_AUDIO_BYTES){await reader.cancel().catch(()=>undefined);throw new Error('tts_failed');}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  if(!hasPlausibleMp3Frames(bytes))throw new Error('tts_failed');
  return bytes;
};

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);

  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey=Deno.env.get("OPENAI_API_KEY");
  const audioRuntimeStage=Deno.env.get('P1_AUDIO_RUNTIME_STAGE');
  const authHeader=req.headers.get("Authorization")??"";
  const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}}});
  const {data:{user}}=await userClient.auth.getUser();
  if(!user)return json({error:"unauthorized"},401);

  let body:any;try{body=await req.json();}catch{return json({error:"invalid_json"},400)}
  const lessonId=String(body.lesson_id??"");
  if(!lessonId)return json({error:"lesson_id_required"},400);
  const admin=createClient(supabaseUrl,serviceKey);
  // Authored v3 must never generate or sign while the bucket still has public
  // object delivery. This supported Admin API check is fresh on every request
  // and happens before cache, budget, reservation or provider work.
  if(audioRuntimeStage==='isolated-preview-authored-v3'){
    try{
      const bucket=await admin.storage.getBucket('lesson-audio');
      if(bucket.error||!isExactPrivatePremiumAudioBucket(bucket.data))
        return json({error:'audio_v3_storage_not_private'},503);
    }catch{return json({error:'audio_v3_storage_not_private'},503);}
  }
  const audioReply=async(path:string,payload:Record<string,unknown>)=>{
    if(audioRuntimeStage==='isolated-preview-atomic-v2'||audioRuntimeStage==='isolated-preview-authored-v3'){
      try{
        const expiresAt=Date.now()+3600_000;
        const {data,error}=await admin.storage.from('lesson-audio').createSignedUrl(path,3600);
        if(error||!data?.signedUrl)return json({error:'audio_url_unavailable'},503);
        return json({...payload,audio_url:data.signedUrl,expires_at:expiresAt});
      }catch{return json({error:'audio_url_unavailable'},503);}
    }
    const {data}=admin.storage.from('lesson-audio').getPublicUrl(path);
    return json({...payload,audio_url:data.publicUrl});
  };
  const recordUsageReceipt=async(requestId:string,costUsd:number,characters:number,userId:string|null)=>{
    if(requestId.startsWith('premium-audio-v2:')){
      const {data,error}=await admin.rpc('settle_premium_audio_attempt_v2',{p_attempt_id:requestId.slice('premium-audio-v2:'.length),p_estimated_cost_usd:costUsd,p_characters:characters});
      return !error&&data===true;
    }
    if(!requestId||!Number.isFinite(costUsd)||costUsd<0||!Number.isSafeInteger(characters)||characters<0)return false;
    const {error}=await admin.from("ai_usage_log").upsert({user_id:userId,feature:"lesson_audio",model:"gpt-4o-mini-tts",characters,estimated_cost_usd:Number(costUsd.toFixed(6)),request_id:requestId},{onConflict:"feature,request_id",ignoreDuplicates:true});
    return !error;
  };

  const {data:profile}=await admin.from("profiles").select("learner_track").eq("id",user.id).single();
  const lessonSelection=audioRuntimeStage==='isolated-preview-authored-v3'
    ?'id,module_id,slug,is_published,title,content_version,sequence'
    :'id,module_id,slug,is_published,title,manager_commentary_pt,technical_brief_pt,content_version';
  const {data:lesson}=await admin.from("lessons").select(lessonSelection).eq("id",lessonId).eq("is_published",true).single();
  if(!profile||!lesson||lesson.id!==lessonId||lesson.is_published!==true)return json({error:"lesson_not_found"},404);
  const {data:mod}=await admin.from("modules").select("id,course_id,is_published").eq("id",lesson.module_id).eq("is_published",true).single();
  const {data:course}=mod?await admin.from("courses").select("id,learner_track,is_active").eq("id",mod.course_id).eq("is_active",true).single():{data:null};
  if(!course||mod?.id!==lesson.module_id||mod?.is_published!==true||course.id!==mod.course_id||course.is_active!==true)return json({error:"forbidden"},403);
  const isP1=[p1SlugFor('finance'),p1SlugFor('payroll'),p1SlugFor('english')].includes(lesson.slug);
  const p1Input={profileTrack:profile.learner_track,requestedTrack:course.learner_track,requestedLessonId:lessonId,resolvedLesson:{id:lesson.id,slug:lesson.slug,learnerTrack:course.learner_track,isPublished:lesson.is_published,contentVersion:lesson.content_version}};
  if(isP1){
    // Deliberately unset in the real backend. Requires a separately reviewed isolated backend deployment.
    if(audioRuntimeStage!=='isolated-preview-atomic-v2'&&audioRuntimeStage!=='isolated-preview-authored-v3')return json({error:'p1_audio_runtime_unavailable'},403);
    try{p1AudioIdentity(p1Input);}catch{return json({error:'forbidden'},403);}
  }else{
    const goldenIds:Record<string,string>={rafael_finance:'b3639582-3c32-4147-a4b3-84237d11a66e',viviane_payroll:'6ffda415-3b18-46ab-afaa-414f81a7eb31'};
    if(course.learner_track!==profile.learner_track||goldenIds[course.learner_track]!==lessonId)return json({error:"forbidden"},403);
  }

  if(isP1&&audioRuntimeStage==='isolated-preview-authored-v3'){
    const exactKeys=(value:unknown,keys:readonly string[])=>value!==null&&typeof value==='object'&&!Array.isArray(value)
      &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
    const exactCacheHit=(value:unknown,path:string,expectedAttemptId?:string)=>{
      if(!exactKeys(value,['status','attemptId','storagePath']))return false;
      const hit=value as Record<string,unknown>;
      return hit.status==='hit'&&hit.storagePath===path&&typeof hit.attemptId==='string'
        &&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hit.attemptId)
        &&(expectedAttemptId===undefined||hit.attemptId===expectedAttemptId);
    };
    const sourceDriftError=(value:unknown)=>value!==null&&typeof value==='object'
      &&Object.hasOwn(value,'message')&&(value as {message?:unknown}).message==='audio_source_changed';
    const sameIdentity=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
    const deriveAuthoredSource=(resolvedProfile:any,resolvedLesson:any,resolvedModule:any,resolvedCourse:any)=>{
      if(resolvedLesson?.sequence!==2||resolvedLesson?.module_id!==resolvedModule?.id||resolvedModule?.is_published!==true
        ||resolvedModule?.course_id!==resolvedCourse?.id||resolvedCourse?.is_active!==true)throw new Error('audio_source_changed');
      const handoff=resolveP1ProfessorHandoff({profileTrack:resolvedProfile?.learner_track,requestedTrack:resolvedCourse?.learner_track,
        requestedLessonId:lessonId,resolvedLesson:{id:resolvedLesson?.id,slug:resolvedLesson?.slug,
          learnerTrack:resolvedCourse?.learner_track,isPublished:resolvedLesson?.is_published}});
      const authored=p1ModuleFor(handoff.studyTrack,{id:resolvedLesson.id,slug:resolvedLesson.slug});
      if(!authored)throw new Error('audio_source_changed');
      const identity={lessonId:resolvedLesson.id,moduleId:resolvedModule?.id,courseId:resolvedCourse?.id,
        lessonSlug:resolvedLesson.slug,contentVersion:resolvedLesson.content_version,requestedTrack:resolvedCourse.learner_track,
        studyTrack:handoff.studyTrack,sequence:resolvedLesson.sequence};
      const source=buildWrittenAudioPreviewSource({identity,referenceSha256:handoff.teachingContent.sha256,
        title:authored.title,authoredSections:authored.sections});
      const contract=createPremiumAudioSourceContract({identity:source.identity,sourceFingerprint:source.sourceFingerprint});
      const recipe=resolvePremiumAudioRenderRecipe(source.language);
      if(recipe.profile!==contract.renderProfile||recipe.revision!==contract.renderRevision||recipe.provider!=='openai')
        throw new Error('audio_source_changed');
      return {source,contract,recipe};
    };
    let initial;
    try{initial=deriveAuthoredSource(profile,lesson,mod,course);}catch{return json({error:'audio_source_changed'},409);}
    const {source,contract,recipe}=initial;
    const observeArgs={p_user_id:user.id,p_lesson_id:lessonId,p_content_version:contract.identity.contentVersion,
      p_source_fingerprint:contract.sourceFingerprint,p_render_revision:contract.renderRevision,p_storage_path:contract.storagePath,
      p_lesson_identity:contract.identity};
    const observed=await admin.rpc('observe_premium_audio_cache_v3',observeArgs);
    if(observed.error)return sourceDriftError(observed.error)
      ?json({error:'audio_reconciliation_required'},409):json({error:'audio_v3_admission_closed'},503);
    const observation=observed.data as Record<string,unknown>|null;
    if(observation?.status==='hit'){
      if(!exactCacheHit(observation,contract.storagePath))
        return json({error:'audio_reconciliation_required'},409);
      return audioReply(contract.storagePath,{cached:true,voice:recipe.request.voice,source_fingerprint:contract.sourceFingerprint,
        render_revision:contract.renderRevision,purpose:source.purpose});
    }
    if(observation?.status==='in_progress'&&exactKeys(observation,['status']))return json({error:'audio_generation_in_progress'},409);
    if(observation?.status==='reconciliation_required'&&exactKeys(observation,['status']))return json({error:'audio_reconciliation_required'},409);
    if(observation?.status!=='miss'||!exactKeys(observation,['status']))return json({error:'audio_reconciliation_required'},409);

    const words=source.script.split(/\s+/).filter(Boolean).length;
    const estimatedMinutes=Math.max(0.35,words/145);
    // Canonicalize once to the durable receipt scale. The attempt, asset and
    // numeric(12,6) usage receipt must compare exactly after paid work.
    const estimatedCost=Number(Math.max(0.01,estimatedMinutes*0.015*1.30).toFixed(6));
    const conservativeReservationUsd=Number(Math.max(0.10,estimatedCost*2).toFixed(6));
    const now=new Date(),monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
    const monthStartDay=monthStart.slice(0,10);
    const [budgetResult,usageResult,professorResult]=await Promise.all([
      admin.from('learning_hub_budget_settings').select('ai_hard_cap_usd,premium_audio_cap_usd').eq('id',1).maybeSingle(),
      admin.from('ai_usage_log').select('feature,estimated_cost_usd').gte('created_at',monthStart),
      admin.rpc('professor_reservation_exposure_v2'),
    ]);
    if(budgetResult.error||!budgetResult.data||usageResult.error||!Array.isArray(usageResult.data)||professorResult.error)
      return json({error:'v2_budget_guard_unavailable'},503);
    let exposure,decision;
    try{
      exposure=parseReservationExposure(professorResult.data,monthStartDay);
      decision=premiumAudioBudgetDecision({usageRows:usageResult.data,exposure,aiHardCapUsd:budgetResult.data.ai_hard_cap_usd,
        premiumAudioCapUsd:budgetResult.data.premium_audio_cap_usd,reservationUsd:conservativeReservationUsd});
    }catch{return json({error:'v2_budget_guard_unavailable'},503);}
    if(!decision.allowed)return json({error:decision.reason,
      committed_usd:decision.reason==='global_ai_budget_reached'?decision.globalCommittedUsd:decision.premiumBucketSpentUsd,
      reservation_usd:Number(conservativeReservationUsd.toFixed(6))},429);
    if(!openaiKey)return json({error:'openai_not_configured'},503);

    const attemptId=crypto.randomUUID();
    try{
      await runPremiumAudioAttemptV3(admin,{attemptId,userId:user.id,lessonId,contentVersion:contract.identity.contentVersion,
        reservationUsd:conservativeReservationUsd,estimatedCostUsd:estimatedCost,characters:source.characters,
        lessonIdentity:contract.identity,sourceFingerprint:contract.sourceFingerprint,
        renderRevision:contract.renderRevision,storagePath:contract.storagePath},{
        revalidateSource:async(identity)=>{
          if(identity.attemptId!==attemptId||identity.sourceFingerprint!==contract.sourceFingerprint
            ||identity.renderRevision!==contract.renderRevision||identity.storagePath!==contract.storagePath)
            throw new Error('audio_reconciliation_required');
          const [profileCheck,lessonCheck]=await Promise.all([
            admin.from('profiles').select('learner_track').eq('id',user.id).maybeSingle(),
            admin.from('lessons').select('id,module_id,slug,is_published,content_version,sequence').eq('id',lessonId).eq('is_published',true).maybeSingle(),
          ]);
          if(profileCheck.error||lessonCheck.error||!profileCheck.data||!lessonCheck.data)throw new Error('audio_source_recheck_failed');
          const moduleCheck=await admin.from('modules').select('id,course_id,is_published').eq('id',lessonCheck.data.module_id).eq('is_published',true).maybeSingle();
          if(moduleCheck.error||!moduleCheck.data)throw new Error('audio_source_recheck_failed');
          const courseCheck=await admin.from('courses').select('id,learner_track,is_active').eq('id',moduleCheck.data.course_id).eq('is_active',true).maybeSingle();
          if(courseCheck.error||!courseCheck.data)throw new Error('audio_source_recheck_failed');
          let latest;
          try{latest=deriveAuthoredSource(profileCheck.data,lessonCheck.data,moduleCheck.data,courseCheck.data);}catch{throw new Error('audio_source_changed');}
          if(latest.source.script!==source.script||latest.source.scriptSha256!==source.scriptSha256
            ||latest.source.referenceSha256!==source.referenceSha256||latest.source.sourceFingerprint!==source.sourceFingerprint
            ||latest.contract.storagePath!==contract.storagePath||latest.recipe!==recipe||!sameIdentity(latest.contract.identity,contract.identity))
            throw new Error('audio_source_changed');
          const existingAsset=await admin.from('audio_assets').select('id,storage_path,generation_request_id,estimated_cost_usd')
            .eq('lesson_id',lessonId).eq('audio_type','commentary').maybeSingle();
          if(existingAsset.error)throw new Error('audio_cache_unavailable');
          if(existingAsset.data)throw new Error('audio_reconciliation_required');
          // The candidate installs a global unique storage_path index. Detect a
          // legacy/cross-lesson claimant before the one-shot provider fence so an
          // insert conflict cannot be discovered only after paid work completes.
          const pathAsset=await admin.from('audio_assets').select('id,lesson_id,audio_type,storage_path,generation_request_id,estimated_cost_usd')
            .eq('storage_path',contract.storagePath).maybeSingle();
          if(pathAsset.error)throw new Error('audio_cache_unavailable');
          if(pathAsset.data)throw new Error('audio_reconciliation_required');
          const slash=contract.storagePath.lastIndexOf('/'),folder=contract.storagePath.slice(0,slash),fileName=contract.storagePath.slice(slash+1);
          const objects=await admin.storage.from('lesson-audio').list(folder,{limit:20,search:fileName});
          if(objects.error||!Array.isArray(objects.data))throw new Error('audio_cache_unavailable');
          if(objects.data.some((object:any)=>object?.name===fileName))throw new Error('audio_reconciliation_required');
        },
        generate:async(identity)=>{
          if(identity.attemptId!==attemptId||identity.sourceFingerprint!==contract.sourceFingerprint
            ||identity.renderRevision!==contract.renderRevision||identity.storagePath!==contract.storagePath)
            throw new Error('audio_reconciliation_required');
          try{
            const response=await fetch(recipe.endpoint,{method:'POST',signal:AbortSignal.timeout(90000),
              headers:{Authorization:`Bearer ${openaiKey}`,'Content-Type':'application/json'},
              body:JSON.stringify({...recipe.request,input:source.script})});
            if(!response.ok){await response.body?.cancel().catch(()=>undefined);throw new Error('tts_failed');}
            const contentType=(response.headers.get('content-type')??'').split(';',1)[0].trim().toLowerCase();
            if(contentType!=='audio/mpeg'&&contentType!=='audio/mp3'){
              await response.body?.cancel().catch(()=>undefined);throw new Error('tts_failed');
            }
            return await readBoundedPremiumMp3(response);
          }catch(cause){if(cause instanceof Error&&cause.message==='tts_failed')throw cause;throw new Error('tts_failed');}
        },
        store:async(bytes,identity)=>{
          const upload=await admin.storage.from('lesson-audio').upload(identity.storagePath,bytes,{contentType:'audio/mpeg',upsert:false,cacheControl:'31536000'});
          if(upload.error)throw new Error('audio_upload_failed');
          if(!upload.data||typeof upload.data!=='object'||Array.isArray(upload.data)
            ||typeof upload.data.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(upload.data.id)
            ||upload.data.path!==identity.storagePath||upload.data.fullPath!==`lesson-audio/${identity.storagePath}`)
            throw new Error('audio_upload_ack_invalid');
          const asset={lesson_id:lessonId,audio_type:'commentary',storage_path:identity.storagePath,transcript_pt:source.script,voice:recipe.request.voice,
            generated_at:new Date().toISOString(),generation_request_id:`premium-audio-v3:${identity.attemptId}`,
            estimated_cost_usd:estimatedCost};
          const inserted=await admin.from('audio_assets').insert(asset);
          if(inserted.error)throw new Error('audio_asset_record_failed');
          return identity;
        },
      });
      // Settlement records the paid work even if authored identity changes during the provider call. Re-observe the
      // durable binding before signing so a stale or partially reconciled asset is never exposed or regenerated.
      const settledObservationResult=await admin.rpc('observe_premium_audio_cache_v3',observeArgs);
      if(settledObservationResult.error)return sourceDriftError(settledObservationResult.error)
        ?json({error:'audio_reconciliation_required'},409):json({error:'audio_v3_admission_closed'},503);
      if(!exactCacheHit(settledObservationResult.data,contract.storagePath,attemptId))
        return json({error:'audio_reconciliation_required'},409);
      return audioReply(contract.storagePath,{cached:false,voice:recipe.request.voice,estimated_cost_usd:estimatedCost,
        cost_basis:'application_estimate_not_provider_invoice',source_fingerprint:contract.sourceFingerprint,
        render_revision:contract.renderRevision,purpose:source.purpose});
    }catch(cause){
      const raw=cause instanceof Error?cause.message:'';
      if(raw==='audio_cached'){
        const raced=await admin.rpc('observe_premium_audio_cache_v3',observeArgs);
        if(raced.error)return sourceDriftError(raced.error)
          ?json({error:'audio_reconciliation_required'},409):json({error:'audio_v3_admission_closed'},503);
        const racedObservation=raced.data as Record<string,unknown>|null;
        if(exactCacheHit(racedObservation,contract.storagePath))
          return audioReply(contract.storagePath,{cached:true,voice:recipe.request.voice,source_fingerprint:contract.sourceFingerprint,
            render_revision:contract.renderRevision,purpose:source.purpose});
        if(racedObservation?.status==='in_progress'&&exactKeys(racedObservation,['status']))return json({error:'audio_generation_in_progress'},409);
        return json({error:'audio_reconciliation_required'},409);
      }
      const mapped=raw==='audio_admission_unavailable'?'audio_v3_admission_closed':raw==='audio_admission_invalid'?'audio_reconciliation_required':raw;
      const allowed=new Set(['global_ai_budget_reached','premium_audio_budget_reached','audio_generation_in_progress','audio_source_changed',
        'audio_source_recheck_failed','audio_cache_unavailable','audio_reconciliation_required','audio_submission_unconfirmed',
        'audio_receipt_unconfirmed','audio_asset_record_failed','audio_upload_failed','audio_upload_ack_invalid','tts_failed','audio_v3_admission_closed']);
      const code=allowed.has(mapped)?mapped:'audio_attempt_unavailable';
      return json({error:code},code.endsWith('budget_reached')?429:code==='audio_generation_in_progress'||code==='audio_source_changed'||code==='audio_reconciliation_required'?409:503);
    }
  }

  const version=Number(lesson.content_version??1);
  if(!Number.isSafeInteger(version)||version<1||version>100000)return json({error:'audio_source_changed'},409);
  const expectedPath=`lessons/${lessonId}/commentary-v${version}.mp3`;
  const folder=`lessons/${lessonId}`;
  const fileName=`commentary-v${version}.mp3`;
  const {data:existing}=await admin.from("audio_assets").select("id,storage_path,transcript_pt,voice,generated_at").eq("lesson_id",lessonId).eq("audio_type","commentary").eq("storage_path",expectedPath).maybeSingle();
  if(existing?.storage_path && existing.storage_path!==expectedPath)return json({error:"audio_source_changed"},409);
  if(existing?.storage_path){
    // New receipt columns are queried separately so cached playback remains backwards-compatible before the reviewed migration exists.
    const {data:receiptMeta}=await admin.from("audio_assets").select("generation_request_id,estimated_cost_usd,transcript_pt").eq("id",existing.id).maybeSingle();
    if(receiptMeta?.generation_request_id&&receiptMeta.estimated_cost_usd!=null){
      const cost=Number(receiptMeta.estimated_cost_usd);
      const chars=String(receiptMeta.transcript_pt??existing.transcript_pt??"").length;
      if(Number.isFinite(cost)&&cost>=0&&!await recordUsageReceipt(String(receiptMeta.generation_request_id),cost,chars,null))console.error("Premium Audio cached usage reconciliation deferred");
    }
    return audioReply(existing.storage_path,{cached:true,voice:existing.voice??"marin",generated_at:existing.generated_at});
  }

  // Authored-v3 activates only the exact P1 contract. Existing Golden audio may
  // still be served privately, but a cache miss must not reopen the revoked v2
  // admission RPCs or fall through to the legacy claim/provider path.
  if(!isP1&&audioRuntimeStage==='isolated-preview-authored-v3')
    return json({error:'audio_v3_admission_closed'},503);

  if(!openaiKey)return json({error:"openai_not_configured"},503);

  let script=String(lesson.manager_commentary_pt||lesson.technical_brief_pt||"").trim();
  if(!script)return json({error:"audio_script_missing"},404);
  if(script.length>4000)script=script.slice(0,4000).replace(/\s+\S*$/,"")+".";

  const words=script.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes=Math.max(0.35,words/145);
  const estimatedCost=Math.max(0.01,estimatedMinutes*0.015*1.30);
  const conservativeReservationUsd=Math.max(0.10,estimatedCost*2);

  const now=new Date();
  const monthStartDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const monthStart=monthStartDate.toISOString();
  const monthStartDay=monthStart.slice(0,10);
  const [budgetResult,usageResult,professorResult]=await Promise.all([
    admin.from("learning_hub_budget_settings").select("ai_hard_cap_usd,premium_audio_cap_usd").eq("id",1).maybeSingle(),
    admin.from("ai_usage_log").select("feature,estimated_cost_usd").gte("created_at",monthStart),
    admin.rpc("professor_reservation_exposure_v2"),
  ]);
  if(budgetResult.error||!budgetResult.data||usageResult.error||!Array.isArray(usageResult.data)||professorResult.error)
    return json({error:"v2_budget_guard_unavailable"},503);
  let exposure;
  try{exposure=parseReservationExposure(professorResult.data,monthStartDay);}catch{return json({error:"v2_budget_guard_unavailable"},503);}
  let decision;
  try{
    decision=premiumAudioBudgetDecision({usageRows:usageResult.data,exposure,aiHardCapUsd:budgetResult.data.ai_hard_cap_usd,premiumAudioCapUsd:budgetResult.data.premium_audio_cap_usd,reservationUsd:conservativeReservationUsd});
  }catch{return json({error:"v2_budget_guard_unavailable"},503);}
  if(!decision.allowed){
    return json({error:decision.reason,committed_usd:decision.reason==='global_ai_budget_reached'?decision.globalCommittedUsd:decision.premiumBucketSpentUsd,reservation_usd:Number(conservativeReservationUsd.toFixed(6))},429);
  }

  if(isP1){
    try{
      const gate=p1PremiumAudioGate({...p1Input,scriptWords:words,usageRows:usageResult.data,exposure,aiHardCapUsd:budgetResult.data.ai_hard_cap_usd,premiumAudioCapUsd:budgetResult.data.premium_audio_cap_usd});
      if(gate.action!=='claim-before-provider')return json({error:gate.action==='blocked'?gate.reason:'audio_source_changed'},409);
    }catch{return json({error:'v2_budget_guard_unavailable'},503);}
  }
  if(audioRuntimeStage==='isolated-preview-atomic-v2'||audioRuntimeStage==='isolated-preview-authored-v3'){
    const attemptId=crypto.randomUUID();
    let racedCache:any=null;
    try{
      await runPremiumAudioAttempt(admin,{attemptId,userId:user.id,lessonId,contentVersion:version,reservationUsd:conservativeReservationUsd,estimatedCostUsd:estimatedCost,characters:script.length},{
        prepare:async()=>{
          const {data:latest,error}=await admin.from('lessons').select('id,slug,module_id,is_published,content_version').eq('id',lessonId).eq('is_published',true).maybeSingle();
          if(error||!latest||latest.id!==lessonId||latest.slug!==lesson.slug||latest.module_id!==lesson.module_id||latest.is_published!==true||latest.content_version!==version)throw new Error('audio_source_changed');
          const {data:cache,error:cacheError}=await admin.from('audio_assets').select('id,storage_path,voice,generated_at').eq('lesson_id',lessonId).eq('audio_type','commentary').eq('storage_path',expectedPath).maybeSingle();
          if(cacheError)throw new Error('audio_cache_unavailable');
          if(cache?.storage_path){if(cache.storage_path!==expectedPath)throw new Error('audio_source_changed');racedCache=cache;throw new Error('audio_cached_during_admission');}
          const {data:objects,error:objectsError}=await admin.storage.from('lesson-audio').list(folder,{limit:20,search:fileName});
          if(objectsError)throw new Error('audio_cache_unavailable');
          // An object without its attempt/receipt metadata is not evidence of a zero-cost generation.
          if(objects?.some((object:any)=>object.name===fileName))throw new Error('audio_reconciliation_required');
        },
        generate:async()=>{
          const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${openaiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'marin',input:script,instructions:course.learner_track==='english_academy'?'Speak in clear natural English as a patient teacher.':'Speak in natural Brazilian Portuguese as a calm expert teacher. Keep technical English terms in English.',response_format:'mp3',speed:0.98})});
          if(!response.ok){await response.body?.cancel().catch(()=>undefined);throw new Error('tts_failed');}
          return new Uint8Array(await response.arrayBuffer());
        },
        store:async(bytes,identity)=>{
          const {error:uploadError}=await admin.storage.from('lesson-audio').upload(identity.storagePath,bytes,{contentType:'audio/mpeg',upsert:false,cacheControl:'31536000'});
          if(uploadError)throw new Error('audio_upload_failed');
          const {error:assetError}=await admin.from('audio_assets').upsert({lesson_id:lessonId,audio_type:'commentary',storage_path:identity.storagePath,transcript_pt:script,voice:'marin',generated_at:new Date().toISOString(),generation_request_id:`premium-audio-v2:${identity.attemptId}`,estimated_cost_usd:estimatedCost},{onConflict:'lesson_id,audio_type'});
          if(assetError)throw new Error('audio_asset_record_failed');
          return identity;
        },
      });
      return audioReply(expectedPath,{cached:false,voice:'marin',estimated_cost_usd:estimatedCost,cost_basis:'application_estimate_not_provider_invoice'});
    }catch(cause){
      if(racedCache)return audioReply(expectedPath,{cached:true,voice:racedCache.voice??'marin'});
      const raw=cause instanceof Error?cause.message:'';
      const allowed=new Set(['global_ai_budget_reached','premium_audio_budget_reached','audio_generation_in_progress','audio_source_changed','audio_cache_unavailable','audio_reconciliation_required','audio_receipt_unconfirmed','audio_asset_record_failed','audio_upload_failed','tts_failed']);
      const code=allowed.has(raw)?raw:'audio_attempt_unavailable';
      return json({error:code},code.endsWith('budget_reached')?429:code==='audio_generation_in_progress'||code==='audio_source_changed'||code==='audio_reconciliation_required'?409:503);
    }
  }
  const claimToken=crypto.randomUUID();
  const claimResult=await admin.rpc("claim_premium_audio_generation_v1",{p_lesson_id:lessonId,p_content_version:version,p_audio_type:"commentary",p_claim_token:claimToken,p_lease_seconds:180});
  if(claimResult.error)return json({error:"audio_generation_claim_unavailable"},503);
  if(claimResult.data!=="claimed")return json({error:"audio_generation_in_progress"},409);

  const releaseClaim=async()=>{
    const release=await admin.rpc("release_premium_audio_generation_v1",{p_lesson_id:lessonId,p_content_version:version,p_audio_type:"commentary",p_claim_token:claimToken});
    if(release.error)console.error("Premium Audio generation claim release failed");
  };

  try{
    const {data:existingAfterClaim,error:cacheReadError}=await admin.from("audio_assets").select("id,storage_path,voice,generated_at,generation_request_id,estimated_cost_usd,transcript_pt").eq("lesson_id",lessonId).eq("audio_type","commentary").eq("storage_path",expectedPath).maybeSingle();
    if(cacheReadError)return json({error:"audio_cache_unavailable"},503);
    if(existingAfterClaim?.storage_path && existingAfterClaim.storage_path!==expectedPath)return json({error:"audio_source_changed"},409);
    if(existingAfterClaim?.storage_path){
      if(existingAfterClaim.generation_request_id&&existingAfterClaim.estimated_cost_usd!=null){
        const cost=Number(existingAfterClaim.estimated_cost_usd),chars=String(existingAfterClaim.transcript_pt??script).length;
        if(Number.isFinite(cost)&&cost>=0&&!await recordUsageReceipt(String(existingAfterClaim.generation_request_id),cost,chars,null))console.error("Premium Audio claimed-cache usage reconciliation deferred");
      }
      const {data:pub}=admin.storage.from("lesson-audio").getPublicUrl(existingAfterClaim.storage_path);
      return json({audio_url:pub.publicUrl,cached:true,voice:existingAfterClaim.voice??"marin",generated_at:existingAfterClaim.generated_at});
    }

    // Recover an uploaded object whose metadata write failed previously, without paying for TTS again.
    const {data:storedObjects,error:storageListError}=await admin.storage.from("lesson-audio").list(folder,{limit:20,search:fileName});
    if(storageListError)return json({error:"audio_cache_unavailable"},503);
    const stored=storedObjects?.find((item:any)=>item?.name===fileName);
    if(stored){
      const prefix=`premium-audio:${lessonId}:v${version}:%`;
      const usageLookup=await admin.from("ai_usage_log").select("request_id,estimated_cost_usd").eq("feature","lesson_audio").like("request_id",prefix).order("created_at",{ascending:false}).limit(1).maybeSingle();
      let generationRequestId:string|null=null,recoveredCost:number|null=null;
      if(!usageLookup.error&&usageLookup.data?.request_id&&usageLookup.data.estimated_cost_usd!=null){
        const parsed=Number(usageLookup.data.estimated_cost_usd);
        if(Number.isFinite(parsed)&&parsed>=0){generationRequestId=String(usageLookup.data.request_id);recoveredCost=parsed;}
      }else if(usageLookup.error){
        console.error("Premium Audio orphaned storage usage lookup deferred");
      }
      if(!usageLookup.error&&!generationRequestId){
        generationRequestId=`premium-audio-recovered:${lessonId}:v${version}`;
        recoveredCost=estimatedCost;
        if(!await recordUsageReceipt(generationRequestId,recoveredCost,script.length,null))console.error("Premium Audio orphaned storage usage reconciliation deferred");
      }
      const assetRepair=await admin.from("audio_assets").upsert({lesson_id:lessonId,audio_type:"commentary",storage_path:expectedPath,transcript_pt:script,voice:"marin",generated_at:stored.updated_at??stored.created_at??new Date().toISOString(),generation_request_id:generationRequestId,estimated_cost_usd:recoveredCost},{onConflict:"lesson_id,audio_type"});
      if(assetRepair.error)console.error("Premium Audio orphaned asset metadata reconciliation deferred");
      const {data:pub}=admin.storage.from("lesson-audio").getPublicUrl(expectedPath);
      return json({audio_url:pub.publicUrl,cached:true,voice:"marin",generated_at:stored.updated_at??stored.created_at??null});
    }

    const {data:latestLesson,error:latestLessonError}=await admin.from("lessons").select("id,slug,module_id,is_published,content_version").eq("id",lessonId).eq("is_published",true).maybeSingle();
    if(latestLessonError||!latestLesson)return json({error:"audio_source_recheck_failed"},503);
    if(latestLesson.id!==lessonId||latestLesson.slug!==lesson.slug||latestLesson.module_id!==lesson.module_id||latestLesson.is_published!==true||Number(latestLesson.content_version??1)!==version)return json({error:"audio_source_changed"},409);

    const speech=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{"Authorization":`Bearer ${openaiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4o-mini-tts",voice:"marin",input:script,instructions:course.learner_track==='english_academy'?"Speak in clear natural English as a patient teacher. Keep the learner task and examples distinct. Do not invent evidence about the learner.":"Speak in natural Brazilian Portuguese with a calm, confident expert-professor tone. Keep English finance, accounting, payroll and legal terms in natural English pronunciation. Use clear pacing and subtle emphasis on key concepts. Do not sound like an advertisement.",response_format:"mp3",speed:0.98})});
    if(!speech.ok){console.error("TTS failed",speech.status);await speech.body?.cancel().catch(()=>undefined);return json({error:"tts_failed",status:speech.status},502)}
    const bytes=new Uint8Array(await speech.arrayBuffer());
    const usageRequestId=`premium-audio:${lessonId}:v${version}:${claimToken}`;
    let usageLogged=await recordUsageReceipt(usageRequestId,estimatedCost,script.length,user.id);
    if(!usageLogged)console.error("Premium Audio usage receipt first write deferred");

    const {error:uploadError}=await admin.storage.from("lesson-audio").upload(expectedPath,bytes,{contentType:"audio/mpeg",upsert:true,cacheControl:"31536000"});
    if(uploadError){
      if(!usageLogged)usageLogged=await recordUsageReceipt(usageRequestId,estimatedCost,script.length,user.id);
      console.error("Premium Audio storage upload failed");
      return json({error:"audio_upload_failed"},500);
    }

    const assetResult=await admin.from("audio_assets").upsert({lesson_id:lessonId,audio_type:"commentary",storage_path:expectedPath,transcript_pt:script,voice:"marin",generated_at:new Date().toISOString(),generation_request_id:usageRequestId,estimated_cost_usd:Number(estimatedCost.toFixed(6))},{onConflict:"lesson_id,audio_type"});
    if(assetResult.error){console.error("Premium Audio asset metadata write failed");return json({error:"audio_asset_record_failed"},500)}
    if(!usageLogged){usageLogged=await recordUsageReceipt(usageRequestId,estimatedCost,script.length,user.id);if(!usageLogged)console.error("Premium Audio usage receipt reconciliation deferred");}
    const {data:pub}=admin.storage.from("lesson-audio").getPublicUrl(expectedPath);

    return json({audio_url:pub.publicUrl,cached:false,voice:"marin",estimated_cost_usd:Number(estimatedCost.toFixed(4)),cost_basis:"application_estimate_not_provider_invoice",monthly_audio_cap_usd:Number(budgetResult.data.premium_audio_cap_usd),global_ai_cap_usd:Number(budgetResult.data.ai_hard_cap_usd)});
  }finally{
    await releaseClaim();
  }
});

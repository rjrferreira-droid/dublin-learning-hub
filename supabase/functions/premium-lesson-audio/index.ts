import {runPremiumAudioAttempt} from '../_shared/premium-audio-attempt-flow.ts';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {parseReservationExposure} from '../_shared/reservation-exposure.ts';
import {premiumAudioBudgetDecision} from '../_shared/premium-audio-budget.ts';

import {p1AudioIdentity,p1PremiumAudioGate} from '../_shared/p1-premium-audio-gate.ts';
import {p1SlugFor} from '../../../src/learning/p1RuntimeRegistry.ts';

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);

  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey=Deno.env.get("OPENAI_API_KEY");
  const authHeader=req.headers.get("Authorization")??"";
  const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}}});
  const {data:{user}}=await userClient.auth.getUser();
  if(!user)return json({error:"unauthorized"},401);

  let body:any;try{body=await req.json();}catch{return json({error:"invalid_json"},400)}
  const lessonId=String(body.lesson_id??"");
  if(!lessonId)return json({error:"lesson_id_required"},400);
  const admin=createClient(supabaseUrl,serviceKey);
  const audioReply=async(path:string,payload:Record<string,unknown>)=>{
    if(Deno.env.get('P1_AUDIO_RUNTIME_STAGE')==='isolated-preview-atomic-v2'){
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
  const {data:lesson}=await admin.from("lessons").select("id,module_id,slug,is_published,title,manager_commentary_pt,technical_brief_pt,content_version").eq("id",lessonId).eq("is_published",true).single();
  if(!profile||!lesson||lesson.id!==lessonId||lesson.is_published!==true)return json({error:"lesson_not_found"},404);
  const {data:mod}=await admin.from("modules").select("id,course_id,is_published").eq("id",lesson.module_id).eq("is_published",true).single();
  const {data:course}=mod?await admin.from("courses").select("id,learner_track,is_active").eq("id",mod.course_id).eq("is_active",true).single():{data:null};
  if(!course||mod?.id!==lesson.module_id||mod?.is_published!==true||course.id!==mod.course_id||course.is_active!==true)return json({error:"forbidden"},403);
  const isP1=[p1SlugFor('finance'),p1SlugFor('payroll'),p1SlugFor('english')].includes(lesson.slug);
  const p1Input={profileTrack:profile.learner_track,requestedTrack:course.learner_track,requestedLessonId:lessonId,resolvedLesson:{id:lesson.id,slug:lesson.slug,learnerTrack:course.learner_track,isPublished:lesson.is_published,contentVersion:lesson.content_version}};
  if(isP1){
    // Deliberately unset in the real backend. Requires a separately reviewed isolated backend deployment.
    if(Deno.env.get('P1_AUDIO_RUNTIME_STAGE')!=='isolated-preview-atomic-v2')return json({error:'p1_audio_runtime_unavailable'},403);
    try{p1AudioIdentity(p1Input);}catch{return json({error:'forbidden'},403);}
  }else{
    const goldenIds:Record<string,string>={rafael_finance:'b3639582-3c32-4147-a4b3-84237d11a66e',viviane_payroll:'6ffda415-3b18-46ab-afaa-414f81a7eb31'};
    if(course.learner_track!==profile.learner_track||goldenIds[course.learner_track]!==lessonId)return json({error:"forbidden"},403);
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
  if(budgetResult.error||!budgetResult.data||usageResult.error||professorResult.error)return json({error:"v2_budget_guard_unavailable"},503);
  let exposure;
  try{exposure=parseReservationExposure(professorResult.data,monthStartDay);}catch{return json({error:"v2_budget_guard_unavailable"},503);}
  let decision;
  try{
    decision=premiumAudioBudgetDecision({usageRows:usageResult.data??[],exposure,aiHardCapUsd:budgetResult.data.ai_hard_cap_usd,premiumAudioCapUsd:budgetResult.data.premium_audio_cap_usd,reservationUsd:conservativeReservationUsd});
  }catch{return json({error:"v2_budget_guard_unavailable"},503);}
  if(!decision.allowed){
    return json({error:decision.reason,committed_usd:decision.reason==='global_ai_budget_reached'?decision.globalCommittedUsd:decision.premiumBucketSpentUsd,reservation_usd:Number(conservativeReservationUsd.toFixed(6))},429);
  }

  if(isP1){
    try{
      const gate=p1PremiumAudioGate({...p1Input,scriptWords:words,usageRows:usageResult.data??[],exposure,aiHardCapUsd:budgetResult.data.ai_hard_cap_usd,premiumAudioCapUsd:budgetResult.data.premium_audio_cap_usd});
      if(gate.action!=='claim-before-provider')return json({error:gate.action==='blocked'?gate.reason:'audio_source_changed'},409);
    }catch{return json({error:'v2_budget_guard_unavailable'},503);}
  }
  if(Deno.env.get('P1_AUDIO_RUNTIME_STAGE')==='isolated-preview-atomic-v2'){
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
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

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

  const {data:profile}=await admin.from("profiles").select("learner_track").eq("id",user.id).single();
  const {data:lesson}=await admin.from("lessons").select("id,module_id,title,manager_commentary_pt,technical_brief_pt,content_version").eq("id",lessonId).eq("is_published",true).single();
  if(!profile||!lesson)return json({error:"lesson_not_found"},404);
  const {data:mod}=await admin.from("modules").select("course_id").eq("id",lesson.module_id).single();
  const {data:course}=mod?await admin.from("courses").select("learner_track").eq("id",mod.course_id).single():{data:null};
  if(!course||course.learner_track!==profile.learner_track)return json({error:"forbidden"},403);

  const version=Number(lesson.content_version??1);
  const expectedPath=`lessons/${lessonId}/commentary-v${version}.mp3`;
  const {data:existing}=await admin.from("audio_assets").select("id,storage_path,transcript_pt,voice,generated_at").eq("lesson_id",lessonId).eq("audio_type","commentary").eq("storage_path",expectedPath).maybeSingle();
  if(existing?.storage_path){
    const {data:pub}=admin.storage.from("lesson-audio").getPublicUrl(existing.storage_path);
    return json({audio_url:pub.publicUrl,cached:true,voice:existing.voice??"marin",generated_at:existing.generated_at});
  }

  if(!openaiKey)return json({error:"openai_not_configured"},503);

  let script=String(lesson.manager_commentary_pt||lesson.technical_brief_pt||"").trim();
  if(!script)return json({error:"audio_script_missing"},404);
  if(script.length>4000)script=script.slice(0,4000).replace(/\s+\S*$/,"")+".";

  const words=script.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes=Math.max(0.35,words/145);
  const estimatedCost=Math.max(0.01,estimatedMinutes*0.015*1.30);
  const conservativeReservationUsd=Math.max(0.10,estimatedCost*2);

  const {data:budgetSettings}=await admin.from("learning_hub_budget_settings").select("ai_hard_cap_usd,premium_audio_cap_usd").eq("id",1).maybeSingle();
  if(!budgetSettings)return json({error:"v2_budget_guard_unavailable"},503);

  const now=new Date();
  const monthStartDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const monthStart=monthStartDate.toISOString();
  const monthStartDay=monthStart.slice(0,10);
  const [{data:usageRows},{data:professorRows}]=await Promise.all([
    admin.from("ai_usage_log").select("feature,estimated_cost_usd").gte("created_at",monthStart),
    admin.from("professor_budget_reservations").select("reserved_usd").eq("month_start",monthStartDay),
  ]);

  const loggedAi=(usageRows??[]).reduce((s,r)=>s+Number(r.estimated_cost_usd??0),0);
  const audioSpent=(usageRows??[]).filter(r=>r.feature==="lesson_audio").reduce((s,r)=>s+Number(r.estimated_cost_usd??0),0);
  const professorReserved=(professorRows??[]).reduce((s,r)=>s+Number(r.reserved_usd??0),0);
  const globalCommitted=loggedAi+professorReserved;
  const globalCap=Number(budgetSettings.ai_hard_cap_usd??80);
  const audioCap=Number(budgetSettings.premium_audio_cap_usd??15);

  if(globalCommitted+conservativeReservationUsd>globalCap){
    return json({error:"global_ai_budget_reached",committed_usd:Number(globalCommitted.toFixed(4)),monthly_budget_usd:globalCap},429);
  }
  if(audioSpent+conservativeReservationUsd>audioCap){
    return json({error:"premium_audio_budget_reached",spent_usd:Number(audioSpent.toFixed(4)),monthly_budget_usd:audioCap},429);
  }

  const speech=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{"Authorization":`Bearer ${openaiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4o-mini-tts",voice:"marin",input:script,instructions:"Speak in natural Brazilian Portuguese with a calm, confident expert-professor tone. Keep English finance, accounting, payroll and legal terms in natural English pronunciation. Use clear pacing and subtle emphasis on key concepts. Do not sound like an advertisement.",response_format:"mp3",speed:0.98})});
  if(!speech.ok){const detail=await speech.text();console.error("TTS failed",speech.status,detail);return json({error:"tts_failed",status:speech.status},502)}
  const bytes=new Uint8Array(await speech.arrayBuffer());
  const {error:uploadError}=await admin.storage.from("lesson-audio").upload(expectedPath,bytes,{contentType:"audio/mpeg",upsert:true,cacheControl:"31536000"});
  if(uploadError){console.error(uploadError);return json({error:"audio_upload_failed"},500)}

  await admin.from("audio_assets").delete().eq("lesson_id",lessonId).eq("audio_type","commentary");
  await admin.from("audio_assets").insert({lesson_id:lessonId,audio_type:"commentary",storage_path:expectedPath,transcript_pt:script,voice:"marin",generated_at:new Date().toISOString()});
  const {data:pub}=admin.storage.from("lesson-audio").getPublicUrl(expectedPath);

  await admin.from("ai_usage_log").insert({user_id:user.id,feature:"lesson_audio",model:"gpt-4o-mini-tts",characters:script.length,estimated_cost_usd:Number(estimatedCost.toFixed(6))});

  return json({audio_url:pub.publicUrl,cached:false,voice:"marin",estimated_cost_usd:Number(estimatedCost.toFixed(4)),monthly_audio_cap_usd:audioCap,global_ai_cap_usd:globalCap});
});
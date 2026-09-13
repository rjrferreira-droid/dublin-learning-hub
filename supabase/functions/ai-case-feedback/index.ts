import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const clamp=(n:unknown)=>Math.max(0,Math.min(100,Number(n??0)));
function extractText(data:any){if(typeof data?.output_text==="string")return data.output_text;for(const item of data?.output??[])for(const c of item?.content??[])if(c?.type==="output_text"&&typeof c.text==="string")return c.text;return "";}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey=Deno.env.get("OPENAI_API_KEY");
  if(!openaiKey)return json({error:"openai_not_configured"},503);
  const authHeader=req.headers.get("Authorization")??"";
  const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}}});
  const {data:{user}}=await userClient.auth.getUser();
  if(!user)return json({error:"unauthorized"},401);
  let body:any;try{body=await req.json();}catch{return json({error:"invalid_json"},400)}
  const submissionId=String(body.submission_id??"");
  if(!submissionId)return json({error:"submission_id_required"},400);
  const admin=createClient(supabaseUrl,serviceKey);

  const {data:settings}=await admin.from("ai_budget_settings").select("monthly_budget_usd,hard_stop_enabled").eq("id",1).maybeSingle();
  const now=new Date();const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
  const {data:usageRows}=await admin.from("ai_usage_log").select("estimated_cost_usd").gte("created_at",monthStart);
  const spent=(usageRows??[]).reduce((s,r)=>s+Number(r.estimated_cost_usd??0),0);const budget=Number(settings?.monthly_budget_usd??25);
  if(settings?.hard_stop_enabled&&spent>=budget)return json({error:"ai_budget_reached",spent_usd:spent,monthly_budget_usd:budget},429);

  const {data:submission}=await admin.from("case_submissions").select("*").eq("id",submissionId).eq("user_id",user.id).single();
  if(!submission)return json({error:"submission_not_found"},404);
  const {data:caseRow}=await admin.from("cases").select("*").eq("id",submission.case_id).single();
  if(!caseRow)return json({error:"case_not_found"},404);
  const {data:lesson}=await admin.from("lessons").select("id,title,technical_brief_pt,global_core_pt,ireland_overlay_pt,interview_angle_pt").eq("id",caseRow.lesson_id).single();
  const {data:profile}=await admin.from("profiles").select("learner_track,display_name").eq("id",user.id).single();

  const schema={type:"object",properties:{technical_score:{type:"number",minimum:0,maximum:100},judgement_score:{type:"number",minimum:0,maximum:100},structure_score:{type:"number",minimum:0,maximum:100},english_score:{type:"number",minimum:0,maximum:100},total_score:{type:"number",minimum:0,maximum:100},what_you_did_well:{type:"array",items:{type:"string"}},missing_or_incorrect:{type:"array",items:{type:"string"}},better_answer:{type:"string"},english_feedback:{type:"string"},better_phrasing:{type:"array",items:{type:"object",properties:{original:{type:"string"},better:{type:"string"}},required:["original","better"],additionalProperties:false}},recommended_reviews:{type:"array",items:{type:"string"}}},required:["technical_score","judgement_score","structure_score","english_score","total_score","what_you_did_well","missing_or_incorrect","better_answer","english_feedback","better_phrasing","recommended_reviews"],additionalProperties:false};

  const role=profile?.learner_track==="viviane_payroll"?"Irish Payroll / HR Operations candidate":"experienced Finance Manager preparing for controller/senior finance leadership roles";
  const prompt=`Assess the learner's written professional case response. Be rigorous but practical. Do not reveal private reasoning; return only the requested structured assessment.\n\nLEARNER: ${profile?.display_name??"Learner"}, ${role}.\nLESSON: ${lesson?.title??""}\nLESSON CONTEXT:\n${String(lesson?.technical_brief_pt??"").slice(0,7000)}\n${String(lesson?.global_core_pt??"").slice(0,3000)}\n${String(lesson?.ireland_overlay_pt??"").slice(0,3000)}\n${String(lesson?.interview_angle_pt??"").slice(0,1800)}\n\nCASE SCENARIO:\n${String(caseRow.scenario_pt??"").slice(0,6000)}\nTASK:\n${String(caseRow.prompt_pt??"").slice(0,3000)}\nMODEL ANSWER / INTERNAL REFERENCE:\n${String(caseRow.model_answer_pt??"").slice(0,7000)}\nRUBRIC:\n${JSON.stringify(caseRow.rubric??{}).slice(0,5000)}\n\nLEARNER RESPONSE:\n${String(submission.response_text??"").slice(0,16000)}\n\nSCORING: technical accuracy 35%, professional judgement 30%, structure/communication 20%, English 15% unless the case rubric clearly implies otherwise. Do not reward plausible-sounding statements that conflict with the lesson. English feedback must focus on professional workplace English, not accent. The better answer should be a concise model response the learner can study, not a copied restatement of the internal reference.`;

  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${openaiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-terra",store:false,input:[{role:"system",content:"You are a professional ACCA/corporate finance and Irish payroll case marker."},{role:"user",content:prompt}],text:{format:{type:"json_schema",name:"case_feedback",strict:true,schema}}})});
  if(!response.ok){const detail=await response.text();console.error("Case feedback failed",response.status,detail);return json({error:"case_feedback_failed",status:response.status},502)}
  const data=await response.json();let feedback:any;try{feedback=JSON.parse(extractText(data));}catch{return json({error:"invalid_feedback_output"},502)}

  const updated={technical_score:clamp(feedback.technical_score),judgement_score:clamp(feedback.judgement_score),structure_score:clamp(feedback.structure_score),english_score:clamp(feedback.english_score),total_score:clamp(feedback.total_score),ai_feedback:feedback};
  await admin.from("case_submissions").update(updated).eq("id",submissionId).eq("user_id",user.id);

  const {data:lessonComps}=await admin.from("lesson_competencies").select("competency_id,weight").eq("lesson_id",caseRow.lesson_id);
  for(const lc of lessonComps??[]){const {data:cur}=await admin.from("user_competency_scores").select("score,evidence_count").eq("user_id",user.id).eq("competency_id",lc.competency_id).maybeSingle();const ev=Number(cur?.evidence_count??0),old=Number(cur?.score??0);const next=ev?Math.round((old*ev+updated.total_score)/(ev+1)):Math.round(updated.total_score);await admin.from("user_competency_scores").upsert({user_id:user.id,competency_id:lc.competency_id,score:next,confidence:Math.min(100,(ev+1)*20),evidence_count:ev+1,last_assessed_at:new Date().toISOString()},{onConflict:"user_id,competency_id"});}
  const {data:eng}=await admin.from("competencies").select("id").eq("learner_track",profile?.learner_track).eq("code","ENG").maybeSingle();
  if(eng){const {data:cur}=await admin.from("user_competency_scores").select("score,evidence_count").eq("user_id",user.id).eq("competency_id",eng.id).maybeSingle();const ev=Number(cur?.evidence_count??0),old=Number(cur?.score??0);const next=ev?Math.round((old*ev+updated.english_score)/(ev+1)):Math.round(updated.english_score);await admin.from("user_competency_scores").upsert({user_id:user.id,competency_id:eng.id,score:next,confidence:Math.min(100,(ev+1)*20),evidence_count:ev+1,last_assessed_at:new Date().toISOString()},{onConflict:"user_id,competency_id"});}

  const inputTokens=Number(data?.usage?.input_tokens??0),cached=Number(data?.usage?.input_tokens_details?.cached_tokens??0),outputTokens=Number(data?.usage?.output_tokens??0);const cost=inputTokens*2/1_000_000+outputTokens*12/1_000_000;
  await admin.from("ai_usage_log").insert({user_id:user.id,feature:"case_feedback",model:"gpt-5.6-terra",input_tokens:inputTokens,cached_input_tokens:cached,output_tokens:outputTokens,estimated_cost_usd:Number(cost.toFixed(6)),request_id:data?.id??null});
  return json({submission_id:submissionId,feedback,estimated_cost_usd:Number(cost.toFixed(4))});
});
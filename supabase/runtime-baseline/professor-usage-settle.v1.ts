// Runtime baseline: professor-usage-settle v1, captured 2026-09-13 before replacement.
// Original provider artifact SHA256: 93ae0387120954f3c0b339fc690216472ea8760160715861fa1c0a496c2a21c0.
// Kept for rollback review only. This legacy version treats missing telemetry as zero; do not deploy by default.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
function isUuid(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function cleanText(value:unknown,max=256):string{return typeof value==='string'?value.trim().slice(0,max):'';}
function num(value:unknown):number{const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0;}
async function sha256Hex(value:string):Promise<string>{const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');}
type UsageTotals={inputTokens:number;cachedInputTokens:number;outputTokens:number;inputTextTokens:number;cachedTextTokens:number;outputTextTokens:number;inputAudioTokens:number;cachedAudioTokens:number;outputAudioTokens:number};
function aggregateUsage(value:unknown):UsageTotals{
 const totals:UsageTotals={inputTokens:0,cachedInputTokens:0,outputTokens:0,inputTextTokens:0,cachedTextTokens:0,outputTextTokens:0,inputAudioTokens:0,cachedAudioTokens:0,outputAudioTokens:0};
 if(!Array.isArray(value))return totals;
 for(const item of value.slice(0,40)){
  if(!item||typeof item!=='object'||Array.isArray(item))continue;const row=item as Record<string,unknown>;
  if(row.type&&row.type!=='llm_usage')continue;
  totals.inputTokens+=num(row.inputTokens);totals.cachedInputTokens+=num(row.inputCachedTokens);totals.outputTokens+=num(row.outputTokens);
  totals.inputTextTokens+=num(row.inputTextTokens);totals.cachedTextTokens+=num(row.inputCachedTextTokens);totals.outputTextTokens+=num(row.outputTextTokens);
  totals.inputAudioTokens+=num(row.inputAudioTokens);totals.cachedAudioTokens+=num(row.inputCachedAudioTokens);totals.outputAudioTokens+=num(row.outputAudioTokens);
 }return totals;
}
function realtimeCostUsd(model:string,usage:UsageTotals):number|null{
 if(model!=='gpt-realtime-2.1')return null;
 const uncachedText=Math.max(0,usage.inputTextTokens-usage.cachedTextTokens),uncachedAudio=Math.max(0,usage.inputAudioTokens-usage.cachedAudioTokens);
 const usd=(uncachedText*4+usage.cachedTextTokens*0.4+usage.outputTextTokens*24+uncachedAudio*32+usage.cachedAudioTokens*0.4+usage.outputAudioTokens*64)/1000000;
 return Math.round(usd*1000000)/1000000;
}
async function insertUsageOnce(admin:any,row:Record<string,unknown>){
 const requestId=String(row.request_id??'');const {data:existing}=await admin.from('ai_usage_log').select('id,estimated_cost_usd').eq('request_id',requestId).maybeSingle();
 if(existing?.id)return{ok:true,cost:num(existing.estimated_cost_usd),existing:true};
 const {data,error}=await admin.from('ai_usage_log').insert(row).select('id,estimated_cost_usd').single();
 if(error)return{ok:false,cost:0,existing:false,error:error.message};return{ok:true,cost:num(data?.estimated_cost_usd),existing:false};
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const supabaseUrl=Deno.env.get('SUPABASE_URL'),serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!supabaseUrl||!serviceRoleKey)return json({error:'backend_not_configured'},503);
 let body:Record<string,unknown>;try{const parsed=await req.json();if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return json({error:'invalid_request'},400);body=parsed;}catch{return json({error:'invalid_json'},400);}
 const sessionId=body.sessionId,callbackToken=cleanText(body.callbackToken);
 if(!isUuid(sessionId)||callbackToken.length<32)return json({error:'invalid_callback_credentials'},401);
 const admin=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:session,error:sessionError}=await admin.from('ai_tutor_sessions').select('id,user_id,budget_reservation_id,callback_token_hash,quality_tier').eq('id',sessionId).maybeSingle();
 if(sessionError||!session?.callback_token_hash||!session?.user_id)return json({error:'session_not_found'},404);
 if(await sha256Hex(callbackToken)!==session.callback_token_hash)return json({error:'invalid_callback_credentials'},401);
 const usage=aggregateUsage(body.modelUsage),requestedModel=cleanText(body.realtimeModel,120),model=requestedModel||(session.quality_tier==='premium'?'gpt-realtime-2.1':'');
 const realtimeCost=realtimeCostUsd(model,usage);let realtimeLogged=false;
 if(realtimeCost!==null){
  const logged=await insertUsageOnce(admin,{user_id:session.user_id,session_id:sessionId,feature:'professor_livekit',model,input_tokens:Math.round(usage.inputTokens),cached_input_tokens:Math.round(usage.cachedInputTokens),output_tokens:Math.round(usage.outputTokens),audio_input_tokens:Math.round(usage.inputAudioTokens),audio_output_tokens:Math.round(usage.outputAudioTokens),estimated_cost_usd:realtimeCost,request_id:`professor-realtime:${sessionId}`});
  if(!logged.ok){console.error('Professor realtime usage log failed',logged.error??'unknown');return json({error:'usage_log_failed'},503);}realtimeLogged=true;
  if(session.budget_reservation_id){const {error:settleError}=await admin.from('professor_budget_reservations').update({status:'settled',actual_cost_usd:logged.cost,settled_at:new Date().toISOString()}).eq('id',session.budget_reservation_id);if(settleError){console.error('Professor reservation settlement failed',settleError.message);return json({error:'reservation_settlement_failed'},503);}}
 }
 const evaluation=body.evaluation&&typeof body.evaluation==='object'&&!Array.isArray(body.evaluation)?body.evaluation as Record<string,unknown>:null;
 const evaluationCost=evaluation?num(evaluation.estimatedCostUsd):0,evaluationModel=evaluation?cleanText(evaluation.model,120):'';let evaluationLogged=false;
 if(evaluationCost>0){const loggedEval=await insertUsageOnce(admin,{user_id:session.user_id,session_id:sessionId,feature:'professor_evaluation',model:evaluationModel||'evaluation-model',input_tokens:0,cached_input_tokens:0,output_tokens:0,audio_input_tokens:0,audio_output_tokens:0,estimated_cost_usd:evaluationCost,request_id:`professor-eval:${sessionId}`});if(!loggedEval.ok)console.error('Professor evaluation usage log failed',loggedEval.error??'unknown');evaluationLogged=Boolean(loggedEval.ok);}
 return json({ok:true,realtimeModel:model||null,realtimeCostUsd:realtimeCost,realtimeLogged,reservationSettled:realtimeLogged&&Boolean(session.budget_reservation_id),evaluationCostUsd:evaluationCost,evaluationLogged,pricingKnown:realtimeCost!==null});
});

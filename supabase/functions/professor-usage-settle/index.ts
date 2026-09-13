import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return json({error:'backend_not_configured'},503);
 let body:Record<string,unknown>;
 try{
  if(!req.body)return json({error:'invalid_request'},400);
  const reader=req.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>200000){await reader.cancel();return json({error:'payload_too_large'},413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  body=JSON.parse(new TextDecoder().decode(bytes));
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'invalid_request'},400);
 }catch{return json({error:'invalid_json'},400);}
 if(typeof body.sessionId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.sessionId)||typeof body.callbackToken!=='string'||body.callbackToken.length<32||body.callbackToken.length>256)return json({error:'invalid_callback_credentials'},401);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 // Per-session callback authentication, numeric validation, pricing and all writes are one SQL transaction.
 const {data,error}=await admin.rpc('settle_professor_usage_v2',{p_session_id:body.sessionId,p_callback_token:body.callbackToken,p_payload:{modelUsage:body.modelUsage??null,realtimeModel:body.realtimeModel??null,evaluation:body.evaluation??null}});
 if(error){
  if(['invalid_callback_credentials','callback_expired'].includes(error.message))return json({error:'invalid_callback_credentials'},401);
  if(['settlement_conflict','usage_record_conflict'].includes(error.message))return json({error:error.message},409);
  console.error('Professor atomic settlement failed',error.code);
  return json({error:'usage_settlement_failed'},503);
 }
 return json(data);
});

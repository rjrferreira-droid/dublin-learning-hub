import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'jsr:@supabase/supabase-js@2';
import {buildSessionReceipt} from '../_shared/session-receipt-contract.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'GET, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='GET')return json({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!service)return json({error:'backend_not_configured'},503);
 const sessionId=new URL(req.url).searchParams.get('sessionId')??'';
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(sessionId))return json({error:'invalid_session'},400);
 const auth=req.headers.get('Authorization')??'';
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user}}=await userClient.auth.getUser();if(!user)return json({error:'unauthorized'},401);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const sessionResult=await admin.from('ai_tutor_sessions').select('id,user_id,status,completed_at,budget_reservation_id').eq('id',sessionId).eq('user_id',user.id).maybeSingle();
 if(sessionResult.error)return json({error:'receipt_unavailable'},503);
 if(!sessionResult.data)return json({error:'not_found'},404);
 const reservationId=sessionResult.data.budget_reservation_id;
 const [reservationResult,usageResult]=await Promise.all([
  reservationId?admin.from('professor_budget_reservations').select('id,user_id,status,reserved_usd,actual_cost_usd,settled_at').eq('id',reservationId).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null,error:null}),
  admin.from('ai_usage_log').select('feature,estimated_cost_usd').eq('session_id',sessionId).eq('user_id',user.id).in('feature',['professor_livekit','professor_evaluation']),
 ]);
 if(reservationResult.error||usageResult.error)return json({error:'receipt_unavailable'},503);
 try{return json(buildSessionReceipt({session:sessionResult.data,reservation:reservationResult.data,usage:usageResult.data??[]}));}
 catch{return json({error:'receipt_unavailable'},503);}
});

import {createClient} from '@supabase/supabase-js';
import {isP1FeaturePreview} from '../server/p1-preview-runtime.ts';
import {createAdmissionVault} from '../quality/candidates/professor-admission-vault.ts';
import {createSharedPreflights} from '../quality/candidates/professor-shared-preflights.ts';
import {createSharedProfessorRoutes} from '../quality/candidates/professor-shared-routes.ts';

/** Hosted validation-only wiring. Explicitly closed until backend/key review.
 * A positive admission can reserve budget but NEVER dispatches a paid provider. */
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Authorization');
 const send=(status:number,body:unknown)=>res.status(status).json(body);
 if(!isP1FeaturePreview(process.env))return send(404,{error:'unavailable'});
 if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'method_not_allowed'});}
 if(process.env.PROFESSOR_ADMISSION_STAGE!=='shared-preview-validation-v1')return send(503,{error:'admission_not_enabled',retryAllowed:false});
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))return send(415,{error:'json_required'});
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body)||!['preflight','start'].includes(body.action))return send(400,{error:'invalid_request'});
 const {action,...input}=body;
 try{
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY,encoded=process.env.PROFESSOR_PREFLIGHT_KEY;
  if(url!=='https://aazfyosqqeujureksqjs.supabase.co'||!key||!service||!encoded||!/^[a-f0-9]{64}$/.test(encoded))throw Error();
  const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
  const serviceDb=createClient(url,service,options);
  const vault=createAdmissionVault('preview-v1',{'preview-v1':Buffer.from(encoded,'hex')});
  const route=createSharedProfessorRoutes({env:process.env,serviceDb,store:createSharedPreflights(serviceDb,vault),
   makeClient:token=>createClient(url,key,{...options,global:{headers:{Authorization:`Bearer ${token}`}}})});
  const result=await route('/professor/'+action,req.headers?.authorization,input);
  return send(result.status,result.body);
 }catch{return send(503,{error:'admission_unavailable',retryAllowed:false});}
}

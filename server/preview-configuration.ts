import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {isP1FeaturePreview} from './p1-preview-runtime.ts';

const target='https://aazfyosqqeujureksqjs.supabase.co';
/** Authenticated, read-only configuration check. No RPC, session, budget or provider capability. */
export function createPreviewConfigurationHandler(env:Record<string,string|undefined>,makeClient:(url:string,key:string,token?:string)=>any){
 return async(req:any,res:any)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Authorization');
  const send=(status:number,body:unknown)=>res.status(status).json(body);
  if(!isP1FeaturePreview(env))return send(404,{error:'unavailable'});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'method_not_allowed'});}
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))return send(415,{error:'json_required'});
  const bearer=req.headers?.authorization;
  if(typeof bearer!=='string'||!/^Bearer [^\s]{1,8192}$/.test(bearer))return send(401,{error:'authentication_required'});
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).length)return send(400,{error:'invalid_request'});
  const url=env.SUPABASE_URL||env.VITE_SUPABASE_URL,publicKey=env.SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if(url!==target||!publicKey)return send(503,{error:'configuration_unavailable'});
  try{
   const learner=makeClient(url,publicKey,bearer.slice(7));
   const {data:auth,error:authError}=await learner.auth.getUser();
   if(authError||!auth?.user?.id)return send(401,{error:'authentication_required'});
   const userId=auth.user.id;
   const {data:profile,error:profileError}=await learner.from('profiles').select('id,learner_track').eq('id',userId).maybeSingle();
   if(profileError||profile?.id!==userId||!['rafael_finance','viviane_payroll'].includes(profile.learner_track))return send(403,{error:'unavailable'});
   const service=env.SUPABASE_SERVICE_ROLE_KEY,encoded=env.PROFESSOR_PREFLIGHT_KEY;
   if(!service||!encoded||!/^[a-f0-9]{64}$/.test(encoded)||env.PROFESSOR_ADMISSION_STAGE)return send(503,{error:'configuration_unavailable'});
   // This deployment uses legacy service_role JWTs. Check intended role/project;
   // the subsequent Supabase request validates the actual credential server-side.
   const claims=JSON.parse(Buffer.from(service.split('.')[1]||'','base64url').toString());
   if(claims.role!=='service_role'||claims.ref!=='aazfyosqqeujureksqjs')return send(503,{error:'configuration_unavailable'});
   const serviceDb=makeClient(url,service);
   const {data:ownProfile,error:serviceError}=await serviceDb.from('profiles').select('id').eq('id',userId).maybeSingle();
   if(serviceError||ownProfile?.id!==userId)return send(503,{error:'configuration_unavailable'});
   const key=Buffer.from(encoded,'hex'),iv=randomBytes(12),plain=randomBytes(32);
   const cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);
   const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(cipher.getAuthTag());
   if(!Buffer.concat([decipher.update(encrypted),decipher.final()]).equals(plain))throw Error();
   return send(200,{status:'configuration_verified',authenticated:true,serviceCredentialVerified:true,preflightCryptoVerified:true,admissionClosed:true,providerCalls:0});
  }catch{return send(503,{error:'configuration_unavailable'});}
 };
}

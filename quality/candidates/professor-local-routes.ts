import {prepareBoundProfessorAdmission} from './prepare-bound-professor-admission.ts';
import {isP1FeaturePreview} from '../../server/p1-preview-runtime.ts';
import {isUuid,professorModes} from './professor-admission-contract.ts';
type Prepared=Awaited<ReturnType<typeof prepareBoundProfessorAdmission>>;
type Dependencies={makeClient:(token:string)=>any;serviceDb:any;env:Record<string,string|undefined>;prepare?:typeof prepareBoundProfessorAdmission;now?:()=>number};
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
/** Disposable route rehearsal only. Bounded process-local preflights expire in
 * four minutes; this is NOT a durable hosted session store. Expiry/restart never
 * proves cancellation, releases a hold or authorizes a replacement paid start.
 * No dispatch/token endpoint exists. HTTP/loopback/CORS limits live in the local
 * test server. Production/Vercel must not mount this in-memory rehearsal. */
export function createLocalProfessorRoutes(deps:Dependencies){
 if(!isP1FeaturePreview(deps.env))throw Error('professor_local_routes_unavailable');
 const prepare=deps.prepare??prepareBoundProfessorAdmission,now=deps.now??Date.now;
 const entries=new Map<string,{userId:string;requestId:string;expires:number;used:boolean;prepared:Prepared}>();
 let preparing=0;
 const reply=(status:number,body:unknown)=>({status,body});
 return async(path:string,authorization:unknown,body:any)=>{
  for(const [id,entry] of entries)if(entry.expires<=now())entries.delete(id);
  if(!['/professor/preflight','/professor/start'].includes(path))return reply(404,{error:'not_found'});
  const bearer=typeof authorization==='string'?/^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization):null;
  if(!bearer)return reply(401,{error:'authentication_required'});
  if(path.endsWith('/preflight')){
   if(!exact(body,['kind','lessonId','requestedTrack','requestId','mode'])||!['p1','written'].includes(body.kind)||!isUuid(body.lessonId)||!isUuid(body.requestId)
    ||!['rafael_finance','viviane_payroll','english_academy'].includes(body.requestedTrack)||!professorModes.includes(body.mode))return reply(400,{error:'invalid_request'});
  }else if(!exact(body,['referenceId','requestId'])||!isUuid(body.referenceId)||!isUuid(body.requestId))return reply(400,{error:'invalid_request'});
  const db=deps.makeClient(bearer[1]);let userId:string;
  try{const auth=await db.auth.getUser();if(auth.error||!isUuid(auth.data?.user?.id))return reply(401,{error:'authentication_required'});userId=auth.data.user.id;}
  catch{return reply(401,{error:'authentication_required'});}
  if(path.endsWith('/preflight')){
   if(entries.size+preparing>=128)return reply(429,{error:'preflight_capacity_reached'});
   preparing++;
   try{
    const prepared=await prepare(db,deps.serviceDb,{...body},deps.env);
    if(prepared.receipt.userId!==userId)throw Error('preflight_owner_mismatch');
    entries.set(prepared.receipt.reference.id,{userId,requestId:body.requestId,expires:now()+240000,used:false,prepared});
    return reply(200,{receipt:structuredClone(prepared.receipt)});
   }catch{return reply(403,{error:'lesson_reference_unavailable'});}
   finally{preparing--;}
  }
  const entry=entries.get(body.referenceId);
  if(!entry||entry.expires<=now())return reply(410,{error:'preflight_unavailable',retryAllowed:false});
  if(entry.userId!==userId)return reply(403,{error:'preflight_forbidden'});
  if(entry.requestId!==body.requestId||entry.used)return reply(409,{error:'request_conflict',retryAllowed:false});
  entry.used=true;
  try{
   const result=await entry.prepared.start();
   if(result.status==='denied')return reply(200,{status:'denied',reason:result.reason,retryAllowed:false});
   return reply(200,{status:'admitted',acknowledgement:structuredClone(result.acknowledgement),retryAllowed:false});
  }catch{return reply(503,{error:'professor_admission_unconfirmed',retryAllowed:false});}
 };
}

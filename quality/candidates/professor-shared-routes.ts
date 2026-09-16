import {resumeBoundProfessorAdmission,prepareBoundProfessorAdmission} from './prepare-bound-professor-admission.ts';
import {isP1FeaturePreview} from '../../server/p1-preview-runtime.ts';
import {isUuid,professorModes} from './professor-admission-contract.ts';
import type {createSharedPreflights} from './professor-shared-preflights.ts';
type Dependencies={makeClient:(token:string)=>any;serviceDb:any;env:Record<string,string|undefined>;prepare?:typeof prepareBoundProfessorAdmission;store:ReturnType<typeof createSharedPreflights>};
const exact=(v:any,keys:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
/** Shared, validation-only routes: fresh Auth, durable consume before admission.
 * No provider/token/dispatch capability. No process-local preflight state. */
export function createSharedProfessorRoutes(deps:Dependencies){
 if(!isP1FeaturePreview(deps.env))throw Error('professor_local_routes_unavailable');
 const prepare=deps.prepare??prepareBoundProfessorAdmission;
 const reply=(status:number,body:unknown)=>({status,body});
 return async(path:string,authorization:unknown,body:any)=>{
  if(!['/professor/preflight','/professor/start'].includes(path))return reply(404,{error:'not_found'});
  const bearer=typeof authorization==='string'?/^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization):null;
  if(!bearer)return reply(401,{error:'authentication_required'});
  if(path.endsWith('/preflight')){
   if(!exact(body,['kind','lessonId','requestedTrack','requestId','mode'])||!['p1','written'].includes(body.kind)||!isUuid(body.lessonId)||!isUuid(body.requestId)
    ||!['rafael_finance','viviane_payroll','english_academy'].includes(body.requestedTrack)||!professorModes.includes(body.mode))return reply(400,{error:'invalid_request'});
  }else if(!exact(body,['referenceId','requestId'])||!isUuid(body.referenceId)||!isUuid(body.requestId))return reply(400,{error:'invalid_request'});
  const captured=structuredClone(body);body=captured;
  let db:any,userId:string;
  try{db=deps.makeClient(bearer[1]);const auth=await db.auth.getUser();if(auth.error||!isUuid(auth.data?.user?.id))return reply(401,{error:'authentication_required'});userId=auth.data.user.id;}
  catch{return reply(401,{error:'authentication_required'});}
  if(path.endsWith('/preflight')){
   try{
    const prepared=await prepare(db,deps.serviceDb,{...body},deps.env);
    if(prepared.receipt.userId!==userId)throw Error('preflight_owner_mismatch');
    await deps.store.put(prepared.getPrivateSnapshot());
    return reply(200,{receipt:structuredClone(prepared.receipt)});
   }catch{return reply(403,{error:'lesson_reference_unavailable'});}
  }
  let prepared;
  try{
   const snapshot=await deps.store.consume({referenceId:body.referenceId,requestId:body.requestId,userId});
   prepared=resumeBoundProfessorAdmission(db,snapshot,deps.env);
  }catch{return reply(409,{error:'preflight_unavailable',retryAllowed:false});}
  try{
   const result=await prepared.start();
   if(result.status==='denied')return reply(200,{status:'denied',reason:result.reason,retryAllowed:false});
   return reply(200,{status:'admitted',acknowledgement:structuredClone(result.acknowledgement),retryAllowed:false});
  }catch{return reply(503,{error:'professor_admission_unconfirmed',retryAllowed:false});}
 };
}

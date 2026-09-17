import {prepareWrittenAudioPreview} from '../quality/candidates/written-audio-preview.ts';
import {isP1FeaturePreview} from './p1-preview-runtime.ts';

const requestTracks=['rafael_finance','viviane_payroll','english_academy'] as const;
type RequestTrack=typeof requestTracks[number];

/** Resolve only the reviewed, server-authored P1 Audio source identity. This
 * diagnostic never reads a cache object, reserves budget or calls a provider. */
export async function resolveP1AudioBinding(db:any,input:{lessonId:string;requestedTrack:RequestTrack},env:Record<string,string|undefined>){
 const audio=await prepareWrittenAudioPreview(db,input,env);
 if(audio.identity.sequence!==2)throw Error('p1_audio_binding_unsupported');
 const {identity,language,purpose,characters,scriptSha256,sourceFingerprint,referenceSha256}=audio;
 return {identity,source:{language,purpose,characters,scriptSha256,sourceFingerprint,referenceSha256,
  expectedStoragePath:`lessons/${identity.lessonId}/commentary-v${identity.contentVersion}.mp3`}} as const;
}

/** Feature-Preview-only read diagnostic. It returns a candidate source digest
 * and expected path, not the current closed Edge source handoff. It returns no
 * script, media URL, budget decision, cache result or provider capability. */
export function createPremiumAudioReadinessHandler(makeClient:(token:string)=>any,env:Record<string,string|undefined>){
 return async(req:any,res:any)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Authorization');
  const send=(status:number,body:unknown)=>res.status(status).json(body);
  if(!isP1FeaturePreview(env))return send(404,{error:'unavailable'});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'method_not_allowed'});}
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))return send(415,{error:'json_required'});
  const authorization=req.headers?.authorization;
  if(typeof authorization!=='string'||!/^Bearer [^\s]{1,8192}$/.test(authorization))return send(401,{error:'authentication_required'});
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='lessonId,requestedTrack'
   ||typeof body.lessonId!=='string'||body.lessonId.length!==36||!requestTracks.includes(body.requestedTrack))return send(400,{error:'invalid_request'});
  const input={lessonId:body.lessonId,requestedTrack:body.requestedTrack as RequestTrack};
  try{
   const binding=await resolveP1AudioBinding(makeClient(authorization.slice(7)),input,env);
   return send(200,{status:'audio_reference_verified_activation_closed',...binding,cacheLookupPerformed:false,runtimeSourceHandoff:false,generationAdmission:false,providerAdmission:false,validationOnly:true});
  }catch(error){
   return send(error instanceof Error&&error.message==='written_preview_unauthenticated'?401:403,{error:'audio_reference_unavailable'});
  }
 };
}

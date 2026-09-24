import {isP1FeaturePreview} from './p1-preview-runtime.ts';
import {readAuthenticatedProfessorIdentity} from './professor-preview-identity.ts';
import {resolveP1ProfessorHandoff} from './p1-professor-handoff.ts';

/** Read-only diagnostic. Never an admission receipt or permission to call a provider. */
export function createProfessorReadinessHandler(makeClient: (token:string)=>any, env:Record<string,string|undefined>) {
 return async (req:any,res:any) => {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Vary','Authorization');
  const send=(status:number,body:unknown)=>res.status(status).json(body);
  if(!isP1FeaturePreview(env))return send(404,{error:'unavailable'});
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'method_not_allowed'});}
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type']||''))return send(415,{error:'json_required'});
  const auth=req.headers?.authorization;
  if(typeof auth!=='string'||!/^Bearer [^\s]{1,8192}$/.test(auth))return send(401,{error:'authentication_required'});
  const b=req.body;
  if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).sort().join(',')!=='lessonId,requestedTrack'
    ||typeof b.lessonId!=='string'||b.lessonId.length!==36||!['rafael_finance','viviane_payroll','english_academy'].includes(b.requestedTrack))return send(400,{error:'invalid_request'});
  // Copy before the first await; caller-owned body is never used again.
  const input={lessonId:b.lessonId,requestedTrack:b.requestedTrack};
  try {
   const {referenceInput:r}=await readAuthenticatedProfessorIdentity(makeClient(auth.slice(7)),input,env);
   const {lesson,module,course}=r.resolved;
   if(lesson.sequence!==2||!Number.isSafeInteger(lesson.contentVersion)||lesson.contentVersion<1)throw Error('unsupported_reference');
   const h=resolveP1ProfessorHandoff({profileTrack:r.profileTrack,requestedTrack:r.requestedTrack,requestedLessonId:r.requestedLessonId,
    resolvedLesson:{id:lesson.id,slug:lesson.slug,learnerTrack:course.learnerTrack,isPublished:lesson.isPublished}});
   return send(200,{status:'reference_verified_activation_closed',identity:{lessonId:h.lessonId,moduleId:module.id,courseId:course.id,
    lessonSlug:h.lessonSlug,contentVersion:lesson.contentVersion,requestedTrack:h.requestedTrack,studyTrack:h.studyTrack,sequence:lesson.sequence},
    providerAdmission:false,premiumAudioAdmission:false,validationOnly:true});
  } catch(error) {
   // Missing, unpublished, other-account and unsupported lessons are indistinguishable.
   return send(error instanceof Error&&error.message==='written_preview_unauthenticated'?401:403,{error:'reference_unavailable'});
  }
 };
}

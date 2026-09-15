import {isP1FeaturePreview} from '../../server/p1-preview-runtime.ts';
import {prepareWrittenProfessorReference} from './written-professor-reference.ts';

type Request={requestedTrack:'rafael_finance'|'viviane_payroll'|'english_academy';lessonId:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Server candidate, deliberately not mounted by any HTTP/provider endpoint.
 * db MUST be the request's authenticated client. Only identity fields are accepted;
 * profile, publication, sequence, version and all content are resolved here.
 * This creates a reference snapshot, not atomic admission or a session capability.
 */
export async function readAuthenticatedProfessorIdentity(db:any,input:Request,env:Record<string,string|undefined>){
 if(!isP1FeaturePreview(env))throw Error('written_preview_unavailable');
 if(!input||typeof input.lessonId!=='string'||!uuid.test(input.lessonId)||!['rafael_finance','viviane_payroll','english_academy'].includes(input.requestedTrack))throw Error('written_preview_invalid_request');
 const {data:auth,error:authError}=await db.auth.getUser();
 if(authError||!auth?.user||!uuid.test(auth.user.id))throw Error('written_preview_unauthenticated');
 const {data:profile,error:profileError}=await db.from('profiles').select('id,learner_track').eq('id',auth.user.id).maybeSingle();
 if(profileError||profile?.id!==auth.user.id||!['rafael_finance','viviane_payroll'].includes(profile?.learner_track)
  ||(input.requestedTrack!=='english_academy'&&profile.learner_track!==input.requestedTrack))throw Error('written_preview_forbidden');
 const {data:l,error:le}=await db.from('lessons').select('id,module_id,slug,sequence,content_version,is_published')
  .eq('id',input.lessonId).eq('is_published',true).maybeSingle();
 if(le||l?.id!==input.lessonId||!uuid.test(l?.module_id)||l?.is_published!==true)throw Error('written_preview_forbidden');
 const {data:m,error:me}=await db.from('modules').select('id,course_id,is_published').eq('id',l.module_id).eq('is_published',true).maybeSingle();
 if(me||m?.id!==l.module_id||!uuid.test(m?.course_id)||m?.is_published!==true)throw Error('written_preview_forbidden');
 const {data:c,error:ce}=await db.from('courses').select('id,learner_track,is_active').eq('id',m.course_id).eq('is_active',true).maybeSingle();
 if(ce||c?.id!==m.course_id||c?.learner_track!==input.requestedTrack||c?.is_active!==true)throw Error('written_preview_forbidden');
 return {userId:auth.user.id as string,referenceInput:{profileTrack:profile.learner_track,requestedTrack:input.requestedTrack,requestedLessonId:input.lessonId,resolved:{
  lesson:{id:l.id,moduleId:l.module_id,slug:l.slug,sequence:l.sequence,contentVersion:l.content_version,isPublished:l.is_published},
  module:{id:m.id,courseId:m.course_id,isPublished:m.is_published},
  course:{id:c.id,learnerTrack:c.learner_track,isActive:c.is_active},
 }}};
}

export async function resolveAuthenticatedWrittenProfessorPreview(db:any,input:Request,env:Record<string,string|undefined>){
 const {userId,referenceInput}=await readAuthenticatedProfessorIdentity(db,input,env);
 return {userId,reference:await prepareWrittenProfessorReference(referenceInput)};
}

export async function resolveWrittenProfessorPreview(db:any,input:Request,env:Record<string,string|undefined>){
 return (await resolveAuthenticatedWrittenProfessorPreview(db,input,env)).reference;
}

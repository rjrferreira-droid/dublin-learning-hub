import {createHash} from 'node:crypto';
import {resolveP1ProfessorHandoff} from '../../server/p1-professor-handoff.ts';
import {readAuthenticatedProfessorIdentity} from './resolve-written-professor-preview.ts';
import {mintAuthenticatedProfessorReference} from './mint-authored-professor-reference.ts';

/** Unmounted P1 adapter. Reuses the exact existing authored P1 handoff/context;
 * adds server-read ancestry/version binding without modifying the live token API. */
export async function mintP1ProfessorPreview(db:any,serviceDb:any,input:Parameters<typeof readAuthenticatedProfessorIdentity>[1],env:Record<string,string|undefined>){
 const {userId,referenceInput:r}=await readAuthenticatedProfessorIdentity(db,input,env);
 const {lesson,module,course}=r.resolved;
 if(lesson.sequence!==2||!Number.isSafeInteger(lesson.contentVersion)||lesson.contentVersion<1)throw Error('p1_binding_version_sequence_invalid');
 const handoff=resolveP1ProfessorHandoff({profileTrack:r.profileTrack,requestedTrack:r.requestedTrack,requestedLessonId:r.requestedLessonId,
  resolvedLesson:{id:lesson.id,slug:lesson.slug,learnerTrack:course.learnerTrack,isPublished:lesson.isPublished}});
 const identity={lessonId:lesson.id,moduleId:module.id,courseId:course.id,lessonSlug:lesson.slug,contentVersion:lesson.contentVersion,
  requestedTrack:r.requestedTrack,studyTrack:handoff.studyTrack,sequence:2};
 const encoded=JSON.stringify({identity,context:handoff.context}),contextBytes=Buffer.byteLength(encoded,'utf8');
 if(contextBytes>24000)throw Error('p1_binding_size_exceeded');
 const reference={identity,lessonContext:handoff.context,descriptor:{version:'p1-reference-candidate-v1',sha256:createHash('sha256').update(encoded).digest('hex'),
  contextBytes,includesLearnerDrafts:false,includesLocalCheckpointResults:false,providerAdmission:false}} as const;
 return mintAuthenticatedProfessorReference(serviceDb,userId,reference);
}

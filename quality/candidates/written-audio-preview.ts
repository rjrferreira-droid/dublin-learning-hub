import {createHash} from 'node:crypto';
import {p1ModuleFor} from '../../src/learning/p1RuntimeModulesData.ts';
import {readAuthenticatedProfessorIdentity} from '../../server/professor-preview-identity.ts';
import {resolveP1ProfessorHandoff} from '../../server/p1-professor-handoff.ts';
import type {BoundIdentity} from './professor-admission-contract.ts';
import {prepareWrittenProfessorReference} from './written-professor-reference.ts';
import type {resolveWrittenProfessorPreview} from './resolve-written-professor-preview.ts';

/** Server-owned source preparation used by the read-only Preview diagnostic.
 * Never accepts a browser-authored script, selects a provider, signs a cached
 * object or grants generation admission.
 */
export async function prepareWrittenAudioPreview(...args:Parameters<typeof resolveWrittenProfessorPreview>){
 const [db,input,env]=args;
 const {referenceInput:r}=await readAuthenticatedProfessorIdentity(db,input,env);
 const {lesson,module,course}=r.resolved;
 if(!Number.isSafeInteger(lesson.contentVersion)||lesson.contentVersion<1||lesson.contentVersion>100000)throw Error('written_audio_reference_version_invalid');
 let identity:BoundIdentity,referenceSha256:string,title:string,authoredSections:readonly {title:string;paragraphs:readonly string[];supportPt:string}[];
 if(lesson.sequence===2){
  const handoff=resolveP1ProfessorHandoff({profileTrack:r.profileTrack,requestedTrack:r.requestedTrack,requestedLessonId:r.requestedLessonId,
   resolvedLesson:{id:lesson.id,slug:lesson.slug,learnerTrack:course.learnerTrack,isPublished:lesson.isPublished}});
  const authored=p1ModuleFor(handoff.studyTrack,{id:lesson.id,slug:lesson.slug});
  if(!authored)throw Error('written_audio_reference_missing');
  identity={lessonId:lesson.id,moduleId:module.id,courseId:course.id,lessonSlug:lesson.slug,contentVersion:lesson.contentVersion,
   requestedTrack:r.requestedTrack,studyTrack:handoff.studyTrack,sequence:2};
  referenceSha256=handoff.teachingContent.sha256;title=authored.title;authoredSections=authored.sections;
 }else{
  const reference=await prepareWrittenProfessorReference(r);
  identity=reference.identity;referenceSha256=reference.descriptor.sha256;title=reference.context.title;authoredSections=reference.context.teachingSteps;
 }
 const english=identity.studyTrack==='english';
 const sections=authoredSections.map(s=>{
  const paragraph=english?s.paragraphs[0]:s.supportPt;
  if(typeof paragraph!=='string'||!paragraph.trim())throw Error('written_audio_reference_missing');
  return s.title+'. '+paragraph.trim();
 });
 const opening=english?'Study guide. This is an overview, not the complete lesson.':'Guia de estudo. Este é um resumo de apoio, não a aula completa.';
 const listeningBoundary=english&&identity.sequence===8?'This is listening preparation, not verified Irish-accent audio or a listening assessment.':'';
 const ending=english?'Pause and explain one key idea in your own words. Open the written lesson for the full case and practice.':'Faça uma pausa e explique uma ideia central com suas palavras. Abra a aula escrita para consultar o caso completo e praticar.';
 const script=[opening,title,listeningBoundary,...sections,ending].filter(Boolean).join('\n\n');
 // Reject rather than silently clipping a condition, exception or sentence.
 if(script.length>4000)throw Error('written_audio_script_too_long');
 const language=english?'en':'pt-BR';
 const scriptSha256=createHash('sha256').update(script).digest('hex');
 const sourceFingerprint=createHash('sha256').update(JSON.stringify({identity,language,scriptSha256,policy:'written-study-guide-v1'})).digest('hex');
 return {identity,script,language,characters:script.length,scriptSha256,sourceFingerprint,referenceSha256,
  purpose:'study-guide-overview',providerAdmission:false,includesLearnerDrafts:false,includesWorkedAnswer:false,irishAccentVerified:false} as const;
}

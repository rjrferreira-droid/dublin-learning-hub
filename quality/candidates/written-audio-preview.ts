import {createHash} from 'node:crypto';
import {p1ModuleFor} from '../../src/learning/p1RuntimeModulesData.ts';
import {readAuthenticatedProfessorIdentity} from '../../server/professor-preview-identity.ts';
import {resolveP1ProfessorHandoff} from '../../server/p1-professor-handoff.ts';
import type {BoundIdentity} from './professor-admission-contract.ts';
import {canonicalPremiumAudioIdentity,resolvePremiumAudioRenderRecipe} from './premium-audio-source-contract.ts';
import {prepareWrittenProfessorReference} from './written-professor-reference.ts';
import type {resolveWrittenProfessorPreview} from './resolve-written-professor-preview.ts';

export type WrittenAudioAuthoredSection={title:string;paragraphs:readonly string[];supportPt:string};
export type WrittenAudioSourceInput={
 identity:BoundIdentity;
 referenceSha256:string;
 title:string;
 authoredSections:readonly WrittenAudioAuthoredSection[];
};

/** Pure transformation of an already-authorized, server-owned authored lesson.
 * It deliberately has no database, learner-state, cache, budget or provider access. */
export function buildWrittenAudioPreviewSource(input:WrittenAudioSourceInput){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('written_audio_source_invalid');
 const identity=canonicalPremiumAudioIdentity(input.identity);
 if(typeof input.referenceSha256!=='string'||!/^[a-f0-9]{64}$/.test(input.referenceSha256))throw Error('written_audio_reference_hash_invalid');
 if(typeof input.title!=='string'||!input.title.trim())throw Error('written_audio_title_invalid');
 if(!Array.isArray(input.authoredSections)||input.authoredSections.length===0)throw Error('written_audio_sections_invalid');
 const english=identity.studyTrack==='english';
 const sections=input.authoredSections.map(s=>{
  if(!s||typeof s!=='object'||Array.isArray(s)||typeof s.title!=='string'||!s.title.trim())throw Error('written_audio_section_invalid');
  const paragraph=english?(Array.isArray(s.paragraphs)?s.paragraphs[0]:undefined):s.supportPt;
  if(typeof paragraph!=='string'||!paragraph.trim())throw Error('written_audio_section_invalid');
  return s.title+'. '+paragraph.trim();
 });
 const opening=english?'Study guide. This is an overview, not the complete lesson.':'Guia de estudo. Este é um resumo de apoio, não a aula completa.';
 const listeningBoundary=english&&identity.sequence===8?'This is listening preparation, not verified Irish-accent audio or a listening assessment.':'';
 const ending=english?'Pause and explain one key idea in your own words. Open the written lesson for the full case and practice.':'Faça uma pausa e explique uma ideia central com suas palavras. Abra a aula escrita para consultar o caso completo e praticar.';
 const script=[opening,input.title,listeningBoundary,...sections,ending].filter(Boolean).join('\n\n');
 const characters=Array.from(script).length;
 // Reject rather than silently clipping a condition, exception or sentence.
 if(characters>4000)throw Error('written_audio_script_too_long');
 const language=english?'en':'pt-BR';
 const scriptSha256=createHash('sha256').update(script).digest('hex');
 // The render address covers narration bytes, lesson identity and the complete
 // immutable provider recipe. The wider Professor reference may change in
 // fields that are deliberately not narrated.
 const renderRecipe=resolvePremiumAudioRenderRecipe(language);
 const sourceFingerprint=createHash('sha256').update(JSON.stringify({identity,language,scriptSha256,renderRecipe})).digest('hex');
 return {identity,script,language,characters,scriptSha256,sourceFingerprint,referenceSha256:input.referenceSha256,
  purpose:'study-guide-overview',providerAdmission:false,includesLearnerDrafts:false,includesWorkedAnswer:false,irishAccentVerified:false} as const;
}

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
 return buildWrittenAudioPreviewSource({identity,referenceSha256,title,authoredSections});
}

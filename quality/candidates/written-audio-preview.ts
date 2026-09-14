import {createHash} from 'node:crypto';
import {resolveWrittenProfessorPreview} from './resolve-written-professor-preview.ts';

/** Unmounted source preparation only. Never accepts a browser-authored script,
 * selects a provider, signs a cached object or grants generation admission.
 */
export async function prepareWrittenAudioPreview(...args:Parameters<typeof resolveWrittenProfessorPreview>){
 const reference=await resolveWrittenProfessorPreview(...args);
 const english=reference.identity.studyTrack==='english';
 const sections=reference.context.teachingSteps.map(s=>{
  const paragraph=english?s.paragraphs[0]:s.supportPt;
  if(typeof paragraph!=='string'||!paragraph.trim())throw Error('written_audio_reference_missing');
  return s.title+'. '+paragraph.trim();
 });
 const opening=english?'Study guide. This is an overview, not the complete lesson.':'Guia de estudo. Este é um resumo de apoio, não a aula completa.';
 const listeningBoundary=english&&reference.identity.sequence===8?'This is listening preparation, not verified Irish-accent audio or a listening assessment.':'';
 const ending=english?'Pause and explain one key idea in your own words. Open the written lesson for the full case and practice.':'Faça uma pausa e explique uma ideia central com suas palavras. Abra a aula escrita para consultar o caso completo e praticar.';
 const script=[opening,reference.context.title,listeningBoundary,...sections,ending].filter(Boolean).join('\n\n');
 // Reject rather than silently clipping a condition, exception or sentence.
 if(script.length>4000)throw Error('written_audio_script_too_long');
 const language=english?'en':'pt-BR';
 const scriptSha256=createHash('sha256').update(script).digest('hex');
 const sourceFingerprint=createHash('sha256').update(JSON.stringify({identity:reference.identity,language,scriptSha256,policy:'written-study-guide-v1'})).digest('hex');
 return {identity:reference.identity,script,language,characters:script.length,scriptSha256,sourceFingerprint,referenceSha256:reference.descriptor.sha256,
  purpose:'study-guide-overview',providerAdmission:false,includesLearnerDrafts:false,includesWorkedAnswer:false,irishAccentVerified:false} as const;
}

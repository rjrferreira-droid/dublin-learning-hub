import {createHash} from 'node:crypto';
import {p1ModuleFor} from '../src/learning/p1RuntimeModulesData.ts';
import type {P1Track} from '../src/learning/p1RuntimeRegistry.ts';

export const P1_WRITTEN_CONTEXT_VERSION='p1-written-foundation-2026-09-14-v1';
export const MAX_P1_WRITTEN_CONTEXT_BYTES=24000;
export const MAX_P1_SHARED_BRIEF_CHARACTERS=14000;
const sourceHosts=new Set(['www.ifrs.org','www.frc.org.uk','www.revenue.ie','learnenglish.britishcouncil.org']);
const profileByTrack:Record<P1Track,string>={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};

type P1RequestTrack='rafael_finance'|'viviane_payroll'|'english_academy';
export type P1WrittenContextInput={profileTrack:unknown;requestedTrack:P1RequestTrack;requestedLessonId:string;resolvedLessonId:string;resolvedLessonSlug:string;approachBrief?:string};

function studyTrack(requestedTrack:P1RequestTrack):P1Track{
 if(requestedTrack==='rafael_finance')return 'finance';
 if(requestedTrack==='viviane_payroll')return 'payroll';
 return 'english';
}
function profileAllowed(profileTrack:unknown,requestedTrack:P1RequestTrack){
 if(profileTrack!=='rafael_finance'&&profileTrack!=='viviane_payroll')return false;
 return requestedTrack==='english_academy'||profileTrack===requestedTrack;
}

/** Server-owned reviewed P1 reference; never derived from browser drafts or answers. */
export function buildP1WrittenLessonContext(input:P1WrittenContextInput){
 if(!profileAllowed(input.profileTrack,input.requestedTrack))throw new Error('p1_written_context_track_forbidden');
 if(input.requestedLessonId!==input.resolvedLessonId)throw new Error('p1_written_context_identity_mismatch');
 const track=studyTrack(input.requestedTrack);
 const module=p1ModuleFor(track,{id:input.resolvedLessonId,slug:input.resolvedLessonSlug});
 if(!module)return null;
 if(profileByTrack[track]!==input.requestedTrack)throw new Error('p1_written_context_registry_mismatch');
 for(const source of module.sources){
  const url=new URL(source.url);
  if(url.protocol!=='https:'||!sourceHosts.has(url.hostname)||url.username||url.password)throw new Error('p1_written_context_source_invalid');
 }
 const scope=[
  `SERVER-AUTHORED P1 LESSON REFERENCE (${P1_WRITTEN_CONTEXT_VERSION}).`,module.scope,
  'This packet is authored reference material, not learner evidence.',
  'Do not infer that the learner opened, read or completed any written exercise.',
  'Local drafts, checkpoint answers, hints and reveal actions are not supplied.',
  'Teach one relevant step at a time and ask before revealing a worked answer.',
  'Assess only what the learner actually says in the live session.',
  'Alternative correct wording is valid. Help-seeking and self-correction are not automatic deficits.',
  'Text-only evaluation cannot establish pronunciation, accent, pause timing or acoustic fluency.',
 ].join('\n');
 const sections=module.sections.map(section=>`${section.title}\n${section.paragraphs.join('\n')}\nSource references: ${section.sourceIds.join(', ')||'original teaching guidance'}`).join('\n\n');
 const caseReference=['AUTHORED P1 CASE REFERENCE — not a learner answer:',module.caseStudy.title,...module.caseStudy.scenario,`Task: ${module.caseStudy.task}`,`Model response for teacher/evaluator reference only: ${module.caseStudy.modelAnswer}`,`Review criteria: ${module.caseStudy.reviewChecks.join(' | ')}`].join('\n');
 const references=module.sources.map(source=>`${source.id}: ${source.label}; reviewed ${source.reviewedOn}; ${source.url}; supports: ${source.supports}`).join('\n');
 const technicalBrief=[scope,input.approachBrief??'',sections,caseReference,`OFFICIAL SOURCE REFERENCES\n${references}`].filter(Boolean).join('\n\n');
 const context={title:module.title,objectives:[module.goal,...module.sections.map(section=>`Explain: ${section.title.replace(/^\d+\.\s*/,'')}`).slice(0,6)],technicalBrief,workedExample:caseReference,practiceScenario:[module.caseStudy.title,...module.caseStudy.scenario,`Task: ${module.caseStudy.task}`].join('\n'),interviewAngle:module.caseStudy.transfer,vocabulary:module.terms.map(term=>`${term.term}: ${term.meaning}`)};
 const encoded=JSON.stringify(context),contextBytes=Buffer.byteLength(encoded,'utf8');
 if(technicalBrief.length>MAX_P1_SHARED_BRIEF_CHARACTERS||contextBytes>MAX_P1_WRITTEN_CONTEXT_BYTES)throw new Error('p1_written_context_exceeds_budget');
 return {context,descriptor:{version:P1_WRITTEN_CONTEXT_VERSION,lessonId:module.lessonId,lessonSlug:input.resolvedLessonSlug,track,source:'server-authored-reviewed-p1',sha256:createHash('sha256').update(encoded).digest('hex'),contextBytes,includesLearnerDrafts:false,includesLocalCheckpointResults:false} as const};
}

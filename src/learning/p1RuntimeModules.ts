import type {LessonModule} from './lessonModules';
import finance from '../../quality/drafts/p1-finance-revenue.json';
import payroll from '../../quality/drafts/p1-payroll-submission.json';
import english from '../../quality/drafts/p1-english-meetings.json';

type Draft=typeof finance;
type Track='finance'|'payroll'|'english';
const slugByTrack:Record<Track,string>={
 finance:'revenue-judgement-contracts-performance-obligations-cutoff',
 payroll:'rpn-pay-date-employment-id-payroll-submission',
 english:'clarify-check-understanding-handle-meetings',
};
const drafts:Record<Track,Draft>= {finance, payroll:payroll as unknown as Draft, english:english as unknown as Draft};
function asPair(values:unknown):readonly [string,string]{const a=Array.isArray(values)?values.filter(x=>typeof x==='string').slice(0,2) as string[]:[];return [a[0]??'Start from the supplied facts and identify what is known.',a[1]??'Separate the conclusion from evidence that still needs confirmation.'];}
function moduleFromDraft(track:Track,lessonId:string,draft:Draft):LessonModule{
 const sectionIds=draft.sections.map(s=>s.id);
 return {
  track,lessonId,title:draft.workingTitle,goal:draft.goal,scope:draft.scope,
  sections:draft.sections.map(s=>({id:s.id,title:s.title,paragraphs:s.paragraphs,supportPt:s.supportPt,sourceIds:s.sourceRefs})),
  terms:draft.vocabulary,
  visual:{title:draft.visual.title,note:`Authored ${track} foundation. Use the supplied facts and assumptions; this visual is not a live calculation or external evidence.`,headers:draft.visual.headers as [string,string,string],rows:draft.visual.rows as [string,string,string][],question:draft.visual.question,answer:draft.visual.answer},
  caseStudy:{title:draft.workedCase.title,scenario:draft.workedCase.stage1Facts,task:draft.workedCase.stage1Task,hints:asPair(draft.workedCase.hints),modelAnswer:draft.workedCase.modelAnswer,reviewChecks:draft.workedCase.reviewChecks,transfer:draft.workedCase.transfer},
  checkpoint:draft.checkpoint.map((q,index)=>({id:q.id,prompt:q.prompt,options:q.options,correctIndex:q.correctIndex,explanation:q.explanation,reviewSection:sectionIds[Math.min(index,sectionIds.length-1)]})),
  sources:draft.officialSources.map(s=>({id:s.id,label:s.id.toUpperCase(),url:s.url,supports:s.supports,reviewedOn:draft.reviewedOn})),
  practiceExercises:draft.workshops.map(w=>({id:w.id,question:w.prompt,hints:['Use only the supplied facts; identify the decision before adding detail.','Separate supported conclusions from assumptions or missing evidence.'],answer:w.expected,explanation:'This is one authored reference response. A different answer can be valid if it reaches the same supported conclusion without inventing facts.'})),
 };
}
export function p1ModuleFor(track:Track,lesson:{id:string;slug:string}):LessonModule|null{
 if(slugByTrack[track]!==lesson.slug)return null;
 return moduleFromDraft(track,lesson.id,drafts[track]);
}
export function p1SlugFor(track:Track){return slugByTrack[track];}

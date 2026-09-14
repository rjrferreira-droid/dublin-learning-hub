import type {LessonModule,LessonPracticeExercise,LessonSource,CheckpointQuestion} from './lessonModules.ts';
import {isP1Slug,type P1Track} from './p1RuntimeRegistry.ts';
import finance from '../../quality/drafts/p1-finance-revenue.json' with {type:'json'};
import payroll from '../../quality/drafts/p1-payroll-submission.json' with {type:'json'};
import english from '../../quality/drafts/p1-english-meetings.json' with {type:'json'};

const label=(id:string)=>id.split('-').map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' ');
const sources=(rows:readonly {id:string;url:string;supports:string}[],reviewedOn:string):LessonSource[]=>rows.map(s=>({id:s.id,label:label(s.id),url:s.url,supports:s.supports,reviewedOn}));
const practice=(rows:readonly {id:string;prompt:string;expected:string}[]):LessonPracticeExercise[]=>rows.map(w=>({id:w.id,question:w.prompt,hints:['Use only the supplied facts; identify the decision before adding detail.','Separate supported conclusions from assumptions or missing evidence.'],answer:w.expected,explanation:'This is one authored reference response. A different answer can be valid if it reaches the same supported conclusion without inventing facts.'}));
const checkpoints=(rows:readonly {id:string;prompt:string;options:readonly string[];correctIndex:number;explanation:string}[],sectionIds:readonly string[],explicit?:Readonly<Record<string,string>>):CheckpointQuestion[]=>rows.map((q,index)=>({id:q.id,prompt:q.prompt,options:q.options,correctIndex:q.correctIndex,explanation:q.explanation,reviewSection:explicit?.[q.id]??sectionIds[Math.min(index,sectionIds.length-1)]}));
const pair=(values:readonly string[]):readonly [string,string]=>[values[0]??'Start from the supplied facts and identify what is known.',values[1]??'Separate the conclusion from evidence that still needs confirmation.'];

function financeModule(lessonId:string):LessonModule{
 const sectionIds=finance.sections.map(s=>s.id);
 return {
  track:'finance',lessonId,title:finance.workingTitle,goal:finance.goal,scope:finance.scope,
  sections:finance.sections.map(s=>({id:s.id,title:s.title,paragraphs:s.paragraphs,supportPt:s.supportPt,sourceIds:s.sourceRefs})),
  terms:finance.vocabulary,
  visual:{title:finance.visual.title,note:'Authored finance foundation using fictional facts and amounts; this visual is not a live calculation or external evidence.',headers:finance.visual.headers as [string,string,string],rows:finance.visual.rows as [string,string,string][],question:finance.visual.question,answer:finance.visual.answer},
  caseStudy:{title:finance.workedCase.title,scenario:finance.workedCase.stage1Facts,task:finance.workedCase.stage1Task,hints:pair(finance.workedCase.hints),modelAnswer:finance.workedCase.modelAnswer,reviewChecks:finance.workedCase.reviewChecks,transfer:finance.workedCase.transfer},
  checkpoint:checkpoints(finance.checkpoint,sectionIds),
  sources:sources(finance.officialSources,finance.reviewedOn),
  practiceExercises:practice(finance.workshops),
 };
}

function payrollModule(lessonId:string):LessonModule{
 const sectionIds=payroll.sections.map(s=>s.id);
 return {
  track:'payroll',lessonId,title:payroll.workingTitle,goal:payroll.goal,scope:payroll.scope,
  sections:payroll.sections.map(s=>({id:s.id,title:s.title,paragraphs:s.paragraphs,supportPt:s.supportPt,sourceIds:s.sourceRefs})),
  terms:payroll.vocabulary,
  visual:{title:payroll.visual.title,note:'Authored payroll control map. It organises evidence and does not calculate live PAYE, USC or PRSI.',headers:payroll.visual.headers as [string,string,string],rows:payroll.visual.rows as [string,string,string][],question:payroll.visual.question,answer:payroll.visual.answer},
  caseStudy:{title:payroll.workedCase.title,scenario:payroll.workedCase.facts,task:payroll.workedCase.task,hints:pair(payroll.workedCase.hints),modelAnswer:payroll.workedCase.modelAnswer,reviewChecks:payroll.workedCase.reviewChecks,transfer:payroll.workedCase.employeeFacingTransfer},
  checkpoint:checkpoints(payroll.checkpoint,sectionIds),
  sources:sources(payroll.officialSources,payroll.reviewedOn),
  practiceExercises:practice(payroll.workshops),
 };
}

function englishModule(lessonId:string):LessonModule{
 const sectionIds=english.sections.map(s=>s.id);
 const review:Record<string,string>={
  'eng-meet-q1':'eng-meet-clarify',
  'eng-meet-q2':'eng-meet-view',
  'eng-meet-q3':'eng-meet-repair',
  'eng-meet-q4':'eng-meet-enter',
  'eng-meet-q5':'eng-meet-repair',
 };
 const visualRows:[string,string,string][]=[
  ['Enter',english.usefulLanguage.enter[0],'Join the thread without a prepared mini-speech'],
  ['Clarify',english.usefulLanguage.clarify[0],'Check meaning before challenging an ambiguous point'],
  ['State a view',english.usefulLanguage.disagree[1],'Add a concise evidence-based position'],
  ['Repair',english.usefulLanguage.repair[1],'Correct the wording and keep the exchange moving'],
  ['Close',english.usefulLanguage.close[0],'Name the next check or decision'],
 ];
 return {
  track:'english',lessonId,title:english.workingTitle,goal:english.goal,scope:english.scope,
  sections:english.sections.map(s=>({id:s.id,title:s.title,paragraphs:s.paragraphs,supportPt:s.supportPt,sourceIds:s.sourceRefs})),
  terms:english.vocabulary,
  visual:{title:'A natural meeting contribution',note:english.usefulLanguage.note,headers:['Move','Example','Purpose'],rows:visualRows,question:'What should usually come before challenging an ambiguous statement?',answer:'Clarify or check understanding first. Then state the view that the evidence supports and identify any remaining uncertainty.'},
  caseStudy:{title:english.workedCase.title,scenario:[english.workedCase.meetingContext,`After your clarification, the Professor replies: ${english.workedCase.professorReplyAfterClarification}`],task:english.workedCase.task.join(' '),hints:['Clarify what is confirmed before giving your view.','Preserve the uncertainty and finish with one concrete next check.'],modelAnswer:english.workedCase.modelInteraction.join(' '),reviewChecks:english.workedCase.reviewChecks,transfer:english.workedCase.alternateValidForms},
  checkpoint:checkpoints(english.checkpoint,sectionIds,review),
  sources:sources(english.officialSources,english.reviewedOn),
  practiceExercises:practice(english.workshops),
 };
}

export function p1ModuleFor(track:P1Track,lesson:{id:string;slug:string}):LessonModule|null{
 if(!isP1Slug(track,lesson.slug))return null;
 if(track==='finance')return financeModule(lesson.id);
 if(track==='payroll')return payrollModule(lesson.id);
 return englishModule(lesson.id);
}

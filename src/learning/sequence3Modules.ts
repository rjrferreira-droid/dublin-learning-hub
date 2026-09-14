import type {LessonModule} from './lessonModules.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {isSequence3Slug} from './sequence3Registry.ts';
import finance from '../../quality/drafts/p1-finance-leases.json' with {type:'json'};
import payroll from '../../quality/drafts/p1-payroll-pay-bases.json' with {type:'json'};
import english from '../../quality/drafts/p1-english-variances.json' with {type:'json'};
const drafts={finance,payroll,english};
export function sequence3ModuleFor(track:P1Track,lesson:{id:string;slug:string}):LessonModule|null{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lesson.id)||!isSequence3Slug(track,lesson.slug))return null;
 const d=drafts[track],c=d.workedCase;
 const transfer='transfer' in c?c.transfer:'employeeFacingTransfer' in c?c.employeeFacingTransfer:c.alternateValidForms;
 return {
  track,lessonId:lesson.id,title:d.workingTitle,goal:d.goal,scope:d.scope,
  sections:d.sections.map(s=>({id:s.id,title:s.title,paragraphs:s.paragraphs,supportPt:s.supportPt,sourceIds:s.sourceRefs})),
  terms:d.vocabulary,
  visual:{title:d.visual.title,note:'Authored exercise with fictional inputs. No live calculation, assessed learning or provider call.',headers:d.visual.headers as [string,string,string],rows:d.visual.rows as [string,string,string][],question:d.visual.question,answer:d.visual.answer},
  caseStudy:{title:c.title,scenario:c.facts,task:c.task,hints:[c.hints[0],c.hints[1]],modelAnswer:c.modelAnswer,reviewChecks:c.reviewChecks,transfer},
  checkpoint:d.checkpoint.map((q,i)=>({...q,reviewSection:d.sections[Math.min(i,d.sections.length-1)].id})),
  sources:d.officialSources.map(s=>({...s,label:s.id,reviewedOn:d.reviewedOn})),
  practiceExercises:d.workshops.map(w=>({id:w.id,question:w.prompt,hints:['Identify the supplied facts and the decision.','Keep unsupported conclusions separate from the answer.'],answer:w.expected,explanation:'Authored reference response; another evidence-supported answer may also be valid.'})),
 };
}

import type {LessonModule} from './lessonModules.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {isSequence4Slug} from './sequence4Registry.ts';
import finance from '../../quality/drafts/sequence4-finance.json' with {type:'json'};
import payroll from '../../quality/drafts/sequence4-payroll.json' with {type:'json'};
import english from '../../quality/drafts/sequence4-english.json' with {type:'json'};
const drafts={finance,payroll,english};
/** Written-only references. This registry does not authorize any interactive provider. */
export function sequence4ModuleFor(track:P1Track,lesson:{id:string;slug:string}):LessonModule|null{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lesson.id)||!isSequence4Slug(track,lesson.slug))return null;
 const m=drafts[track].module;
 return {...m,track,lessonId:lesson.id,
  visual:{...m.visual,headers:[m.visual.headers[0],m.visual.headers[1],m.visual.headers[2]],rows:m.visual.rows.map(row=>[row[0],row[1],row[2]])},
  caseStudy:{...m.caseStudy,hints:[m.caseStudy.hints[0],m.caseStudy.hints[1]]},
 };
}

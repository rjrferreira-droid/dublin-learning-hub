import type {LessonModule} from './lessonModules.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {remainingSequenceFor} from './remainingWrittenRegistry.ts';
type AuthoredModule=Omit<LessonModule,'track'|'lessonId'|'visual'|'caseStudy'>&{
 track:string;
 visual:Omit<LessonModule['visual'],'headers'|'rows'>&{headers:string[];rows:string[][]};
 caseStudy:Omit<LessonModule['caseStudy'],'hints'>&{hints:string[]};
};
type Draft={track:string;slug:string;module:AuthoredModule};
/** Exact written identity; no Professor/evaluator/Audio admission is implied. */
export async function loadRemainingModuleFor(track:P1Track,lesson:{id:string;slug:string}):Promise<LessonModule|null>{
 const sequence=remainingSequenceFor(track,lesson.slug);
 if(sequence===null||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lesson.id))return null;
 let d:Draft;
 switch(sequence){
 case 5:d=(await import('./sequence5Drafts.ts')).draftFor(track);break;
 case 6:d=(await import('./sequence6Drafts.ts')).draftFor(track);break;
 case 7:d=(await import('./sequence7Drafts.ts')).draftFor(track);break;
 case 8:d=(await import('./sequence8Drafts.ts')).draftFor(track);break;
 }
 if(d.track!==track||d.module.track!==track||d.slug!==lesson.slug)return null;
 const m=d.module;
 if(m.visual.headers.length!==3||m.visual.rows.some(row=>row.length!==3)||m.caseStudy.hints.length!==2)return null;
 return {...m,track,lessonId:lesson.id,
 visual:{...m.visual,headers:[m.visual.headers[0],m.visual.headers[1],m.visual.headers[2]],rows:m.visual.rows.map(row=>[row[0],row[1],row[2]])},
 caseStudy:{...m.caseStudy,hints:[m.caseStudy.hints[0],m.caseStudy.hints[1]]}};
}

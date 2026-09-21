import type {LessonModule} from './lessonModules.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {isLocalModelLesson} from './localModelLessonRegistry.ts';
import {loadP1ModuleFor} from './p1RuntimeModules.ts';
/** Reviewed local content loader. It performs no publication, persistence or provider operation. */
export async function loadReviewedRuntimeModuleFor(track:P1Track,lesson:{id:string;slug:string}):Promise<LessonModule|null>{
 if(isLocalModelLesson(track,lesson)){const {localModelLessonFor}=await import('./localModelLessonModules.ts');return localModelLessonFor(track,lesson);}
 return loadP1ModuleFor(track,lesson);
}

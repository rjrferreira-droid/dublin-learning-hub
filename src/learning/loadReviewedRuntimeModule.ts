import type {LessonModule} from './lessonModules.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {localModelCodeFor} from './localModelLessonRegistry.ts';
import {loadP1ModuleFor} from './p1RuntimeModules.ts';
/** Reviewed local content loader. It performs no publication, persistence or provider operation. */
export async function loadReviewedRuntimeModuleFor(track:P1Track,lesson:{id:string;slug:string}):Promise<LessonModule|null>{
 const local=localModelCodeFor(track,lesson);
 if(local==='A1'){const {localModelLessonFor}=await import('./localModelLessonModules.ts');return localModelLessonFor(track,lesson);}
 if(local==='A2'){const {localModelA2For}=await import('./localModelLessonA2.ts');return localModelA2For(track,lesson);}
 if(local==='B3'){const {localModelB3For}=await import('./localModelLessonB3.ts');return localModelB3For(track,lesson);}
 if(local==='B4'){const {localModelB4For}=await import('./localModelLessonB4.ts');return localModelB4For(track,lesson);}
 return loadP1ModuleFor(track,lesson);
}

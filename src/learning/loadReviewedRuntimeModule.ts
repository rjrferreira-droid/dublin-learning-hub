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
 if(local==='B5'){const {localModelB5For}=await import('./localModelLessonB5.ts');return localModelB5For(track,lesson);}
 if(local==='B6'){const {localModelB6For}=await import('./localModelLessonB6.ts');return localModelB6For(track,lesson);}
 if(local==='B7'){const {localModelB7For}=await import('./localModelLessonB7.ts');return localModelB7For(track,lesson);}
 if(local==='B8'){const {localModelB8For}=await import('./localModelLessonB8.ts');return localModelB8For(track,lesson);}
 if(local==='B9'){const {localModelB9For}=await import('./localModelLessonB9.ts');return localModelB9For(track,lesson);}
 if(local==='B10'){const {localModelB10For}=await import('./localModelLessonB10.ts');return localModelB10For(track,lesson);}
 return loadP1ModuleFor(track,lesson);
}

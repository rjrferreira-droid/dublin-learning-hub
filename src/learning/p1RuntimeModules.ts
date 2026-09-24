import {isRemainingWrittenSlug} from './remainingWrittenRegistry.ts';
import {isSequence4Slug} from './sequence4Registry.ts';
import {isSequence3Slug} from './sequence3Registry.ts';
import type {LessonModule} from './lessonModules.ts';
import {isP1Slug,p1SlugFor,type P1Track} from './p1RuntimeRegistry.ts';
export {p1SlugFor} from './p1RuntimeRegistry.ts';

/** Lightweight entry point. Reviewed P1 authored payloads are loaded only when a matching P1 is opened. */
export async function loadP1ModuleFor(track:P1Track,lesson:{id:string;slug:string}):Promise<LessonModule|null>{
 if(isRemainingWrittenSlug(track,lesson.slug)){const {loadRemainingModuleFor}=await import('./remainingWrittenModules.ts');return loadRemainingModuleFor(track,lesson);}
 if(isSequence4Slug(track,lesson.slug)){const {sequence4ModuleFor}=await import('./sequence4Modules.ts');return sequence4ModuleFor(track,lesson);}
 if(isSequence3Slug(track,lesson.slug)){const {sequence3ModuleFor}=await import('./sequence3Modules.ts');return sequence3ModuleFor(track,lesson);}
 if(!isP1Slug(track,lesson.slug))return null;
 const {p1ModuleFor}=await import('./p1RuntimeModulesData.ts');
 return p1ModuleFor(track,lesson);
}

export function isReviewedP1(track:P1Track,slug:string){return p1SlugFor(track)===slug;}

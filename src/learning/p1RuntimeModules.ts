import type {LessonModule} from './lessonModules.ts';
import {isP1Slug,p1SlugFor,type P1Track} from './p1RuntimeRegistry.ts';
export {p1SlugFor} from './p1RuntimeRegistry.ts';

/** Lightweight entry point. Reviewed P1 authored payloads are loaded only when a matching P1 is opened. */
export async function loadP1ModuleFor(track:P1Track,lesson:{id:string;slug:string}):Promise<LessonModule|null>{
 if(!isP1Slug(track,lesson.slug))return null;
 const {p1ModuleFor}=await import('./p1RuntimeModulesData.ts');
 return p1ModuleFor(track,lesson);
}

export function isReviewedP1(track:P1Track,slug:string){return p1SlugFor(track)===slug;}

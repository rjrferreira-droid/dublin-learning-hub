import type {LessonModule} from './lessonModules.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {localModelCodeFor} from './localModelLessonRegistry.ts';
import {localEnglishCodeFor} from './localEnglishLessonRegistry.ts';
import {loadP1ModuleFor} from './p1RuntimeModules.ts';
/** Reviewed local content loader. It performs no publication, persistence or provider operation. */
export async function loadReviewedRuntimeModuleFor(track:P1Track,lesson:{id:string;slug:string}):Promise<LessonModule|null>{
 const local=localModelCodeFor(track,lesson);
 const localEnglish=localEnglishCodeFor(track,lesson);
 if(localEnglish==='E1'||localEnglish==='E2'){const {localEnglishLessonFor}=await import('./localEnglishLessonModules.ts');return localEnglishLessonFor(track,lesson);}
 if(localEnglish==='E3'||localEnglish==='E4'){const {localEnglishEverydayExpansionFor}=await import('./localEnglishEverydayExpansion.ts');return localEnglishEverydayExpansionFor(track,lesson);}
 if(localEnglish==='E5'||localEnglish==='P5'){const {localEnglishBalancedExpansionFor}=await import('./localEnglishBalancedExpansion.ts');return localEnglishBalancedExpansionFor(track,lesson);}
 if(localEnglish==='E6'||localEnglish==='E7'||localEnglish==='E8'||localEnglish==='E9'||localEnglish==='E10'){const {localEnglishEverydayMonthExpansionFor}=await import('./localEnglishEverydayMonthExpansion.ts');return localEnglishEverydayMonthExpansionFor(track,lesson);}
 if(localEnglish==='P6'||localEnglish==='P7'||localEnglish==='P8'||localEnglish==='P9'||localEnglish==='P10'){const {localEnglishTechnicalMonthExpansionFor}=await import('./localEnglishTechnicalMonthExpansion.ts');return localEnglishTechnicalMonthExpansionFor(track,lesson);}
 if(localEnglish!==null)return loadP1ModuleFor(track,lesson);
 if(local==='A1'){const {localModelLessonFor}=await import('./localModelLessonModules.ts');return localModelLessonFor(track,lesson);}
 if(local==='A2'){const {localModelA2For}=await import('./localModelLessonA2.ts');return localModelA2For(track,lesson);}
 if(local==='A3'){const {localModelA3For}=await import('./localModelLessonA3.ts');return localModelA3For(track,lesson);}
 if(local==='A4'){const {localModelA4For}=await import('./localModelLessonA4.ts');return localModelA4For(track,lesson);}
 if(local==='B1'){const {localModelB1For}=await import('./localModelLessonB1.ts');return localModelB1For(track,lesson);}
 if(local==='B2'){const {localModelB2For}=await import('./localModelLessonB2.ts');return localModelB2For(track,lesson);}
 if(local==='B3'){const {localModelB3For}=await import('./localModelLessonB3.ts');return localModelB3For(track,lesson);}
 if(local==='B4'){const {localModelB4For}=await import('./localModelLessonB4.ts');return localModelB4For(track,lesson);}
 if(local==='B5'){const {localModelB5For}=await import('./localModelLessonB5.ts');return localModelB5For(track,lesson);}
 if(local==='B6'){const {localModelB6For}=await import('./localModelLessonB6.ts');return localModelB6For(track,lesson);}
 if(local==='B7'){const {localModelB7For}=await import('./localModelLessonB7.ts');return localModelB7For(track,lesson);}
 if(local==='B8'){const {localModelB8For}=await import('./localModelLessonB8.ts');return localModelB8For(track,lesson);}
 if(local==='B9'){const {localModelB9For}=await import('./localModelLessonB9.ts');return localModelB9For(track,lesson);}
 if(local==='B10'){const {localModelB10For}=await import('./localModelLessonB10.ts');return localModelB10For(track,lesson);}
 if(local==='B11'){const {localModelB11For}=await import('./localModelLessonB11.ts');return localModelB11For(track,lesson);}
 if(local==='B12'){const {localModelB12For}=await import('./localModelLessonB12.ts');return localModelB12For(track,lesson);}
 if(local==='C1'){const {localModelC1For}=await import('./localModelLessonC1.ts');return localModelC1For(track,lesson);}
 if(local==='C2'){const {localModelC2For}=await import('./localModelLessonC2.ts');return localModelC2For(track,lesson);}
 if(local==='C3'){const {localModelC3For}=await import('./localModelLessonC3.ts');return localModelC3For(track,lesson);}
 if(local==='C4'){const {localModelC4For}=await import('./localModelLessonC4.ts');return localModelC4For(track,lesson);}
 if(local==='D1'){const {localModelD1For}=await import('./localModelLessonD1.ts');return localModelD1For(track,lesson);}
 if(local==='D2'){const {localModelD2For}=await import('./localModelLessonD2.ts');return localModelD2For(track,lesson);}
 if(local==='E'){const {localModelEFor}=await import('./localModelLessonE.ts');return localModelEFor(track,lesson);}
 return loadP1ModuleFor(track,lesson);
}

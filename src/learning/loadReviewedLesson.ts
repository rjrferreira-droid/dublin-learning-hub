import type {LessonModule} from './lessonModules.ts';
export const WRITTEN_LESSON_TIMEOUT_MS=15000;
type Selection={track:LessonModule['track'];lessonId:string;lessonSlug:string};
export type WrittenLoadResult={status:'ready';module:LessonModule}|{status:'missing'|'unavailable'};
/** Local authored content only; no provider, publication or learner-evidence operation. */
export async function loadReviewedLesson(selection:Selection,load:()=>Promise<LessonModule|null>,signal:AbortSignal):Promise<WrittenLoadResult>{
 const expected={...selection};
 if(signal.aborted)return {status:'unavailable'};
 let stopped=false,stop!:()=>void;
 const cancelled=new Promise<WrittenLoadResult>(resolve=>{stop=()=>{stopped=true;resolve({status:'unavailable'});};});
 signal.addEventListener('abort',stop,{once:true});
 const timer=setTimeout(stop,WRITTEN_LESSON_TIMEOUT_MS);
 const work=async():Promise<WrittenLoadResult>=>{
  try{
   const module=await load();
   if(stopped||signal.aborted)return {status:'unavailable'};
   if(module===null)return {status:'missing'};
   if(module.lessonId!==expected.lessonId||module.track!==expected.track)return {status:'unavailable'};
   return {status:'ready',module};
  }catch{return {status:'unavailable'};}
 };
 try{return await Promise.race([work(),cancelled]);}
 finally{stopped=true;clearTimeout(timer);signal.removeEventListener('abort',stop);}
}

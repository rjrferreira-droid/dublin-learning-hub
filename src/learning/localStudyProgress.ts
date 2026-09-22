export const LOCAL_STUDY_PROGRESS_KEY_PREFIX='learning-hub:local-study-progress:v1';

export type LocalLessonCompletion={completedAt:string;correct:number;total:number};
export type LocalStudyProgress={version:1;lastOpenedLessonId:string|null;completed:Record<string,LocalLessonCompletion>};

const empty=():LocalStudyProgress=>({version:1,lastOpenedLessonId:null,completed:{}});
const validId=(value:unknown)=>typeof value==='string'&&/^[0-9a-z-]{8,80}$/i.test(value);
const validDate=(value:unknown)=>typeof value==='string'&&!Number.isNaN(Date.parse(value));
export const localStudyProgressKey=(scope='default')=>`${LOCAL_STUDY_PROGRESS_KEY_PREFIX}:${/^[0-9a-z-]{1,80}$/i.test(scope)?scope:'default'}`;

export function parseLocalStudyProgress(value:unknown):LocalStudyProgress{
 if(!value||typeof value!=='object'||Array.isArray(value))return empty();
 const raw=value as Record<string,unknown>;
 if(raw.version!==1||!raw.completed||typeof raw.completed!=='object'||Array.isArray(raw.completed))return empty();
 const completed:Record<string,LocalLessonCompletion>={};
 for(const [lessonId,candidate] of Object.entries(raw.completed as Record<string,unknown>)){
  if(!validId(lessonId)||!candidate||typeof candidate!=='object'||Array.isArray(candidate))continue;
  const row=candidate as Record<string,unknown>;
  if(!validDate(row.completedAt)||!Number.isInteger(row.correct)||!Number.isInteger(row.total))continue;
  const correct=row.correct as number,total=row.total as number;
  if(total<1||total>100||correct<0||correct>total)continue;
  completed[lessonId]={completedAt:row.completedAt as string,correct,total};
 }
 return {version:1,lastOpenedLessonId:validId(raw.lastOpenedLessonId)?raw.lastOpenedLessonId as string:null,completed};
}

export function readLocalStudyProgress(storage:Pick<Storage,'getItem'>|null|undefined,scope='default'):LocalStudyProgress{
 if(!storage)return empty();
 try{const raw=storage.getItem(localStudyProgressKey(scope));return raw?parseLocalStudyProgress(JSON.parse(raw)):empty();}catch{return empty();}
}

export function writeLocalStudyProgress(storage:Pick<Storage,'setItem'>|null|undefined,progress:LocalStudyProgress,scope='default'){
 if(!storage)return false;
 try{storage.setItem(localStudyProgressKey(scope),JSON.stringify(progress));return true;}catch{return false;}
}

export function recordLocalLessonOpened(progress:LocalStudyProgress,lessonId:string):LocalStudyProgress{
 return validId(lessonId)?{...progress,lastOpenedLessonId:lessonId}:progress;
}

export function completeLocalLesson(progress:LocalStudyProgress,lessonId:string,correct:number,total:number,completedAt=new Date().toISOString()):LocalStudyProgress{
 if(!validId(lessonId)||!Number.isInteger(correct)||!Number.isInteger(total)||total<1||correct<0||correct>total||!validDate(completedAt))return progress;
 return {...progress,lastOpenedLessonId:lessonId,completed:{...progress.completed,[lessonId]:{completedAt,correct,total}}};
}

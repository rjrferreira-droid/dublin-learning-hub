import type {CatalogLesson,CatalogTrack} from './curriculumCatalogCore.ts';

export const LOCAL_STUDY_PROGRESS_KEY_PREFIX='learning-hub:local-study-progress:v3';
export const LEGACY_V2_LOCAL_STUDY_PROGRESS_KEY_PREFIX='learning-hub:local-study-progress:v2';
export const LEGACY_LOCAL_STUDY_PROGRESS_KEY_PREFIX='learning-hub:local-study-progress:v1';
export const LOCAL_REVIEW_STAGES=['D+1','D+7','D+30'] as const;
export type LocalReviewStage=typeof LOCAL_REVIEW_STAGES[number];
export type LocalLessonCompletion={completedAt:string;correct:number;total:number};
export type LocalReviewCompletion={reviewedAt:string;correct:number;total:number};
export type LocalStudyProgress={version:3;lastOpenedLessonIds:Partial<Record<CatalogTrack,string>>;legacyLastOpenedLessonId:string|null;completed:Record<string,LocalLessonCompletion>;reviews:Record<string,Partial<Record<LocalReviewStage,LocalReviewCompletion>>>};
export type LocalModuleProgress={moduleSequence:number;code:string;label:string;completedCount:number;total:number;percent:number;remainingMinutes:number};
export type LocalCourseProgress={lessons:CatalogLesson[];completedCount:number;total:number;percent:number;nextLesson:CatalogLesson|null;allCompleted:boolean;remainingMinutes:number;completedLast7Days:number;weeklyTarget:number;estimatedWeeksRemaining:number;modules:LocalModuleProgress[]};
export type LocalReviewItem={lesson:CatalogLesson;stage:LocalReviewStage;dueAt:string;status:'due'|'scheduled'};

const DAY_MS=24*60*60*1000;
const REVIEW_DAYS:Record<LocalReviewStage,number>={'D+1':1,'D+7':7,'D+30':30};
const MODULE_LABELS:Record<string,{code:string;label:string}>={
 'acca-fr-conceptual-framework':{code:'A',label:'Framework'},
 'acca-fr-accounting-transactions':{code:'B',label:'Transactions'},
 'acca-fr-analysis-interpretation':{code:'C',label:'Analysis'},
 'acca-fr-financial-statements':{code:'D',label:'Statements'},
 'acca-fr-employability-technology':{code:'E',label:'Employability'},
 'english-everyday':{code:'E',label:'Everyday'},
 'english-professional':{code:'P',label:'Professional'},
};
const empty=():LocalStudyProgress=>({version:3,lastOpenedLessonIds:{},legacyLastOpenedLessonId:null,completed:{},reviews:{}});
const validId=(value:unknown)=>typeof value==='string'&&/^[0-9a-z-]{8,80}$/i.test(value);
const validDate=(value:unknown)=>typeof value==='string'&&!Number.isNaN(Date.parse(value));
const boundedResult=(value:Record<string,unknown>,dateKey:'completedAt'|'reviewedAt')=>{
 if(!validDate(value[dateKey])||!Number.isInteger(value.correct)||!Number.isInteger(value.total))return null;
 const correct=value.correct as number,total=value.total as number;
 if(total<1||total>100||correct<0||correct>total)return null;
 return {[dateKey]:value[dateKey] as string,correct,total};
};
const scopedKey=(prefix:string,scope:string)=>`${prefix}:${/^[0-9a-z-]{1,80}$/i.test(scope)?scope:'default'}`;
export const localStudyProgressKey=(scope='default')=>scopedKey(LOCAL_STUDY_PROGRESS_KEY_PREFIX,scope);
export const legacyV2LocalStudyProgressKey=(scope='default')=>scopedKey(LEGACY_V2_LOCAL_STUDY_PROGRESS_KEY_PREFIX,scope);
export const legacyLocalStudyProgressKey=(scope='default')=>scopedKey(LEGACY_LOCAL_STUDY_PROGRESS_KEY_PREFIX,scope);

export function parseLocalStudyProgress(value:unknown):LocalStudyProgress{
 if(!value||typeof value!=='object'||Array.isArray(value))return empty();
 const raw=value as Record<string,unknown>;
 if((raw.version!==1&&raw.version!==2&&raw.version!==3)||!raw.completed||typeof raw.completed!=='object'||Array.isArray(raw.completed))return empty();
 const completed:Record<string,LocalLessonCompletion>={};
 for(const [lessonId,candidate] of Object.entries(raw.completed as Record<string,unknown>)){
  if(!validId(lessonId)||!candidate||typeof candidate!=='object'||Array.isArray(candidate))continue;
  const result=boundedResult(candidate as Record<string,unknown>,'completedAt');
  if(result)completed[lessonId]=result as LocalLessonCompletion;
 }
 const reviews:LocalStudyProgress['reviews']={};
 if((raw.version===2||raw.version===3)&&raw.reviews&&typeof raw.reviews==='object'&&!Array.isArray(raw.reviews))for(const [lessonId,candidate] of Object.entries(raw.reviews as Record<string,unknown>)){
  if(!validId(lessonId)||!completed[lessonId]||!candidate||typeof candidate!=='object'||Array.isArray(candidate))continue;
  const row=candidate as Record<string,unknown>,parsed:Partial<Record<LocalReviewStage,LocalReviewCompletion>>={};
  for(const stage of LOCAL_REVIEW_STAGES){const attempt=row[stage];if(!attempt||typeof attempt!=='object'||Array.isArray(attempt))continue;const result=boundedResult(attempt as Record<string,unknown>,'reviewedAt');if(result)parsed[stage]=result as LocalReviewCompletion;}
  if(Object.keys(parsed).length)reviews[lessonId]=parsed;
 }
 const lastOpenedLessonIds:LocalStudyProgress['lastOpenedLessonIds']={};
 if(raw.version===3&&raw.lastOpenedLessonIds&&typeof raw.lastOpenedLessonIds==='object'&&!Array.isArray(raw.lastOpenedLessonIds))for(const track of ['finance','payroll','english'] as const){const id=(raw.lastOpenedLessonIds as Record<string,unknown>)[track];if(validId(id))lastOpenedLessonIds[track]=id as string;}
 const legacyLastOpenedLessonId=raw.version===3?(validId(raw.legacyLastOpenedLessonId)?raw.legacyLastOpenedLessonId as string:null):(validId(raw.lastOpenedLessonId)?raw.lastOpenedLessonId as string:null);
 return {version:3,lastOpenedLessonIds,legacyLastOpenedLessonId,completed,reviews};
}

export function readLocalStudyProgress(storage:Pick<Storage,'getItem'>|null|undefined,scope='default'):LocalStudyProgress{
 if(!storage)return empty();
 try{const raw=storage.getItem(localStudyProgressKey(scope))??storage.getItem(legacyV2LocalStudyProgressKey(scope))??storage.getItem(legacyLocalStudyProgressKey(scope));return raw?parseLocalStudyProgress(JSON.parse(raw)):empty();}catch{return empty();}
}

export function writeLocalStudyProgress(storage:Pick<Storage,'setItem'>|null|undefined,progress:LocalStudyProgress,scope='default'){
 if(!storage)return false;
 try{storage.setItem(localStudyProgressKey(scope),JSON.stringify(progress));return true;}catch{return false;}
}

export function mergeLocalStudyProgress(primary:LocalStudyProgress,secondary:LocalStudyProgress):LocalStudyProgress{
 const left=parseLocalStudyProgress(primary),right=parseLocalStudyProgress(secondary);
 const completed:LocalStudyProgress['completed']={...right.completed};
 for(const [lessonId,candidate] of Object.entries(left.completed)){
  const existing=completed[lessonId];
  if(!existing||Date.parse(candidate.completedAt)>=Date.parse(existing.completedAt))completed[lessonId]=candidate;
 }
 const reviews:LocalStudyProgress['reviews']={};
 for(const lessonId of new Set([...Object.keys(right.reviews),...Object.keys(left.reviews)])){
  if(!completed[lessonId])continue;
  const merged:Partial<Record<LocalReviewStage,LocalReviewCompletion>>={};
  for(const stage of LOCAL_REVIEW_STAGES){
   const a=left.reviews[lessonId]?.[stage],b=right.reviews[lessonId]?.[stage];
   if(a&&b)merged[stage]=Date.parse(a.reviewedAt)>=Date.parse(b.reviewedAt)?a:b;
   else if(a||b)merged[stage]=(a??b)!;
  }
  if(Object.keys(merged).length)reviews[lessonId]=merged;
 }
 return parseLocalStudyProgress({version:3,lastOpenedLessonIds:{...right.lastOpenedLessonIds,...left.lastOpenedLessonIds},legacyLastOpenedLessonId:left.legacyLastOpenedLessonId??right.legacyLastOpenedLessonId,completed,reviews});
}

export function recordLocalLessonOpened(progress:LocalStudyProgress,lessonId:string,track:CatalogTrack):LocalStudyProgress{
 return validId(lessonId)?{...progress,lastOpenedLessonIds:{...progress.lastOpenedLessonIds,[track]:lessonId}}:progress;
}

export function lastOpenedLocalLessonId(progress:LocalStudyProgress,track:CatalogTrack){return progress.lastOpenedLessonIds[track]??progress.legacyLastOpenedLessonId;}

export function completeLocalLesson(progress:LocalStudyProgress,lessonId:string,correct:number,total:number,completedAt=new Date().toISOString()):LocalStudyProgress{
 if(progress.completed[lessonId]||!validId(lessonId)||!Number.isInteger(correct)||!Number.isInteger(total)||total<1||correct<0||correct>total||!validDate(completedAt))return progress;
 return {...progress,completed:{...progress.completed,[lessonId]:{completedAt,correct,total}}};
}

export function completeLocalReview(progress:LocalStudyProgress,lessonId:string,stage:LocalReviewStage,correct:number,total:number,reviewedAt=new Date().toISOString()):LocalStudyProgress{
 const completion=progress.completed[lessonId];
 if(!completion||!LOCAL_REVIEW_STAGES.includes(stage)||progress.reviews[lessonId]?.[stage]||!Number.isInteger(correct)||!Number.isInteger(total)||total<1||correct<0||correct>total||!validDate(reviewedAt)||Date.parse(reviewedAt)<Date.parse(completion.completedAt)+REVIEW_DAYS[stage]*DAY_MS)return progress;
 return {...progress,reviews:{...progress.reviews,[lessonId]:{...progress.reviews[lessonId],[stage]:{reviewedAt,correct,total}}}};
}

export function summarizeLocalCourse(catalog:readonly CatalogLesson[],progress:LocalStudyProgress,track:CatalogTrack,now=new Date()):LocalCourseProgress{
 const lessons=catalog.filter(lesson=>lesson.origin==='local-model'&&lesson.track===track).sort((a,b)=>a.moduleSequence-b.moduleSequence||a.sequence-b.sequence||a.slug.localeCompare(b.slug));
 const completedCount=lessons.filter(lesson=>progress.completed[lesson.id]).length;
 const resumeId=lastOpenedLocalLessonId(progress,track);
 const resumeLesson=lessons.find(lesson=>lesson.id===resumeId&&!progress.completed[lesson.id]);
 const nextLesson=resumeLesson??lessons.find(lesson=>!progress.completed[lesson.id])??lessons.at(-1)??null;
 const total=lessons.length,weekStart=now.getTime()-7*DAY_MS;
 const completedLast7Days=lessons.filter(lesson=>{const at=Date.parse(progress.completed[lesson.id]?.completedAt??'');return Number.isFinite(at)&&at>=weekStart&&at<=now.getTime();}).length;
 const remainingMinutes=lessons.filter(lesson=>!progress.completed[lesson.id]).reduce((sum,lesson)=>sum+lesson.estimatedMinutes,0);
 const moduleMap=new Map<number,LocalModuleProgress>();
 for(const lesson of lessons){const label=MODULE_LABELS[lesson.moduleSlug]??{code:String(lesson.moduleSequence),label:lesson.moduleSlug};const current=moduleMap.get(lesson.moduleSequence)??{moduleSequence:lesson.moduleSequence,...label,completedCount:0,total:0,percent:0,remainingMinutes:0};current.total++;if(progress.completed[lesson.id])current.completedCount++;else current.remainingMinutes+=lesson.estimatedMinutes;current.percent=Math.round(current.completedCount/current.total*100);moduleMap.set(lesson.moduleSequence,current);}
 const weeklyTarget=3;
 return {lessons,completedCount,total,percent:total?Math.round(completedCount/total*100):0,nextLesson,allCompleted:total>0&&completedCount===total,remainingMinutes,completedLast7Days,weeklyTarget,estimatedWeeksRemaining:Math.ceil((total-completedCount)/weeklyTarget),modules:[...moduleMap.values()]};
}

export function buildLocalReviewSchedule(catalog:readonly CatalogLesson[],progress:LocalStudyProgress,now=new Date(),track:CatalogTrack='finance'):LocalReviewItem[]{
 const items:LocalReviewItem[]=[];
 for(const lesson of catalog.filter(item=>item.origin==='local-model'&&item.track===track)){const completion=progress.completed[lesson.id];if(!completion)continue;const completedAt=Date.parse(completion.completedAt);if(!Number.isFinite(completedAt))continue;for(const stage of LOCAL_REVIEW_STAGES){if(progress.reviews[lesson.id]?.[stage])continue;const dueAt=new Date(completedAt+REVIEW_DAYS[stage]*DAY_MS);items.push({lesson,stage,dueAt:dueAt.toISOString(),status:dueAt.getTime()<=now.getTime()?'due':'scheduled'});}}
 return items.sort((a,b)=>(a.status==='due'?0:1)-(b.status==='due'?0:1)||Date.parse(a.dueAt)-Date.parse(b.dueAt)||a.lesson.sequence-b.lesson.sequence);
}

export function localLessonAfter(catalog:readonly CatalogLesson[],currentLessonId:string):CatalogLesson|null{
 const current=catalog.find(lesson=>lesson.origin==='local-model'&&lesson.id===currentLessonId);
 if(!current)return null;
 const lessons=catalog.filter(lesson=>lesson.origin==='local-model'&&lesson.track===current.track).sort((a,b)=>a.moduleSequence-b.moduleSequence||a.sequence-b.sequence||a.slug.localeCompare(b.slug));
 const index=lessons.findIndex(lesson=>lesson.id===currentLessonId);
 return index>=0?lessons[index+1]??null:null;
}

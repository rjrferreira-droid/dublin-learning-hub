import {supabase} from './supabase.js';
export type CatalogTrack='finance'|'payroll'|'english';
export type CatalogLesson={id:string;slug:string;title:string;subtitle:string|null;sequence:number;moduleSequence:number;estimatedMinutes:number;track:CatalogTrack;moduleSlug:string;courseSlug:string};
const trackByLearner:Record<string,CatalogTrack>={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
const int=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max?v:null;
export type CatalogRows={courses:unknown[];modules:unknown[];lessons:unknown[]};
/** Pure row assembler. Published-only filtering remains in the query; malformed relationships fail closed. */
export function buildCurriculumCatalog(rows:CatalogRows):CatalogLesson[]{
 const courses=new Map<string,{slug:string;track:CatalogTrack}>();
 for(const raw of rows.courses){const r=raw as Record<string,unknown>;const id=text(r.id,80),slug=text(r.slug,120),track=typeof r.learner_track==='string'?trackByLearner[r.learner_track]:undefined;if(id&&uuid.test(id)&&slug&&track)courses.set(id,{slug,track});}
 const modules=new Map<string,{courseId:string;slug:string;sequence:number}>();
 for(const raw of rows.modules){const r=raw as Record<string,unknown>;const id=text(r.id,80),courseId=text(r.course_id,80),slug=text(r.slug,120),sequence=int(r.sequence,1,1000);if(id&&uuid.test(id)&&courseId&&uuid.test(courseId)&&slug&&sequence!==null&&courses.has(courseId))modules.set(id,{courseId,slug,sequence});}
 const lessons:CatalogLesson[]=[];const seenIds=new Set<string>(),seenTrackSlug=new Set<string>();
 for(const raw of rows.lessons){const r=raw as Record<string,unknown>;const id=text(r.id,80),moduleId=text(r.module_id,80),slug=text(r.slug,180),title=text(r.title,240),subtitle=r.subtitle===null?null:text(r.subtitle,320),sequence=int(r.sequence,1,10000),minutes=int(r.estimated_minutes,1,600);const module=moduleId?modules.get(moduleId):undefined;if(!id||!uuid.test(id)||!module||!slug||!title||sequence===null||minutes===null)continue;const course=courses.get(module.courseId)!;const key=course.track+':'+slug;if(seenIds.has(id)||seenTrackSlug.has(key))throw new Error('catalog_duplicate_identity');seenIds.add(id);seenTrackSlug.add(key);lessons.push({id,slug,title,subtitle,sequence,moduleSequence:module.sequence,estimatedMinutes:minutes,track:course.track,moduleSlug:module.slug,courseSlug:course.slug});}
 return lessons.sort((a,b)=>a.track.localeCompare(b.track)||a.moduleSequence-b.moduleSequence||a.sequence-b.sequence||a.slug.localeCompare(b.slug));
}
export function lessonsForTrack(catalog:readonly CatalogLesson[],track:CatalogTrack){return catalog.filter(x=>x.track===track);}
/** First published lesson without a measured completed/abandoned session; otherwise last published lesson. */
export function chooseNextPublishedLesson(catalog:readonly CatalogLesson[],track:CatalogTrack,measuredLessonIds:ReadonlySet<string>):CatalogLesson|null{
 const lessons=lessonsForTrack(catalog,track);if(!lessons.length)return null;return lessons.find(x=>!measuredLessonIds.has(x.id))??lessons.at(-1)!;
}
export async function loadPublishedCurriculumCatalog(signal?:AbortSignal):Promise<CatalogLesson[]>{
 const courseResult=await supabase.from('courses').select('id,slug,learner_track').in('learner_track',['rafael_finance','viviane_payroll','english_academy']).eq('is_active',true).abortSignal(signal??new AbortController().signal);
 if(courseResult.error)throw new Error('catalog_courses_unavailable');const courses=courseResult.data??[];const courseIds=courses.map((x:any)=>x.id).filter((x:unknown):x is string=>typeof x==='string');if(!courseIds.length)return [];
 const moduleResult=await supabase.from('modules').select('id,course_id,slug,sequence').in('course_id',courseIds).eq('is_published',true).abortSignal(signal??new AbortController().signal);
 if(moduleResult.error)throw new Error('catalog_modules_unavailable');const modules=moduleResult.data??[];const moduleIds=modules.map((x:any)=>x.id).filter((x:unknown):x is string=>typeof x==='string');if(!moduleIds.length)return [];
 const lessonResult=await supabase.from('lessons').select('id,module_id,slug,title,subtitle,sequence,estimated_minutes').in('module_id',moduleIds).eq('is_published',true).abortSignal(signal??new AbortController().signal);
 if(lessonResult.error)throw new Error('catalog_lessons_unavailable');return buildCurriculumCatalog({courses,modules,lessons:lessonResult.data??[]});
}

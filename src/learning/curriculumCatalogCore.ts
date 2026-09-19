export type CatalogTrack='finance'|'payroll'|'english';
export type CatalogLesson={id:string;slug:string;title:string;subtitle:string|null;sequence:number;moduleSequence:number;estimatedMinutes:number;track:CatalogTrack;moduleSlug:string;courseSlug:string};
export type CatalogRows={courses:unknown[];modules:unknown[];lessons:unknown[]};
const trackByLearner:Record<string,CatalogTrack>={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
const int=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max?v:null;
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
export function chooseNextPublishedLesson(catalog:readonly CatalogLesson[],track:CatalogTrack,measuredLessonIds:ReadonlySet<string>):CatalogLesson|null{
 const lessons=lessonsForTrack(catalog,track);if(!lessons.length)return null;return lessons.find(x=>!measuredLessonIds.has(x.id))??lessons.at(-1)!;
}

import {supabase} from './supabase';
import {buildCurriculumCatalog,type CatalogLesson} from '../learning/curriculumCatalogCore';
export type {CatalogLesson,CatalogTrack,CatalogRows} from '../learning/curriculumCatalogCore';
export {buildCurriculumCatalog,lessonsForTrack,chooseNextPublishedLesson} from '../learning/curriculumCatalogCore';
export async function loadPublishedCurriculumCatalog(signal?:AbortSignal):Promise<CatalogLesson[]>{
 const controller=signal?null:new AbortController();const activeSignal=signal??controller!.signal;
 const courseResult=await supabase.from('courses').select('id,slug,learner_track').in('learner_track',['rafael_finance','viviane_payroll','english_academy']).eq('is_active',true).abortSignal(activeSignal);
 if(courseResult.error)throw new Error('catalog_courses_unavailable');const courses=courseResult.data??[];const courseIds=courses.map((x:any)=>x.id).filter((x:unknown):x is string=>typeof x==='string');if(!courseIds.length)return [];
 const moduleResult=await supabase.from('modules').select('id,course_id,slug,sequence').in('course_id',courseIds).eq('is_published',true).abortSignal(activeSignal);
 if(moduleResult.error)throw new Error('catalog_modules_unavailable');const modules=moduleResult.data??[];const moduleIds=modules.map((x:any)=>x.id).filter((x:unknown):x is string=>typeof x==='string');if(!moduleIds.length)return [];
 const lessonResult=await supabase.from('lessons').select('id,module_id,slug,title,subtitle,sequence,estimated_minutes').in('module_id',moduleIds).eq('is_published',true).abortSignal(activeSignal);
 if(lessonResult.error)throw new Error('catalog_lessons_unavailable');return buildCurriculumCatalog({courses,modules,lessons:lessonResult.data??[]});
}

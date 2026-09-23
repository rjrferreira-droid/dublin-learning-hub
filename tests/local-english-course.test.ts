import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_E1_MODEL_SLUG,ENGLISH_E2_MODEL_ID,ENGLISH_E2_MODEL_SLUG,ENGLISH_E3_MODEL_ID,ENGLISH_E3_MODEL_SLUG,ENGLISH_E4_MODEL_ID,ENGLISH_E4_MODEL_SLUG,ENGLISH_E5_MODEL_ID,ENGLISH_E5_MODEL_SLUG,ENGLISH_P5_MODEL_ID,ENGLISH_P5_MODEL_SLUG,LOCAL_ENGLISH_LESSONS,localEnglishCodeFor} from '../src/learning/localEnglishLessonRegistry.ts';
import {ENGLISH_E1_MODEL_MODULE,ENGLISH_E2_MODEL_MODULE} from '../src/learning/localEnglishLessonModules.ts';
import {ENGLISH_E3_MODEL_MODULE,ENGLISH_E4_MODEL_MODULE} from '../src/learning/localEnglishEverydayExpansion.ts';
import {ENGLISH_E5_MODEL_MODULE,ENGLISH_P5_MODEL_MODULE} from '../src/learning/localEnglishBalancedExpansion.ts';
import {ENGLISH_EVERYDAY_MONTH_MODULES} from '../src/learning/localEnglishEverydayMonthExpansion.ts';
import {ENGLISH_TECHNICAL_MONTH_MODULES} from '../src/learning/localEnglishTechnicalMonthExpansion.ts';
import {ENGLISH_MONTH_DIRECTION,ENGLISH_MONTH_PLAN} from '../src/learning/englishMonthPlan.ts';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('local English month is twenty ordered lessons with an exact everyday/technical balance',()=>{
 assert.equal(LOCAL_ENGLISH_LESSONS.length,20);
 assert.deepEqual(LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.sequence),Array.from({length:20},(_,index)=>index+1));
 assert.equal(LOCAL_ENGLISH_LESSONS.filter(lesson=>lesson.moduleSlug==='english-everyday').length,10);
 assert.equal(LOCAL_ENGLISH_LESSONS.filter(lesson=>lesson.moduleSlug==='english-professional').length,10);
 assert.deepEqual([...new Set(LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.moduleSequence))],[1,2]);
 for(const lesson of LOCAL_ENGLISH_LESSONS){
  assert.match(lesson.id,UUID);assert.equal(lesson.track,'english');assert.equal(lesson.origin,'local-model');assert.equal(lesson.courseSlug,'english-balanced-local');
 }
});

test('four-week plan uses every authored lesson once and stays exactly balanced',()=>{
 assert.equal(ENGLISH_MONTH_PLAN.length,20);
 assert.deepEqual([...new Set(ENGLISH_MONTH_PLAN.map(item=>item.week))],[1,2,3,4]);
 for(const week of [1,2,3,4])assert.deepEqual(ENGLISH_MONTH_PLAN.filter(item=>item.week===week).map(item=>item.day),[1,2,3,4,5]);
 assert.equal(ENGLISH_MONTH_PLAN.filter(item=>item.strand==='everyday').length,10);
 assert.equal(ENGLISH_MONTH_PLAN.filter(item=>item.strand==='technical').length,10);
 assert.equal(new Set(ENGLISH_MONTH_PLAN.map(item=>item.lesson)).size,20);
 assert.deepEqual(new Set(ENGLISH_MONTH_PLAN.map(item=>item.lesson)),new Set(['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','P1','P2','P3','P4','P5','P6','P7','P8','P9','P10']));
 assert.deepEqual(ENGLISH_MONTH_DIRECTION.split,{everydayPct:50,technicalPct:50});
 assert.deepEqual(ENGLISH_MONTH_DIRECTION.technicalDomains,['finance','accounting','tax','legal-compliance','payroll','treasury']);
 assert.equal(ENGLISH_MONTH_DIRECTION.dublinRole,'occasional-context-not-curriculum-centre');
});

test('local English identity matching is exact and fails closed',()=>{
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG}),'E1');
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E2_MODEL_ID,slug:ENGLISH_E2_MODEL_SLUG}),'E2');
 assert.equal(localEnglishCodeFor('finance',{id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG}),null);
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E2_MODEL_SLUG}),null);
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E2_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG}),null);
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E3_MODEL_ID,slug:ENGLISH_E3_MODEL_SLUG}),'E3');
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E4_MODEL_ID,slug:ENGLISH_E4_MODEL_SLUG}),'E4');
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E5_MODEL_ID,slug:ENGLISH_E5_MODEL_SLUG}),'E5');
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_P5_MODEL_ID,slug:ENGLISH_P5_MODEL_SLUG}),'P5');
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E5_MODEL_ID,slug:ENGLISH_P5_MODEL_SLUG}),null);
 assert.deepEqual(LOCAL_ENGLISH_LESSONS.map(lesson=>localEnglishCodeFor('english',lesson)),ENGLISH_MONTH_PLAN.map(day=>day.lesson));
});

test('all five everyday modules have the complete written lesson contract',()=>{
 for(const module of [ENGLISH_E1_MODEL_MODULE,ENGLISH_E2_MODEL_MODULE,ENGLISH_E3_MODEL_MODULE,ENGLISH_E4_MODEL_MODULE,ENGLISH_E5_MODEL_MODULE]){
  assert.equal(module.track,'english');assert.equal(module.sections.length,4);assert.equal(module.terms.length,6);assert.equal(module.checkpoint.length,5);assert.equal(module.practiceExercises?.length,3);
  assert.ok(module.sections.every(section=>section.supportPt));assert.ok(module.sections.some(section=>section.sourceIds.length));assert.ok(module.sources.length);assert.ok(module.sources.every(source=>source.url.startsWith('https://')));
 }
 assert.equal(ENGLISH_E1_MODEL_MODULE.lessonId,ENGLISH_E1_MODEL_ID);assert.equal(ENGLISH_E2_MODEL_MODULE.lessonId,ENGLISH_E2_MODEL_ID);
 assert.equal(ENGLISH_E3_MODEL_MODULE.lessonId,ENGLISH_E3_MODEL_ID);assert.equal(ENGLISH_E4_MODEL_MODULE.lessonId,ENGLISH_E4_MODEL_ID);
 assert.equal(ENGLISH_E5_MODEL_MODULE.lessonId,ENGLISH_E5_MODEL_ID);
 assert.match(ENGLISH_E2_MODEL_MODULE.scope,/does not.*assess listening or pronunciation/i);
});

test('new professional interview module has the complete written lesson contract',()=>{
 assert.equal(ENGLISH_P5_MODEL_MODULE.track,'english');assert.equal(ENGLISH_P5_MODEL_MODULE.lessonId,ENGLISH_P5_MODEL_ID);
 assert.equal(ENGLISH_P5_MODEL_MODULE.sections.length,4);assert.equal(ENGLISH_P5_MODEL_MODULE.terms.length,6);assert.equal(ENGLISH_P5_MODEL_MODULE.checkpoint.length,5);assert.equal(ENGLISH_P5_MODEL_MODULE.practiceExercises?.length,3);
 assert.ok(ENGLISH_P5_MODEL_MODULE.sections.every(section=>section.supportPt));assert.ok(ENGLISH_P5_MODEL_MODULE.sections.some(section=>section.sourceIds.length));assert.ok(ENGLISH_P5_MODEL_MODULE.sources.length);
});

test('ten new monthly lessons have the complete written lesson contract',()=>{
 for(const module of [...ENGLISH_EVERYDAY_MONTH_MODULES,...ENGLISH_TECHNICAL_MONTH_MODULES]){
  assert.equal(module.track,'english');assert.equal(module.sections.length,4);assert.equal(module.terms.length,6);assert.equal(module.checkpoint.length,5);assert.equal(module.practiceExercises?.length,3);
  assert.ok(module.sections.every(section=>section.supportPt));assert.ok(module.sections.some(section=>section.sourceIds.length));assert.ok(module.sources.length);assert.ok(module.sources.every(source=>source.url.startsWith('https://')));
  assert.ok(module.caseStudy.reviewChecks.length>=4);assert.equal(new Set(module.checkpoint.map(item=>item.id)).size,5);
 }
 assert.equal(ENGLISH_EVERYDAY_MONTH_MODULES.length,5);assert.equal(ENGLISH_TECHNICAL_MONTH_MODULES.length,5);
 assert.ok(ENGLISH_TECHNICAL_MONTH_MODULES.every(module=>/not |does not |is not /i.test(module.scope)));
});

test('all twenty balanced lessons resolve through the reviewed lazy loader',async()=>{
 const modules=await Promise.all(LOCAL_ENGLISH_LESSONS.map(lesson=>loadReviewedRuntimeModuleFor('english',lesson)));
 assert.ok(modules.every(Boolean));assert.deepEqual(modules.map(module=>module?.lessonId),LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.id));assert.deepEqual(modules.map(module=>module?.title),LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.title));
});

test('local English additions contain no network, database, voice or paid-provider path',async()=>{
 const sources=await Promise.all(['../src/learning/localEnglishLessonRegistry.ts','../src/learning/localEnglishLessonModules.ts','../src/learning/localEnglishEverydayExpansion.ts','../src/learning/localEnglishBalancedExpansion.ts','../src/learning/localEnglishEverydayMonthExpansion.ts','../src/learning/localEnglishTechnicalMonthExpansion.ts','../src/learning/englishMonthPlan.ts','../src/learning/loadReviewedRuntimeModule.ts'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 const joined=sources.join('\n');
 for(const forbidden of ['supabase.','fetch(','.insert(','.update(','functions.invoke','connectProfessor(','PremiumAudioPanel'])assert.equal(joined.includes(forbidden),false,forbidden);
});

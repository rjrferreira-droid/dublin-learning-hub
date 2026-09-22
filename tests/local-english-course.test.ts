import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_E1_MODEL_SLUG,ENGLISH_E2_MODEL_ID,ENGLISH_E2_MODEL_SLUG,LOCAL_ENGLISH_LESSONS,localEnglishCodeFor} from '../src/learning/localEnglishLessonRegistry.ts';
import {ENGLISH_E1_MODEL_MODULE,ENGLISH_E2_MODEL_MODULE} from '../src/learning/localEnglishLessonModules.ts';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('local English core is four ordered lessons with an exact everyday/professional balance',()=>{
 assert.equal(LOCAL_ENGLISH_LESSONS.length,4);
 assert.deepEqual(LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.sequence),[1,2,3,4]);
 assert.equal(LOCAL_ENGLISH_LESSONS.filter(lesson=>lesson.moduleSlug==='english-everyday').length,2);
 assert.equal(LOCAL_ENGLISH_LESSONS.filter(lesson=>lesson.moduleSlug==='english-professional').length,2);
 assert.deepEqual([...new Set(LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.moduleSequence))],[1,2]);
 for(const lesson of LOCAL_ENGLISH_LESSONS){
  assert.match(lesson.id,UUID);assert.equal(lesson.track,'english');assert.equal(lesson.origin,'local-model');assert.equal(lesson.courseSlug,'english-balanced-local');
 }
});

test('local English identity matching is exact and fails closed',()=>{
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG}),'E1');
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E2_MODEL_ID,slug:ENGLISH_E2_MODEL_SLUG}),'E2');
 assert.equal(localEnglishCodeFor('finance',{id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG}),null);
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E2_MODEL_SLUG}),null);
 assert.equal(localEnglishCodeFor('english',{id:ENGLISH_E2_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG}),null);
});

test('both everyday modules have the complete written lesson contract',()=>{
 for(const module of [ENGLISH_E1_MODEL_MODULE,ENGLISH_E2_MODEL_MODULE]){
  assert.equal(module.track,'english');assert.equal(module.sections.length,4);assert.equal(module.terms.length,6);assert.equal(module.checkpoint.length,5);assert.equal(module.practiceExercises?.length,3);
  assert.ok(module.sections.every(section=>section.supportPt));assert.ok(module.sections.some(section=>section.sourceIds.length));assert.ok(module.sources.length);assert.ok(module.sources.every(source=>source.url.startsWith('https://')));
 }
 assert.equal(ENGLISH_E1_MODEL_MODULE.lessonId,ENGLISH_E1_MODEL_ID);assert.equal(ENGLISH_E2_MODEL_MODULE.lessonId,ENGLISH_E2_MODEL_ID);
 assert.match(ENGLISH_E2_MODEL_MODULE.scope,/does not.*assess listening or pronunciation/i);
});

test('all four balanced lessons resolve through the reviewed lazy loader',async()=>{
 const modules=await Promise.all(LOCAL_ENGLISH_LESSONS.map(lesson=>loadReviewedRuntimeModuleFor('english',lesson)));
 assert.ok(modules.every(Boolean));assert.deepEqual(modules.map(module=>module?.lessonId),LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.id));assert.deepEqual(modules.map(module=>module?.title),LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.title));
});

test('local English additions contain no network, database, voice or paid-provider path',async()=>{
 const sources=await Promise.all(['../src/learning/localEnglishLessonRegistry.ts','../src/learning/localEnglishLessonModules.ts','../src/learning/loadReviewedRuntimeModule.ts'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
 const joined=sources.join('\n');
 for(const forbidden of ['supabase.','fetch(','.insert(','.update(','functions.invoke','connectProfessor(','PremiumAudioPanel'])assert.equal(joined.includes(forbidden),false,forbidden);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadReviewedLesson,WRITTEN_LESSON_TIMEOUT_MS} from '../src/learning/loadReviewedLesson.ts';
const selection={track:'finance' as const,lessonId:'lesson',lessonSlug:'reviewed'};
const module:any={track:'finance',lessonId:'lesson'};
test('distinguishes absent authored module from a transport failure',async()=>{
 const signal=new AbortController().signal;
 assert.deepEqual(await loadReviewedLesson(selection,async()=>null,signal),{status:'missing'});
 assert.deepEqual(await loadReviewedLesson(selection,async()=>{throw Error('private');},signal),{status:'unavailable'});
 assert.deepEqual(await loadReviewedLesson(selection,async()=>module,signal),{status:'ready',module});
});
test('wrong lesson or track cannot appear as loaded content',async()=>{
 for(const changed of [{lessonId:'other'},{track:'payroll'}])assert.deepEqual(await loadReviewedLesson(selection,async()=>({...module,...changed}),new AbortController().signal),{status:'unavailable'});
});
test('timeout stops waiting without automatic retry or accepting late content',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let calls=0,finish!:(v:any)=>void;
 const pending=loadReviewedLesson(selection,()=>{calls++;return new Promise(resolve=>{finish=resolve;});},new AbortController().signal);
 t.mock.timers.tick(WRITTEN_LESSON_TIMEOUT_MS);assert.deepEqual(await pending,{status:'unavailable'});
 finish(module);await Promise.resolve();assert.equal(calls,1);assert.deepEqual(await pending,{status:'unavailable'});
});
test('unmount cancels a hung import, while an explicit fresh attempt can succeed',async()=>{
 const controller=new AbortController();let calls=0;
 const pending=loadReviewedLesson(selection,()=>{calls++;return new Promise(()=>{});},controller.signal);
 controller.abort();assert.deepEqual(await pending,{status:'unavailable'});assert.equal(calls,1);
 assert.deepEqual(await loadReviewedLesson(selection,async()=>module,new AbortController().signal),{status:'ready',module});
});
test('already cancelled load does not invoke importer',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 await loadReviewedLesson(selection,async()=>{calls++;return module;},c.signal);assert.equal(calls,0);
});

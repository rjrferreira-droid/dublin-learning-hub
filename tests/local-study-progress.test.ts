import test from 'node:test';import assert from 'node:assert/strict';
import {completeLocalLesson,localStudyProgressKey,parseLocalStudyProgress,readLocalStudyProgress,recordLocalLessonOpened,writeLocalStudyProgress} from '../src/learning/localStudyProgress.ts';
const lesson='a1100000-2026-4acc-8a01-000000000001';
test('local study progress fails closed on absent or malformed browser data',()=>{
 assert.deepEqual(parseLocalStudyProgress(null),{version:1,lastOpenedLessonId:null,completed:{}});
 assert.deepEqual(parseLocalStudyProgress({version:2,completed:{}}),{version:1,lastOpenedLessonId:null,completed:{}});
 assert.deepEqual(readLocalStudyProgress({getItem:()=>'{bad'}),{version:1,lastOpenedLessonId:null,completed:{}});
});
test('opening and completing a lesson preserve only bounded local checkpoint evidence',()=>{
 const opened=recordLocalLessonOpened(parseLocalStudyProgress(null),lesson);assert.equal(opened.lastOpenedLessonId,lesson);
 const completed=completeLocalLesson(opened,lesson,4,5,'2026-09-22T17:00:00.000Z');
 assert.deepEqual(completed.completed[lesson],{completedAt:'2026-09-22T17:00:00.000Z',correct:4,total:5});
 assert.equal(completeLocalLesson(opened,lesson,6,5),opened);
});
test('browser adapter uses one versioned key and tolerates unavailable storage',()=>{
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 const progress=completeLocalLesson(recordLocalLessonOpened(parseLocalStudyProgress(null),lesson),lesson,5,5,'2026-09-22T17:00:00.000Z');
 assert.equal(writeLocalStudyProgress(storage,progress,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),true);assert.deepEqual(readLocalStudyProgress(storage,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),progress);assert.ok(values.has(localStudyProgressKey('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')));assert.deepEqual(readLocalStudyProgress(storage,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').completed,{});
 assert.equal(writeLocalStudyProgress({setItem:()=>{throw Error('blocked');}},progress),false);
});

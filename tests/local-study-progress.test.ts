import test from 'node:test';import assert from 'node:assert/strict';
import {completeLocalLesson,localLessonAfter,localStudyProgressKey,parseLocalStudyProgress,readLocalStudyProgress,recordLocalLessonOpened,summarizeLocalCourse,writeLocalStudyProgress} from '../src/learning/localStudyProgress.ts';
import {LOCAL_MODEL_LESSONS} from '../src/learning/localModelLessonRegistry.ts';
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
test('local course summary counts only catalog lessons and selects the first unfinished lesson',()=>{
 const empty=parseLocalStudyProgress(null);const initial=summarizeLocalCourse(LOCAL_MODEL_LESSONS,empty,'finance');
 assert.equal(initial.total,23);assert.equal(initial.completedCount,0);assert.equal(initial.percent,0);assert.equal(initial.nextLesson?.title,'ACCA FR A1 · Purpose and users of financial reporting');assert.equal(initial.allCompleted,false);
 const afterA1=completeLocalLesson(empty,LOCAL_MODEL_LESSONS[0].id,5,5,'2026-09-22T17:00:00.000Z');const next=summarizeLocalCourse(LOCAL_MODEL_LESSONS,afterA1,'finance');
 assert.equal(next.completedCount,1);assert.equal(next.percent,4);assert.equal(next.nextLesson?.id,LOCAL_MODEL_LESSONS[1].id);assert.equal(localLessonAfter(LOCAL_MODEL_LESSONS,LOCAL_MODEL_LESSONS[0].id)?.id,LOCAL_MODEL_LESSONS[1].id);
 assert.equal(localLessonAfter(LOCAL_MODEL_LESSONS,LOCAL_MODEL_LESSONS.at(-1)!.id),null);
});
test('local course summary resumes an opened unfinished lesson without changing completion order',()=>{
 const opened=recordLocalLessonOpened(parseLocalStudyProgress(null),LOCAL_MODEL_LESSONS[8].id);const summary=summarizeLocalCourse(LOCAL_MODEL_LESSONS,opened,'finance');
 assert.equal(summary.completedCount,0);assert.equal(summary.nextLesson?.id,LOCAL_MODEL_LESSONS[8].id);
 const completed=completeLocalLesson(opened,LOCAL_MODEL_LESSONS[8].id,3,5,'2026-09-22T18:00:00.000Z');assert.equal(summarizeLocalCourse(LOCAL_MODEL_LESSONS,completed,'finance').nextLesson?.id,LOCAL_MODEL_LESSONS[0].id);
});

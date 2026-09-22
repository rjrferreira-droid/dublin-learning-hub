import test from 'node:test';import assert from 'node:assert/strict';
import {buildLocalReviewSchedule,completeLocalLesson,completeLocalReview,legacyLocalStudyProgressKey,localLessonAfter,localStudyProgressKey,parseLocalStudyProgress,readLocalStudyProgress,recordLocalLessonOpened,summarizeLocalCourse,writeLocalStudyProgress} from '../src/learning/localStudyProgress.ts';
import {LOCAL_MODEL_LESSONS} from '../src/learning/localModelLessonRegistry.ts';
const lesson='a1100000-2026-4acc-8a01-000000000001';
const blank={version:2 as const,lastOpenedLessonId:null,completed:{},reviews:{}};
test('local study progress fails closed and migrates bounded v1 completion data',()=>{
 assert.deepEqual(parseLocalStudyProgress(null),blank);
 assert.deepEqual(parseLocalStudyProgress({version:3,completed:{}}),blank);
 assert.deepEqual(readLocalStudyProgress({getItem:()=>'{bad'}),blank);
 const migrated=parseLocalStudyProgress({version:1,lastOpenedLessonId:lesson,completed:{[lesson]:{completedAt:'2026-09-01T09:00:00.000Z',correct:4,total:5}}});
 assert.equal(migrated.version,2);assert.equal(migrated.lastOpenedLessonId,lesson);assert.deepEqual(migrated.completed[lesson],{completedAt:'2026-09-01T09:00:00.000Z',correct:4,total:5});assert.deepEqual(migrated.reviews,{});
});
test('opening and completing a lesson preserve only the first bounded local checkpoint result',()=>{
 const opened=recordLocalLessonOpened(parseLocalStudyProgress(null),lesson);assert.equal(opened.lastOpenedLessonId,lesson);
 const completed=completeLocalLesson(opened,lesson,4,5,'2026-09-22T17:00:00.000Z');
 assert.deepEqual(completed.completed[lesson],{completedAt:'2026-09-22T17:00:00.000Z',correct:4,total:5});
 assert.equal(completeLocalLesson(opened,lesson,6,5),opened);assert.equal(completeLocalLesson(completed,lesson,5,5,'2026-09-23T17:00:00.000Z'),completed);
});
test('browser adapter writes v2, reads a legacy v1 key and tolerates unavailable storage',()=>{
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 values.set(legacyLocalStudyProgressKey('legacy'),JSON.stringify({version:1,lastOpenedLessonId:lesson,completed:{[lesson]:{completedAt:'2026-09-01T09:00:00.000Z',correct:5,total:5}}}));
 assert.equal(readLocalStudyProgress(storage,'legacy').completed[lesson].correct,5);
 const progress=completeLocalLesson(recordLocalLessonOpened(parseLocalStudyProgress(null),lesson),lesson,5,5,'2026-09-22T17:00:00.000Z');
 assert.equal(writeLocalStudyProgress(storage,progress,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),true);assert.deepEqual(readLocalStudyProgress(storage,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),progress);assert.ok(values.has(localStudyProgressKey('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')));assert.deepEqual(readLocalStudyProgress(storage,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').completed,{});
 assert.equal(writeLocalStudyProgress({setItem:()=>{throw Error('blocked');}},progress),false);
});
test('local course summary counts lessons, weekly pace, remaining time and modules A to E',()=>{
 const initial=summarizeLocalCourse(LOCAL_MODEL_LESSONS,blank,'finance',new Date('2026-09-22T19:00:00.000Z'));
 assert.equal(initial.total,23);assert.equal(initial.completedCount,0);assert.equal(initial.percent,0);assert.equal(initial.nextLesson?.title,'ACCA FR A1 · Purpose and users of financial reporting');assert.equal(initial.allCompleted,false);assert.equal(initial.modules.length,5);assert.deepEqual(initial.modules.map(x=>x.code),['A','B','C','D','E']);assert.equal(initial.remainingMinutes,LOCAL_MODEL_LESSONS.reduce((sum,x)=>sum+x.estimatedMinutes,0));assert.equal(initial.weeklyTarget,3);assert.equal(initial.estimatedWeeksRemaining,8);
 const afterA1=completeLocalLesson(blank,LOCAL_MODEL_LESSONS[0].id,5,5,'2026-09-22T17:00:00.000Z');const next=summarizeLocalCourse(LOCAL_MODEL_LESSONS,afterA1,'finance',new Date('2026-09-22T19:00:00.000Z'));
 assert.equal(next.completedCount,1);assert.equal(next.completedLast7Days,1);assert.equal(next.percent,4);assert.equal(next.nextLesson?.id,LOCAL_MODEL_LESSONS[1].id);assert.equal(next.modules[0].completedCount,1);assert.equal(localLessonAfter(LOCAL_MODEL_LESSONS,LOCAL_MODEL_LESSONS[0].id)?.id,LOCAL_MODEL_LESSONS[1].id);
 assert.equal(localLessonAfter(LOCAL_MODEL_LESSONS,LOCAL_MODEL_LESSONS.at(-1)!.id),null);
});
test('local course summary resumes an opened unfinished lesson without changing completion order',()=>{
 const opened=recordLocalLessonOpened(blank,LOCAL_MODEL_LESSONS[8].id);const summary=summarizeLocalCourse(LOCAL_MODEL_LESSONS,opened,'finance');
 assert.equal(summary.completedCount,0);assert.equal(summary.nextLesson?.id,LOCAL_MODEL_LESSONS[8].id);
 const completed=completeLocalLesson(opened,LOCAL_MODEL_LESSONS[8].id,3,5,'2026-09-22T18:00:00.000Z');assert.equal(summarizeLocalCourse(LOCAL_MODEL_LESSONS,completed,'finance').nextLesson?.id,LOCAL_MODEL_LESSONS[0].id);
});
test('D+1, D+7 and D+30 reviews are scheduled locally and saved without moving original completion',()=>{
 const completed=completeLocalLesson(blank,lesson,4,5,'2026-09-01T09:00:00.000Z');const schedule=buildLocalReviewSchedule(LOCAL_MODEL_LESSONS,completed,new Date('2026-09-09T09:00:00.000Z'));
 assert.deepEqual(schedule.map(x=>[x.stage,x.status]),[['D+1','due'],['D+7','due'],['D+30','scheduled']]);
 assert.equal(completeLocalReview(blank,lesson,'D+1',4,5),blank);
 assert.equal(completeLocalReview(completed,lesson,'D+30',4,5,'2026-09-02T10:00:00.000Z'),completed);
 const reviewed=completeLocalReview(completed,lesson,'D+1',5,5,'2026-09-09T10:00:00.000Z');assert.deepEqual(reviewed.reviews[lesson]?.['D+1'],{reviewedAt:'2026-09-09T10:00:00.000Z',correct:5,total:5});assert.equal(reviewed.completed[lesson].completedAt,'2026-09-01T09:00:00.000Z');assert.deepEqual(buildLocalReviewSchedule(LOCAL_MODEL_LESSONS,reviewed,new Date('2026-09-09T11:00:00.000Z')).map(x=>x.stage),['D+7','D+30']);
});

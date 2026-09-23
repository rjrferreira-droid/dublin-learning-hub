import test from 'node:test';import assert from 'node:assert/strict';
import {buildLocalReviewSchedule,completeLocalLesson,completeLocalReview,lastOpenedLocalLessonId,legacyLocalStudyProgressKey,legacyV2LocalStudyProgressKey,localLessonAfter,localStudyProgressKey,mergeLocalStudyProgress,parseLocalStudyProgress,readLocalStudyProgress,recordLocalLessonOpened,summarizeLocalCourse,writeLocalStudyProgress} from '../src/learning/localStudyProgress.ts';
import {LOCAL_ENGLISH_LESSONS} from '../src/learning/localEnglishLessonRegistry.ts';
import {LOCAL_MODEL_LESSONS} from '../src/learning/localModelLessonRegistry.ts';
const lesson='a1100000-2026-4acc-8a01-000000000001';
const blank={version:3 as const,lastOpenedLessonIds:{},legacyLastOpenedLessonId:null,completed:{},reviews:{}};
test('local study progress fails closed and migrates bounded v1 completion data',()=>{
 assert.deepEqual(parseLocalStudyProgress(null),blank);
 assert.deepEqual(parseLocalStudyProgress({version:4,completed:{}}),blank);
 assert.deepEqual(readLocalStudyProgress({getItem:()=>'{bad'}),blank);
 const migrated=parseLocalStudyProgress({version:1,lastOpenedLessonId:lesson,completed:{[lesson]:{completedAt:'2026-09-01T09:00:00.000Z',correct:4,total:5}}});
 assert.equal(migrated.version,3);assert.equal(migrated.legacyLastOpenedLessonId,lesson);assert.equal(lastOpenedLocalLessonId(migrated,'finance'),lesson);assert.deepEqual(migrated.completed[lesson],{completedAt:'2026-09-01T09:00:00.000Z',correct:4,total:5});assert.deepEqual(migrated.reviews,{});
});
test('opening and completing a lesson preserve only the first bounded local checkpoint result',()=>{
 const opened=recordLocalLessonOpened(parseLocalStudyProgress(null),lesson,'finance');assert.equal(lastOpenedLocalLessonId(opened,'finance'),lesson);
 const completed=completeLocalLesson(opened,lesson,4,5,'2026-09-22T17:00:00.000Z');
 assert.deepEqual(completed.completed[lesson],{completedAt:'2026-09-22T17:00:00.000Z',correct:4,total:5});
 assert.equal(completeLocalLesson(opened,lesson,6,5),opened);assert.equal(completeLocalLesson(completed,lesson,5,5,'2026-09-23T17:00:00.000Z'),completed);
});
test('browser adapter writes v3, reads legacy v1/v2 keys and tolerates unavailable storage',()=>{
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 values.set(legacyLocalStudyProgressKey('legacy'),JSON.stringify({version:1,lastOpenedLessonId:lesson,completed:{[lesson]:{completedAt:'2026-09-01T09:00:00.000Z',correct:5,total:5}}}));
 assert.equal(readLocalStudyProgress(storage,'legacy').completed[lesson].correct,5);
 values.set(legacyV2LocalStudyProgressKey('legacy-v2'),JSON.stringify({version:2,lastOpenedLessonId:lesson,completed:{[lesson]:{completedAt:'2026-09-02T09:00:00.000Z',correct:4,total:5}},reviews:{}}));const migratedV2=readLocalStudyProgress(storage,'legacy-v2');assert.equal(migratedV2.legacyLastOpenedLessonId,lesson);
 const englishOpened=recordLocalLessonOpened(migratedV2,LOCAL_ENGLISH_LESSONS[0].id,'english');assert.equal(lastOpenedLocalLessonId(englishOpened,'finance'),lesson);assert.equal(lastOpenedLocalLessonId(englishOpened,'english'),LOCAL_ENGLISH_LESSONS[0].id);
 const progress=completeLocalLesson(recordLocalLessonOpened(parseLocalStudyProgress(null),lesson,'finance'),lesson,5,5,'2026-09-22T17:00:00.000Z');
 assert.equal(writeLocalStudyProgress(storage,progress,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),true);assert.deepEqual(readLocalStudyProgress(storage,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),progress);assert.ok(values.has(localStudyProgressKey('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')));assert.deepEqual(readLocalStudyProgress(storage,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').completed,{});
 assert.equal(writeLocalStudyProgress({setItem:()=>{throw Error('blocked');}},progress),false);
});
test('account merge keeps progress from both devices and the newest result per lesson or review stage',()=>{
 const second=LOCAL_MODEL_LESSONS[1].id;
 const primary=parseLocalStudyProgress({version:3,lastOpenedLessonIds:{finance:second},legacyLastOpenedLessonId:null,completed:{[lesson]:{completedAt:'2026-09-23T12:00:00.000Z',correct:5,total:5}},reviews:{[lesson]:{'D+1':{reviewedAt:'2026-09-24T12:00:00.000Z',correct:5,total:5}}}});
 const secondary=parseLocalStudyProgress({version:3,lastOpenedLessonIds:{english:LOCAL_ENGLISH_LESSONS[0].id},legacyLastOpenedLessonId:null,completed:{[lesson]:{completedAt:'2026-09-22T12:00:00.000Z',correct:3,total:5},[second]:{completedAt:'2026-09-22T13:00:00.000Z',correct:4,total:5}},reviews:{[lesson]:{'D+1':{reviewedAt:'2026-09-24T10:00:00.000Z',correct:3,total:5}}}});
 const merged=mergeLocalStudyProgress(primary,secondary);
 assert.equal(merged.completed[lesson].correct,5);assert.equal(merged.completed[second].correct,4);assert.equal(merged.reviews[lesson]?.['D+1']?.correct,5);assert.equal(lastOpenedLocalLessonId(merged,'finance'),second);assert.equal(lastOpenedLocalLessonId(merged,'english'),LOCAL_ENGLISH_LESSONS[0].id);
});
test('local course summary counts lessons, weekly pace, remaining time and modules A to E',()=>{
 const initial=summarizeLocalCourse(LOCAL_MODEL_LESSONS,blank,'finance',new Date('2026-09-22T19:00:00.000Z'));
 assert.equal(initial.total,23);assert.equal(initial.completedCount,0);assert.equal(initial.percent,0);assert.equal(initial.nextLesson?.title,'ACCA FR A1 · Purpose and users of financial reporting');assert.equal(initial.allCompleted,false);assert.equal(initial.modules.length,5);assert.deepEqual(initial.modules.map(x=>x.code),['A','B','C','D','E']);assert.equal(initial.remainingMinutes,LOCAL_MODEL_LESSONS.reduce((sum,x)=>sum+x.estimatedMinutes,0));assert.equal(initial.weeklyTarget,3);assert.equal(initial.estimatedWeeksRemaining,8);
 const afterA1=completeLocalLesson(blank,LOCAL_MODEL_LESSONS[0].id,5,5,'2026-09-22T17:00:00.000Z');const next=summarizeLocalCourse(LOCAL_MODEL_LESSONS,afterA1,'finance',new Date('2026-09-22T19:00:00.000Z'));
 assert.equal(next.completedCount,1);assert.equal(next.completedLast7Days,1);assert.equal(next.percent,4);assert.equal(next.nextLesson?.id,LOCAL_MODEL_LESSONS[1].id);assert.equal(next.modules[0].completedCount,1);assert.equal(localLessonAfter(LOCAL_MODEL_LESSONS,LOCAL_MODEL_LESSONS[0].id)?.id,LOCAL_MODEL_LESSONS[1].id);
 assert.equal(localLessonAfter(LOCAL_MODEL_LESSONS,LOCAL_MODEL_LESSONS.at(-1)!.id),null);
});
test('local course summary resumes an opened unfinished lesson without changing completion order',()=>{
 const opened=recordLocalLessonOpened(blank,LOCAL_MODEL_LESSONS[8].id,'finance');const summary=summarizeLocalCourse(LOCAL_MODEL_LESSONS,opened,'finance');
 assert.equal(summary.completedCount,0);assert.equal(summary.nextLesson?.id,LOCAL_MODEL_LESSONS[8].id);
 const completed=completeLocalLesson(opened,LOCAL_MODEL_LESSONS[8].id,3,5,'2026-09-22T18:00:00.000Z');assert.equal(summarizeLocalCourse(LOCAL_MODEL_LESSONS,completed,'finance').nextLesson?.id,LOCAL_MODEL_LESSONS[0].id);
});
test('English local core is exactly balanced and keeps an independent resume point',()=>{
 const catalog=[...LOCAL_MODEL_LESSONS,...LOCAL_ENGLISH_LESSONS];
 let progress=recordLocalLessonOpened(blank,LOCAL_MODEL_LESSONS[4].id,'finance');
 progress=recordLocalLessonOpened(progress,LOCAL_ENGLISH_LESSONS[1].id,'english');
 const english=summarizeLocalCourse(catalog,progress,'english'),finance=summarizeLocalCourse(catalog,progress,'finance');
 assert.equal(english.total,10);assert.deepEqual(english.modules.map(x=>[x.code,x.total]),[['E',5],['P',5]]);assert.equal(english.nextLesson?.id,LOCAL_ENGLISH_LESSONS[1].id);assert.equal(finance.nextLesson?.id,LOCAL_MODEL_LESSONS[4].id);
 assert.equal(lastOpenedLocalLessonId(progress,'english'),LOCAL_ENGLISH_LESSONS[1].id);assert.equal(lastOpenedLocalLessonId(progress,'finance'),LOCAL_MODEL_LESSONS[4].id);
 const completed=completeLocalLesson(progress,LOCAL_ENGLISH_LESSONS[0].id,5,5,'2026-09-22T18:00:00.000Z');
 assert.deepEqual(buildLocalReviewSchedule(catalog,completed,new Date('2026-09-24T18:00:00.000Z'),'english').map(x=>[x.stage,x.status]),[['D+1','due'],['D+7','scheduled'],['D+30','scheduled']]);
 assert.equal(buildLocalReviewSchedule(catalog,completed,new Date('2026-09-24T18:00:00.000Z'),'finance').length,0);
});
test('D+1, D+7 and D+30 reviews are scheduled locally and saved without moving original completion',()=>{
 const completed=completeLocalLesson(blank,lesson,4,5,'2026-09-01T09:00:00.000Z');const schedule=buildLocalReviewSchedule(LOCAL_MODEL_LESSONS,completed,new Date('2026-09-09T09:00:00.000Z'));
 assert.deepEqual(schedule.map(x=>[x.stage,x.status]),[['D+1','due'],['D+7','due'],['D+30','scheduled']]);
 assert.equal(completeLocalReview(blank,lesson,'D+1',4,5),blank);
 assert.equal(completeLocalReview(completed,lesson,'D+30',4,5,'2026-09-02T10:00:00.000Z'),completed);
 const reviewed=completeLocalReview(completed,lesson,'D+1',5,5,'2026-09-09T10:00:00.000Z');assert.deepEqual(reviewed.reviews[lesson]?.['D+1'],{reviewedAt:'2026-09-09T10:00:00.000Z',correct:5,total:5});assert.equal(reviewed.completed[lesson].completedAt,'2026-09-01T09:00:00.000Z');assert.deepEqual(buildLocalReviewSchedule(LOCAL_MODEL_LESSONS,reviewed,new Date('2026-09-09T11:00:00.000Z')).map(x=>x.stage),['D+7','D+30']);
});

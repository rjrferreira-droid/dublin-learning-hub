import assert from 'node:assert/strict';
import test from 'node:test';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';
import {LOCAL_PAYROLL_LESSONS,PAYROLL_IDENTITIES,localPayrollCodeFor} from '../src/learning/localPayrollLessonRegistry.ts';
import {summarizeLocalCourse} from '../src/learning/localStudyProgress.ts';

const blank={version:3 as const,lastOpenedLessonIds:{},legacyLastOpenedLessonId:null,completed:{},reviews:{}};

test('Viviane has a complete local seven-unit Irish Payroll pathway',async()=>{
 assert.equal(LOCAL_PAYROLL_LESSONS.length,7);
 assert.deepEqual(LOCAL_PAYROLL_LESSONS.map(lesson=>lesson.sequence),[1,2,3,4,5,6,7]);
 assert.ok(LOCAL_PAYROLL_LESSONS.every(lesson=>lesson.track==='payroll'&&lesson.origin==='local-model'&&lesson.courseSlug==='irish-payroll-viviane-local'));
 const loaded=await Promise.all(LOCAL_PAYROLL_LESSONS.map(lesson=>loadReviewedRuntimeModuleFor('payroll',lesson)));
 assert.ok(loaded.every(Boolean));
 assert.deepEqual(loaded.map(module=>module?.lessonId),LOCAL_PAYROLL_LESSONS.map(lesson=>lesson.id));
});

test('Payroll identities and account-synced progress stay isolated',()=>{
 assert.equal(localPayrollCodeFor('finance',PAYROLL_IDENTITIES.P1),null);
 assert.equal(localPayrollCodeFor('payroll',PAYROLL_IDENTITIES.P1),'P1');
 assert.equal(localPayrollCodeFor('payroll',{id:PAYROLL_IDENTITIES.P1.id,slug:PAYROLL_IDENTITIES.P2.slug}),null);
 const summary=summarizeLocalCourse(LOCAL_PAYROLL_LESSONS,blank,'payroll');
 assert.equal(summary.total,7);
 assert.equal(summary.nextLesson?.id,PAYROLL_IDENTITIES.P1.id);
 assert.deepEqual(summary.modules.map(module=>module.label),['Foundations','Gross to net','Controls','Lifecycle','Employee service','Month end']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {curriculumUnitReadiness,isCurriculumUnitReady,readinessSummary,REVIEWED_UNIT_MANIFEST} from '../src/learning/curriculumReadiness.ts';
import {LOCAL_MODEL_LESSONS,ACCA_A1_MODEL_ID,ACCA_A2_MODEL_ID,ACCA_A3_MODEL_ID} from '../src/learning/localModelLessonRegistry.ts';
import {LOCAL_ENGLISH_LESSONS,ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from '../src/learning/localEnglishLessonRegistry.ts';
import {LOCAL_PAYROLL_LESSONS,PAYROLL_IDENTITIES} from '../src/learning/localPayrollLessonRegistry.ts';
import {LOCAL_VIVIANE_ENGLISH_LESSONS,VIVIANE_ENGLISH_IDENTITIES} from '../src/learning/vivianeEnglishLessonRegistry.ts';

test('planned catalogue rows remain locked unless explicitly deep-reviewed',()=>{
 const a1=LOCAL_MODEL_LESSONS.find(lesson=>lesson.id===ACCA_A1_MODEL_ID)!;
 const a2=LOCAL_MODEL_LESSONS.find(lesson=>lesson.id===ACCA_A2_MODEL_ID)!;
 const a3=LOCAL_MODEL_LESSONS.find(lesson=>lesson.id===ACCA_A3_MODEL_ID)!;
 assert.equal(curriculumUnitReadiness(a1),'deep-reviewed');
 assert.equal(curriculumUnitReadiness(a2),'deep-reviewed');
 assert.equal(curriculumUnitReadiness(a3),'rebuilding');
 assert.equal(isCurriculumUnitReady(a3),false);
});

test('the first reviewed unit in each current pathway is allow-listed by stable identity',()=>{
 const readyIds=new Set(REVIEWED_UNIT_MANIFEST.map(entry=>entry.lessonId));
 assert.ok(readyIds.has(ACCA_A1_MODEL_ID));
 assert.ok(readyIds.has(ACCA_A2_MODEL_ID));
 assert.ok(readyIds.has(ENGLISH_E1_MODEL_ID));
 assert.ok(readyIds.has(ENGLISH_P1_MODEL_ID));
 assert.ok(readyIds.has(VIVIANE_ENGLISH_IDENTITIES.VE1.id));
 assert.ok(readyIds.has(VIVIANE_ENGLISH_IDENTITIES.VE2.id));
 assert.ok(readyIds.has(PAYROLL_IDENTITIES.P1.id));
 assert.ok(readyIds.has(PAYROLL_IDENTITIES.P2.id));
 assert.equal(new Set(REVIEWED_UNIT_MANIFEST.map(entry=>entry.lessonId)).size,REVIEWED_UNIT_MANIFEST.length);
});

test('readiness summary distinguishes the complete plan from usable content',()=>{
 assert.deepEqual(readinessSummary(LOCAL_MODEL_LESSONS,'finance'),{planned:23,ready:2,rebuilding:21});
 assert.deepEqual(readinessSummary(LOCAL_ENGLISH_LESSONS,'english'),{planned:20,ready:2,rebuilding:18});
 assert.deepEqual(readinessSummary(LOCAL_VIVIANE_ENGLISH_LESSONS,'english'),{planned:20,ready:2,rebuilding:18});
 assert.deepEqual(readinessSummary(LOCAL_PAYROLL_LESSONS,'payroll'),{planned:7,ready:2,rebuilding:5});
});

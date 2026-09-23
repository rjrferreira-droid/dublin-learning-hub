import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCA_FR_EXAM_BLUEPRINT,ACCA_FR_REMEDIATED_OUTCOME_IDS,ACCA_FR_SYLLABUS_COVERAGE,ACCA_FR_SYLLABUS_SOURCE} from '../src/learning/accaFrSyllabusCoverage.ts';
import {LOCAL_MODEL_LESSONS,localModelCodeFor} from '../src/learning/localModelLessonRegistry.ts';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';

test('official 2026-27 FR audit enumerates all 111 learning outcomes',()=>{
 assert.equal(ACCA_FR_SYLLABUS_SOURCE.sitting,'September 2026 to June 2027');
 assert.match(ACCA_FR_SYLLABUS_SOURCE.url,/fr_s26_j27_syllabus_and_study_guide\.pdf$/);
 assert.match(ACCA_FR_SYLLABUS_SOURCE.sha256,/^[0-9a-f]{64}$/);
 assert.equal(ACCA_FR_SYLLABUS_COVERAGE.length,111);
 assert.equal(new Set(ACCA_FR_SYLLABUS_COVERAGE.map(row=>row.id)).size,111);
 assert.deepEqual(Object.fromEntries(['A','B','C','D','E'].map(area=>[area,ACCA_FR_SYLLABUS_COVERAGE.filter(row=>row.area===area).length])),{A:27,B:53,C:15,D:12,E:4});
 assert.ok(ACCA_FR_SYLLABUS_COVERAGE.every(row=>row.status==='covered'||row.status==='remediated'));
 assert.deepEqual(ACCA_FR_REMEDIATED_OUTCOME_IDS,['A1a','A1b','A1d','A1g','A3c','A3e','A4c','A4d','A4e','B1a','B1f','B1g','B5c','B6c']);
});

test('every audited learning outcome resolves to real lesson evidence',async()=>{
 const evidenceByCode=new Map<string,Set<string>>();
 for(const lesson of LOCAL_MODEL_LESSONS){
  const code=localModelCodeFor('finance',lesson);
  const module=await loadReviewedRuntimeModuleFor('finance',lesson);
  assert.ok(code&&module);
  evidenceByCode.set(code,new Set([
   ...module.sections.map(section=>section.id),
   ...module.checkpoint.map(question=>question.id),
   ...(module.practiceExercises??[]).map(exercise=>exercise.id),
   `acca-${code.toLowerCase()}-case`
  ]));
 }
 for(const row of ACCA_FR_SYLLABUS_COVERAGE){
  assert.ok(row.summary.length>20,row.id);
  assert.ok(row.evidenceIds.length>=2,row.id);
  const available=evidenceByCode.get(row.lessonCode);
  assert.ok(available,`${row.id}: ${row.lessonCode}`);
  for(const evidenceId of row.evidenceIds)assert.ok(available.has(evidenceId),`${row.id}: ${evidenceId}`);
  if(row.status==='remediated')assert.ok((row.remediation??'').length>20,row.id);
 }
});

test('official full-exam blueprint is 180 minutes and 100 marks',()=>{
 assert.equal(ACCA_FR_EXAM_BLUEPRINT.durationMinutes,180);
 assert.equal(ACCA_FR_EXAM_BLUEPRINT.totalMarks,100);
 assert.deepEqual(ACCA_FR_EXAM_BLUEPRINT.sections.map(section=>section.totalMarks),[30,30,40]);
 assert.deepEqual(ACCA_FR_EXAM_BLUEPRINT.sections.map(section=>section.id),['A','B','C']);
});

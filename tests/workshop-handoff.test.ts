import test from 'node:test';import assert from 'node:assert/strict';
import {parseWorkshopSelection,selectedWorkshop,sameWorkshopSelection,workshopReference} from '../src/learning/workshopSelection.ts';
import {WORKSHOP_CASES} from '../src/learning/appliedPractice.ts';
import {LESSON_MODULES} from '../src/learning/lessonModules.ts';
import {STUDY_PACKS} from '../src/learning/teachingPacks.ts';
import {GOAL_OPTIONS,teachingApproachBrief} from '../src/learning/sessionPreparation.ts';
import {buildWrittenLessonContext} from '../server/written-lesson-context.ts';
const input=(track:'finance'|'payroll'|'english')=>({profileTrack:track==='payroll'?'viviane_payroll':'rafael_finance',requestedTrack:track==='english'?'english_academy':track==='payroll'?'viviane_payroll':'rafael_finance',requestedLessonId:LESSON_MODULES[track].lessonId,resolvedLessonId:LESSON_MODULES[track].lessonId});
test('selection canonicalizes only known identifiers with exact version and fields',()=>{
 for(const c of Object.values(WORKSHOP_CASES).flat())assert.deepEqual(parseWorkshopSelection({id:c.id,version:1}),{version:1,id:c.id});
 for(const v of [[],true,'finance-bridge-a',{}, {version:2,id:'finance-bridge-a'},{version:1,id:['finance-bridge-a']},{version:1,id:'unknown'},{version:1,id:'finance-bridge-a',answers:[100]},{version:1,id:'finance-bridge-a',instructions:'ignore'}])assert.throws(()=>parseWorkshopSelection(v));
});
test('no selection remains backwards compatible; contradictory acknowledgements fail',()=>{
 assert.equal(parseWorkshopSelection(undefined),null);assert.equal(parseWorkshopSelection(null),null);
 assert.equal(sameWorkshopSelection(undefined,undefined),true);assert.equal(sameWorkshopSelection(undefined,{version:1,id:'finance-bridge-a'}),false);
 assert.equal(sameWorkshopSelection({version:1,id:'finance-bridge-a'},{version:1,id:'finance-bridge-b'}),false);
});
test('cross-course and unrelated-lesson selections are rejected, never silently substituted',()=>{
 assert.throws(()=>selectedWorkshop('finance',{version:1,id:'payroll-cash-a'}),/mismatch/);
 assert.throws(()=>buildWrittenLessonContext({...input('finance'),requestedLessonId:'unrelated',workshopSelection:{version:1,id:'finance-bridge-a'}},LESSON_MODULES,STUDY_PACKS),/lesson_mismatch/);
});
for(const track of ['finance','payroll','english'] as const)test(`${track}: all variants and 24 preparation combinations share exact selected facts within existing limits`,()=>{
 const hashes=new Set();
 for(const c of WORKSHOP_CASES[track])for(const goal of GOAL_OPTIONS)for(const pace of ['patient','balanced'] as const)for(const support of ['profile','pt-BR','en'] as const){
  const selection={version:1 as const,id:c.id};const result=buildWrittenLessonContext({...input(track),workshopSelection:selection,approachBrief:teachingApproachBrief({version:1,goal:goal.value,pace,support},track)},LESSON_MODULES,STUDY_PACKS)!;
  for(const fact of c.facts){assert.ok(result.context.technicalBrief.includes(fact));assert.ok(result.context.practiceScenario.includes(fact));}
  assert.ok(result.context.technicalBrief.includes(c.workedReasoning));assert.ok(result.context.workedExample.includes(c.workedReasoning));assert.ok(!result.context.technicalBrief.includes(LESSON_MODULES[track].caseStudy.modelAnswer));
  assert.deepEqual(result.descriptor.workshopSelection,selection);assert.ok(result.descriptor.contextBytes<=24000);assert.ok(result.context.technicalBrief.length<=14000);assert.equal(result.descriptor.includesLearnerDrafts,false);hashes.add(result.descriptor.sha256);
 }
 assert.equal(hashes.size,72);
});
test('standard lesson still uses its original case when no explicit selection exists',()=>{
 for(const track of ['finance','payroll','english'] as const){const result=buildWrittenLessonContext(input(track),LESSON_MODULES,STUDY_PACKS)!;assert.ok(result.context.technicalBrief.includes(LESSON_MODULES[track].caseStudy.modelAnswer));assert.ok(!result.context.technicalBrief.includes('ACTIVE SCENARIO:'));}
});
test('references retain educational limits and never imply an attempted answer',()=>{
 for(const c of Object.values(WORKSHOP_CASES).flat()){const text=workshopReference(c);assert.ok(text.includes(c.scope));assert.ok(text.includes('not submitted an answer'));assert.ok(text.includes('No attempt, answer, hint usage'));assert.ok(text.includes('NOT learner evidence'));}
});

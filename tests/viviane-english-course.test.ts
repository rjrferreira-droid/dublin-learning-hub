import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {localEnglishLessonsForLearner} from '../src/learning/localEnglishCatalogForLearner.ts';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';
import {summarizeLocalCourse} from '../src/learning/localStudyProgress.ts';
import {VIVIANE_ENGLISH_COMPANIONS} from '../src/learning/vivianeEnglishCompanions.ts';
import {VIVIANE_ENGLISH_MONTH_DIRECTION,VIVIANE_ENGLISH_MONTH_PLAN} from '../src/learning/vivianeEnglishMonthPlan.ts';
import {LOCAL_VIVIANE_ENGLISH_LESSONS,VIVIANE_ENGLISH_IDENTITIES,localVivianeEnglishCodeFor} from '../src/learning/vivianeEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_MODULES} from '../src/learning/vivianeEnglishModules.ts';
import {LOCAL_ENGLISH_LESSONS} from '../src/learning/localEnglishLessonRegistry.ts';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const blank={version:3 as const,lastOpenedLessonIds:{},legacyLastOpenedLessonId:null,completed:{},reviews:{}};

test('Viviane has an isolated twenty-lesson English catalogue with the exact 80/20 split',()=>{
 assert.equal(LOCAL_VIVIANE_ENGLISH_LESSONS.length,20);
 assert.deepEqual(LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>lesson.sequence),Array.from({length:20},(_,index)=>index+1));
 assert.equal(LOCAL_VIVIANE_ENGLISH_LESSONS.filter(lesson=>lesson.moduleSlug==='english-viviane-everyday').length,16);
 assert.equal(LOCAL_VIVIANE_ENGLISH_LESSONS.filter(lesson=>lesson.moduleSlug==='english-viviane-people-operations').length,4);
 assert.deepEqual(VIVIANE_ENGLISH_MONTH_DIRECTION.split,{everydayPct:80,professionalPct:20});
 const rafaelIds=new Set(LOCAL_ENGLISH_LESSONS.map(lesson=>lesson.id));
 for(const lesson of LOCAL_VIVIANE_ENGLISH_LESSONS){
  assert.match(lesson.id,UUID);assert.equal(lesson.track,'english');assert.equal(lesson.origin,'local-model');assert.equal(lesson.courseSlug,'english-viviane-80-20-local');assert.equal(rafaelIds.has(lesson.id),false);
 }
 assert.equal(new Set(LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>lesson.slug)).size,20);
});

test('each of four weeks has four everyday lessons and one Payroll/People Operations lesson',()=>{
 assert.equal(VIVIANE_ENGLISH_MONTH_PLAN.length,20);
 assert.equal(new Set(VIVIANE_ENGLISH_MONTH_PLAN.map(day=>day.lesson)).size,20);
 for(const week of [1,2,3,4] as const){
  const days=VIVIANE_ENGLISH_MONTH_PLAN.filter(day=>day.week===week);
  assert.deepEqual(days.map(day=>day.day),[1,2,3,4,5]);
  assert.equal(days.filter(day=>day.strand==='everyday').length,4);
  assert.equal(days.filter(day=>day.strand==='professional').length,1);
  assert.equal(days.at(-1)?.strand,'professional');
 }
 assert.deepEqual(VIVIANE_ENGLISH_MONTH_PLAN.map(day=>day.lesson),LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>localVivianeEnglishCodeFor('english',lesson)));
});

test('Viviane professional catalogue is Payroll and People Operations, not Finance curriculum',()=>{
 const professional=LOCAL_VIVIANE_ENGLISH_LESSONS.filter(lesson=>lesson.moduleSequence===2);
 assert.equal(professional.length,4);
 for(const lesson of professional){
  const visible=(lesson.title+' '+lesson.subtitle).toLowerCase();
  for(const excluded of ['finance','accounting','treasury','financial reporting'])assert.equal(visible.includes(excluded),false,`${lesson.title}: ${excluded}`);
  assert.match(visible,/payroll|employee|people/);
 }
 assert.deepEqual(VIVIANE_ENGLISH_MONTH_DIRECTION.professionalDomains,['payroll','departamento-pessoal','people-operations','employee-service','benefits','onboarding-offboarding','manager-communication']);
});

test('all twenty Viviane lessons have the complete written lesson contract and reviewed loader support',async()=>{
 assert.equal(VIVIANE_ENGLISH_MODULES.length,20);
 const loaded=await Promise.all(LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>loadReviewedRuntimeModuleFor('english',lesson)));
 assert.ok(loaded.every(Boolean));
 assert.deepEqual(loaded.map(module=>module?.lessonId),LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>lesson.id));
 assert.deepEqual(loaded.map(module=>module?.title),LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>lesson.title));
 for(const module of VIVIANE_ENGLISH_MODULES){
  assert.equal(module.track,'english');assert.equal(module.sections.length,4);assert.equal(module.terms.length,6);assert.equal(module.checkpoint.length,5);assert.equal(module.practiceExercises?.length,3);
  assert.ok(module.sections.every(section=>section.supportPt.length>20));assert.ok(module.sources.length>0);assert.ok(module.sources.every(source=>source.url.startsWith('https://')));
  assert.ok(module.caseStudy.reviewChecks.length>=4);assert.equal(new Set(module.checkpoint.map(question=>question.id)).size,5);
 }
});

test('Professor, grammar, pronunciation and Premium Audio outlines cover every Viviane lesson without activation',()=>{
 const codes=LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>localVivianeEnglishCodeFor('english',lesson)!);
 assert.deepEqual(Object.keys(VIVIANE_ENGLISH_COMPANIONS),codes);
 for(const code of codes){
  const companion=VIVIANE_ENGLISH_COMPANIONS[code];
  assert.ok(companion.grammarTarget.length>30);assert.ok(companion.pronunciationTarget.length>20);
  assert.deepEqual([companion.professor.status,companion.professor.referenceMinutes,companion.professor.hardLimit,companion.professor.startingEnglishSharePct],['offline_authored_not_live',10,false,55]);
  assert.equal(companion.premiumAudio.status,'outline_only_no_generation');assert.equal(companion.premiumAudio.estimatedMinutes,10);assert.equal(companion.premiumAudio.segments.length,4);assert.equal(companion.premiumAudio.generationRequested,false);
 }
});

test('catalogue selection and progress stay profile-specific',()=>{
 assert.equal(localEnglishLessonsForLearner('rafael'),LOCAL_ENGLISH_LESSONS);
 assert.equal(localEnglishLessonsForLearner('viviane'),LOCAL_VIVIANE_ENGLISH_LESSONS);
 assert.equal(localVivianeEnglishCodeFor('finance',VIVIANE_ENGLISH_IDENTITIES.VE1),null);
 assert.equal(localVivianeEnglishCodeFor('english',{id:VIVIANE_ENGLISH_IDENTITIES.VE1.id,slug:VIVIANE_ENGLISH_IDENTITIES.VE2.slug}),null);
 const summary=summarizeLocalCourse(LOCAL_VIVIANE_ENGLISH_LESSONS,blank,'english');
 assert.equal(summary.total,20);assert.equal(summary.nextLesson?.id,VIVIANE_ENGLISH_IDENTITIES.VE1.id);
 assert.deepEqual(summary.modules.map(module=>[module.code,module.label,module.total]),[['E','Everyday',16],['P','Payroll & People Ops',4]]);
});

test('Viviane additions remain local and contain no provider, database or deployment path',async()=>{
 const paths=['../src/learning/vivianeEnglishLessonRegistry.ts','../src/learning/vivianeEnglishMonthPlan.ts','../src/learning/vivianeEnglishModules.ts','../src/learning/vivianeEnglishCompanions.ts','../src/learning/localEnglishCatalogForLearner.ts'];
 const joined=(await Promise.all(paths.map(path=>readFile(new URL(path,import.meta.url),'utf8')))).join('\n');
 for(const forbidden of ['supabase.','fetch(','.insert(','.update(','functions.invoke','connectProfessor(','PremiumAudioPanel','openai.com/v1/audio'])assert.equal(joined.includes(forbidden),false,forbidden);
});

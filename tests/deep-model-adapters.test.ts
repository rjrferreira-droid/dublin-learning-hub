import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DEEP_ACCA_A1_VISIBLE_LEARN_TEXT,
 DEEP_ACCA_A2_VISIBLE_LEARN_TEXT,
 DEEP_ENGLISH_UNIT_1_VISIBLE_LEARN_TEXT,
 DEEP_PAYROLL_UNIT_1_VISIBLE_LEARN_TEXT,
 DEEP_PAYROLL_UNIT_2_VISIBLE_LEARN_TEXT,
 DEEP_RP1_VISIBLE_LEARN_TEXT,
 DEEP_VE2_VISIBLE_LEARN_TEXT,
 deepRuntimeOverlayFor,
} from '../src/learning/deepModelAdapters.ts';
import {countWords} from '../src/learning/deepLessonContract.ts';
import {ACCA_A1_MODEL_ID,ACCA_A1_MODEL_SLUG,ACCA_A2_MODEL_ID,ACCA_A2_MODEL_SLUG} from '../src/learning/localModelLessonRegistry.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_E1_MODEL_SLUG,ENGLISH_P1_MODEL_ID,ENGLISH_P1_MODEL_SLUG} from '../src/learning/localEnglishLessonRegistry.ts';
import {PAYROLL_IDENTITIES} from '../src/learning/localPayrollLessonRegistry.ts';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from '../src/learning/vivianeEnglishLessonRegistry.ts';

function assertVisibleSectionSourcesResolve(module:{sections:readonly {id:string;sourceIds:readonly string[]}[];sources:readonly {id:string}[]}){
 const sourceIds=new Set(module.sources.map(source=>source.id));
 for(const section of module.sections)for(const sourceId of section.sourceIds)assert.ok(sourceIds.has(sourceId),`${section.id}: ${sourceId}`);
}

test('ACCA A1 replaces the shallow Learn surface with the quality-gated local A1a–A1b model',async()=>{
 const overlay=deepRuntimeOverlayFor('finance',ACCA_A1_MODEL_ID);
 assert.ok(overlay);
 assert.equal(overlay.deepLesson.editorial.status,'deep-reviewed');
 assert.equal(overlay.quality.passed,true,overlay.quality.issues.map(issue=>`${issue.code}: ${issue.message}`).join('\n'));
 assert.equal(overlay.deepLesson.workload.totalMinutes,90);
 assert.deepEqual(overlay.deepLesson.curriculum.outcomeIds,['A1a','A1b']);
 assert.equal(overlay.deepLesson.workedExamples.length,3);
 assert.equal(overlay.deepLesson.practice.items.length,8);
 assert.equal(overlay.deepLesson.examTasks?.length,2);
 assert.equal(overlay.module.sections?.length,6);
 assert.ok(overlay.module.sections?.some(section=>section.id==='acca-a1-objective'),'audited A1 evidence anchor must survive the deep migration');
 assert.ok(countWords(DEEP_ACCA_A1_VISIBLE_LEARN_TEXT)>=2500);
 assertVisibleSectionSourcesResolve({sections:overlay.module.sections??[],sources:overlay.module.sources??[]});

 const runtime=await loadReviewedRuntimeModuleFor('finance',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG});
 assert.ok(runtime?.deepLesson);
 assert.equal(runtime.lessonId,ACCA_A1_MODEL_ID);
 assert.equal(runtime.sections.length,6);
 assertVisibleSectionSourcesResolve(runtime);
});

test('English E1 and VE1 share deep teaching while retaining separate runtime identities',async()=>{
 const rafael=deepRuntimeOverlayFor('english',ENGLISH_E1_MODEL_ID);
 const viviane=deepRuntimeOverlayFor('english',VIVIANE_ENGLISH_IDENTITIES.VE1.id);
 assert.ok(rafael&&viviane);
 assert.equal(rafael.deepLesson,viviane.deepLesson);
 assert.equal(rafael.module.sections,viviane.module.sections);
 assert.equal(rafael.deepLesson.editorial.status,'deep-reviewed');
 assert.equal(rafael.quality.passed,true,rafael.quality.issues.map(issue=>`${issue.code}: ${issue.message}`).join('\n'));
 assert.ok(countWords(DEEP_ENGLISH_UNIT_1_VISIBLE_LEARN_TEXT)>700);

 const rafaelRuntime=await loadReviewedRuntimeModuleFor('english',{id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG});
 const vivianeRuntime=await loadReviewedRuntimeModuleFor('english',{id:VIVIANE_ENGLISH_IDENTITIES.VE1.id,slug:VIVIANE_ENGLISH_IDENTITIES.VE1.slug});
 assert.ok(rafaelRuntime?.deepLesson&&vivianeRuntime?.deepLesson);
 assert.equal(rafaelRuntime.lessonId,ENGLISH_E1_MODEL_ID);
 assert.equal(vivianeRuntime.lessonId,VIVIANE_ENGLISH_IDENTITIES.VE1.id);
 assert.notEqual(rafaelRuntime.lessonId,vivianeRuntime.lessonId,'profile progress identities must stay separate');
 assertVisibleSectionSourcesResolve(rafaelRuntime);
 assertVisibleSectionSourcesResolve(vivianeRuntime);
});

test('Payroll P1 exposes the authored deep lesson and passes the quality gate against visible Learn text',async()=>{
 const overlay=deepRuntimeOverlayFor('payroll',PAYROLL_IDENTITIES.P1.id);
 assert.ok(overlay);
 assert.equal(overlay.deepLesson.editorial.status,'deep-reviewed');
 assert.equal(overlay.quality.passed,true,overlay.quality.issues.map(issue=>`${issue.code}: ${issue.message}`).join('\n'));
 assert.equal(overlay.deepLesson.workload.totalMinutes,80);
 assert.equal(overlay.module.sections?.length,6);
 assert.ok(countWords(DEEP_PAYROLL_UNIT_1_VISIBLE_LEARN_TEXT)>=1300);

 assertVisibleSectionSourcesResolve({sections:overlay.module.sections??[],sources:overlay.module.sources??[]});

 const runtime=await loadReviewedRuntimeModuleFor('payroll',PAYROLL_IDENTITIES.P1);
 assert.ok(runtime?.deepLesson);
 assert.equal(runtime.lessonId,PAYROLL_IDENTITIES.P1.id);
 assert.equal(runtime.sections.length,6);
 assert.equal(runtime.deepLesson.audioEpisode.format,'authored-script');
 assertVisibleSectionSourcesResolve(runtime);
});

test('the second deep units resolve through their real runtime identities',async()=>{
 const cases=[
  {track:'finance' as const,lesson:{id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG},learn:DEEP_ACCA_A2_VISIBLE_LEARN_TEXT,sections:6},
  {track:'english' as const,lesson:{id:ENGLISH_P1_MODEL_ID,slug:ENGLISH_P1_MODEL_SLUG},learn:DEEP_RP1_VISIBLE_LEARN_TEXT,sections:4},
  {track:'english' as const,lesson:VIVIANE_ENGLISH_IDENTITIES.VE2,learn:DEEP_VE2_VISIBLE_LEARN_TEXT,sections:4},
  {track:'payroll' as const,lesson:PAYROLL_IDENTITIES.P2,learn:DEEP_PAYROLL_UNIT_2_VISIBLE_LEARN_TEXT,sections:6},
 ];
 for(const item of cases){
  const overlay=deepRuntimeOverlayFor(item.track,item.lesson.id);
  assert.ok(overlay,`${item.track}:${item.lesson.id}`);
  assert.equal(overlay.deepLesson.editorial.status,'deep-reviewed');
  assert.equal(overlay.quality.passed,true,overlay.quality.issues.map(issue=>`${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(overlay.learnText,item.learn);
  const runtime=await loadReviewedRuntimeModuleFor(item.track,item.lesson);
  assert.ok(runtime?.deepLesson,`${item.track}:${item.lesson.id} runtime`);
  assert.equal(runtime.lessonId,item.lesson.id);
  assert.equal(runtime.sections.length,item.sections);
  assertVisibleSectionSourcesResolve(runtime);
 }
});

test('adapters are identity-bound, offline and never label a model published',()=>{
 assert.equal(deepRuntimeOverlayFor('english','not-a-model-id'),null);
 assert.equal(deepRuntimeOverlayFor('payroll',ENGLISH_E1_MODEL_ID),null);
 for(const overlay of [
  deepRuntimeOverlayFor('english',ENGLISH_E1_MODEL_ID),
  deepRuntimeOverlayFor('english',ENGLISH_P1_MODEL_ID),
  deepRuntimeOverlayFor('english',VIVIANE_ENGLISH_IDENTITIES.VE1.id),
  deepRuntimeOverlayFor('english',VIVIANE_ENGLISH_IDENTITIES.VE2.id),
  deepRuntimeOverlayFor('payroll',PAYROLL_IDENTITIES.P1.id),
  deepRuntimeOverlayFor('payroll',PAYROLL_IDENTITIES.P2.id),
  deepRuntimeOverlayFor('finance',ACCA_A1_MODEL_ID),
  deepRuntimeOverlayFor('finance',ACCA_A2_MODEL_ID),
 ]){
  assert.ok(overlay);
  assert.notEqual(overlay.deepLesson.editorial.status,'published');
  assert.equal(overlay.quality.passed,true);
 }
});

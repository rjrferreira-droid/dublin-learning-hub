import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {LESSON_MODULES} from '../src/learning/lessonModules.ts';
import {ACCA_A1_MODEL_ID,ACCA_A1_MODEL_SLUG,LOCAL_MODEL_LESSONS,curriculumModelPreviewEnabled,isLocalModelLesson} from '../src/learning/localModelLessonRegistry.ts';
import {ACCA_A1_MODEL_MODULE,ACCA_A1_PREMIUM_AUDIO_OUTLINE,ACCA_A1_PROFESSOR_GUIDE,localModelLessonFor} from '../src/learning/localModelLessonModules.ts';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';
test('local ACCA model requires exact identity and explicit preview flag',()=>{
 assert.equal(curriculumModelPreviewEnabled('?curriculumPreview=1'),true);assert.equal(curriculumModelPreviewEnabled('?curriculumPreview=0'),false);assert.equal(curriculumModelPreviewEnabled(''),false);
 assert.equal(LOCAL_MODEL_LESSONS.length,1);assert.equal(LOCAL_MODEL_LESSONS[0].origin,'local-model');
 assert.equal(isLocalModelLesson('finance',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),true);
 assert.equal(isLocalModelLesson('finance',{id:'wrong',slug:ACCA_A1_MODEL_SLUG}),false);assert.equal(isLocalModelLesson('finance',{id:ACCA_A1_MODEL_ID,slug:'wrong'}),false);
 assert.equal(isLocalModelLesson('english',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),false);
});
test('ACCA A1 has a complete written shape and sitting gate',()=>{
 const m=ACCA_A1_MODEL_MODULE;assert.equal(m.lessonId,ACCA_A1_MODEL_ID);assert.equal(m.track,'finance');assert.equal(m.sections.length,4);assert.equal(m.terms.length,6);assert.equal(m.practiceExercises?.length,3);assert.equal(m.checkpoint.length,5);assert.equal(m.caseStudy.reviewChecks.length,4);assert.ok(m.visual.rows.length>=4);assert.match(m.scope,/selected exam sitting/i);assert.match(m.scope,/not an ACCA-approved course/i);
 for(const s of m.sections)assert.ok(s.paragraphs.join(' ').split(/\s+/).length>75);
});
test('reviewed loader resolves exact local identity and rejects partial matches',async()=>{
 assert.equal(localModelLessonFor('finance',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),ACCA_A1_MODEL_MODULE);assert.equal(localModelLessonFor('finance',{id:ACCA_A1_MODEL_ID,slug:'wrong'}),null);
 assert.equal(await loadReviewedRuntimeModuleFor('finance',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),ACCA_A1_MODEL_MODULE);
 assert.equal(await loadReviewedRuntimeModuleFor('finance',{id:'a1100000-2026-4acc-8a01-000000000002',slug:ACCA_A1_MODEL_SLUG}),null);
});
test('English Golden Lesson uses lesson-specific contextual grammar practice',()=>{
 const xs=LESSON_MODULES.english.practiceExercises??[];assert.deepEqual(xs.map(x=>x.id),['eng-grammar-p1','eng-grammar-p2','eng-grammar-p3']);assert.match(xs[0].answer,/was waiting.*called/i);assert.match(xs[1].explanation,/time relationship/i);assert.match(xs[2].explanation,/Many answers are valid/i);
});
test('Professor and Premium Audio references remain offline and provider-free',()=>{
 assert.equal(ACCA_A1_PREMIUM_AUDIO_OUTLINE.status,'outline_only_no_generation');assert.match(ACCA_A1_PREMIUM_AUDIO_OUTLINE.preservation,/No existing Premium Audio/i);assert.equal(ACCA_A1_PROFESSOR_GUIDE.status,'offline_authored_not_live');assert.match(ACCA_A1_PROFESSOR_GUIDE.evidenceBoundary,/must never enter/i);
 for(const path of ['src/learning/localModelLessonRegistry.ts','src/learning/localModelLessonModules.ts','src/learning/loadReviewedRuntimeModule.ts']){const raw=fs.readFileSync(path,'utf8');for(const banned of ['supabase.','fetch(','.insert(','.update(','functions.invoke','connectProfessor(','PremiumAudioPanel'])assert.ok(!raw.includes(banned),path+': '+banned);}
});
test('application labels the model honestly and excludes it by default',()=>{
 const raw=fs.readFileSync('src/App.tsx','utf8');assert.match(raw,/curriculumModelPreviewEnabled\(window.location.search\)/);assert.match(raw,/Model · local/);assert.match(raw,/Local preview · no providers/);assert.match(raw,/not published and do not enable Professor, Audio or saved progress/);
});
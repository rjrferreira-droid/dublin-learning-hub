import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {LESSON_MODULES} from '../src/learning/lessonModules.ts';
import {ACCA_A1_MODEL_ID,ACCA_A1_MODEL_SLUG,ACCA_A2_MODEL_ID,ACCA_A2_MODEL_SLUG,ACCA_B3_MODEL_ID,ACCA_B3_MODEL_SLUG,ACCA_B4_MODEL_ID,ACCA_B4_MODEL_SLUG,LOCAL_MODEL_LESSONS,curriculumModelPreviewEnabled,isLocalModelLesson,localModelCodeFor} from '../src/learning/localModelLessonRegistry.ts';
import {ACCA_A1_MODEL_MODULE,ACCA_A1_PREMIUM_AUDIO_OUTLINE,ACCA_A1_PROFESSOR_GUIDE,localModelLessonFor} from '../src/learning/localModelLessonModules.ts';
import {ACCA_A2_MODEL_MODULE,ACCA_A2_PREMIUM_AUDIO_OUTLINE,ACCA_A2_PROFESSOR_GUIDE,localModelA2For} from '../src/learning/localModelLessonA2.ts';
import {ACCA_B3_MODEL_MODULE,ACCA_B3_PREMIUM_AUDIO_OUTLINE,ACCA_B3_PROFESSOR_GUIDE,localModelB3For} from '../src/learning/localModelLessonB3.ts';
import {ACCA_B4_MODEL_MODULE,ACCA_B4_PREMIUM_AUDIO_OUTLINE,ACCA_B4_PROFESSOR_GUIDE,localModelB4For} from '../src/learning/localModelLessonB4.ts';
import {loadReviewedRuntimeModuleFor} from '../src/learning/loadReviewedRuntimeModule.ts';
const models=[ACCA_A1_MODEL_MODULE,ACCA_A2_MODEL_MODULE,ACCA_B3_MODEL_MODULE,ACCA_B4_MODEL_MODULE];
test('four local ACCA models require exact identity and explicit Preview',()=>{
 assert.equal(curriculumModelPreviewEnabled('?curriculumPreview=1'),true);assert.equal(curriculumModelPreviewEnabled(''),false);
 assert.deepEqual(LOCAL_MODEL_LESSONS.map(x=>x.sequence),[1,2,3,4]);assert.ok(LOCAL_MODEL_LESSONS.every(x=>x.origin==='local-model'));
 assert.equal(localModelCodeFor('finance',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),'A1');assert.equal(localModelCodeFor('finance',{id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG}),'A2');assert.equal(localModelCodeFor('finance',{id:ACCA_B3_MODEL_ID,slug:ACCA_B3_MODEL_SLUG}),'B3');assert.equal(localModelCodeFor('finance',{id:ACCA_B4_MODEL_ID,slug:ACCA_B4_MODEL_SLUG}),'B4');
 assert.equal(isLocalModelLesson('finance',{id:ACCA_A2_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),false);assert.equal(isLocalModelLesson('english',{id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG}),false);
});
for(const m of models)test(m.title+' has the complete written shape and sitting gate',()=>{
 assert.equal(m.track,'finance');assert.equal(m.sections.length,4);assert.equal(m.terms.length,6);assert.equal(m.practiceExercises?.length,3);assert.equal(m.checkpoint.length,5);assert.equal(m.caseStudy.reviewChecks.length,4);assert.ok(m.visual.rows.length>=4);assert.match(m.scope,/selected exam sitting/i);assert.match(m.scope,/not ACCA approval|not an ACCA-approved course/i);
 for(const s of m.sections)assert.ok(s.paragraphs.join(' ').split(/\s+/).length>70);
});
test('reviewed loader keeps all four models in separate exact lazy paths',async()=>{
 assert.equal(localModelLessonFor('finance',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),ACCA_A1_MODEL_MODULE);assert.equal(localModelA2For('finance',{id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG}),ACCA_A2_MODEL_MODULE);assert.equal(localModelB3For('finance',{id:ACCA_B3_MODEL_ID,slug:ACCA_B3_MODEL_SLUG}),ACCA_B3_MODEL_MODULE);assert.equal(localModelB4For('finance',{id:ACCA_B4_MODEL_ID,slug:ACCA_B4_MODEL_SLUG}),ACCA_B4_MODEL_MODULE);
 assert.equal(await loadReviewedRuntimeModuleFor('finance',{id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),ACCA_A1_MODEL_MODULE);assert.equal(await loadReviewedRuntimeModuleFor('finance',{id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG}),ACCA_A2_MODEL_MODULE);assert.equal(await loadReviewedRuntimeModuleFor('finance',{id:ACCA_B3_MODEL_ID,slug:ACCA_B3_MODEL_SLUG}),ACCA_B3_MODEL_MODULE);assert.equal(await loadReviewedRuntimeModuleFor('finance',{id:ACCA_B4_MODEL_ID,slug:ACCA_B4_MODEL_SLUG}),ACCA_B4_MODEL_MODULE);
 assert.equal(await loadReviewedRuntimeModuleFor('finance',{id:ACCA_A2_MODEL_ID,slug:ACCA_A1_MODEL_SLUG}),null);
 const entry=fs.readFileSync('src/learning/loadReviewedRuntimeModule.ts','utf8');assert.match(entry,/import\('\.\/localModelLessonModules\.ts'\)/);assert.match(entry,/import\('\.\/localModelLessonA2\.ts'\)/);assert.match(entry,/import\('\.\/localModelLessonB3\.ts'\)/);assert.match(entry,/import\('\.\/localModelLessonB4\.ts'\)/);
});
test('English Golden Lesson retains contextual grammar practice',()=>{const xs=LESSON_MODULES.english.practiceExercises??[];assert.deepEqual(xs.map(x=>x.id),['eng-grammar-p1','eng-grammar-p2','eng-grammar-p3']);assert.match(xs[0].answer,/was waiting.*called/i);});
test('both Professor and Premium Audio references remain offline',()=>{
 for(const audio of [ACCA_A1_PREMIUM_AUDIO_OUTLINE,ACCA_A2_PREMIUM_AUDIO_OUTLINE,ACCA_B3_PREMIUM_AUDIO_OUTLINE,ACCA_B4_PREMIUM_AUDIO_OUTLINE]){assert.equal(audio.status,'outline_only_no_generation');assert.match(audio.preservation,/No existing Premium Audio/i);}
 for(const guide of [ACCA_A1_PROFESSOR_GUIDE,ACCA_A2_PROFESSOR_GUIDE,ACCA_B3_PROFESSOR_GUIDE,ACCA_B4_PROFESSOR_GUIDE]){assert.equal(guide.status,'offline_authored_not_live');assert.match(guide.evidenceBoundary,/must never enter|Only actual integrated session turns/i);}
 for(const path of ['src/learning/localModelLessonRegistry.ts','src/learning/localModelLessonModules.ts','src/learning/localModelLessonA2.ts','src/learning/localModelLessonB3.ts','src/learning/localModelLessonB4.ts','src/learning/loadReviewedRuntimeModule.ts']){const raw=fs.readFileSync(path,'utf8');for(const banned of ['supabase.','fetch(','.insert(','.update(','functions.invoke','connectProfessor(','PremiumAudioPanel'])assert.ok(!raw.includes(banned),path+': '+banned);}
});
test('application labels local models honestly and excludes them by default',()=>{const raw=fs.readFileSync('src/App.tsx','utf8');assert.match(raw,/curriculumModelPreviewEnabled\(window.location.search\)/);assert.match(raw,/Model · local/);assert.match(raw,/Local preview · no providers/);});

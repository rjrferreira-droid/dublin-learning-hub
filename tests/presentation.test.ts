import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {presentation,isTrackVisible,primaryVisibleTrack} from '../src/config/presentation.ts';
import {LANGUAGE_COURSES,LANGUAGE_UNIT_FLOW} from '../src/learning/languageCourseArchitecture.ts';

test('the active portal contains only English and Spanish for both learners',()=>{
 assert.equal(presentation.showPayroll,false);
 assert.equal(presentation.showManuLauncher,false);
 assert.deepEqual(['finance','payroll','english','spanish'].filter(isTrackVisible),['english','spanish']);
 assert.equal(primaryVisibleTrack('rafael'),'english');
 assert.equal(primaryVisibleTrack('viviane'),'english');
});

test('Spanish shares the language unit contract without pretending content is ready',()=>{
 assert.equal(LANGUAGE_COURSES.spanish.status,'preparing');
 assert.deepEqual(LANGUAGE_UNIT_FLOW.map(stage=>stage.key),['Learn','Audio','Practice','Speaking','Professor']);
 const app=fs.readFileSync('src/App.tsx','utf8');
 assert.match(app,/const local=\[\.\.\.localEnglishLessonsForLearner\(learnerKey\)\]/);
 assert.match(app,/languageKey==='spanish'\?<SpanishCourseWorkspace/);
 assert.match(app,/if\(!isTrackVisible\(key\)\)return/);
 assert.match(app,/tracksForLearner/);
});

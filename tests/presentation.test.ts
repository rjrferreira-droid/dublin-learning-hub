import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {presentation,isTrackVisible,primaryVisibleTrack} from '../src/config/presentation.ts';
test('the finished course set is visible without changing learner identity',()=>{
 assert.equal(presentation.showManuLauncher,false);
 assert.deepEqual(['finance','payroll','english'].filter(isTrackVisible),['finance','payroll','english']);
 assert.equal(primaryVisibleTrack('rafael'),'finance');
 assert.equal(primaryVisibleTrack('viviane'),'payroll');
});
test('Payroll remains the primary course for Viviane',()=>{
 assert.equal(presentation.showPayroll,true);assert.equal(isTrackVisible('payroll'),true);assert.equal(primaryVisibleTrack('viviane'),'payroll');
});
test('catalog and fallback filter presentation only; Manu standalone and Payroll content remain',()=>{
 const app=fs.readFileSync('src/App.tsx','utf8');const main=fs.readFileSync('src/main.tsx','utf8');
 assert.match(app,/learnerTrackKeys.has\(lesson.track\)/);
 assert.match(app,/learnerKey==='rafael'\?LOCAL_MODEL_LESSONS:LOCAL_PAYROLL_LESSONS/);
 assert.match(app,/tracksForLearner/);
 assert.match(app,/key: 'payroll'/);
 assert.match(main,/presentation.showManuLauncher && <LittleEnglish/);
 assert.match(main,/<LittleEnglish standalone/);
});

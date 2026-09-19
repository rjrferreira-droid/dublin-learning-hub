import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {presentation,isTrackVisible,primaryVisibleTrack} from '../src/config/presentation.ts';
test('standby areas are hidden without changing learner identity',()=>{
 assert.equal(presentation.showManuLauncher,false);
 assert.deepEqual(['finance','payroll','english'].filter(isTrackVisible),['finance','english']);
 assert.equal(primaryVisibleTrack('rafael'),'finance');
 assert.equal(primaryVisibleTrack('viviane'),'english');
});
test('presentation switches are reversible',()=>{
 try {presentation.showPayroll=true;assert.equal(isTrackVisible('payroll'),true);assert.equal(primaryVisibleTrack('viviane'),'payroll');}
 finally {presentation.showPayroll=false;}
});
test('catalog and fallback filter presentation only; Manu standalone and Payroll content remain',()=>{
 const app=fs.readFileSync('src/App.tsx','utf8');const main=fs.readFileSync('src/main.tsx','utf8');
 assert.match(app,/catalog.filter\(lesson=>isTrackVisible\(lesson.track\)\)/);
 assert.match(app,/available.length\|\|visibleTracks.length/);
 assert.equal((app.match(/visibleTracks.map/g)??[]).length,3);
 assert.match(app,/key: 'payroll'/);
 assert.match(main,/presentation.showManuLauncher && <LittleEnglish/);
 assert.match(main,/<LittleEnglish standalone/);
});

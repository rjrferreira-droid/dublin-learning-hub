import test from 'node:test';
import assert from 'node:assert/strict';
import {DEEP_ACCA_A2,DEEP_ACCA_A2_CONTRACT,DEEP_ACCA_A2_LEARN_TEXT} from '../src/learning/deepAccaA2.ts';
import {audioEpisodeText,countWords,runDeepLessonQualityGate} from '../src/learning/deepLessonContract.ts';

test('deep local ACCA A2 owns only official A1c–A1g and preserves the A3 boundary',()=>{
 assert.deepEqual(DEEP_ACCA_A2_CONTRACT.curriculum.outcomeIds,['A1c','A1d','A1e','A1f','A1g']);
 assert.equal(DEEP_ACCA_A2.teachingBlocks.length,6);
 assert.ok(DEEP_ACCA_A2.scope.nextUnitBoundary.some(item=>/recognition, derecognition and measurement/i.test(item)));
 assert.ok(DEEP_ACCA_A2.scope.nextUnitBoundary.some(item=>/no qualitative characteristic can override.*IFRS Accounting Standard/i.test(item)));
 assert.match(DEEP_ACCA_A2_CONTRACT.curriculum.sourceUrl??'',/fr_s26_j27_syllabus_and_study_guide\.pdf$/);
});

test('deep ACCA A2 contains substantial teaching, progressive practice and marked application',()=>{
 assert.ok(countWords(DEEP_ACCA_A2_LEARN_TEXT)>=1_800);
 assert.equal(DEEP_ACCA_A2_CONTRACT.workedExamples.length,3);
 assert.ok(DEEP_ACCA_A2_CONTRACT.practice.items.length>=9);
 assert.ok(DEEP_ACCA_A2_CONTRACT.practice.items.some(item=>item.responseMode==='single-select'||item.responseMode==='multi-select'));
 assert.ok(DEEP_ACCA_A2_CONTRACT.practice.items.some(item=>item.responseMode==='short-text'||item.responseMode==='extended-text'));
 assert.equal(DEEP_ACCA_A2_CONTRACT.practice.attemptsBeforeReveal,2);
 assert.equal(DEEP_ACCA_A2_CONTRACT.examTasks?.length,2);
 assert.ok((DEEP_ACCA_A2_CONTRACT.examTasks??[]).every(task=>task.markingGuide.length>0&&task.totalMarks>0));
});

test('deep ACCA A2 passes the offline quality gate with an evidence-backed workload',()=>{
 const report=runDeepLessonQualityGate(DEEP_ACCA_A2_CONTRACT,{learnText:DEEP_ACCA_A2_LEARN_TEXT});
 assert.equal(report.passed,true,report.issues.map(item=>`${item.code}: ${item.message}`).join('\n'));
 assert.equal(report.metrics.declaredMinutes,92);
 assert.ok(report.metrics.supportedMinutes>=91&&report.metrics.supportedMinutes<=93);
 assert.equal(DEEP_ACCA_A2_CONTRACT.editorial.status,'deep-reviewed');
 assert.equal(DEEP_ACCA_A2_CONTRACT.completion.itemLevelEvidenceRequired,true);
});

test('A2 Audio is an independent authored ten-minute episode',()=>{
 assert.equal(DEEP_ACCA_A2_CONTRACT.audioEpisode.format,'authored-script');
 assert.equal(DEEP_ACCA_A2_CONTRACT.audioEpisode.estimatedMinutes,10);
 assert.ok(countWords(audioEpisodeText(DEEP_ACCA_A2_CONTRACT.audioEpisode))>=1_100);
 const report=runDeepLessonQualityGate(DEEP_ACCA_A2_CONTRACT,{learnText:DEEP_ACCA_A2_LEARN_TEXT});
 assert.ok((report.metrics.audioLearnFiveGramContainment??1)<0.55);
});

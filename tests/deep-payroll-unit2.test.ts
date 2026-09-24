import test from 'node:test';
import assert from 'node:assert/strict';
import {DEEP_PAYROLL_UNIT_2,DEEP_PAYROLL_UNIT_2_CONTRACT} from '../src/learning/deepPayrollUnit2.ts';
import {audioEpisodeText,countWords,runDeepLessonQualityGate} from '../src/learning/deepLessonContract.ts';
import {PAYROLL_IDENTITIES} from '../src/learning/localPayrollLessonRegistry.ts';

test('Payroll Unit 2 is a substantive source-aligned gross-to-net unit',()=>{
 assert.equal(DEEP_PAYROLL_UNIT_2.lessonId,PAYROLL_IDENTITIES.P2.id);
 assert.equal(DEEP_PAYROLL_UNIT_2.sections.length,6);
 assert.ok(countWords(DEEP_PAYROLL_UNIT_2.learnText)>=1_500);
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.workedExamples.length,3);
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.practice.items.length,10);
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.examTasks?.length,1);
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.examTasks?.[0]?.totalMarks,10);
 assert.ok(DEEP_PAYROLL_UNIT_2.sources.every(source=>new URL(source.url).hostname.endsWith('revenue.ie')));
});

test('Payroll Unit 2 preserves the statutory bases and employer-PRSI boundary',()=>{
 const visible=JSON.stringify(DEEP_PAYROLL_UNIT_2);
 assert.match(visible,/€3,500/);
 assert.match(visible,/€3,325/);
 assert.match(visible,/€2,535/);
 assert.match(visible,/Employer PRSI excluded from net/i);
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.payroll?.liveRatePolicy,'official-source-required');
 assert.doesNotMatch(visible,/\b\d+(?:\.\d+)?%\b/,'the unit must not embed a live statutory percentage');
});

test('Payroll Unit 2 passes the gate with honest time and independent Audio',()=>{
 const report=runDeepLessonQualityGate(DEEP_PAYROLL_UNIT_2_CONTRACT,{learnText:DEEP_PAYROLL_UNIT_2.learnText});
 assert.equal(report.passed,true,report.issues.map(item=>`${item.code}: ${item.message}`).join('\n'));
 assert.equal(report.metrics.declaredMinutes,84);
 assert.ok(report.metrics.supportedMinutes>=81&&report.metrics.supportedMinutes<=84);
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.audioEpisode.format,'authored-script');
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.audioEpisode.estimatedMinutes,6);
 assert.ok(countWords(audioEpisodeText(DEEP_PAYROLL_UNIT_2_CONTRACT.audioEpisode))>=680);
 assert.ok((report.metrics.audioLearnFiveGramContainment??1)<0.55);
 assert.equal(DEEP_PAYROLL_UNIT_2_CONTRACT.completion.itemLevelEvidenceRequired,true);
});

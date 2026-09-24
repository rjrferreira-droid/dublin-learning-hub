import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {
 audioEpisodeText,
 audioLearnFiveGramContainment,
 countWords,
 GRAMMAR_STAGE_ORDER,
 practiceMixFor,
 runDeepLessonQualityGate,
} from '../src/learning/deepLessonContract.ts';
import {
 DEEP_ENGLISH_UNIT_1,
 DEEP_ENGLISH_UNIT_1_CONTRACT,
 DEEP_ENGLISH_UNIT_1_LEARN_TEXT,
 DEEP_ENGLISH_UNIT_1_PRACTICE_COUNTS,
 DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS,
} from '../src/learning/deepEnglishUnit1.ts';

test('English Unit 1 is a shared everyday lesson while preserving each profile month mix',()=>{
 assert.equal(DEEP_ENGLISH_UNIT_1.strand,'everyday');
 assert.deepEqual(DEEP_ENGLISH_UNIT_1.profilePlacement.rafael,{code:'E1',sequence:1,monthlyMix:{everydayPct:50,professionalPct:50}});
 assert.deepEqual(DEEP_ENGLISH_UNIT_1.profilePlacement.viviane,{code:'VE1',sequence:1,monthlyMix:{everydayPct:80,professionalPct:20}});
 const learnerContent=JSON.stringify({learn:DEEP_ENGLISH_UNIT_1.learn,audio:DEEP_ENGLISH_UNIT_1.audio,grammar:DEEP_ENGLISH_UNIT_1.grammar,practice:DEEP_ENGLISH_UNIT_1.practice.items,speaking:DEEP_ENGLISH_UNIT_1.speaking}).toLowerCase();
 for(const excluded of ['financial reporting','treasury','accounting standard','tax return','cash flow'])assert.equal(learnerContent.includes(excluded),false,excluded);
});

test('Learn and Audio are independent, complete learning experiences rather than duplicate text',()=>{
 assert.equal(DEEP_ENGLISH_UNIT_1.audio.isIndependentFromLearn,true);
 assert.equal(DEEP_ENGLISH_UNIT_1.audio.status,'authored-script-no-generation-requested');
 assert.equal(DEEP_ENGLISH_UNIT_1.audio.generationRequested,false);
 assert.equal(DEEP_ENGLISH_UNIT_1.audio.estimatedMinutes,12);
 const episode=DEEP_ENGLISH_UNIT_1_CONTRACT.audioEpisode;
 assert.equal(episode.format,'authored-script');
 const audioText=audioEpisodeText(episode);
 const audioMinutes=countWords(audioText)/145;
 assert.ok(audioMinutes>=10&&audioMinutes<=15,`script supports ${audioMinutes.toFixed(1)} minutes`);
 assert.ok(audioText.includes('Riverside Community Centre'));
 assert.ok(DEEP_ENGLISH_UNIT_1_LEARN_TEXT.join(' ').includes('film screening'));
 assert.ok(audioLearnFiveGramContainment(DEEP_ENGLISH_UNIT_1_LEARN_TEXT,episode)<0.1);
 assert.deepEqual(new Set(DEEP_ENGLISH_UNIT_1.audio.segments.map(segment=>segment.phase)),new Set(['orientation','first-listen','comprehension','second-listen','language-clinic','shadowing','transfer']));
 assert.equal(DEEP_ENGLISH_UNIT_1.audio.firstListen.questions.length,3);
 assert.equal(DEEP_ENGLISH_UNIT_1.audio.secondListen.questions.length,4);
 assert.equal(DEEP_ENGLISH_UNIT_1.audio.shadowing.length,3);
});

test('Grammar follows Notice → Understand → Choose → Build → Use with ten mixed items',()=>{
 assert.deepEqual(DEEP_ENGLISH_UNIT_1.grammar.stages.map(stage=>stage.id),GRAMMAR_STAGE_ORDER);
 assert.equal(DEEP_ENGLISH_UNIT_1.grammar.items.length,10);
 for(const stage of GRAMMAR_STAGE_ORDER){
  const items=DEEP_ENGLISH_UNIT_1.grammar.items.filter(item=>item.stage===stage);
  assert.equal(items.length,2,stage);
  assert.deepEqual(items.map(item=>item.id),DEEP_ENGLISH_UNIT_1.grammar.stages.find(item=>item.id===stage)?.itemIds);
 }
 assert.ok(DEEP_ENGLISH_UNIT_1.grammar.items.some(item=>item.responseMode==='single-select'));
 assert.ok(DEEP_ENGLISH_UNIT_1.grammar.items.some(item=>item.responseMode==='short-written'));
 assert.ok(DEEP_ENGLISH_UNIT_1.grammar.items.some(item=>item.responseMode==='extended-written'));
 for(const item of DEEP_ENGLISH_UNIT_1.grammar.items){
  assert.equal(item.maxAttemptsBeforeReveal,2);
  assert.ok(item.evidence.skillTags.length>0);
  assert.ok(item.evidence.retain.includes('item id'));
 }
});

test('Practice uses weighted 60/25/15 pools and a deterministic rounded twelve-item example session',()=>{
 assert.equal(DEEP_ENGLISH_UNIT_1.practice.sessionSize,12);
 assert.deepEqual(DEEP_ENGLISH_UNIT_1.practice.allocation,[
  {source:'current-unit',weight:0.6},
  {source:'previous-unit',weight:0.25},
  {source:'confirmed-error-bank',weight:0.15},
 ]);
 assert.deepEqual(DEEP_ENGLISH_UNIT_1_PRACTICE_COUNTS,{current:12,previous:5,errorBank:3});
 assert.deepEqual(practiceMixFor(DEEP_ENGLISH_UNIT_1_CONTRACT.practice),{current:0.6,previous:0.25,'confirmed-error-bank':0.15});
 const example=DEEP_ENGLISH_UNIT_1.practice.selectionPlan.exampleSession;
 assert.deepEqual(example.map(bucket=>[bucket.source,bucket.count]),[['current-unit',7],['previous-unit',3],['confirmed-error-bank',2]]);
 assert.equal(DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS.length,12);
 assert.equal(new Set(DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS).size,12);
 const byId=new Map(DEEP_ENGLISH_UNIT_1.practice.items.map(item=>[item.id,item]));
 const sampled=DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS.map(id=>byId.get(id));
 assert.ok(sampled.every(Boolean));
 assert.ok(sampled.some(item=>item?.responseMode==='single-select'));
 assert.ok(sampled.some(item=>item?.responseMode==='short-written'||item?.responseMode==='extended-written'));
 assert.match(DEEP_ENGLISH_UNIT_1.practice.selectionPlan.roundingNote,/7\.2, 3\.0 and 1\.8/);
 assert.match(DEEP_ENGLISH_UNIT_1.practice.firstUnitFallback.previousUnit,/prerequisite baseline/i);
 assert.match(DEEP_ENGLISH_UNIT_1.practice.firstUnitFallback.errorBank,/only confirmed learner errors/i);
 assert.match(DEEP_ENGLISH_UNIT_1.practice.firstUnitFallback.reportingRule,/never be relabelled/i);
 assert.equal(DEEP_ENGLISH_UNIT_1_CONTRACT.practice.attemptsBeforeReveal,2);
});

test('unbound Error Bank positions are concrete diagnostic substitutes, never dynamic placeholders or fake learner errors',()=>{
 const errorItems=DEEP_ENGLISH_UNIT_1.practice.items.filter(item=>item.source==='confirmed-error-bank');
 assert.equal(errorItems.length,3);
 for(const item of errorItems){
  assert.match(item.prompt,/Diagnostic substitute/);
  assert.equal(item.evidence.errorBankTrigger,'never');
  assert.doesNotMatch(JSON.stringify(item),/Dynamic option|generated from the confirmed|Resolved at runtime/);
 }
});

test('Speaking covers chunks, stress, linking, shadowing and transfer without a fake acoustic score',()=>{
 assert.equal(DEEP_ENGLISH_UNIT_1.speaking.attemptsPerPrompt,3);
 assert.equal(DEEP_ENGLISH_UNIT_1.speaking.recordingPolicy.audio,'local-until-lesson-close');
 assert.match(DEEP_ENGLISH_UNIT_1.speaking.recordingPolicy.transcript,/ephemeral/);
 assert.deepEqual(new Set(DEEP_ENGLISH_UNIT_1.speaking.activities.map(item=>item.kind)),new Set(['chunking','stress','connected-speech','shadowing','transfer']));
 assert.ok(DEEP_ENGLISH_UNIT_1.speaking.activities.every(item=>item.chunks.length&&item.stress.length&&item.coachChecks.length));
 assert.ok(DEEP_ENGLISH_UNIT_1.speaking.scorePolicy.prohibited.some(rule=>/pronunciation percentage/i.test(rule)));
 assert.equal(DEEP_ENGLISH_UNIT_1_CONTRACT.english?.speaking.acousticScore,false);
 assert.equal(DEEP_ENGLISH_UNIT_1_CONTRACT.english?.speaking.recordingRetention,'local-until-lesson-close');
});

test('the shared deep quality gate substantiates the 55-minute model and item-level completion',()=>{
 const report=runDeepLessonQualityGate(DEEP_ENGLISH_UNIT_1_CONTRACT,{learnText:DEEP_ENGLISH_UNIT_1_LEARN_TEXT});
 assert.equal(report.passed,true,report.issues.map(issue=>`${issue.code}: ${issue.message}`).join('\n'));
 assert.deepEqual(report.issues,[]);
 assert.equal(report.metrics.declaredMinutes,55);
 assert.ok(report.metrics.supportedMinutes>=45&&report.metrics.supportedMinutes<=60);
 assert.equal(report.metrics.grammarItems,10);
 assert.equal(DEEP_ENGLISH_UNIT_1_CONTRACT.completion.itemLevelEvidenceRequired,true);
 assert.ok(DEEP_ENGLISH_UNIT_1_CONTRACT.completion.requirements.every(requirement=>requirement.rule!=='view'));
 assert.match(DEEP_ENGLISH_UNIT_1.completion.masteryBoundary,/does not by itself establish durable mastery/i);
});

test('the model stays local and does not call a provider, database or generation path',async()=>{
 const source=await readFile(new URL('../src/learning/deepEnglishUnit1.ts',import.meta.url),'utf8');
 for(const forbidden of ['fetch(', 'supabase.', 'functions.invoke', 'openai.com/v1', 'connectProfessor(', 'PremiumAudioPanel'])assert.equal(source.includes(forbidden),false,forbidden);
});

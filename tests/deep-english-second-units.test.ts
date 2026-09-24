import test from 'node:test';
import assert from 'node:assert/strict';
import {DEEP_RP1,DEEP_VE2} from '../src/learning/deepEnglishSecondUnits.ts';
import {audioEpisodeText,countWords,ENGLISH_PRACTICE_MIX,GRAMMAR_STAGE_ORDER,runDeepLessonQualityGate,type DeepLessonContract} from '../src/learning/deepLessonContract.ts';
import {ENGLISH_P1_MODEL_ID} from '../src/learning/localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from '../src/learning/vivianeEnglishLessonRegistry.ts';

function sourceCounts(contract:DeepLessonContract,ids:readonly string[]){
 const byId=new Map(contract.practice.items.map(item=>[item.id,item]));
 return ids.reduce<Record<string,number>>((counts,id)=>{
  const bucket=byId.get(id)?.sourceBucket;
  assert.ok(bucket,`missing practice item ${id}`);
  counts[bucket]=(counts[bucket]??0)+1;
  return counts;
 },{});
}

for(const [label,unit,minLearn,minAudio] of [
 ['Rafael technical Unit 2',DEEP_RP1,650,780],
 ['Viviane everyday Unit 2',DEEP_VE2,600,700],
] as const){
 test(`${label} passes the deep English gate`,()=>{
  const report=runDeepLessonQualityGate(unit.contract,{learnText:unit.learnText});
  assert.equal(report.passed,true,report.issues.map(item=>`${item.code}: ${item.message}`).join('\n'));
  assert.equal(unit.contract.editorial.status,'deep-reviewed');
  assert.ok(countWords(unit.learnText)>=minLearn);
  assert.ok(countWords(audioEpisodeText(unit.contract.audioEpisode))>=minAudio);
  assert.equal(unit.contract.audioEpisode.format,'authored-script');
  assert.equal(unit.contract.audioEpisode.estimatedMinutes,6);
  assert.ok((report.metrics.audioLearnFiveGramContainment??1)<0.55);
 });

 test(`${label} implements Grammar, mixed Practice and five-stage Speaking`,()=>{
  const english=unit.contract.english;
  assert.ok(english);
  assert.deepEqual(english.grammar.stages.map(item=>item.stage),GRAMMAR_STAGE_ORDER);
  assert.equal(english.grammar.items.length,10);
  assert.ok(english.grammar.items.some(item=>item.responseMode==='single-select'));
  assert.ok(english.grammar.items.some(item=>item.responseMode==='short-text'));
  assert.equal(unit.contract.practice.items.length,20);
  assert.deepEqual(unit.contract.practice.targetMix,ENGLISH_PRACTICE_MIX);
  assert.deepEqual(sourceCounts(unit.contract,unit.contract.practice.sessionItemIds??[]),{current:7,previous:3,'confirmed-error-bank':2});
  assert.deepEqual(english.speaking.tasks.map(item=>item.focus),['chunks','stress','linking','shadowing','transfer']);
  assert.equal(english.speaking.attemptsPerTask,3);
  assert.equal(english.speaking.recordingRetention,'discard-after-feedback');
  assert.equal(english.speaking.acousticScore,false);
  assert.equal(unit.contract.completion.itemLevelEvidenceRequired,true);
 });
}

test('the next English units use the correct profile identities and registers',()=>{
 assert.equal(DEEP_RP1.lessonId,ENGLISH_P1_MODEL_ID);
 assert.equal(DEEP_RP1.contract.course.kind,'english');
 assert.equal(DEEP_RP1.contract.course.register,'technical');
 assert.equal(DEEP_VE2.lessonId,VIVIANE_ENGLISH_IDENTITIES.VE2.id);
 assert.equal(DEEP_VE2.contract.course.kind,'english');
 assert.equal(DEEP_VE2.contract.course.register,'everyday');
 const vivianeSurface=JSON.stringify({
  goal:DEEP_VE2.goal,
  sections:DEEP_VE2.sections,
  contextualInput:DEEP_VE2.contract.english?.contextualInput,
  grammar:DEEP_VE2.contract.english?.grammar,
  practice:DEEP_VE2.contract.practice,
  audio:DEEP_VE2.contract.audioEpisode,
 }).toLowerCase();
 assert.doesNotMatch(vivianeSurface,/\bfinance\b|\baccounting\b|\bpayroll\b|\bledger\b/);
});

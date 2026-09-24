import assert from 'node:assert/strict';
import test from 'node:test';
import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from '../src/learning/localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from '../src/learning/vivianeEnglishLessonRegistry.ts';
import {DEEP_ENGLISH_UNIT_1_CONTRACT} from '../src/learning/deepEnglishUnit1.ts';
import {DEEP_RP1,DEEP_VE2} from '../src/learning/deepEnglishSecondUnits.ts';
import {audioQuestionCoverage} from '../src/learning/audioQuestions.ts';
import {englishPracticeSession} from '../src/learning/englishPracticeSession.ts';
import {englishSpeakingPhrasesFor} from '../src/learning/englishSpeakingPhrases.ts';
import {grammarConceptsFor} from '../src/learning/englishGrammarConcepts.ts';

const cases=[
 [ENGLISH_E1_MODEL_ID,DEEP_ENGLISH_UNIT_1_CONTRACT],
 [VIVIANE_ENGLISH_IDENTITIES.VE1.id,DEEP_ENGLISH_UNIT_1_CONTRACT],
 [ENGLISH_P1_MODEL_ID,DEEP_RP1.contract],
 [VIVIANE_ENGLISH_IDENTITIES.VE2.id,DEEP_VE2.contract],
] as const;

test('each reviewed English unit links Learn concepts, listening questions, twenty balanced practice items and twenty phrases',()=>{
 for(const [lessonId,deep] of cases){
  assert.ok(grammarConceptsFor(lessonId).length>0,lessonId);
  assert.equal(audioQuestionCoverage(lessonId),true,lessonId);
  const items=englishPracticeSession(lessonId,deep);
  assert.equal(items.length,20,lessonId);
  assert.equal(new Set(items.map(({item})=>item.id)).size,20,lessonId);
  assert.equal(items.filter(({item})=>item.responseMode==='single-select'||item.responseMode==='multi-select').length,10,lessonId);
  assert.equal(items.filter(({item})=>item.responseMode==='short-text'||item.responseMode==='extended-text').length,10,lessonId);
  const answerPositions=items.slice(0,10).map(({item})=>item.evaluation.kind==='selection'?item.options?.findIndex(option=>option.id===item.evaluation.correctOptionIds[0]):-1);
  assert.ok(new Set(answerPositions).size>1,`${lessonId}: choices must not put every answer in one position`);
  assert.equal(englishSpeakingPhrasesFor(lessonId).length,20,lessonId);
 }
});

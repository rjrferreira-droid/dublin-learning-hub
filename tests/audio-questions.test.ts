import test from 'node:test';
import assert from 'node:assert/strict';
import {audioQuestionsFor} from '../src/learning/audioQuestions.ts';

test('reviewed English episodes offer five authored listening questions',()=>{
 for(const id of ['e1100000-2026-4e11-8e01-000000000001','e2100000-2026-4e21-8e03-000000000003']){
  const questions=audioQuestionsFor(id);
  assert.equal(questions.length,5);
  assert.ok(questions.every(question=>question.question.endsWith('?')&&question.reference.length>25));
 }
 assert.equal(audioQuestionsFor('unknown').length,0);
});

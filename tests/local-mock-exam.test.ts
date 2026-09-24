import assert from 'node:assert/strict';
import test from 'node:test';
import {ACCA_FR_MOCK_1,ACCA_FR_MOCK_2,LOCAL_ACCA_FR_MOCKS,LOCAL_ACCA_FR_PRACTICE,buildLocalMockReviewSchedule,completeLocalMockReview,constructedResponsesFor,gradeMockObjectives,mergeLocalMockProgress,mockProgressKey,objectiveQuestionsFor,parseLocalMockProgress,readLocalMockProgress,recordLocalMockAttempt,writeLocalMockProgress} from '../src/learning/localMockExam.ts';
import {ACCA_FR_FULL_MOCK_1} from '../src/learning/localFullMockExam.ts';

const blank={version:1 as const,attempts:{},reviews:{}};
const attempt={id:'11111111-1111-4111-8111-111111111111',submittedAt:'2026-09-22T12:00:00.000Z',objectiveCorrect:5,objectiveTotal:6,constructedMarks:6,totalMarks:16,elapsedSeconds:1400};

test('two complementary ACCA FR mocks have bounded 20-mark, 30-minute original practice contracts',()=>{
 assert.equal(LOCAL_ACCA_FR_MOCKS.length,2);assert.deepEqual(LOCAL_ACCA_FR_MOCKS.map(mock=>mock.id),['acca-fr-mini-mock-01','acca-fr-mini-mock-02']);assert.equal(new Set(LOCAL_ACCA_FR_MOCKS.flatMap(mock=>mock.objectiveQuestions.map(question=>question.id))).size,12);
 for(const mock of LOCAL_ACCA_FR_MOCKS){
  assert.equal(mock.format,'mini');assert.match(mock.equivalenceNotice,/not equivalent.*3-hour, 100-mark/i);assert.equal(mock.durationMinutes,30);assert.equal(mock.objectiveMarks,12);assert.equal(mock.constructedMarks,8);assert.equal(mock.objectiveMarks+mock.constructedMarks,20);assert.equal(mock.objectiveMarks%mock.objectiveQuestions.length,0);
  assert.equal(mock.objectiveQuestions.length,6);assert.equal(mock.constructed.markingGuide.length,8);assert.equal(mock.constructed.markingGuide.reduce((sum,item)=>sum+item.marks,0),8);assert.equal(mock.focusAreas.length,4);
  for(const question of mock.objectiveQuestions){assert.equal(question.options.length,4);assert.ok(question.correctIndex>=0&&question.correctIndex<4);assert.ok(question.explanation.length>40);}
 }
});

test('full mock matches the official 180-minute, 100-mark section blueprint',()=>{
 assert.equal(LOCAL_ACCA_FR_PRACTICE.length,3);assert.equal(LOCAL_ACCA_FR_PRACTICE.at(-1),ACCA_FR_FULL_MOCK_1);
 assert.equal(ACCA_FR_FULL_MOCK_1.format,'full');assert.equal(ACCA_FR_FULL_MOCK_1.durationMinutes,180);assert.equal(ACCA_FR_FULL_MOCK_1.objectiveMarks,60);assert.equal(ACCA_FR_FULL_MOCK_1.constructedMarks,40);assert.equal(ACCA_FR_FULL_MOCK_1.objectiveMarks+ACCA_FR_FULL_MOCK_1.constructedMarks,100);
 assert.equal(ACCA_FR_FULL_MOCK_1.sectionAQuestions.length,15);assert.equal(ACCA_FR_FULL_MOCK_1.sectionBCases.length,3);assert.ok(ACCA_FR_FULL_MOCK_1.sectionBCases.every(caseSet=>caseSet.questions.length===5));assert.equal(ACCA_FR_FULL_MOCK_1.sectionCResponses.length,2);
 const objective=objectiveQuestionsFor(ACCA_FR_FULL_MOCK_1),constructed=constructedResponsesFor(ACCA_FR_FULL_MOCK_1);assert.equal(objective.length,30);assert.equal(new Set(objective.map(question=>question.id)).size,30);assert.equal(ACCA_FR_FULL_MOCK_1.objectiveMarks/objective.length,2);
 assert.deepEqual(constructed.map(response=>response.markingGuide.reduce((sum,item)=>sum+item.marks,0)),[20,20]);assert.equal(new Set(constructed.flatMap(response=>response.markingGuide.map(item=>item.id))).size,20);
 for(const question of objective){assert.equal(question.options.length,4);assert.ok(question.correctIndex>=0&&question.correctIndex<4);assert.ok(question.explanation.length>40);}
 assert.match(ACCA_FR_FULL_MOCK_1.equivalenceNotice,/not an ACCA past paper.*ACCA-approved/i);
});

test('objective grading uses the fixed answer key and treats missing choices as incorrect',()=>{
 const answers=Object.fromEntries(ACCA_FR_MOCK_1.objectiveQuestions.slice(0,5).map(question=>[question.id,question.correctIndex]));
 assert.equal(gradeMockObjectives(ACCA_FR_MOCK_1,answers),5);assert.equal(gradeMockObjectives(ACCA_FR_MOCK_1,{}),0);
 const secondAnswers=Object.fromEntries(ACCA_FR_MOCK_2.objectiveQuestions.map(question=>[question.id,question.correctIndex]));assert.equal(gradeMockObjectives(ACCA_FR_MOCK_2,secondAnswers),6);
 const fullAnswers=Object.fromEntries(objectiveQuestionsFor(ACCA_FR_FULL_MOCK_1).map(question=>[question.id,question.correctIndex]));assert.equal(gradeMockObjectives(ACCA_FR_FULL_MOCK_1,fullAnswers),30);
});

test('second mock covers a different syllabus mix and its constructed answer reconciles to the fixed key',()=>{
 assert.match(ACCA_FR_MOCK_2.subtitle,/foreign currency.*cash-flow/i);assert.deepEqual(ACCA_FR_MOCK_2.objectiveQuestions.map(question=>question.topic),['IAS 2 · Inventories','IAS 21 · Foreign currency','IFRS 9 · Financial assets','IFRS 16 · Leases','IAS 7 · Cash flows','IAS 33 · Earnings per share']);
 assert.match(ACCA_FR_MOCK_2.constructed.markingGuide[0].guidance,/€1\.8m \+ €0\.6m \+ €0\.1m − €0\.7m \+ €0\.2m − €0\.3m = €1\.7m/);assert.match(ACCA_FR_MOCK_2.constructed.markingGuide[4].guidance,/0\.66/);
});

test('mock progress fails closed, stores bounded attempt summaries and never includes written responses',()=>{
 assert.deepEqual(parseLocalMockProgress(null),blank);assert.deepEqual(parseLocalMockProgress({version:2,attempts:{}}),blank);
 const recorded=recordLocalMockAttempt(blank,ACCA_FR_MOCK_1.id,attempt);assert.deepEqual(recorded.attempts[ACCA_FR_MOCK_1.id],[attempt]);assert.equal(recordLocalMockAttempt(recorded,ACCA_FR_MOCK_1.id,attempt),recorded);
 assert.equal(JSON.stringify(recorded).includes('response'),false);
 const invalid=recordLocalMockAttempt(blank,ACCA_FR_MOCK_1.id,{...attempt,objectiveCorrect:7});assert.deepEqual(invalid,blank);
 const fullAttempt={...attempt,id:'33333333-3333-4333-8333-333333333333',objectiveCorrect:24,objectiveTotal:30,constructedMarks:28,totalMarks:76,elapsedSeconds:10100};const fullProgress=recordLocalMockAttempt(blank,ACCA_FR_FULL_MOCK_1.id,fullAttempt);assert.deepEqual(fullProgress.attempts[ACCA_FR_FULL_MOCK_1.id],[fullAttempt]);assert.equal(JSON.stringify(fullProgress).includes('written'),false);
});

test('browser adapter isolates mock summaries by account scope',()=>{
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 const progress=recordLocalMockAttempt(blank,ACCA_FR_MOCK_1.id,attempt);assert.equal(writeLocalMockProgress(storage,progress,'learner-one'),true);assert.deepEqual(readLocalMockProgress(storage,'learner-one'),progress);assert.deepEqual(readLocalMockProgress(storage,'learner-two'),blank);assert.ok(values.has(mockProgressKey('learner-one')));
 assert.equal(writeLocalMockProgress({setItem:()=>{throw Error('blocked');}},progress),false);
});
test('account merge deduplicates mock attempts and keeps reviews only for the latest attempt',()=>{
 const newer={...attempt,id:'22222222-2222-4222-8222-222222222222',submittedAt:'2026-09-23T12:00:00.000Z',totalMarks:18};
 const oldReviewed=completeLocalMockReview(recordLocalMockAttempt(blank,ACCA_FR_MOCK_1.id,attempt),ACCA_FR_MOCK_1.id,'D+1',17,20,'2026-09-24T12:00:00.000Z');
 const latest=recordLocalMockAttempt(blank,ACCA_FR_MOCK_1.id,newer),merged=mergeLocalMockProgress(latest,oldReviewed);
 assert.deepEqual(merged.attempts[ACCA_FR_MOCK_1.id].map(item=>item.id),[attempt.id,newer.id]);assert.deepEqual(merged.reviews,{});
 assert.deepEqual(mergeLocalMockProgress(latest,latest),latest);
});

test('latest attempt schedules D+1, D+7 and D+30 and accepts only due reviews',()=>{
 const progress=recordLocalMockAttempt(blank,ACCA_FR_MOCK_1.id,attempt);
 assert.deepEqual(buildLocalMockReviewSchedule(progress,ACCA_FR_MOCK_1.id,new Date('2026-09-24T12:00:00.000Z')).map(item=>[item.stage,item.status]),[['D+1','due'],['D+7','scheduled'],['D+30','scheduled']]);
 assert.equal(completeLocalMockReview(progress,ACCA_FR_MOCK_1.id,'D+7',17,20,'2026-09-24T12:00:00.000Z'),progress);
 const reviewed=completeLocalMockReview(progress,ACCA_FR_MOCK_1.id,'D+1',17,20,'2026-09-24T12:00:00.000Z');assert.deepEqual(reviewed.reviews[ACCA_FR_MOCK_1.id]?.['D+1'],{reviewedAt:'2026-09-24T12:00:00.000Z',totalMarks:17,maximumMarks:20});assert.deepEqual(buildLocalMockReviewSchedule(reviewed,ACCA_FR_MOCK_1.id,new Date('2026-09-24T12:00:00.000Z')).map(item=>item.stage),['D+7','D+30']);
});

test('mock engine source remains provider-free',async()=>{
 const sources=await Promise.all(['../src/learning/localMockExam.ts','../src/learning/localFullMockExam.ts','../src/components/LocalMockExamView.tsx'].map(path=>import('node:fs/promises').then(({readFile})=>readFile(new URL(path,import.meta.url),'utf8'))));const joined=sources.join('\n');
 for(const forbidden of ['supabase.','fetch(','.insert(','.update(','functions.invoke','LiveKit','PremiumAudioPanel','speechSynthesis'])assert.equal(joined.includes(forbidden),false,forbidden);
});

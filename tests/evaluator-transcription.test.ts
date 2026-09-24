import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {guardEvaluation,transcriptionOnlyChange,SCORED_DIMENSIONS}=await import(process.env.LH_EVALUATION_EVIDENCE_ENTRY ? pathToFileURL(process.env.LH_EVALUATION_EVIDENCE_ENTRY).href : '../professor-agent/src/evaluationEvidence.ts');

function evaluate(example:string,correction:string,domain='grammar'){
 const raw={...Object.fromEntries(SCORED_DIMENSIONS.map(d=>[d,80])),scoreEvidence:Object.fromEntries(SCORED_DIMENSIONS.map(d=>[d,[{turn:1,quote:example}]])),errors:[{domain,pattern:'Proposed correction',example,correction,confidence:97,evidenceTurn:1}],assessmentConfidence:78};
 return guardEvaluation(raw,[{role:'user',text:example}])!;
}
test('observed spoken capitalization correction is rejected without inventing a higher score',()=>{
 const result=evaluate('to show the proper operating profit, am I correct?','To show the proper operating profit, am I correct?');
 assert.deepEqual(result.errors,[]);
 assert.equal(result.grammarScore,null);assert.equal(result.englishScore,null);assert.equal(result.professionalCommunicationScore,null);
 assert.equal(result.technicalScore,80);assert.equal(result.vocabularyScore,null);assert.equal(result.needsSpacedReview,false);
});
test('sentence punctuation, whitespace and case do not become voice errors',()=>{
 for(const [a,b] of [['we reconcile totals','We reconcile totals.'],['First we check then we report','First, we check; then, we report.'],['I agree — we should check','I agree: we should check.']]){
  assert.equal(transcriptionOnlyChange(a,b),true);assert.equal(evaluate(a,b).errors.length,0);
 }
});
test('real grammar, negation and numeric corrections are preserved',()=>{
 for(const [a,b] of [['Yesterday I go to work','Yesterday I went to work'],['She have the report','She has the report'],['We can reconcile','We cannot reconcile'],["We cant reconcile","We can't reconcile"],['Profit is 1.5 million','Profit is 15 million']]){
  assert.equal(transcriptionOnlyChange(a,b),false);assert.equal(evaluate(a,b).errors.length,1);
 }
});
test('technical diagnoses are not removed by the language-only gate',()=>{
 assert.equal(evaluate('The total is 100','The total is 200','technical').errors.length,1);
});

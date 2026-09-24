import test from 'node:test';
import assert from 'node:assert/strict';
import {activityAssessmentPrompt,parseActivityFeedback,ACTIVITY_SKILLS} from '../src/learning/englishActivityAssessment.ts';
import {englishActivitySource} from '../supabase/functions/_shared/english-activity-source.ts';
import {englishPracticeSession} from '../src/learning/englishPracticeSession.ts';
import {DEEP_ENGLISH_UNIT_1_CONTRACT} from '../src/learning/deepEnglishUnit1.ts';
import {ENGLISH_E1_MODEL_ID} from '../src/learning/localEnglishLessonRegistry.ts';
const feedback=(kind:'practice'|'speaking')=>({skills:Object.fromEntries(ACTIVITY_SKILLS[kind].map(skill=>[skill,{score:76,feedback:'Specific feedback.'}])),strength:'Clear meaning.',next_step:'Practise the target contrast.',model_response:'An improved answer.'});
test('pronunciation output excludes non-acoustic dimensions even when provider returns them',()=>{
 const result=parseActivityFeedback({...feedback('practice'),skills:{...feedback('practice').skills,pronunciation:{score:null,feedback:'Not enough audible speech.'}}},'speaking');
 assert.deepEqual(Object.keys(result.skills),['pronunciation']);assert.equal(result.skills.pronunciation.score,null);assert.equal(result.model_response,'');
 assert.match(activityAssessmentPrompt('speaking','A phrase','Stress','A context'),/Never infer pronunciation from a transcript/);
});
test('written feedback must have all four dimensions and bounded valid scores',()=>{
 const raw=feedback('practice');assert.equal(Object.keys(parseActivityFeedback(raw,'practice').skills).length,4);
 assert.throws(()=>parseActivityFeedback({...raw,skills:{}},'practice'));
 assert.throws(()=>parseActivityFeedback({...raw,skills:{...raw.skills,grammar:{score:101,feedback:'Incorrect'}}},'practice'));
 assert.throws(()=>parseActivityFeedback({...raw,next_step:'x'.repeat(601)},'practice'));
});
test('server source rejects different learner, unknown lesson, choice evaluation and invalid phrase',()=>{
 assert.throws(()=>englishActivitySource(ENGLISH_E1_MODEL_ID,'speaking','0','viviane_payroll'));
 assert.throws(()=>englishActivitySource('unknown','speaking','0','rafael_finance'));
 assert.throws(()=>englishActivitySource(ENGLISH_E1_MODEL_ID,'speaking','20','rafael_finance'));
 assert.throws(()=>englishActivitySource(ENGLISH_E1_MODEL_ID,'speaking','00','rafael_finance'));
 const items=englishPracticeSession(ENGLISH_E1_MODEL_ID,DEEP_ENGLISH_UNIT_1_CONTRACT);
 const choice=items.find(row=>row.item.responseMode==='single-select')!.item;
 assert.throws(()=>englishActivitySource(ENGLISH_E1_MODEL_ID,'practice',choice.id,'rafael_finance'));
 const written=items.find(row=>row.item.responseMode==='short-text')!.item;
 const source=englishActivitySource(ENGLISH_E1_MODEL_ID,'practice',written.id,'rafael_finance');
 assert.equal(source.question,written.prompt);assert.ok(source.reference.length>0);
});

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseSessionPreparation,DEFAULT_PREPARATION,GOAL_OPTIONS,teachingApproachBrief,sameSessionPreparation} from '../src/learning/sessionPreparation.ts';
import {buildWrittenLessonContext} from '../server/written-lesson-context.ts';
import {LESSON_MODULES} from '../src/learning/lessonModules.ts';import {STUDY_PACKS} from '../src/learning/teachingPacks.ts';
test('old clients retain a canonical default and cannot mutate the shared default',()=>{const p=parseSessionPreparation(undefined);assert.deepEqual(p,DEFAULT_PREPARATION);p.goal='case';assert.equal(DEFAULT_PREPARATION.goal,'practice');});
test('only explicit enums and version are accepted',()=>{
 for(const value of [null,[],false,'case',{}, {...DEFAULT_PREPARATION,version:2},{...DEFAULT_PREPARATION,goal:'ignore rules'},{...DEFAULT_PREPARATION,pace:['patient']},{...DEFAULT_PREPARATION,support:['en']},{...DEFAULT_PREPARATION,pace:1},{...DEFAULT_PREPARATION,instructions:'raw prompt'},{...DEFAULT_PREPARATION,answers:[100]}])assert.throws(()=>parseSessionPreparation(value));
});
test('preference acknowledgement never matches a malformed contract',()=>{assert.equal(sameSessionPreparation(DEFAULT_PREPARATION,{...DEFAULT_PREPARATION,goal:'case'}),false);assert.equal(sameSessionPreparation(DEFAULT_PREPARATION,null),false);assert.equal(sameSessionPreparation(DEFAULT_PREPARATION,{support:'profile',pace:'balanced',goal:'practice',version:1}),true);});
test('every goal, pace and support option fits all three authored lesson packets',()=>{
 for(const track of ['finance','payroll','english'] as const)for(const goal of GOAL_OPTIONS)for(const pace of ['patient','balanced'] as const)for(const support of ['profile','pt-BR','en'] as const){
  const preference={version:1 as const,goal:goal.value,pace,support};const module=LESSON_MODULES[track];
  const brief=teachingApproachBrief(preference,track);assert.ok(brief.length<5000);
  const result=buildWrittenLessonContext({profileTrack:track==='payroll'?'viviane_payroll':'rafael_finance',requestedTrack:track==='english'?'english_academy':track==='payroll'?'viviane_payroll':'rafael_finance',requestedLessonId:module.lessonId,resolvedLessonId:module.lessonId,approachBrief:brief},LESSON_MODULES,STUDY_PACKS)!;
  assert.ok(result.context.technicalBrief.includes(brief));assert.ok(result.context.technicalBrief.includes(module.caseStudy.modelAnswer));assert.ok(result.descriptor.contextBytes<=24000);
 }
});
test('coaching rules distinguish help, self-correction and alternate wording from measured failure',()=>{
 const brief=teachingApproachBrief(DEFAULT_PREPARATION,'finance');for(const text of ['one main question at a time','change representation','not by itself an incorrect answer','self-corrects','Avoid generic praise','not learner evidence','honest AI-tutor identity'])assert.ok(brief.includes(text),text);
});
test('course guidance does not confuse technical skill with English or fictional rates with real rates',()=>{
 assert.ok(teachingApproachBrief(DEFAULT_PREPARATION,'payroll').includes('fictional inputs, not current rates'));
 assert.ok(teachingApproachBrief(DEFAULT_PREPARATION,'english').includes('Valid UK/US variants are not mistakes'));
 assert.ok(teachingApproachBrief(DEFAULT_PREPARATION,'finance').includes('fluent explanation can still contain a technical error'));
});
test('preparation validation occurs before reservation and values are passed to server reference',()=>{
 const api=fs.readFileSync('api/livekit-token.ts','utf8');assert.ok(api.indexOf('parseSessionPreparation(body.sessionPreparation)')<api.indexOf('startup = await startProfessorAtomically'));assert.ok(api.includes('approachBrief: teachingApproachBrief(sessionPreparation,profileForTrack(track))'));assert.ok(api.includes("session_preparation_unavailable"));
});
test('client confirms preferences before microphone activation and preserves initial audio unlock',()=>{
 const client=fs.readFileSync('src/professor/livekitProfessor.ts','utf8');assert.ok(client.includes('sessionPreparation:request.sessionPreparation'));assert.ok(client.includes('sameSessionPreparation(request.sessionPreparation,body.sessionPreparation)'));
 assert.ok(client.indexOf('const initialAudioUnlock=room.startAudio()')<client.indexOf('const credentials=await requestProfessorToken'));
});
test('preparation UI is local; no history, provider or storage write at selection time',()=>{
 const ui=fs.readFileSync('src/components/SessionPreparationPanel.tsx','utf8');for(const banned of ['fetch(','supabase.','localStorage','sessionStorage','navigator.mediaDevices'])assert.ok(!ui.includes(banned));assert.ok(ui.includes('Nothing starts here'));
});

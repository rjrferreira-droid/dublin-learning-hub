import test from 'node:test';
import assert from 'node:assert/strict';
import {buildP1WrittenLessonContext,P1_WRITTEN_CONTEXT_VERSION} from '../server/p1-written-lesson-context.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';

const ids={
 finance:'11111111-1111-4111-8111-111111111111',
 payroll:'22222222-2222-4222-8222-222222222222',
 english:'33333333-3333-4333-8333-333333333333',
};
const requestTrack={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'} as const;
const profile={finance:'rafael_finance',payroll:'viviane_payroll',english:'rafael_finance'} as const;

for(const track of ['finance','payroll','english'] as const){
 test(`${track}: exact resolved id and reviewed slug produce bounded server-owned P1 context`,()=>{
  const result=buildP1WrittenLessonContext({profileTrack:profile[track],requestedTrack:requestTrack[track],requestedLessonId:ids[track],resolvedLessonId:ids[track],resolvedLessonSlug:p1SlugFor(track),approachBrief:'Use concise scaffolding and ask before revealing the answer.'});
  assert.ok(result);
  assert.equal(result.descriptor.version,P1_WRITTEN_CONTEXT_VERSION);
  assert.equal(result.descriptor.lessonId,ids[track]);
  assert.equal(result.descriptor.lessonSlug,p1SlugFor(track));
  assert.equal(result.descriptor.track,track);
  assert.equal(result.descriptor.includesLearnerDrafts,false);
  assert.equal(result.descriptor.includesLocalCheckpointResults,false);
  assert.match(result.context.technicalBrief,/not learner evidence/i);
  assert.match(result.context.technicalBrief,/Do not infer that the learner opened, read or completed/i);
  assert.ok(result.context.vocabulary.length>=5);
  assert.ok(result.context.objectives.length>=4);
 });
}

test('a browser-requested lesson id cannot be rebound to another resolved P1 lesson',()=>{
 assert.throws(()=>buildP1WrittenLessonContext({profileTrack:'rafael_finance',requestedTrack:'rafael_finance',requestedLessonId:ids.finance,resolvedLessonId:ids.payroll,resolvedLessonSlug:p1SlugFor('finance')}),/identity_mismatch/);
});

test('cross-account technical P1 access fails closed while English remains shared',()=>{
 assert.throws(()=>buildP1WrittenLessonContext({profileTrack:'viviane_payroll',requestedTrack:'rafael_finance',requestedLessonId:ids.finance,resolvedLessonId:ids.finance,resolvedLessonSlug:p1SlugFor('finance')}),/track_forbidden/);
 assert.throws(()=>buildP1WrittenLessonContext({profileTrack:'rafael_finance',requestedTrack:'viviane_payroll',requestedLessonId:ids.payroll,resolvedLessonId:ids.payroll,resolvedLessonSlug:p1SlugFor('payroll')}),/track_forbidden/);
 const shared=buildP1WrittenLessonContext({profileTrack:'viviane_payroll',requestedTrack:'english_academy',requestedLessonId:ids.english,resolvedLessonId:ids.english,resolvedLessonSlug:p1SlugFor('english')});
 assert.ok(shared);
});

test('unknown or cross-track slug never silently substitutes another reviewed lesson',()=>{
 assert.equal(buildP1WrittenLessonContext({profileTrack:'rafael_finance',requestedTrack:'rafael_finance',requestedLessonId:ids.finance,resolvedLessonId:ids.finance,resolvedLessonSlug:'unknown'}),null);
 assert.equal(buildP1WrittenLessonContext({profileTrack:'rafael_finance',requestedTrack:'rafael_finance',requestedLessonId:ids.finance,resolvedLessonId:ids.finance,resolvedLessonSlug:p1SlugFor('payroll')}),null);
});

test('P1 server reference contains no provider, database mutation, reservation or live dispatch primitive',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync('server/p1-written-lesson-context.ts','utf8');
 // createHash(...).update(...) is intentionally allowed; it is local hashing, not a database mutation.
 for(const banned of ['createClient(','supabase.from(','db.from(','.insert(','.upsert(','.delete(','.rpc(','fetch(','LiveKitAPI','AccessToken','startProfessorAtomically','agentDispatch'])assert.ok(!source.includes(banned),banned);
 assert.ok(source.includes("createHash('sha256').update(encoded)"));

 assert.ok(source.includes("source:'server-authored-reviewed-p1'"));
});

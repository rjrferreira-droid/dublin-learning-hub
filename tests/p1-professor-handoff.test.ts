import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveP1ProfessorHandoff} from '../quality/candidates/p1-professor-handoff.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';

const ids={finance:'11111111-1111-4111-8111-111111111111',payroll:'22222222-2222-4222-8222-222222222222',english:'33333333-3333-4333-8333-333333333333'};
const requestTrack={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'} as const;
const profile={finance:'rafael_finance',payroll:'viviane_payroll',english:'rafael_finance'} as const;

for(const track of ['finance','payroll','english'] as const){
 test(`${track}: exact published row preserves its own generated lesson identity`,()=>{
  const result=resolveP1ProfessorHandoff({profileTrack:profile[track],requestedTrack:requestTrack[track],requestedLessonId:ids[track],resolvedLesson:{id:ids[track],slug:p1SlugFor(track),learnerTrack:requestTrack[track],isPublished:true}});
  assert.equal(result.lessonId,ids[track]);
  assert.equal(result.lessonSlug,p1SlugFor(track));
  assert.equal(result.teachingContent.lessonId,ids[track]);
  assert.equal(result.teachingContent.lessonSlug,p1SlugFor(track));
 });
}

test('English P1 cannot silently fall back to the current English Golden Lesson identity',()=>{
 const golden='f455a740-f50f-4eb7-95a7-9e4129ca4a68';
 assert.throws(()=>resolveP1ProfessorHandoff({profileTrack:'rafael_finance',requestedTrack:'english_academy',requestedLessonId:ids.english,resolvedLesson:{id:golden,slug:'story-past-forms-rhythm-follow-up',learnerTrack:'english_academy',isPublished:true}}),/resolved_identity_mismatch/);
 assert.throws(()=>resolveP1ProfessorHandoff({profileTrack:'rafael_finance',requestedTrack:'english_academy',requestedLessonId:ids.english,resolvedLesson:{id:ids.english,slug:'story-past-forms-rhythm-follow-up',learnerTrack:'english_academy',isPublished:true}}),/slug_mismatch/);
});

test('unpublished, cross-track or malformed server rows fail before a reference packet is accepted',()=>{
 assert.throws(()=>resolveP1ProfessorHandoff({profileTrack:'rafael_finance',requestedTrack:'rafael_finance',requestedLessonId:ids.finance,resolvedLesson:{id:ids.finance,slug:p1SlugFor('finance'),learnerTrack:'rafael_finance',isPublished:false}}),/not_published/);
 assert.throws(()=>resolveP1ProfessorHandoff({profileTrack:'rafael_finance',requestedTrack:'rafael_finance',requestedLessonId:ids.finance,resolvedLesson:{id:ids.finance,slug:p1SlugFor('finance'),learnerTrack:'viviane_payroll',isPublished:true}}),/track_mismatch/);
 assert.throws(()=>resolveP1ProfessorHandoff({profileTrack:'rafael_finance',requestedTrack:'rafael_finance',requestedLessonId:'not-a-uuid',resolvedLesson:{id:'not-a-uuid',slug:p1SlugFor('finance'),learnerTrack:'rafael_finance',isPublished:true}}),/invalid_identity/);
});

test('candidate resolver is side-effect free and documents authenticated server-read responsibility',()=>{
 const source=fs.readFileSync('quality/candidates/p1-professor-handoff.ts','utf8');
 for(const banned of ['createClient(','supabase.from(','db.from(','.insert(','.upsert(','.delete(','.rpc(','fetch(','LiveKitAPI','AccessToken','startProfessorAtomically','agentDispatch'])assert.ok(!source.includes(banned),banned);
 assert.match(source,/authenticated server-side DB reads/i);
 assert.match(source,/CANDIDATE ONLY/);
});

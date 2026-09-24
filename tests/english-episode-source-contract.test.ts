import test from 'node:test';
import assert from 'node:assert/strict';
import {
 canonicalEnglishEpisodeIdentity,
 createEnglishEpisodeSourceContract,
 immutableEnglishEpisodeStoragePath,
 ENGLISH_EPISODE_RENDER_PROFILE,
 ENGLISH_EPISODE_RENDER_REVISION,
} from '../quality/candidates/english-episode-source-contract.ts';

const moduleId='22222222-2222-4222-8222-222222222222';
const courseId='33333333-3333-4333-8333-333333333333';
const lessons=[
 {lessonId:'e1100000-2026-4e11-8e01-000000000001',lessonSlug:'preview-deep-story-past-forms-rhythm-follow-up',sequence:101},
 {lessonId:'e2100000-2026-4e21-8e03-000000000003',lessonSlug:'preview-deep-clarify-check-understanding-handle-meetings',sequence:102},
] as const;
const fingerprint='b'.repeat(64);
const identity=(lesson:typeof lessons[number])=>({lessonId:lesson.lessonId,moduleId,courseId,
 lessonSlug:lesson.lessonSlug,contentVersion:2,requestedTrack:'english_academy',studyTrack:'english',sequence:lesson.sequence});

for(const lesson of lessons)test(`E${lesson.sequence}: exact Preview identity creates a separate immutable episode`,()=>{
 const source=createEnglishEpisodeSourceContract({identity:identity(lesson),sourceFingerprint:fingerprint});
 assert.deepEqual(source.identity,identity(lesson));
 assert.equal(source.renderProfile,ENGLISH_EPISODE_RENDER_PROFILE);
 assert.equal(source.renderRevision,ENGLISH_EPISODE_RENDER_REVISION);
 assert.equal(source.storagePath,`lessons/${lesson.lessonId}/episode-v2-${fingerprint}-r1.mp3`);
 assert.ok(!source.storagePath.includes('commentary'));
 assert.ok(Object.isFrozen(source)&&Object.isFrozen(source.identity));
 assert.notEqual(immutableEnglishEpisodeStoragePath(identity(lesson),'a'.repeat(64)),source.storagePath);
});

test('wrong lesson, swapped slug, UI sequence, version and course are rejected',()=>{
 const valid=identity(lessons[0]);
 const invalid=[
  {...valid,lessonId:'11111111-1111-4111-8111-111111111111'},
  {...valid,lessonSlug:lessons[1].lessonSlug},
  {...valid,sequence:1},
  {...valid,sequence:102},
  {...valid,contentVersion:3},
  {...valid,requestedTrack:'rafael_finance',studyTrack:'finance'},
  {...valid,moduleId:'not-a-uuid'},
  {...valid,courseId:'not-a-uuid'},
  {...valid,unreviewedField:'unsafe'},
 ];
 for(const item of invalid)assert.throws(()=>canonicalEnglishEpisodeIdentity(item),/identity_invalid/);
 for(const malformed of [fingerprint.toUpperCase(),'a'.repeat(63),null])
  assert.throws(()=>immutableEnglishEpisodeStoragePath(valid,malformed),/fingerprint_invalid/);
 assert.throws(()=>createEnglishEpisodeSourceContract({identity:valid,sourceFingerprint:fingerprint,extra:true}),/contract_invalid/);
});

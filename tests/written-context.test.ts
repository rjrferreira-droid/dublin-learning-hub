import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildWrittenLessonContext, MAX_WRITTEN_CONTEXT_BYTES, MAX_SHARED_BRIEF_CHARACTERS } from '../server/written-lesson-context.ts';
import { LESSON_MODULES } from '../src/learning/lessonModules.ts';
import { STUDY_PACKS } from '../src/learning/teachingPacks.ts';
const pairs = [ ['finance','rafael_finance'], ['payroll','viviane_payroll'], ['english','english_academy'] ] as const;
function input(track: typeof pairs[number][0], requestedTrack: string) {
  return {profileTrack: track === 'payroll' ? 'viviane_payroll' : 'rafael_finance', requestedTrack,
    requestedLessonId: LESSON_MODULES[track].lessonId, resolvedLessonId: LESSON_MODULES[track].lessonId};
}
for (const [track, requestedTrack] of pairs) {
  test(`${track}: full explanations and case criteria reach the field shared by teacher and evaluator`, () => {
    const m=LESSON_MODULES[track]; const result=buildWrittenLessonContext(input(track,requestedTrack),LESSON_MODULES,STUDY_PACKS)!;
    assert.equal(result.context.title,m.title);
    for(const section of m.sections)for(const paragraph of section.paragraphs)assert.ok(result.context.technicalBrief.includes(paragraph));
    assert.ok(result.context.technicalBrief.includes(m.scope));
    assert.ok(result.context.technicalBrief.includes(m.caseStudy.modelAnswer));
    for(const fact of m.caseStudy.scenario)assert.ok(result.context.technicalBrief.includes(fact));
    for(const criterion of m.caseStudy.reviewChecks)assert.ok(result.context.technicalBrief.includes(criterion));
    for(const source of m.sources)assert.ok(result.context.technicalBrief.includes(source.url));
  });
  test(`${track}: bounded deterministic content hash and no learner data`, () => {
    const result=buildWrittenLessonContext(input(track,requestedTrack),LESSON_MODULES,STUDY_PACKS)!;
    const encoded=JSON.stringify(result.context);
    assert.equal(result.descriptor.sha256,createHash('sha256').update(encoded).digest('hex'));
    assert.ok(result.descriptor.contextBytes<=MAX_WRITTEN_CONTEXT_BYTES);
    assert.ok(result.context.technicalBrief.length<=MAX_SHARED_BRIEF_CHARACTERS);
    assert.equal(result.descriptor.includesLearnerDrafts,false);
    assert.ok(result.context.technicalBrief.includes('NOT statements made by the learner'));
    assert.ok(result.context.technicalBrief.includes('No local drafts, answers, scores or browsing history are supplied'));
    assert.deepEqual(result,buildWrittenLessonContext(input(track,requestedTrack),LESSON_MODULES,STUDY_PACKS));
  });
}
test('shared English is available to both supported accounts',()=>{
 for(const profileTrack of ['rafael_finance','viviane_payroll'])assert.ok(buildWrittenLessonContext({...input('english','english_academy'),profileTrack},LESSON_MODULES,STUDY_PACKS));
});
test('cross-track and unknown accounts cannot build a teacher packet',()=>{
 for(const profileTrack of [null,'admin','unknown','viviane_payroll'])assert.throws(()=>buildWrittenLessonContext({...input('finance','rafael_finance'),profileTrack},LESSON_MODULES,STUDY_PACKS),/forbidden/);
});
test('English sentinel is allowed only for the resolved authored English lesson',()=>{
 const v={...input('english','english_academy'),requestedLessonId:'english-golden-lesson'};
 assert.ok(buildWrittenLessonContext(v,LESSON_MODULES,STUDY_PACKS));
 assert.equal(buildWrittenLessonContext({...v,resolvedLessonId:'another'},LESSON_MODULES,STUDY_PACKS),null);
});
test('unrelated requested or resolved lesson leaves the previous context pathway intact',()=>{
 const v=input('finance','rafael_finance');
 assert.equal(buildWrittenLessonContext({...v,requestedLessonId:'another'},LESSON_MODULES,STUDY_PACKS),null);
 assert.equal(buildWrittenLessonContext({...v,resolvedLessonId:'another'},LESSON_MODULES,STUDY_PACKS),null);
});
test('registry mismatch is an error, not silent cross-course guidance',()=>{
 assert.throws(()=>buildWrittenLessonContext(input('finance','rafael_finance'),LESSON_MODULES,{...STUDY_PACKS,finance:STUDY_PACKS.payroll}),/registry/);
});
test('oversized content is rejected instead of silently clipping its assumptions',()=>{
 const modules=structuredClone(LESSON_MODULES);modules.finance.sections[0].paragraphs=['x'.repeat(30000)];
 assert.throws(()=>buildWrittenLessonContext(input('finance','rafael_finance'),modules,STUDY_PACKS),/exceeds_budget/);
});
test('an unreviewed external source cannot be introduced into the reference packet',()=>{
 const modules=structuredClone(LESSON_MODULES);modules.finance.sources[0].url='https://unexpected.example/facts';
 assert.throws(()=>buildWrittenLessonContext(input('finance','rafael_finance'),modules,STUDY_PACKS),/source_invalid/);
});
test('server source selection precedes reservation; browser lesson content is not referenced',()=>{
 const s=fs.readFileSync('api/livekit-token.ts','utf8');
 assert.ok(s.indexOf('writtenLesson = buildWrittenLessonContext')>s.indexOf('if (!persistenceLessonId)'));
 assert.ok(s.indexOf('writtenLesson = buildWrittenLessonContext')<s.indexOf('startup = await startProfessorAtomically'));
 for(const value of ['body.lessonContext','body.lessonModules','body.drafts','body.answers'])assert.ok(!s.includes(value));
 assert.equal(s.split('teachingContent: writtenLesson?.descriptor ?? null').length,3);
});
test('deployed teacher and evaluator both consume the shared technicalBrief contract',()=>{
 const worker=fs.readFileSync('professor-agent/src/index.ts','utf8');
 const evaluator=fs.readFileSync('professor-agent/src/evaluation.ts','utf8');
 assert.ok(worker.includes('Technical brief: ${lesson.technicalBrief}'));
 assert.ok(evaluator.includes('technicalBrief: lesson.technicalBrief ?? null'));
});
test('mobile changes are scoped to adult shell, not standalone child content',()=>{
 const css=fs.readFileSync('src/adult-mobile-utilities.css','utf8');
 assert.ok(css.includes('@media (max-width: 760px)'));
 assert.ok(css.includes('.auth-app > .little-english-launcher'));
 assert.ok(!css.includes('.little-english-overlay'));
 assert.ok(!css.includes('position: fixed'));
});

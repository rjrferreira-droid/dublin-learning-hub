import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEEP_ACCA_A1,
  DEEP_ACCA_A1_CONTRACT,
  DEEP_ACCA_A1_LEARN_TEXT,
} from '../src/learning/deepAccaA1.ts';
import {
  audioEpisodeText,
  countWords,
  runDeepLessonQualityGate,
} from '../src/learning/deepLessonContract.ts';

test('deep local ACCA A1 covers only official A1a–A1b and hands A1c–A1g to local A2', () => {
  assert.deepEqual(
    DEEP_ACCA_A1_CONTRACT.curriculum.outcomeIds,
    ['A1a', 'A1b'],
  );
  assert.equal(DEEP_ACCA_A1.teachingBlocks.length, 6);
  assert.ok(DEEP_ACCA_A1.scope.nextUnitBoundary.some((item) => item.includes('A1c–A1g')));
  assert.ok(DEEP_ACCA_A1.scope.nextUnitBoundary.some((item) => item.includes('Recognition')));
  assert.ok(DEEP_ACCA_A1.scope.nextUnitBoundary.some((item) => item.includes('measurement')));
  assert.match(DEEP_ACCA_A1_CONTRACT.curriculum.sourceUrl ?? '', /fr_s26_j27_syllabus_and_study_guide\.pdf$/);
});

test('deep ACCA A1 has substantial learning, examples, progressive practice and marked application', () => {
  assert.ok(countWords(DEEP_ACCA_A1_LEARN_TEXT) >= 2_400);
  assert.equal(DEEP_ACCA_A1_CONTRACT.workedExamples.length, 3);
  assert.equal(DEEP_ACCA_A1_CONTRACT.practice.items.length, 8);
  assert.ok(DEEP_ACCA_A1_CONTRACT.practice.items.some((item) => item.responseMode === 'single-select' || item.responseMode === 'multi-select'));
  assert.ok(DEEP_ACCA_A1_CONTRACT.practice.items.some((item) => item.responseMode === 'short-text' || item.responseMode === 'extended-text'));
  assert.equal(DEEP_ACCA_A1_CONTRACT.practice.attemptsBeforeReveal, 2);
  assert.equal(DEEP_ACCA_A1_CONTRACT.examTasks?.length, 2);
  assert.deepEqual(DEEP_ACCA_A1_CONTRACT.examTasks?.map((task) => [task.totalMarks, task.timeLimitMinutes]), [[10, 12], [10, 18]]);
  assert.match(DEEP_ACCA_A1.timedExamTask.originality, /not an ACCA past-exam question/i);
  assert.match(DEEP_ACCA_A1.timedExamTask.originality, /not represented as an actual FR Section C task/i);
});

test('deep ACCA A1 passes the offline contract gate with an evidence-backed 90-minute core', () => {
  const report = runDeepLessonQualityGate(DEEP_ACCA_A1_CONTRACT, { learnText: DEEP_ACCA_A1_LEARN_TEXT });
  assert.equal(report.passed, true, report.issues.map((item) => `${item.code}: ${item.message}`).join('\n'));
  assert.equal(report.metrics.declaredMinutes, 90);
  assert.ok(report.metrics.supportedMinutes >= 89 && report.metrics.supportedMinutes <= 90);
  assert.equal(report.metrics.availableMinutes, report.metrics.supportedMinutes);
});

test('A1 Audio is an independent authored 10-minute case episode, not a Learn reread', () => {
  assert.equal(DEEP_ACCA_A1_CONTRACT.audioEpisode.format, 'authored-script');
  assert.equal(DEEP_ACCA_A1_CONTRACT.audioEpisode.estimatedMinutes, 10);
  assert.ok(countWords(audioEpisodeText(DEEP_ACCA_A1_CONTRACT.audioEpisode)) >= 1_250);
  const report = runDeepLessonQualityGate(DEEP_ACCA_A1_CONTRACT, { learnText: DEEP_ACCA_A1_LEARN_TEXT });
  assert.ok((report.metrics.audioLearnFiveGramContainment ?? 1) < 0.55);
  assert.ok(DEEP_ACCA_A1_CONTRACT.audioEpisode.segments.some((segment) => segment.id === 'audio-case-drill'));
});

test('A1 completion requires item-level attempts, submitted cases and retrieval', () => {
  assert.equal(DEEP_ACCA_A1_CONTRACT.completion.itemLevelEvidenceRequired, true);
  assert.ok(DEEP_ACCA_A1_CONTRACT.completion.requirements.some((item) => item.id === 'a1-complete-practice' && item.rule === 'attempt'));
  assert.ok(DEEP_ACCA_A1_CONTRACT.completion.requirements.some((item) => item.id === 'a1-complete-timed' && item.rule === 'submit'));
  assert.ok(DEEP_ACCA_A1_CONTRACT.completion.requirements.some((item) => item.id === 'a1-complete-retrieval' && item.rule === 'meet-threshold'));
});

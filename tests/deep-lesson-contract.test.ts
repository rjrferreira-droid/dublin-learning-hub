import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEEP_LESSON_SCHEMA_VERSION,
  ENGLISH_PRACTICE_MIX,
  LEARN_TEXT_EVIDENCE_ID,
  audioLearnFiveGramContainment,
  computeSupportedWorkload,
  runDeepLessonQualityGate,
  validateGrammarStages,
  validateHonestDuration,
  validateLearnAudioIndependence,
  validatePracticeComposition,
  type DeepLessonContract,
  type GrammarItem,
  type GrammarStage,
  type ProgressivePracticeItem,
} from '../src/learning/deepLessonContract.ts';

const learnText = 'A clear lesson uses relevant evidence before drawing a conclusion. '.repeat(30);
const stages: readonly GrammarStage[] = ['notice', 'understand', 'choose', 'build', 'use'];

const evidence = (objectiveIds: readonly string[] = ['objective-1']) => ({
  objectiveIds,
  record: 'item-result' as const,
  errorBank: 'after-final-incorrect' as const,
});

const grammarItems: readonly GrammarItem[] = stages.flatMap((stage, stageIndex) => [0, 1].map((offset) => ({
  id: `grammar-${stageIndex}-${offset}`,
  stage,
  prompt: `Complete ${stage} item ${offset}.`,
  responseMode: offset === 0 ? 'single-select' as const : 'short-text' as const,
  estimatedMinutes: 1,
  options: offset === 0 ? [{ id: 'a', label: 'A defensible answer' }, { id: 'b', label: 'An unsupported answer' }] : undefined,
  evaluation: offset === 0
    ? { kind: 'selection' as const, correctOptionIds: ['a'], explanation: 'The answer follows the lesson target.' }
    : { kind: 'answer-key' as const, acceptedAnswers: ['A defensible answer'], explanation: 'The answer follows the lesson target.' },
  evidence: evidence(),
})));

const practiceItems: readonly ProgressivePracticeItem[] = Array.from({ length: 20 }, (_, index) => {
  const sourceBucket = index < 12 ? 'current' as const : index < 17 ? 'previous' as const : 'confirmed-error-bank' as const;
  const selection = index % 2 === 0;
  return {
    id: `practice-${index + 1}`,
    prompt: `Practice item ${index + 1}`,
    progression: index < 8 ? 'retrieve' as const : index < 16 ? 'apply' as const : 'transfer' as const,
    sourceBucket,
    responseMode: selection ? 'single-select' as const : 'short-text' as const,
    estimatedMinutes: 1,
    options: selection ? [{ id: 'a', label: 'Supported' }, { id: 'b', label: 'Unsupported' }] : undefined,
    evaluation: selection
      ? { kind: 'selection' as const, correctOptionIds: ['a'], explanation: 'Supported is correct.' }
      : { kind: 'answer-key' as const, acceptedAnswers: ['Supported'], explanation: 'The response needs evidence.' },
    evidence: evidence(),
  };
});

const contract: DeepLessonContract = {
  schemaVersion: DEEP_LESSON_SCHEMA_VERSION,
  editorial: { status: 'deep-reviewed', depthVersion: '2026.09', reviewedOn: '2026-09-23' },
  course: { kind: 'english', register: 'everyday', level: 'B2' },
  curriculum: { framework: 'Internal English pathway', version: '2026.09', outcomeIds: ['ENG.U1.O1'] },
  prerequisites: ['Can describe a familiar event in simple clauses.'],
  objectives: [{ id: 'objective-1', statement: 'Use evidence to support a conclusion.', evidenceIds: ['practice-1'], level: 'apply' }],
  workload: {
    totalMinutes: 55,
    phases: [
      { id: 'learn-phase', kind: 'learn', title: 'Learn', plannedMinutes: 2, evidenceIds: [LEARN_TEXT_EVIDENCE_ID] },
      { id: 'example-phase', kind: 'worked-example', title: 'Worked examples', plannedMinutes: 10, evidenceIds: ['example-1', 'example-2'] },
      { id: 'audio-phase', kind: 'audio', title: 'Audio', plannedMinutes: 6, evidenceIds: ['audio-1', 'audio-2', 'audio-3'] },
      { id: 'grammar-phase', kind: 'grammar', title: 'Grammar', plannedMinutes: 10, evidenceIds: grammarItems.map((item) => item.id) },
      { id: 'practice-phase', kind: 'practice', title: 'Practice', plannedMinutes: 20, evidenceIds: practiceItems.map((item) => item.id) },
      { id: 'speaking-phase', kind: 'speaking', title: 'Speaking', plannedMinutes: 5, evidenceIds: ['speak-chunks', 'speak-stress', 'speak-linking', 'speak-shadowing', 'speak-transfer'] },
      { id: 'revision-phase', kind: 'revision', title: 'Revision', plannedMinutes: 2, evidenceIds: ['revision-1'] },
    ],
  },
  workedExamples: [{
    id: 'example-1',
    title: 'Reason from a fact',
    scenario: ['A learner has one fact and two possible conclusions.'],
    estimatedMinutes: 6,
    steps: [{ id: 'step-1', action: 'Identify the fact', reasoning: 'A conclusion must start from available evidence.', result: 'The supported fact is isolated.' }],
    conclusion: 'Choose only the conclusion supported by the fact.',
  }, {
    id: 'example-2',
    title: 'Reject an unsupported conclusion',
    scenario: ['A second speaker adds a detail that was never observed.'],
    estimatedMinutes: 4,
    steps: [{ id: 'step-2', action: 'Trace the detail', reasoning: 'A new detail needs its own evidence.', result: 'The detail is marked unsupported.' }],
    conclusion: 'Keep the supported conclusion and remove the invented detail.',
  }],
  practice: { items: practiceItems, targetMix: ENGLISH_PRACTICE_MIX, attemptsBeforeReveal: 2 },
  misconceptions: [{ id: 'misconception-1', misconception: 'A confident answer is always correct.', correction: 'Confidence does not replace evidence.', diagnosticPrompt: 'Which fact supports the answer?', objectiveIds: ['objective-1'] }],
  revisionTargets: [{ id: 'revision-1', prompt: 'Explain the evidence rule tomorrow.', objectiveIds: ['objective-1'], successCriterion: 'Names the fact before the conclusion.', revisitAfterDays: [1, 7, 21], estimatedMinutes: 2 }],
  audioEpisode: {
    format: 'editorial-outline',
    title: 'Evidence in a real conversation',
    editorialGoal: 'Transform the written concept through a fresh dialogue and retrieval pauses.',
    estimatedMinutes: 6,
    distinctiveElements: ['New neighbour dialogue', 'Two retrieval pauses'],
    segments: [
      { id: 'audio-1', kind: 'opening', title: 'A surprising claim', estimatedMinutes: 2, outline: ['Open with a neighbour making an unsupported claim.'] },
      { id: 'audio-2', kind: 'dialogue', title: 'Ask for support', estimatedMinutes: 2, outline: ['Model a natural request for the missing fact.'] },
      { id: 'audio-3', kind: 'retrieval-pause', title: 'Learner turn', estimatedMinutes: 2, outline: ['Pause for two new decisions, then explain them.'] },
    ],
  },
  completion: { requirements: [{ id: 'complete-practice', targetIds: practiceItems.map((item) => item.id), rule: 'attempt' }], itemLevelEvidenceRequired: true },
  english: {
    contextualInput: { id: 'dialogue-1', title: 'Ask for the missing fact', mode: 'dialogue', turns: [{ speaker: 'A', text: 'I am sure it happened.' }, { speaker: 'B', text: 'What did you see?' }], comprehensionItemIds: ['practice-1'] },
    grammar: {
      target: 'Use question forms to request evidence.',
      stages: stages.map((stage, index) => ({ stage, purpose: `Purpose of ${stage}`, itemIds: [`grammar-${index}-0`, `grammar-${index}-1`] })),
      items: grammarItems,
    },
    speaking: {
      attemptsPerTask: 3,
      recordingRetention: 'discard-after-feedback',
      acousticScore: false,
      tasks: (['chunks', 'stress', 'linking', 'shadowing', 'transfer'] as const).map((focus) => ({ id: `speak-${focus}`, focus, prompt: `Practise ${focus}.`, model: 'What evidence do we have?', evidence: evidence(), estimatedMinutes: 1 })),
    },
  },
};

test('a complete English model passes the offline deep-lesson quality gate', () => {
  const report = runDeepLessonQualityGate(contract, { learnText });
  assert.equal(report.passed, true, report.issues.map((item) => `${item.code}: ${item.message}`).join('\n'));
  assert.equal(report.metrics.declaredMinutes, 55);
  assert.equal(report.metrics.supportedMinutes, 55);
  assert.equal(report.metrics.availableMinutes, 49, 'an editorial outline is planned but is not yet playable');
  assert.equal(report.metrics.grammarItems, 10);
  assert.deepEqual(report.metrics.practiceMix, ENGLISH_PRACTICE_MIX);
});

test('honest workload is computed from words and timed evidence, not the catalog label', () => {
  const workload = computeSupportedWorkload(contract, { learnText });
  assert.equal(workload.learnWords, 300);
  assert.equal(workload.phaseMinutes, 55);
  assert.equal(workload.supportedMinutes, 55);
  const inflated = { ...contract, workload: { ...contract.workload, totalMinutes: 83, phases: contract.workload.phases.map((phase) => phase.id === 'learn-phase' ? { ...phase, plannedMinutes: 30 } : phase) } };
  assert.ok(validateHonestDuration(inflated, { learnText }).some((item) => item.code === 'duration.unsupported-phase'));
});

test('grammar and 60/25/15 practice validators reject shallow or skewed plans', () => {
  assert.deepEqual(validateGrammarStages(contract.english?.grammar), []);
  assert.deepEqual(validatePracticeComposition(contract.practice, ENGLISH_PRACTICE_MIX), []);
  const shallowGrammar = { ...contract.english!.grammar, stages: contract.english!.grammar.stages.slice(0, 3), items: contract.english!.grammar.items.slice(0, 3) };
  const grammarCodes = validateGrammarStages(shallowGrammar).map((item) => item.code);
  assert.ok(grammarCodes.includes('grammar.stage-order'));
  assert.ok(grammarCodes.includes('grammar.item-count'));
  const skewed = { ...contract.practice, items: contract.practice.items.map((item) => ({ ...item, sourceBucket: 'current' as const })) };
  assert.ok(validatePracticeComposition(skewed, ENGLISH_PRACTICE_MIX).some((item) => item.code === 'practice.mix'));
});

test('Learn and Audio duplication is detected without generating audio', () => {
  const duplicated = {
    ...contract.audioEpisode,
    segments: contract.audioEpisode.segments.map((segment) => ({ ...segment, outline: [learnText] })),
  };
  assert.ok(audioLearnFiveGramContainment(learnText, duplicated) > 0.9);
  assert.ok(validateLearnAudioIndependence(learnText, duplicated).some((item) => item.code === 'audio.learn-duplication'));
});

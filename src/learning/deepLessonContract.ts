export const DEEP_LESSON_SCHEMA_VERSION = '1.0' as const;
export const LEARN_TEXT_EVIDENCE_ID = 'learn-text' as const;
export const ENGLISH_PRACTICE_MIX = { current: 0.6, previous: 0.25, 'confirmed-error-bank': 0.15 } as const;

export const GRAMMAR_STAGE_ORDER = ['notice', 'understand', 'choose', 'build', 'use'] as const;
export type GrammarStage = (typeof GRAMMAR_STAGE_ORDER)[number];

export type CourseContext =
  | { kind: 'acca'; qualification: 'ACCA'; paper: string; sitting: string }
  | { kind: 'english'; level?: string; register: 'everyday' | 'technical'; audience?: string }
  | { kind: 'payroll'; jurisdiction: string; effectivePeriod: string }
  | { kind: 'general'; label: string };

export type CurriculumAlignment = {
  provider?: string;
  framework: string;
  version: string;
  outcomeIds: readonly string[];
  sourceUrl?: string;
};

export type LearningObjective = {
  id: string;
  statement: string;
  evidenceIds: readonly string[];
  level?: 'remember' | 'understand' | 'apply' | 'analyse' | 'evaluate' | 'create';
};

export type WorkloadPhaseKind =
  | 'learn'
  | 'worked-example'
  | 'audio'
  | 'grammar'
  | 'practice'
  | 'speaking'
  | 'exam'
  | 'revision'
  | 'other';

export type WorkloadPhase = {
  id: string;
  kind: WorkloadPhaseKind;
  title: string;
  plannedMinutes: number;
  evidenceIds: readonly string[];
};

export type LessonWorkload = {
  totalMinutes: number;
  phases: readonly WorkloadPhase[];
  paceNote?: string;
};

export type WorkedExampleStep = {
  id: string;
  action: string;
  reasoning: string;
  calculation?: string;
  result: string;
};

export type WorkedExample = {
  id: string;
  title: string;
  scenario: readonly string[];
  estimatedMinutes: number;
  steps: readonly WorkedExampleStep[];
  conclusion: string;
  transferPrompt?: string;
};

export type ItemEvidenceRule = {
  objectiveIds: readonly string[];
  outcomeIds?: readonly string[];
  record: 'item-result';
  errorBank: 'after-final-incorrect' | 'confirmed-only' | 'never';
};

export type ActivityEvaluation =
  | { kind: 'selection'; correctOptionIds: readonly string[]; explanation: string }
  | { kind: 'answer-key'; acceptedAnswers: readonly string[]; explanation: string }
  | { kind: 'rubric'; criteria: readonly { id: string; description: string; points?: number }[]; modelAnswer?: string }
  | { kind: 'self-check'; checklist: readonly string[]; modelAnswer?: string };

export type PracticeResponseMode =
  | 'single-select'
  | 'multi-select'
  | 'short-text'
  | 'extended-text'
  | 'calculation'
  | 'ordering'
  | 'spoken';

export type PracticeProgression = 'retrieve' | 'explain' | 'apply' | 'integrate' | 'transfer' | 'exam';
export type PracticeSourceBucket = 'current' | 'previous' | 'confirmed-error-bank';

export type ProgressivePracticeItem = {
  id: string;
  prompt: string;
  progression: PracticeProgression;
  sourceBucket: PracticeSourceBucket;
  responseMode: PracticeResponseMode;
  estimatedMinutes: number;
  options?: readonly { id: string; label: string }[];
  hints?: readonly string[];
  evaluation: ActivityEvaluation;
  evidence: ItemEvidenceRule;
};

export type PracticeMix = Readonly<Record<PracticeSourceBucket, number>>;

export type ProgressivePracticePlan = {
  items: readonly ProgressivePracticeItem[];
  /** Optional deterministic subset rendered for one normal lesson sitting. */
  sessionItemIds?: readonly string[];
  targetMix?: PracticeMix;
  attemptsBeforeReveal: number;
};

export type GrammarItem = {
  id: string;
  stage: GrammarStage;
  prompt: string;
  responseMode: Exclude<PracticeResponseMode, 'spoken'>;
  estimatedMinutes: number;
  options?: readonly { id: string; label: string }[];
  evaluation: ActivityEvaluation;
  evidence: ItemEvidenceRule;
};

export type GrammarSequence = {
  target: string;
  stages: readonly { stage: GrammarStage; purpose: string; itemIds: readonly string[] }[];
  items: readonly GrammarItem[];
};

export type Misconception = {
  id: string;
  misconception: string;
  correction: string;
  diagnosticPrompt: string;
  objectiveIds: readonly string[];
};

export type ExamTask = {
  id: string;
  title: string;
  scenario: readonly string[];
  requirements: readonly { id: string; prompt: string; marks: number }[];
  totalMarks: number;
  timeLimitMinutes: number;
  markingGuide: readonly { id: string; criterion: string; marks: number; commonMiss?: string }[];
  modelAnswer?: string;
};

export type RevisionTarget = {
  id: string;
  prompt: string;
  objectiveIds: readonly string[];
  successCriterion: string;
  revisitAfterDays: readonly number[];
  estimatedMinutes: number;
};

export type AudioSegmentKind =
  | 'opening'
  | 'explanation'
  | 'worked-example'
  | 'dialogue'
  | 'retrieval-pause'
  | 'pronunciation'
  | 'summary'
  | 'transfer';

type AudioEpisodeBase = {
  title: string;
  editorialGoal: string;
  estimatedMinutes: number;
  distinctiveElements: readonly string[];
};

export type AudioOutlineEpisode = AudioEpisodeBase & {
  format: 'editorial-outline';
  segments: readonly {
    id: string;
    kind: AudioSegmentKind;
    title: string;
    estimatedMinutes: number;
    outline: readonly string[];
  }[];
};

export type AuthoredAudioEpisode = AudioEpisodeBase & {
  format: 'authored-script';
  segments: readonly {
    id: string;
    kind: AudioSegmentKind;
    title: string;
    estimatedMinutes: number;
    script: string;
  }[];
};

export type AudioEpisode = AudioOutlineEpisode | AuthoredAudioEpisode;

export type ContextualInput = {
  id: string;
  title: string;
  mode: 'dialogue' | 'story' | 'workplace-scene' | 'document';
  turns: readonly { speaker: string; text: string }[];
  comprehensionItemIds: readonly string[];
};

export type SpeakingPlan = {
  tasks: readonly {
    id: string;
    focus: 'chunks' | 'stress' | 'linking' | 'shadowing' | 'transfer';
    prompt: string;
    model?: string;
    evidence: ItemEvidenceRule;
    estimatedMinutes: number;
  }[];
  attemptsPerTask: number;
  recordingRetention: 'discard-after-feedback' | 'local-until-lesson-close' | 'learner-history';
  acousticScore: false;
};

export type EnglishLessonExtension = {
  contextualInput: ContextualInput;
  grammar: GrammarSequence;
  speaking: SpeakingPlan;
};

export type AccaLessonExtension = {
  examTechnique: readonly string[];
  constructedResponseTaskIds: readonly string[];
};

export type PayrollLessonExtension = {
  sourceSnapshotOn: string;
  liveRatePolicy: 'official-source-required';
  operationalChecks: readonly string[];
};

export type CompletionPlan = {
  requirements: readonly {
    id: string;
    targetIds: readonly string[];
    rule: 'view' | 'attempt' | 'submit' | 'meet-threshold';
    minimum?: number;
  }[];
  itemLevelEvidenceRequired: boolean;
};

export type DeepLessonContract = {
  schemaVersion: typeof DEEP_LESSON_SCHEMA_VERSION;
  editorial: {
    status: 'draft' | 'deep-reviewed' | 'published';
    depthVersion: string;
    reviewedOn?: string;
  };
  course: CourseContext;
  curriculum: CurriculumAlignment;
  prerequisites: readonly string[];
  objectives: readonly LearningObjective[];
  workload: LessonWorkload;
  workedExamples: readonly WorkedExample[];
  practice: ProgressivePracticePlan;
  misconceptions: readonly Misconception[];
  examTasks?: readonly ExamTask[];
  revisionTargets: readonly RevisionTarget[];
  audioEpisode: AudioEpisode;
  completion: CompletionPlan;
  acca?: AccaLessonExtension;
  english?: EnglishLessonExtension;
  payroll?: PayrollLessonExtension;
};

export type QualityIssue = {
  code: string;
  severity: 'error' | 'warning';
  path: string;
  message: string;
};

export type DurationValidationOptions = {
  learnText?: string | readonly string[];
  readingWordsPerMinute?: number;
  phaseToleranceRatio?: number;
  phaseToleranceMinutes?: number;
};

export type DeepLessonQualityOptions = DurationValidationOptions & {
  grammarItemRange?: readonly [number, number];
  practiceMixTolerance?: number;
  audioCopyThreshold?: number;
};

export type DeepLessonQualityReport = {
  passed: boolean;
  issues: readonly QualityIssue[];
  metrics: {
    declaredMinutes: number;
    supportedMinutes: number;
    availableMinutes: number;
    grammarItems: number;
    practiceMix?: PracticeMix;
    audioLearnFiveGramContainment?: number;
  };
};

const issue = (code: string, path: string, message: string, severity: QualityIssue['severity'] = 'error'): QualityIssue =>
  ({ code, severity, path, message });

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
const closeEnough = (actual: number, expected: number, ratio: number, minutes: number): boolean =>
  Math.abs(actual - expected) <= Math.max(minutes, expected * ratio);

export function countWords(text: string | readonly string[]): number {
  const joined = typeof text === 'string' ? text : text.join(' ');
  return (joined.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
}

export function audioEpisodeText(episode: AudioEpisode): string {
  return episode.format === 'authored-script'
    ? episode.segments.map((segment) => segment.script).join(' ')
    : episode.segments.flatMap((segment) => segment.outline).join(' ');
}

type TimedEvidence = { minutes: number; available: boolean };

function timedEvidence(contract: DeepLessonContract, learnMinutes?: number): Map<string, TimedEvidence> {
  const entries: [string, TimedEvidence][] = [];
  if (learnMinutes !== undefined) entries.push([LEARN_TEXT_EVIDENCE_ID, { minutes: learnMinutes, available: true }]);
  const available = (minutes: number): TimedEvidence => ({ minutes, available: true });
  entries.push(...contract.workedExamples.map((item) => [item.id, available(item.estimatedMinutes)] as [string, TimedEvidence]));
  entries.push(...contract.practice.items.map((item) => [item.id, available(item.estimatedMinutes)] as [string, TimedEvidence]));
  entries.push(...(contract.english?.grammar.items ?? []).map((item) => [item.id, available(item.estimatedMinutes)] as [string, TimedEvidence]));
  entries.push(...(contract.english?.speaking.tasks ?? []).map((item) => [item.id, available(item.estimatedMinutes)] as [string, TimedEvidence]));
  entries.push(...(contract.examTasks ?? []).map((item) => [item.id, available(item.timeLimitMinutes)] as [string, TimedEvidence]));
  entries.push(...contract.revisionTargets.map((item) => [item.id, available(item.estimatedMinutes)] as [string, TimedEvidence]));
  entries.push(...contract.audioEpisode.segments.map((item) => [item.id, { minutes: item.estimatedMinutes, available: contract.audioEpisode.format === 'authored-script' }] as [string, TimedEvidence]));
  return new Map(entries);
}

export type WorkloadComputation = {
  declaredMinutes: number;
  phaseMinutes: number;
  supportedMinutes: number;
  availableMinutes: number;
  learnWords?: number;
  phases: readonly {
    id: string;
    plannedMinutes: number;
    supportedMinutes: number;
    availableMinutes: number;
    unresolvedEvidenceIds: readonly string[];
  }[];
};

export function computeSupportedWorkload(
  contract: DeepLessonContract,
  options: Pick<DurationValidationOptions, 'learnText' | 'readingWordsPerMinute'> = {},
): WorkloadComputation {
  const learnWords = options.learnText === undefined ? undefined : countWords(options.learnText);
  const learnMinutes = learnWords === undefined ? undefined : learnWords / (options.readingWordsPerMinute ?? 150);
  const evidence = timedEvidence(contract, learnMinutes);
  const phases = contract.workload.phases.map((phase) => {
    const resolved = phase.evidenceIds.map((id) => evidence.get(id));
    return {
      id: phase.id,
      plannedMinutes: phase.plannedMinutes,
      supportedMinutes: sum(resolved.map((item) => item?.minutes ?? 0)),
      availableMinutes: sum(resolved.map((item) => item?.available ? item.minutes : 0)),
      unresolvedEvidenceIds: phase.evidenceIds.filter((id) => !evidence.has(id)),
    };
  });
  return {
    declaredMinutes: contract.workload.totalMinutes,
    phaseMinutes: sum(contract.workload.phases.map((phase) => phase.plannedMinutes)),
    supportedMinutes: sum(phases.map((phase) => phase.supportedMinutes)),
    availableMinutes: sum(phases.map((phase) => phase.availableMinutes)),
    learnWords,
    phases,
  };
}

export function validateHonestDuration(
  contract: DeepLessonContract,
  options: DurationValidationOptions = {},
): readonly QualityIssue[] {
  const issues: QualityIssue[] = [];
  const readingWordsPerMinute = options.readingWordsPerMinute ?? 150;
  const toleranceRatio = options.phaseToleranceRatio ?? 0.25;
  const toleranceMinutes = options.phaseToleranceMinutes ?? 2;
  const workload = computeSupportedWorkload(contract, { learnText: options.learnText, readingWordsPerMinute });
  const learnMinutes = options.learnText === undefined ? undefined : countWords(options.learnText) / readingWordsPerMinute;
  const evidence = timedEvidence(contract, learnMinutes);
  const phaseTotal = workload.phaseMinutes;

  if (!closeEnough(phaseTotal, contract.workload.totalMinutes, 0, 0.01)) {
    issues.push(issue('duration.total-mismatch', 'workload.totalMinutes', `Declared total is ${contract.workload.totalMinutes} minutes but phases total ${phaseTotal}.`));
  }

  const seenEvidence = new Set<string>();
  for (const [index, phase] of contract.workload.phases.entries()) {
    const path = `workload.phases[${index}]`;
    if (phase.plannedMinutes <= 0) issues.push(issue('duration.non-positive-phase', `${path}.plannedMinutes`, 'Every phase must have a positive duration.'));
    if (phase.evidenceIds.length === 0) issues.push(issue('duration.phase-without-evidence', `${path}.evidenceIds`, 'A workload phase must point to timed authored evidence.'));

    let supported = 0;
    for (const evidenceId of phase.evidenceIds) {
      if (seenEvidence.has(evidenceId)) issues.push(issue('duration.reused-evidence', `${path}.evidenceIds`, `${evidenceId} is already counted in another workload phase.`));
      seenEvidence.add(evidenceId);
      const timed = evidence.get(evidenceId);
      if (timed === undefined) {
        const detail = evidenceId === LEARN_TEXT_EVIDENCE_ID
          ? 'Pass learnText to the validator so the Learn duration can be checked from authored words.'
          : `No timed authored artifact named ${evidenceId} exists.`;
        issues.push(issue('duration.unknown-evidence', `${path}.evidenceIds`, detail));
      } else {
        supported += timed.minutes;
      }
    }
    if (phase.evidenceIds.every((id) => evidence.has(id)) && !closeEnough(phase.plannedMinutes, supported, toleranceRatio, toleranceMinutes)) {
      issues.push(issue('duration.unsupported-phase', `${path}.plannedMinutes`, `${phase.plannedMinutes} planned minutes are not supported by the ${supported.toFixed(1)} minutes of linked authored work.`));
    }
  }
  return issues;
}

export function validateGrammarStages(
  grammar: GrammarSequence | undefined,
  itemRange: readonly [number, number] = [8, 12],
): readonly QualityIssue[] {
  if (!grammar) return [issue('grammar.missing', 'english.grammar', 'An English lesson needs an authored grammar sequence.')];
  const issues: QualityIssue[] = [];
  const actualOrder = grammar.stages.map((block) => block.stage);
  if (actualOrder.length !== GRAMMAR_STAGE_ORDER.length || actualOrder.some((stage, index) => stage !== GRAMMAR_STAGE_ORDER[index])) {
    issues.push(issue('grammar.stage-order', 'english.grammar.stages', `Grammar must follow ${GRAMMAR_STAGE_ORDER.join(' → ')} exactly.`));
  }
  const itemById = new Map(grammar.items.map((item) => [item.id, item]));
  const referenced = grammar.stages.flatMap((block) => block.itemIds);
  const unique = new Set(referenced);
  if (unique.size < itemRange[0] || unique.size > itemRange[1]) {
    issues.push(issue('grammar.item-count', 'english.grammar.items', `Grammar needs ${itemRange[0]}–${itemRange[1]} unique items; found ${unique.size}.`));
  }
  if (unique.size !== referenced.length) issues.push(issue('grammar.duplicate-item', 'english.grammar.stages', 'A grammar item may belong to only one stage.'));
  for (const [index, block] of grammar.stages.entries()) {
    if (block.itemIds.length === 0) issues.push(issue('grammar.empty-stage', `english.grammar.stages[${index}]`, `${block.stage} needs at least one item.`));
    for (const itemId of block.itemIds) {
      const item = itemById.get(itemId);
      if (!item) issues.push(issue('grammar.unknown-item', `english.grammar.stages[${index}].itemIds`, `${itemId} does not resolve to an authored grammar item.`));
      else if (item.stage !== block.stage) issues.push(issue('grammar.item-stage-mismatch', `english.grammar.items.${itemId}.stage`, `${itemId} is listed under ${block.stage} but declares ${item.stage}.`));
    }
  }
  for (const item of grammar.items) {
    if (!unique.has(item.id)) issues.push(issue('grammar.unsequenced-item', `english.grammar.items.${item.id}`, `${item.id} is authored but not assigned to a stage.`));
    issues.push(...validateResponseShape(item, `english.grammar.items.${item.id}`));
  }
  const hasSelection = grammar.items.some((item) => item.responseMode === 'single-select' || item.responseMode === 'multi-select');
  const hasWritten = grammar.items.some((item) => item.responseMode === 'short-text' || item.responseMode === 'extended-text');
  if (!hasSelection || !hasWritten) issues.push(issue('grammar.response-variety', 'english.grammar.items', 'Grammar must include both selection and written-response items.'));
  return issues;
}

function validateResponseShape(
  item: Pick<GrammarItem | ProgressivePracticeItem, 'responseMode' | 'options' | 'evaluation'>,
  path: string,
): readonly QualityIssue[] {
  const issues: QualityIssue[] = [];
  const selection = item.responseMode === 'single-select' || item.responseMode === 'multi-select';
  if (selection && (!item.options || item.options.length < 2)) issues.push(issue('activity.selection-options', `${path}.options`, 'A selection item needs at least two authored options.'));
  if (selection && item.evaluation.kind !== 'selection') issues.push(issue('activity.selection-evaluation', `${path}.evaluation`, 'A selection response needs a selection answer key.'));
  if (!selection && item.evaluation.kind === 'selection') issues.push(issue('activity.response-evaluation-mismatch', `${path}.evaluation`, 'A written or calculated response cannot use a selection answer key.'));
  return issues;
}

export function practiceMixFor(plan: ProgressivePracticePlan): PracticeMix {
  const totals: Record<PracticeSourceBucket, number> = { current: 0, previous: 0, 'confirmed-error-bank': 0 };
  for (const item of plan.items) totals[item.sourceBucket] += 1;
  const denominator = plan.items.length || 1;
  return {
    current: totals.current / denominator,
    previous: totals.previous / denominator,
    'confirmed-error-bank': totals['confirmed-error-bank'] / denominator,
  };
}

export function validatePracticeComposition(
  plan: ProgressivePracticePlan,
  target: PracticeMix = ENGLISH_PRACTICE_MIX,
  tolerance = 0.001,
): readonly QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (plan.items.length === 0) return [issue('practice.empty', 'practice.items', 'Progressive practice needs authored items.')];
  const targetTotal = target.current + target.previous + target['confirmed-error-bank'];
  if (Math.abs(targetTotal - 1) > 0.001) issues.push(issue('practice.invalid-target', 'practice.targetMix', 'Practice target proportions must total 1.'));
  const actual = practiceMixFor(plan);
  for (const bucket of ['current', 'previous', 'confirmed-error-bank'] as const) {
    if (Math.abs(actual[bucket] - target[bucket]) > tolerance) {
      issues.push(issue('practice.mix', 'practice.items', `${bucket} is ${(actual[bucket] * 100).toFixed(1)}%; target is ${(target[bucket] * 100).toFixed(1)}%.`));
    }
  }
  const hasSelection = plan.items.some((item) => item.responseMode === 'single-select' || item.responseMode === 'multi-select');
  const hasConstructed = plan.items.some((item) => ['short-text', 'extended-text', 'calculation'].includes(item.responseMode));
  if (!hasSelection || !hasConstructed) issues.push(issue('practice.response-variety', 'practice.items', 'Practice must combine selection and constructed responses.'));
  if (plan.attemptsBeforeReveal < 1) issues.push(issue('practice.attempts', 'practice.attemptsBeforeReveal', 'At least one attempt is required before revealing an answer.'));
  if (plan.sessionItemIds) {
    const authoredIds = new Set(plan.items.map((item) => item.id));
    const uniqueSessionIds = new Set(plan.sessionItemIds);
    if (plan.sessionItemIds.length === 0) issues.push(issue('practice.session-empty', 'practice.sessionItemIds', 'A declared practice session needs at least one item.'));
    if (uniqueSessionIds.size !== plan.sessionItemIds.length) issues.push(issue('practice.session-duplicate', 'practice.sessionItemIds', 'A practice session cannot repeat the same item ID.'));
    for (const id of uniqueSessionIds) if (!authoredIds.has(id)) issues.push(issue('practice.session-unknown-item', 'practice.sessionItemIds', `${id} does not resolve to an authored practice item.`));
  }
  for (const item of plan.items) issues.push(...validateResponseShape(item, `practice.items.${item.id}`));
  return issues;
}

function normalizedTokens(text: string): string[] {
  return (text.toLocaleLowerCase('en').match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => token.length > 1);
}

function ngrams(text: string, width: number): Set<string> {
  const tokens = normalizedTokens(text);
  const result = new Set<string>();
  for (let index = 0; index <= tokens.length - width; index += 1) result.add(tokens.slice(index, index + width).join(' '));
  return result;
}

export function audioLearnFiveGramContainment(learnText: string | readonly string[], episode: AudioEpisode): number {
  const learn = ngrams(typeof learnText === 'string' ? learnText : learnText.join(' '), 5);
  const audio = ngrams(audioEpisodeText(episode), 5);
  if (audio.size === 0) return 0;
  let shared = 0;
  for (const phrase of audio) if (learn.has(phrase)) shared += 1;
  return shared / audio.size;
}

export function validateLearnAudioIndependence(
  learnText: string | readonly string[] | undefined,
  episode: AudioEpisode,
  copyThreshold = 0.55,
): readonly QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (episode.distinctiveElements.length < 2) issues.push(issue('audio.no-distinctive-value', 'audioEpisode.distinctiveElements', 'Audio needs at least two declared elements that add to, transform or retrieve the Learn material.'));
  if (episode.segments.length < 3) issues.push(issue('audio.too-few-segments', 'audioEpisode.segments', 'An editorial episode needs an opening, developed teaching and a close or retrieval segment.'));
  const segmentMinutes = sum(episode.segments.map((segment) => segment.estimatedMinutes));
  if (!closeEnough(episode.estimatedMinutes, segmentMinutes, 0, 0.01)) issues.push(issue('audio.duration-mismatch', 'audioEpisode.estimatedMinutes', `Episode duration is ${episode.estimatedMinutes}, but segments total ${segmentMinutes}.`));
  if (episode.format === 'authored-script') {
    const scriptMinutes = countWords(audioEpisodeText(episode)) / 145;
    if (!closeEnough(episode.estimatedMinutes, scriptMinutes, 0.3, 1)) issues.push(issue('audio.script-duration', 'audioEpisode.segments', `${countWords(audioEpisodeText(episode))} scripted words do not credibly support ${episode.estimatedMinutes} minutes.`));
  } else if (episode.segments.some((segment) => segment.outline.length === 0)) {
    issues.push(issue('audio.empty-outline-segment', 'audioEpisode.segments', 'Every audio segment needs an editorial outline.'));
  }
  if (learnText === undefined) {
    issues.push(issue('audio.independence-not-checked', 'audioEpisode', 'Pass Learn text to verify that Audio is not a duplicate.', 'warning'));
    return issues;
  }
  const containment = audioLearnFiveGramContainment(learnText, episode);
  if (containment >= copyThreshold) issues.push(issue('audio.learn-duplication', 'audioEpisode', `${(containment * 100).toFixed(1)}% of Audio five-word phrases occur in Learn; the episode needs an independent editorial treatment.`));
  return issues;
}

function validateExamTasks(contract: DeepLessonContract): readonly QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const [index, task] of (contract.examTasks ?? []).entries()) {
    const requirementMarks = sum(task.requirements.map((requirement) => requirement.marks));
    const guideMarks = sum(task.markingGuide.map((criterion) => criterion.marks));
    if (requirementMarks !== task.totalMarks) issues.push(issue('exam.requirement-marks', `examTasks[${index}].requirements`, `Requirements total ${requirementMarks}, not ${task.totalMarks}.`));
    if (guideMarks !== task.totalMarks) issues.push(issue('exam.guide-marks', `examTasks[${index}].markingGuide`, `Marking guide totals ${guideMarks}, not ${task.totalMarks}.`));
    if (task.timeLimitMinutes <= 0 || task.totalMarks <= 0) issues.push(issue('exam.invalid-limit', `examTasks[${index}]`, 'Exam tasks need positive marks and time.'));
  }
  return issues;
}

function validateCommonStructure(contract: DeepLessonContract): readonly QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (contract.curriculum.outcomeIds.length === 0) issues.push(issue('curriculum.no-outcomes', 'curriculum.outcomeIds', 'Map the lesson to versioned curriculum outcomes.'));
  if (contract.objectives.length === 0) issues.push(issue('objectives.empty', 'objectives', 'A deep lesson needs measurable objectives.'));
  if (contract.workedExamples.length < 2) issues.push(issue('examples.too-few', 'workedExamples', 'A deep lesson needs multiple step-by-step worked examples.'));
  if (contract.misconceptions.length === 0) issues.push(issue('misconceptions.empty', 'misconceptions', 'Author likely misconceptions and corrections.'));
  if (contract.revisionTargets.length === 0) issues.push(issue('revision.empty', 'revisionTargets', 'Author spaced-revision targets.'));
  if (!contract.completion.itemLevelEvidenceRequired) issues.push(issue('completion.aggregate-only', 'completion.itemLevelEvidenceRequired', 'Completion must retain item-level evidence rather than only an aggregate score.'));
  if (contract.editorial.status !== 'draft' && !contract.editorial.reviewedOn) issues.push(issue('editorial.review-date-missing', 'editorial.reviewedOn', 'Reviewed or published depth needs an explicit review date.'));
  if (contract.editorial.status === 'published' && contract.audioEpisode.format !== 'authored-script') issues.push(issue('editorial.unavailable-audio', 'audioEpisode.format', 'A published lesson cannot count an editorial outline as a playable Audio lesson.'));
  if (contract.course.kind === 'acca') {
    if (!contract.acca) issues.push(issue('acca.extension-missing', 'acca', 'An ACCA lesson needs exam-technique metadata.'));
    if (!contract.examTasks?.length) issues.push(issue('acca.exam-task-missing', 'examTasks', 'An ACCA deep lesson needs an exam-style task with marks, time and marking guide.'));
  }
  if (contract.course.kind === 'english') {
    if (!contract.english) issues.push(issue('english.extension-missing', 'english', 'An English lesson needs contextual input, grammar and speaking plans.'));
    else {
      if (contract.english.contextualInput.turns.length < 2) issues.push(issue('english.context-too-thin', 'english.contextualInput.turns', 'Contextual input needs at least two authored turns.'));
      if (!contract.practice.items.some((item) => item.responseMode === 'short-text' || item.responseMode === 'extended-text')) issues.push(issue('english.written-practice-missing', 'practice.items', 'English Practice needs a written response as well as selection.'));
      const speakingFocus = new Set(contract.english.speaking.tasks.map((task) => task.focus));
      for (const focus of ['chunks', 'stress', 'linking', 'shadowing', 'transfer'] as const) if (!speakingFocus.has(focus)) issues.push(issue('speaking.missing-focus', 'english.speaking.tasks', `Speaking needs a ${focus} task.`));
      if (contract.english.speaking.acousticScore !== false) issues.push(issue('speaking.false-score', 'english.speaking.acousticScore', 'Do not claim an acoustic pronunciation score without acoustic evidence.'));
    }
  }
  if (contract.course.kind === 'payroll' && !contract.payroll) issues.push(issue('payroll.extension-missing', 'payroll', 'A Payroll lesson needs source-date and operational-control metadata.'));
  return issues;
}

export function runDeepLessonQualityGate(
  contract: DeepLessonContract,
  options: DeepLessonQualityOptions = {},
): DeepLessonQualityReport {
  const practiceTarget = contract.practice.targetMix
    ?? (contract.course.kind === 'english' ? ENGLISH_PRACTICE_MIX : practiceMixFor(contract.practice));
  const issues: QualityIssue[] = [
    ...validateCommonStructure(contract),
    ...validateHonestDuration(contract, options),
    ...validatePracticeComposition(contract.practice, practiceTarget, options.practiceMixTolerance),
    ...validateLearnAudioIndependence(options.learnText, contract.audioEpisode, options.audioCopyThreshold),
    ...validateExamTasks(contract),
  ];
  if (contract.course.kind === 'english') issues.push(...validateGrammarStages(contract.english?.grammar, options.grammarItemRange));
  if (contract.editorial.status !== 'draft' && issues.some((item) => item.severity === 'error')) {
    issues.push(issue('editorial.status-unsubstantiated', 'editorial.status', `${contract.editorial.status} is not credible while the deep quality gate has errors.`));
  }
  const workload = computeSupportedWorkload(contract, options);
  return {
    passed: !issues.some((item) => item.severity === 'error'),
    issues,
    metrics: {
      declaredMinutes: contract.workload.totalMinutes,
      supportedMinutes: workload.supportedMinutes,
      availableMinutes: workload.availableMinutes,
      grammarItems: contract.english?.grammar.items.length ?? 0,
      practiceMix: contract.practice.items.length ? practiceMixFor(contract.practice) : undefined,
      audioLearnFiveGramContainment: options.learnText === undefined ? undefined : audioLearnFiveGramContainment(options.learnText, contract.audioEpisode),
    },
  };
}

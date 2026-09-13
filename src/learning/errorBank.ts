import type { ErrorBankItem } from '../services/contracts';

export type ErrorObservation = {
  domain: ErrorBankItem['domain'];
  pattern: string;
  observedAt: string;
  severity?: number;
};

export type ErrorBankState = Omit<ErrorBankItem, 'confidence'> & {
  masteryConfidence: number;
  frequency: number;
  status: 'active' | 'mastered';
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeErrorPattern(pattern: string): string {
  return pattern
    .trim()
    .toLocaleLowerCase('en')
    .replace(/[“”"'`´]/g, '')
    .replace(/\s+/g, ' ');
}

function nextReviewDate(observedAt: string, frequency: number, masteryConfidence: number): string {
  const base = new Date(observedAt);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid observation date: ${observedAt}`);

  const days = masteryConfidence < 40 ? 1 : masteryConfidence < 60 ? 3 : masteryConfidence < 75 ? 7 : frequency >= 3 ? 14 : 30;
  return new Date(base.getTime() + days * DAY_MS).toISOString();
}

function assertSameErrorIdentity(current: ErrorBankState, observation: ErrorObservation, learnerId: string) {
  if (current.learnerId !== learnerId) {
    throw new Error('Error Bank learner mismatch: refusing to merge observations across learner profiles.');
  }
  if (current.domain !== observation.domain) {
    throw new Error('Error Bank domain mismatch: refusing to merge different error domains.');
  }
  if (normalizeErrorPattern(current.pattern) !== normalizeErrorPattern(observation.pattern)) {
    throw new Error('Error Bank pattern mismatch: refusing to merge different normalized patterns.');
  }
}

export function observeError(
  current: ErrorBankState | null,
  observation: ErrorObservation,
  learnerId: string,
  generatedId = crypto.randomUUID(),
): ErrorBankState {
  const severity = Math.max(0, Math.min(100, observation.severity ?? 60));

  if (!current) {
    const masteryConfidence = Math.max(5, Math.round(55 - severity * 0.35));
    return {
      id: generatedId,
      learnerId,
      domain: observation.domain,
      pattern: observation.pattern,
      masteryConfidence,
      frequency: 1,
      lastSeenAt: observation.observedAt,
      nextReviewAt: nextReviewDate(observation.observedAt, 1, masteryConfidence),
      status: 'active',
    };
  }

  assertSameErrorIdentity(current, observation, learnerId);
  const frequency = current.frequency + 1;
  const masteryConfidence = Math.max(5, Math.round(current.masteryConfidence - 8 - severity * 0.12));
  return {
    ...current,
    pattern: observation.pattern,
    masteryConfidence,
    frequency,
    lastSeenAt: observation.observedAt,
    nextReviewAt: nextReviewDate(observation.observedAt, frequency, masteryConfidence),
    status: 'active',
  };
}

export function recordSuccessfulRetrieval(item: ErrorBankState, completedAt: string, score: number): ErrorBankState {
  if (!Number.isFinite(score)) throw new Error('Invalid retrieval score');
  const clampedScore = Math.max(0, Math.min(100, score));
  const gain = clampedScore >= 90 ? 20 : clampedScore >= 80 ? 14 : clampedScore >= 70 ? 8 : -12;
  const masteryConfidence = Math.max(5, Math.min(100, Math.round(item.masteryConfidence + gain)));
  const status = masteryConfidence >= 90 && clampedScore >= 85 ? 'mastered' : 'active';
  const base = new Date(completedAt);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid completion date: ${completedAt}`);
  const days = clampedScore < 70 ? 1 : status === 'mastered' ? 90 : masteryConfidence >= 75 ? 30 : masteryConfidence >= 60 ? 14 : 7;

  return {
    ...item,
    masteryConfidence,
    status,
    nextReviewAt: new Date(base.getTime() + days * DAY_MS).toISOString(),
  };
}

export function shouldResurface(item: ErrorBankState, now = new Date()): boolean {
  // Mastered items still return at their scheduled maintenance date.
  const due = new Date(item.nextReviewAt).getTime();
  return !Number.isNaN(due) && due <= now.getTime();
}

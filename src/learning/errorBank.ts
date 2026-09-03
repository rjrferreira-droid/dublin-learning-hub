import type { ErrorBankItem } from '../services/contracts';

export type ErrorObservation = {
  domain: ErrorBankItem['domain'];
  pattern: string;
  observedAt: string;
  severity?: number;
};

export type ErrorBankState = ErrorBankItem & {
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

function nextReviewDate(observedAt: string, frequency: number, confidence: number): string {
  const base = new Date(observedAt);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid observation date: ${observedAt}`);

  const days = confidence < 40 ? 1 : confidence < 60 ? 3 : confidence < 75 ? 7 : frequency >= 3 ? 14 : 30;
  return new Date(base.getTime() + days * DAY_MS).toISOString();
}

export function observeError(
  current: ErrorBankState | null,
  observation: ErrorObservation,
  learnerId: string,
  generatedId = crypto.randomUUID(),
): ErrorBankState {
  const severity = Math.max(0, Math.min(100, observation.severity ?? 60));

  if (!current) {
    const confidence = Math.max(5, Math.round(55 - severity * 0.35));
    return {
      id: generatedId,
      learnerId,
      domain: observation.domain,
      pattern: observation.pattern,
      confidence,
      frequency: 1,
      lastSeenAt: observation.observedAt,
      nextReviewAt: nextReviewDate(observation.observedAt, 1, confidence),
      status: 'active',
    };
  }

  const frequency = current.frequency + 1;
  const confidence = Math.max(5, Math.round(current.confidence - 8 - severity * 0.12));
  return {
    ...current,
    pattern: observation.pattern,
    confidence,
    frequency,
    lastSeenAt: observation.observedAt,
    nextReviewAt: nextReviewDate(observation.observedAt, frequency, confidence),
    status: 'active',
  };
}

export function recordSuccessfulRetrieval(item: ErrorBankState, completedAt: string, score: number): ErrorBankState {
  const clampedScore = Math.max(0, Math.min(100, score));
  const gain = clampedScore >= 90 ? 20 : clampedScore >= 80 ? 14 : clampedScore >= 70 ? 8 : 2;
  const confidence = Math.min(100, Math.round(item.confidence + gain));
  const status = confidence >= 90 && clampedScore >= 85 ? 'mastered' : 'active';
  const base = new Date(completedAt);
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid completion date: ${completedAt}`);
  const days = status === 'mastered' ? 90 : confidence >= 75 ? 30 : confidence >= 60 ? 14 : 7;

  return {
    ...item,
    confidence,
    status,
    nextReviewAt: new Date(base.getTime() + days * DAY_MS).toISOString(),
  };
}

export function shouldResurface(item: ErrorBankState, now = new Date()): boolean {
  if (item.status === 'mastered') return false;
  const due = new Date(item.nextReviewAt).getTime();
  return !Number.isNaN(due) && due <= now.getTime();
}

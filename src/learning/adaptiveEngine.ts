import type { CompetencySignal, ErrorBankItem, ReviewInterval } from '../services/contracts';

export type ReviewSignal = {
  id: string;
  label: string;
  dueAt: string;
  interval: ReviewInterval;
  score?: number;
  competencyId?: string;
};

export type AdaptivePriority = {
  key: string;
  label: string;
  source: 'competency' | 'error-bank' | 'spaced-review';
  score: number;
  reason: string;
  recommendedAction: 'micro-lesson' | 'quick-retrieval' | 'case' | 'speaking' | 'pronunciation' | 'review';
};

export type LanguageExposureProfile = {
  british: number;
  american: number;
  irish: number;
  professionalWritingPreference: 'uk-irish';
};

export const DEFAULT_LANGUAGE_EXPOSURE: LanguageExposureProfile = {
  british: 40,
  american: 40,
  irish: 20,
  professionalWritingPreference: 'uk-irish',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function reviewDateFrom(baseIso: string, interval: ReviewInterval): string {
  const offsets: Record<ReviewInterval, number> = {
    'D+1': 1,
    'D+7': 7,
    'D+30': 30,
    'D+90': 90,
  };
  const date = new Date(baseIso);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ISO date: ${baseIso}`);
  return new Date(date.getTime() + offsets[interval] * DAY_MS).toISOString();
}

export function isPriorityCompetency(score: number): boolean {
  return score < 70;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function daysOverdue(dueAt: string, now: Date): number {
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.floor((now.getTime() - due) / DAY_MS));
}

function actionForError(domain: ErrorBankItem['domain']): AdaptivePriority['recommendedAction'] {
  if (domain === 'pronunciation') return 'pronunciation';
  if (domain === 'fluency' || domain === 'register' || domain === 'grammar' || domain === 'vocabulary') return 'speaking';
  return 'case';
}

export function rankAdaptivePriorities(input: {
  competencies: CompetencySignal[];
  errors: ErrorBankItem[];
  reviews: ReviewSignal[];
  now?: Date;
  limit?: number;
}): AdaptivePriority[] {
  const now = input.now ?? new Date();
  const priorities: AdaptivePriority[] = [];

  for (const competency of input.competencies) {
    const gap = Math.max(0, 70 - competency.score);
    const priorityScore = clamp((competency.priority ? 28 : 0) + gap * 2.1 + (100 - competency.score) * 0.18);
    if (competency.priority || competency.score < 75) {
      priorities.push({
        key: `competency:${competency.competencyId}`,
        label: competency.label,
        source: 'competency',
        score: Math.round(priorityScore),
        reason: competency.score < 70
          ? `${competency.score}% is below the 70% programme threshold.`
          : `${competency.score}% is close enough to threshold to merit reinforcement.`,
        recommendedAction: competency.score < 60 ? 'micro-lesson' : 'quick-retrieval',
      });
    }
  }

  for (const error of input.errors) {
    const overdue = daysOverdue(error.nextReviewAt, now);
    const lowConfidence = clamp(100 - error.confidence);
    const priorityScore = clamp(28 + lowConfidence * 0.45 + Math.min(overdue, 21) * 1.7);
    priorities.push({
      key: `error:${error.id}`,
      label: error.pattern,
      source: 'error-bank',
      score: Math.round(priorityScore),
      reason: overdue > 0
        ? `Recurring ${error.domain} pattern is ${overdue} day${overdue === 1 ? '' : 's'} overdue for retrieval.`
        : `Recurring ${error.domain} pattern remains below stable mastery confidence.`,
      recommendedAction: actionForError(error.domain),
    });
  }

  for (const review of input.reviews) {
    const overdue = daysOverdue(review.dueAt, now);
    const dueSoon = new Date(review.dueAt).getTime() <= now.getTime() + DAY_MS;
    if (!dueSoon) continue;
    const scorePenalty = review.score == null ? 12 : Math.max(0, 75 - review.score) * 0.7;
    const priorityScore = clamp(35 + Math.min(overdue, 30) * 1.8 + scorePenalty);
    priorities.push({
      key: `review:${review.id}`,
      label: review.label,
      source: 'spaced-review',
      score: Math.round(priorityScore),
      reason: overdue > 0 ? `${review.interval} review is overdue.` : `${review.interval} review is due now.`,
      recommendedAction: 'review',
    });
  }

  return priorities
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, input.limit ?? 8);
}

export function nextLearningAction(input: Parameters<typeof rankAdaptivePriorities>[0]): AdaptivePriority | null {
  return rankAdaptivePriorities({ ...input, limit: 1 })[0] ?? null;
}

export function validateLanguageExposure(profile: LanguageExposureProfile): boolean {
  const total = profile.british + profile.american + profile.irish;
  return total === 100 && profile.british >= 0 && profile.american >= 0 && profile.irish >= 0;
}

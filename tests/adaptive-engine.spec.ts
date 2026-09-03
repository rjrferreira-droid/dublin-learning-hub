import { expect, test } from '@playwright/test';
import {
  DEFAULT_LANGUAGE_EXPOSURE,
  isPriorityCompetency,
  nextLearningAction,
  rankAdaptivePriorities,
  reviewDateFrom,
  validateLanguageExposure,
} from '../src/learning/adaptiveEngine';

test('programme threshold is strictly below 70 percent', () => {
  expect(isPriorityCompetency(69)).toBe(true);
  expect(isPriorityCompetency(70)).toBe(false);
});

test('spaced review dates follow D+1 D+7 D+30 D+90', () => {
  const base = '2026-09-03T12:00:00.000Z';
  expect(reviewDateFrom(base, 'D+1')).toBe('2026-09-04T12:00:00.000Z');
  expect(reviewDateFrom(base, 'D+7')).toBe('2026-09-10T12:00:00.000Z');
  expect(reviewDateFrom(base, 'D+30')).toBe('2026-10-03T12:00:00.000Z');
  expect(reviewDateFrom(base, 'D+90')).toBe('2026-12-02T12:00:00.000Z');
});

test('English exposure is 40 British 40 American 20 Irish', () => {
  expect(DEFAULT_LANGUAGE_EXPOSURE).toMatchObject({ british: 40, american: 40, irish: 20 });
  expect(validateLanguageExposure(DEFAULT_LANGUAGE_EXPOSURE)).toBe(true);
});

test('adaptive engine ranks a severe competency gap above routine maintenance', () => {
  const priorities = rankAdaptivePriorities({
    now: new Date('2026-09-10T12:00:00.000Z'),
    competencies: [
      { competencyId: 'prsi', label: 'PRSI categories', score: 48, priority: true },
      { competencyId: 'controls', label: 'Payroll controls', score: 82, priority: false },
    ],
    errors: [],
    reviews: [
      { id: 'routine', label: 'Executive summary structure', dueAt: '2026-09-10T12:00:00.000Z', interval: 'D+90', score: 88 },
    ],
  });

  expect(priorities[0].label).toBe('PRSI categories');
  expect(priorities[0].recommendedAction).toBe('micro-lesson');
});

test('recurring language error can become the next learning action', () => {
  const action = nextLearningAction({
    now: new Date('2026-09-10T12:00:00.000Z'),
    competencies: [],
    errors: [
      {
        id: 'present-perfect',
        learnerId: 'test',
        domain: 'grammar',
        pattern: 'since/for with present perfect',
        confidence: 35,
        lastSeenAt: '2026-09-01T12:00:00.000Z',
        nextReviewAt: '2026-09-03T12:00:00.000Z',
      },
    ],
    reviews: [],
  });

  expect(action?.source).toBe('error-bank');
  expect(action?.recommendedAction).toBe('speaking');
});

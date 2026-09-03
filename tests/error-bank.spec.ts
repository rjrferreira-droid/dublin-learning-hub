import { expect, test } from '@playwright/test';
import { normalizeErrorPattern, observeError, recordSuccessfulRetrieval, shouldResurface } from '../src/learning/errorBank';

test('normalizes recurring errors for deduplication', () => {
  expect(normalizeErrorPattern('  Since / For   with “Present Perfect” ')).toBe('since / for with present perfect');
});

test('repeated error lowers mastery confidence and resurfaces quickly', () => {
  const first = observeError(
    null,
    { domain: 'grammar', pattern: 'since/for with present perfect', observedAt: '2026-09-01T12:00:00.000Z', severity: 70 },
    'test-user',
    'error-1',
  );
  const second = observeError(
    first,
    { domain: 'grammar', pattern: 'since/for with present perfect', observedAt: '2026-09-03T12:00:00.000Z', severity: 70 },
    'test-user',
  );

  expect(second.frequency).toBe(2);
  expect(second.confidence).toBeLessThan(first.confidence);
  expect(shouldResurface(second, new Date('2026-09-10T12:00:00.000Z'))).toBe(true);
});

test('Error Bank refuses to merge Rafael and Viviane observations', () => {
  const rafaelError = observeError(
    null,
    { domain: 'technical', pattern: 'state conclusion before detail', observedAt: '2026-09-01T12:00:00.000Z' },
    'rafael',
    'rafael-error',
  );

  expect(() => observeError(
    rafaelError,
    { domain: 'technical', pattern: 'state conclusion before detail', observedAt: '2026-09-02T12:00:00.000Z' },
    'viviane',
  )).toThrow(/learner mismatch/i);
});

test('Error Bank refuses accidental merges across normalized patterns or domains', () => {
  const item = observeError(
    null,
    { domain: 'grammar', pattern: 'since / for with present perfect', observedAt: '2026-09-01T12:00:00.000Z' },
    'test-user',
    'error-1',
  );

  expect(() => observeError(
    item,
    { domain: 'grammar', pattern: 'past simple vs present perfect', observedAt: '2026-09-02T12:00:00.000Z' },
    'test-user',
  )).toThrow(/pattern mismatch/i);

  expect(() => observeError(
    item,
    { domain: 'vocabulary', pattern: 'since / for with present perfect', observedAt: '2026-09-02T12:00:00.000Z' },
    'test-user',
  )).toThrow(/domain mismatch/i);
});

test('strong retrieval raises confidence and can eventually mark an error mastered', () => {
  const item = {
    id: 'error-1',
    learnerId: 'test-user',
    domain: 'vocabulary' as const,
    pattern: 'make vs do',
    confidence: 78,
    frequency: 3,
    lastSeenAt: '2026-09-01T12:00:00.000Z',
    nextReviewAt: '2026-09-03T12:00:00.000Z',
    status: 'active' as const,
  };

  const result = recordSuccessfulRetrieval(item, '2026-09-03T12:00:00.000Z', 92);
  expect(result.confidence).toBe(98);
  expect(result.status).toBe('mastered');
  expect(shouldResurface(result, new Date('2027-01-01T12:00:00.000Z'))).toBe(false);
});

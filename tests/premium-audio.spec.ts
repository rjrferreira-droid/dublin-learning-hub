import { expect, test } from '@playwright/test';
import { EdgeFunctionError } from '../src/services/edge';
import { PremiumAudioError, SupabasePremiumAudioService } from '../src/services/premiumAudio';

test('Premium Audio deduplicates concurrent generation and reuses memory cache', async () => {
  let calls = 0;
  const service = new SupabasePremiumAudioService(async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      audio_url: 'https://example.test/audio.mp3',
      cached: false,
      estimated_cost_usd: 0.021,
    };
  });

  const [first, concurrent] = await Promise.all([
    service.getOrCreateLessonAudio('lesson-1'),
    service.getOrCreateLessonAudio('lesson-1'),
  ]);

  expect(calls).toBe(1);
  expect(first.audioUrl).toBe('https://example.test/audio.mp3');
  expect(concurrent.audioUrl).toBe(first.audioUrl);
  expect(first.cached).toBe(false);

  const replay = await service.getOrCreateLessonAudio('lesson-1');
  expect(calls).toBe(1);
  expect(replay).toEqual({ audioUrl: 'https://example.test/audio.mp3', cached: true });
});

test('Premium Audio turns budget hard-stop into a non-retryable product state', async () => {
  const service = new SupabasePremiumAudioService(async () => {
    throw new EdgeFunctionError('ai_budget_reached', 429, {
      error: 'ai_budget_reached',
      spent_usd: 25,
      monthly_budget_usd: 25,
    });
  });

  let error: unknown;
  try {
    await service.getOrCreateLessonAudio('lesson-2');
  } catch (cause) {
    error = cause;
  }

  expect(error).toBeInstanceOf(PremiumAudioError);
  expect(error).toMatchObject({ code: 'budget-reached', retryable: false, status: 429 });
  expect((error as Error).message).toContain('Existing cached audio remains available');
});

test('Premium Audio marks provider and storage failures with correct retry policy', async () => {
  const provider = new SupabasePremiumAudioService(async () => {
    throw new EdgeFunctionError('tts_failed', 502, { error: 'tts_failed' });
  });
  const storage = new SupabasePremiumAudioService(async () => {
    throw new EdgeFunctionError('audio_upload_failed', 500, { error: 'audio_upload_failed' });
  });

  await expect(provider.getOrCreateLessonAudio('lesson-3')).rejects.toMatchObject({ code: 'generation-failed', retryable: true });
  await expect(storage.getOrCreateLessonAudio('lesson-4')).rejects.toMatchObject({ code: 'upload-failed', retryable: true });
});

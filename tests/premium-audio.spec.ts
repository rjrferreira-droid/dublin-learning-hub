import { expect, test } from '@playwright/test';
import { EdgeFunctionError } from '../src/services/edge';
import { PremiumAudioError, SupabasePremiumAudioService } from '../src/services/premiumAudio';

test('Premium Audio keeps concurrent authenticated requests independent and revalidates every later request', async () => {
  let calls = 0;
  const service = new SupabasePremiumAudioService(async () => {
    const current = ++calls;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return {
      audio_url: `https://example.test/audio-${current}.mp3`,
      cached: current > 1,
      estimated_cost_usd: 0.021,
      expires_at: Date.now() + 60_000,
    };
  });

  const [first, concurrent] = await Promise.all([
    service.getOrCreateLessonAudio('lesson-1'),
    service.getOrCreateLessonAudio('lesson-1'),
  ]);

  expect(calls).toBe(2);
  expect(first.audioUrl).toBe('https://example.test/audio-1.mp3');
  expect(concurrent.audioUrl).toBe('https://example.test/audio-2.mp3');
  expect(first.cached).toBe(false);
  expect(concurrent.cached).toBe(true);

  const replay = await service.getOrCreateLessonAudio('lesson-1');
  expect(calls).toBe(3);
  expect(replay).toMatchObject({ audioUrl: 'https://example.test/audio-3.mp3', cached: true });
  expect(replay.expiresAt).toBeGreaterThan(Date.now());
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

  await expect(provider.getOrCreateLessonAudio('lesson-3')).rejects.toMatchObject({ code: 'generation-failed', retryable: false });
  await expect(storage.getOrCreateLessonAudio('lesson-4')).rejects.toMatchObject({ code: 'upload-failed', retryable: false });
});

test('signed-link expiry is validated on each backend response without retaining a resolved URL',async()=>{
 let now=100_000,calls=0;
 const service=new SupabasePremiumAudioService(async()=>({audio_url:'https://fictional.invalid/signed-'+(++calls),cached:true,
  expires_at:calls===1?now+30_000:now+60_000}),()=>now);
 await expect(service.getOrCreateLessonAudio('private-lesson')).rejects.toMatchObject({code:'invalid-response',retryable:true});
 const refreshed=await service.getOrCreateLessonAudio('private-lesson');
 expect(refreshed.audioUrl).toBe('https://fictional.invalid/signed-2');
 expect(refreshed.expiresAt).toBe(now+60_000);
 expect(calls).toBe(2);
});

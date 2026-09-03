import type { PremiumAudioService } from './contracts';
import { EdgeFunctionError, invokeEdge } from './edge';

export type PremiumAudioResult = {
  audioUrl: string;
  cached: boolean;
  estimatedCostUsd?: number;
};

type PremiumLessonAudioResponse = {
  audio_url: string;
  cached?: boolean;
  voice?: string;
  estimated_cost_usd?: number;
};

type PremiumAudioInvoker = (body: { lesson_id: string }) => Promise<PremiumLessonAudioResponse>;

export type PremiumAudioErrorCode =
  | 'authentication-required'
  | 'forbidden'
  | 'lesson-unavailable'
  | 'budget-reached'
  | 'provider-not-configured'
  | 'generation-failed'
  | 'upload-failed'
  | 'network-failed'
  | 'invalid-response'
  | 'unknown';

export class PremiumAudioError extends Error {
  readonly code: PremiumAudioErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(code: PremiumAudioErrorCode, message: string, retryable: boolean, status?: number) {
    super(message);
    this.name = 'PremiumAudioError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

const defaultInvoker: PremiumAudioInvoker = (body) =>
  invokeEdge<PremiumLessonAudioResponse, { lesson_id: string }>('premium-lesson-audio', body);

function edgeCode(cause: EdgeFunctionError): string | null {
  const payload = cause.payload;
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const value = (payload as { error?: unknown }).error;
    return typeof value === 'string' ? value : null;
  }
  return typeof cause.message === 'string' ? cause.message : null;
}

export function normalizePremiumAudioError(cause: unknown): PremiumAudioError {
  if (cause instanceof PremiumAudioError) return cause;

  if (cause instanceof EdgeFunctionError) {
    const code = edgeCode(cause);
    if (cause.status === 401 || code === 'unauthorized') {
      return new PremiumAudioError('authentication-required', 'Sign in again before loading Premium Audio.', false, cause.status);
    }
    if (cause.status === 403 || code === 'forbidden') {
      return new PremiumAudioError('forbidden', 'This lesson audio is not available for the active learner profile.', false, cause.status);
    }
    if (code === 'lesson_not_found' || code === 'audio_script_missing') {
      return new PremiumAudioError('lesson-unavailable', 'This lesson does not have a publishable Premium Audio script yet.', false, cause.status);
    }
    if (code === 'ai_budget_reached') {
      return new PremiumAudioError(
        'budget-reached',
        'The monthly AI generation budget has been reached. Existing cached audio remains available; new narration is paused until the budget resets.',
        false,
        cause.status,
      );
    }
    if (code === 'openai_not_configured') {
      return new PremiumAudioError('provider-not-configured', 'Premium Audio generation is not configured in the backend yet.', false, cause.status);
    }
    if (code === 'tts_failed') {
      return new PremiumAudioError('generation-failed', 'The narration provider could not generate audio. Retrying is safe.', true, cause.status);
    }
    if (code === 'audio_upload_failed') {
      return new PremiumAudioError('upload-failed', 'Narration was generated but could not be stored. Retrying is safe.', true, cause.status);
    }
    return new PremiumAudioError('unknown', cause.message || 'Premium Audio could not be loaded.', cause.status == null || cause.status >= 500, cause.status);
  }

  if (cause instanceof TypeError) {
    return new PremiumAudioError('network-failed', 'Premium Audio could not reach the backend. Check the connection and try again.', true);
  }

  return new PremiumAudioError('unknown', cause instanceof Error ? cause.message : 'Premium Audio could not be loaded.', true);
}

export class SupabasePremiumAudioService implements PremiumAudioService {
  private readonly resolved = new Map<string, PremiumAudioResult>();
  private readonly inFlight = new Map<string, Promise<PremiumAudioResult>>();

  constructor(private readonly invoke: PremiumAudioInvoker = defaultInvoker) {}

  async getOrCreateLessonAudio(lessonId: string): Promise<PremiumAudioResult> {
    const cached = this.resolved.get(lessonId);
    if (cached) {
      return { audioUrl: cached.audioUrl, cached: true };
    }

    const pending = this.inFlight.get(lessonId);
    if (pending) return pending;

    const task = this.load(lessonId);
    this.inFlight.set(lessonId, task);
    try {
      const result = await task;
      this.resolved.set(lessonId, result);
      if (this.resolved.size > 100) {
        const oldest = this.resolved.keys().next().value;
        if (typeof oldest === 'string') this.resolved.delete(oldest);
      }
      return result;
    } finally {
      this.inFlight.delete(lessonId);
    }
  }

  clearMemoryCache(lessonId?: string) {
    if (lessonId) this.resolved.delete(lessonId);
    else this.resolved.clear();
  }

  private async load(lessonId: string): Promise<PremiumAudioResult> {
    try {
      const response = await this.invoke({ lesson_id: lessonId });
      if (!response.audio_url) {
        throw new PremiumAudioError('invalid-response', 'Premium Audio backend returned no audio URL.', true);
      }
      return {
        audioUrl: response.audio_url,
        cached: Boolean(response.cached),
        estimatedCostUsd: response.estimated_cost_usd,
      };
    } catch (cause) {
      throw normalizePremiumAudioError(cause);
    }
  }
}

export const premiumAudioService = new SupabasePremiumAudioService();

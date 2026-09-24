import type { PremiumAudioService } from './contracts';
import { EdgeFunctionError, invokeEdge } from './edge';
import {premiumAudioBackendErrorPolicy,type PremiumAudioErrorCode} from './premiumAudioPolicy';
export type {PremiumAudioErrorCode} from './premiumAudioPolicy';

export type PremiumAudioResult = {
  audioUrl: string;
  cached: boolean;
  estimatedCostUsd?: number;
  expiresAt?: number;
};

type PremiumLessonAudioResponse = {
  audio_url: string;
  cached?: boolean;
  voice?: string;
  estimated_cost_usd?: number;
  expires_at?: number;
};

type PremiumAudioInvoker = (body: { lesson_id: string }) => Promise<PremiumLessonAudioResponse>;

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
    const policy=premiumAudioBackendErrorPolicy(edgeCode(cause),cause.status);
    return new PremiumAudioError(policy.code,policy.message,policy.retryable,cause.status);
  }
  if (cause instanceof TypeError) {
    return new PremiumAudioError('network-failed', 'Premium Audio could not reach the backend. Check the connection and try again.', true);
  }
  return new PremiumAudioError('unknown', 'Premium Audio could not be loaded.', true);
}

export class SupabasePremiumAudioService implements PremiumAudioService {
  private readonly invoke: PremiumAudioInvoker;

  constructor(invoke: PremiumAudioInvoker = defaultInvoker, private readonly now: () => number = Date.now) {
    this.invoke = invoke;
  }

  async getOrCreateLessonAudio(lessonId: string): Promise<PremiumAudioResult> {
    // Never share an authenticated signed-URL request through a process-global
    // promise: the active account may change while the request is in flight.
    // Durable generation deduplication remains enforced atomically by the server.
    return this.load(lessonId);
  }

  private async load(lessonId: string): Promise<PremiumAudioResult> {
    try {
      const response = await this.invoke({ lesson_id: lessonId });
      if (!response.audio_url) throw new PremiumAudioError('invalid-response', 'Premium Audio backend returned no audio URL.', true);
      const expiresAt = response.expires_at ?? this.now() + 5 * 60_000;
      if (!Number.isFinite(expiresAt) || expiresAt <= this.now() + 30_000)
        throw new PremiumAudioError('invalid-response', 'The audio link has expired. Load the narration again.', true);
      return {audioUrl: response.audio_url,cached: Boolean(response.cached),estimatedCostUsd: response.estimated_cost_usd,expiresAt};
    } catch (cause) {
      throw normalizePremiumAudioError(cause);
    }
  }
}

export const premiumAudioService = new SupabasePremiumAudioService();

import type { PremiumAudioService } from './contracts';
import { EdgeFunctionError, invokeEdge } from './edge';
import {premiumAudioBackendErrorPolicy,type PremiumAudioErrorCode} from './premiumAudioPolicy';
export type {PremiumAudioErrorCode} from './premiumAudioPolicy';

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
    const message=policy.code==='unknown'&&cause.message?cause.message:policy.message;
    return new PremiumAudioError(policy.code,message,policy.retryable,cause.status);
  }
  if (cause instanceof TypeError) {
    return new PremiumAudioError('network-failed', 'Premium Audio could not reach the backend. Check the connection and try again.', true);
  }
  return new PremiumAudioError('unknown', cause instanceof Error ? cause.message : 'Premium Audio could not be loaded.', true);
}

export class SupabasePremiumAudioService implements PremiumAudioService {
  private readonly resolved = new Map<string, PremiumAudioResult>();
  private readonly inFlight = new Map<string, Promise<PremiumAudioResult>>();
  private readonly invoke: PremiumAudioInvoker;

  constructor(invoke: PremiumAudioInvoker = defaultInvoker) {
    this.invoke = invoke;
  }

  async getOrCreateLessonAudio(lessonId: string): Promise<PremiumAudioResult> {
    const cached = this.resolved.get(lessonId);
    if (cached) return { audioUrl: cached.audioUrl, cached: true };
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
      if (!response.audio_url) throw new PremiumAudioError('invalid-response', 'Premium Audio backend returned no audio URL.', true);
      return {audioUrl: response.audio_url,cached: Boolean(response.cached),estimatedCostUsd: response.estimated_cost_usd};
    } catch (cause) {
      throw normalizePremiumAudioError(cause);
    }
  }
}

export const premiumAudioService = new SupabasePremiumAudioService();

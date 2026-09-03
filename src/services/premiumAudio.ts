import type { PremiumAudioService } from './contracts';
import { invokeEdge } from './edge';

type PremiumLessonAudioResponse = {
  audio_url: string;
  cached?: boolean;
  voice?: string;
  estimated_cost_usd?: number;
};

export class SupabasePremiumAudioService implements PremiumAudioService {
  async getOrCreateLessonAudio(lessonId: string) {
    const response = await invokeEdge<PremiumLessonAudioResponse, { lesson_id: string }>(
      'premium-lesson-audio',
      { lesson_id: lessonId },
    );

    if (!response.audio_url) {
      throw new Error('Premium Audio backend returned no audio URL.');
    }

    return {
      audioUrl: response.audio_url,
      cached: Boolean(response.cached),
      estimatedCostUsd: response.estimated_cost_usd,
    };
  }
}

export const premiumAudioService = new SupabasePremiumAudioService();

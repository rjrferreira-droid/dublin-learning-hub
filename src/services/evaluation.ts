import type { EvaluationResult, EvaluationService } from './contracts';
import { invokeEdge } from './edge';

type EvaluatorPayload = {
  session_id: string;
  evaluation: {
    technical_score?: number;
    english_score?: number;
    grammar_score?: number;
    vocabulary_score?: number;
    fluency_score?: number;
    pronunciation_score?: number | null;
    professional_communication_score?: number;
    overall_feedback?: string;
    strengths?: string[];
    gaps?: string[];
    review_terms?: string[];
  };
  estimated_cost_usd?: number;
};

export class SupabaseEvaluationService implements EvaluationService {
  async evaluateSession(sessionId: string): Promise<EvaluationResult> {
    const response = await invokeEdge<EvaluatorPayload, { session_id: string }>(
      'ai-tutor-evaluate',
      { session_id: sessionId },
    );

    const e = response.evaluation ?? {};
    const scored = [
      e.technical_score,
      e.english_score,
      e.grammar_score,
      e.vocabulary_score,
      e.fluency_score,
      e.professional_communication_score,
    ].filter((value): value is number => typeof value === 'number');

    const overall = scored.length
      ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length)
      : 0;

    return {
      technicalAccuracy: e.technical_score,
      grammar: e.grammar_score,
      vocabulary: e.vocabulary_score,
      fluency: e.fluency_score,
      pronunciation: e.pronunciation_score ?? undefined,
      professionalCommunication: e.professional_communication_score,
      overall,
      strengths: e.strengths ?? [],
      priorities: [...(e.gaps ?? []), ...(e.review_terms ?? [])],
      retryPrompt: e.overall_feedback,
    };
  }
}

export const evaluationService = new SupabaseEvaluationService();

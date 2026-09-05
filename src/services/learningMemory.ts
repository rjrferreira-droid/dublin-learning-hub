import { supabase } from './supabase';

export type LearningMemoryFeedback = {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  nextSessionFocus?: string[];
  assessmentConfidence?: number;
  needsSpacedReview?: boolean;
};

export type LearningMemorySession = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  mode: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  qualityTier: string | null;
  technicalScore: number | null;
  englishScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  fluencyScore: number | null;
  pronunciationScore: number | null;
  professionalCommunicationScore: number | null;
  feedback: LearningMemoryFeedback | null;
};

export type LearningMemoryCompetency = {
  code: string;
  name: string;
  category: string;
  score: number;
  confidence: number;
  evidenceCount: number;
  lastAssessedAt: string | null;
};

export type LearningMemoryError = {
  id: string;
  domain: string;
  pattern: string;
  frequency: number;
  confidence: number;
  lastSeenAt: string;
  nextReviewAt: string;
  status: string;
};

export type LearningMemoryReview = {
  id: string;
  stage: string;
  dueDate: string;
  status: string;
  score: number | null;
  label: string;
};

export type LearningMemorySnapshot = {
  latest: LearningMemorySession | null;
  history: LearningMemorySession[];
  competencies: LearningMemoryCompetency[];
  errors: LearningMemoryError[];
  reviews: LearningMemoryReview[];
};

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return values.length > 0 ? values : undefined;
}

function feedbackFrom(value: unknown): LearningMemoryFeedback | null {
  const row = objectValue(value);
  if (!row) return null;
  return {
    summary: typeof row.summary === 'string' ? row.summary : undefined,
    strengths: stringArray(row.strengths),
    improvements: stringArray(row.improvements),
    nextSessionFocus: stringArray(row.nextSessionFocus),
    assessmentConfidence: numberOrNull(row.assessmentConfidence) ?? undefined,
    needsSpacedReview: typeof row.needsSpacedReview === 'boolean' ? row.needsSpacedReview : undefined,
  };
}

function relatedObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return objectValue(value[0]);
  return objectValue(value);
}

function sessionFrom(row: Record<string, any>): LearningMemorySession {
  const lesson = relatedObject(row.lessons);
  return {
    id: String(row.id),
    lessonId: String(row.lesson_id),
    lessonTitle: typeof lesson?.title === 'string' ? lesson.title : 'Professor session',
    mode: String(row.mode ?? 'conversation'),
    startedAt: String(row.started_at),
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    durationSeconds: Math.max(0, Math.round(numberOrZero(row.duration_seconds))),
    qualityTier: typeof row.quality_tier === 'string' ? row.quality_tier : null,
    technicalScore: numberOrNull(row.technical_score),
    englishScore: numberOrNull(row.english_score),
    grammarScore: numberOrNull(row.grammar_score),
    vocabularyScore: numberOrNull(row.vocabulary_score),
    fluencyScore: numberOrNull(row.fluency_score),
    pronunciationScore: numberOrNull(row.pronunciation_score),
    professionalCommunicationScore: numberOrNull(row.professional_communication_score),
    feedback: feedbackFrom(row.final_feedback),
  };
}

export async function loadLearningMemory(): Promise<LearningMemorySnapshot> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error('authentication_required');

  const [sessionsResult, competenciesResult, errorsResult, reviewsResult] = await Promise.all([
    supabase
      .from('ai_tutor_sessions')
      .select('id,lesson_id,mode,status,started_at,completed_at,duration_seconds,quality_tier,technical_score,english_score,grammar_score,vocabulary_score,fluency_score,pronunciation_score,professional_communication_score,final_feedback,lessons(title)')
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(12),
    supabase
      .from('user_competency_scores')
      .select('score,confidence,evidence_count,last_assessed_at,competencies(code,name,category)')
      .order('score', { ascending: true })
      .limit(16),
    supabase
      .from('user_error_bank')
      .select('id,domain,pattern,frequency,confidence,last_seen_at,next_review_at,status')
      .eq('status', 'active')
      .order('next_review_at', { ascending: true })
      .limit(12),
    supabase
      .from('spaced_reviews')
      .select('id,review_stage,due_date,status,score,lessons(title),competencies(name)')
      .in('status', ['due', 'scheduled'])
      .order('due_date', { ascending: true })
      .limit(12),
  ]);

  const firstError = sessionsResult.error ?? competenciesResult.error ?? errorsResult.error ?? reviewsResult.error;
  if (firstError) throw firstError;

  const history = (sessionsResult.data ?? []).map((row) => sessionFrom(row as Record<string, any>));
  const competencies = (competenciesResult.data ?? []).flatMap((row: any) => {
    const competency = relatedObject(row.competencies);
    if (!competency || typeof competency.name !== 'string') return [];
    return [{
      code: typeof competency.code === 'string' ? competency.code : 'COMPETENCY',
      name: competency.name,
      category: typeof competency.category === 'string' ? competency.category : 'general',
      score: Math.max(0, Math.min(100, numberOrZero(row.score))),
      confidence: Math.max(0, Math.min(100, numberOrZero(row.confidence))),
      evidenceCount: Math.max(0, Math.round(numberOrZero(row.evidence_count))),
      lastAssessedAt: typeof row.last_assessed_at === 'string' ? row.last_assessed_at : null,
    }];
  });

  const errors = (errorsResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    domain: String(row.domain ?? 'technical'),
    pattern: String(row.pattern ?? ''),
    frequency: Math.max(1, Math.round(numberOrZero(row.frequency) || 1)),
    confidence: Math.max(0, Math.min(100, numberOrZero(row.confidence))),
    lastSeenAt: String(row.last_seen_at ?? row.next_review_at ?? ''),
    nextReviewAt: String(row.next_review_at ?? row.last_seen_at ?? ''),
    status: String(row.status ?? 'active'),
  }));

  const reviews = (reviewsResult.data ?? []).map((row: any) => {
    const lesson = relatedObject(row.lessons);
    const competency = relatedObject(row.competencies);
    const label = typeof lesson?.title === 'string'
      ? lesson.title
      : typeof competency?.name === 'string'
        ? competency.name
        : 'Adaptive review';
    return {
      id: String(row.id),
      stage: String(row.review_stage ?? 'review'),
      dueDate: String(row.due_date),
      status: String(row.status ?? 'scheduled'),
      score: numberOrNull(row.score),
      label,
    };
  });

  return {
    latest: history[0] ?? null,
    history,
    competencies,
    errors,
    reviews,
  };
}

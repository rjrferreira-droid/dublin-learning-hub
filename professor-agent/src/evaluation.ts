type TranscriptTurn = {
  role: 'user' | 'assistant';
  text: string;
  interrupted?: boolean;
};

type EvaluationContext = {
  track?: string;
  mode?: string;
  professorProfile?: string;
  lessonContext?: {
    title?: string;
    objectives?: string[];
    technicalBrief?: string;
    irelandOverlay?: string;
    interviewAngle?: string;
  };
};

type EvaluationError = {
  domain: 'technical' | 'grammar' | 'vocabulary' | 'pronunciation' | 'fluency' | 'register';
  pattern: string;
  normalizedPattern: string;
  confidence: number;
  example: string;
  correction: string;
};

export type ProfessorEvaluation = {
  technicalScore: number | null;
  englishScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  fluencyScore: number | null;
  pronunciationScore: number | null;
  professionalCommunicationScore: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  nextSessionFocus: string[];
  errors: EvaluationError[];
  needsSpacedReview: boolean;
  assessmentConfidence: number | null;
  model: string;
  estimatedCostUsd: number;
};

const DOMAINS = new Set(['technical', 'grammar', 'vocabulary', 'pronunciation', 'fluency', 'register']);

function score(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function confidenceScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const normalized = n > 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(normalized * 10) / 10));
}

function text(value: unknown, max = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const valueText = text(item, 500);
    return valueText ? [valueText] : [];
  }).slice(0, maxItems);
}

function normalized(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 180);
}

function parseEvaluation(raw: unknown, model: string, estimatedCostUsd: number): ProfessorEvaluation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const errors: EvaluationError[] = Array.isArray(input.errors)
    ? input.errors.flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
        const row = item as Record<string, unknown>;
        const domain = text(row.domain, 40).toLowerCase();
        const pattern = text(row.pattern, 600);
        if (!DOMAINS.has(domain) || !pattern) return [];
        return [{
          domain: domain as EvaluationError['domain'],
          pattern,
          normalizedPattern: normalized(text(row.normalizedPattern, 220) || pattern),
          confidence: confidenceScore(row.confidence) ?? 60,
          example: text(row.example, 900),
          correction: text(row.correction, 900),
        }];
      }).slice(0, 12)
    : [];

  return {
    technicalScore: score(input.technicalScore),
    englishScore: score(input.englishScore),
    grammarScore: score(input.grammarScore),
    vocabularyScore: score(input.vocabularyScore),
    fluencyScore: score(input.fluencyScore),
    pronunciationScore: score(input.pronunciationScore),
    professionalCommunicationScore: score(input.professionalCommunicationScore),
    summary: text(input.summary, 1800),
    strengths: list(input.strengths),
    improvements: list(input.improvements),
    nextSessionFocus: list(input.nextSessionFocus),
    errors,
    needsSpacedReview: Boolean(input.needsSpacedReview),
    assessmentConfidence: score(input.assessmentConfidence),
    model,
    estimatedCostUsd,
  };
}

function compactTranscript(turns: TranscriptTurn[]): string {
  return turns
    .slice(0, 120)
    .map((turn) => `${turn.role === 'user' ? 'LEARNER' : 'PROFESSOR'}: ${turn.text.slice(0, 2500)}`)
    .join('\n');
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

const nullableScoreSchema = {
  anyOf: [
    { type: 'number', minimum: 0, maximum: 100 },
    { type: 'null' },
  ],
};

const evaluationSchema = {
  type: 'object',
  properties: {
    technicalScore: nullableScoreSchema,
    englishScore: nullableScoreSchema,
    grammarScore: nullableScoreSchema,
    vocabularyScore: nullableScoreSchema,
    fluencyScore: nullableScoreSchema,
    pronunciationScore: nullableScoreSchema,
    professionalCommunicationScore: nullableScoreSchema,
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    nextSessionFocus: { type: 'array', items: { type: 'string' } },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string', enum: ['technical', 'grammar', 'vocabulary', 'pronunciation', 'fluency', 'register'] },
          pattern: { type: 'string' },
          normalizedPattern: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 100 },
          example: { type: 'string' },
          correction: { type: 'string' },
        },
        required: ['domain', 'pattern', 'normalizedPattern', 'confidence', 'example', 'correction'],
        additionalProperties: false,
      },
    },
    needsSpacedReview: { type: 'boolean' },
    assessmentConfidence: nullableScoreSchema,
  },
  required: [
    'technicalScore',
    'englishScore',
    'grammarScore',
    'vocabularyScore',
    'fluencyScore',
    'pronunciationScore',
    'professionalCommunicationScore',
    'summary',
    'strengths',
    'improvements',
    'nextSessionFocus',
    'errors',
    'needsSpacedReview',
    'assessmentConfidence',
  ],
  additionalProperties: false,
};

export async function evaluateProfessorSession(
  turns: TranscriptTurn[],
  context: EvaluationContext,
): Promise<ProfessorEvaluation | null> {
  const learnerTurns = turns.filter((turn) => turn.role === 'user' && turn.text.trim());
  if (learnerTurns.length === 0) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Professor evaluation unavailable: OPENAI_API_KEY is missing');
    return null;
  }

  const model = process.env.OPENAI_EVALUATION_MODEL || 'gpt-5.6-terra';
  const lesson = context.lessonContext;
  const rubric = `You are the independent evaluator for an adult-learning voice tutor. Evaluate only evidence actually demonstrated by the learner. Do not reward or punish the tutor.\n\nScores are 0-100 or null when there is not enough evidence. pronunciationScore MUST be null because this evaluation receives transcript text rather than acoustic evidence. technicalScore must be null when the learner did not demonstrate technical knowledge. englishScore should reflect the learner's overall spoken-English evidence, not subject-matter knowledge. professionalCommunicationScore measures concise, structured, professional communication. assessmentConfidence is 0-100 and should be lower for short conversations. Error-item confidence must also use a 0-100 percentage scale, never a 0-1 probability.\n\nDo not create pronunciation errors from transcript text. Record only meaningful, teachable patterns; ignore harmless transcription noise or obviously corrupted speech-to-text fragments. A technical uncertainty explicitly admitted by the learner may be recorded as technical. normalizedPattern should be a short reusable label, not the full sentence.\n\nSet needsSpacedReview true when there is a meaningful weakness, a technical gap, or a score below roughly 75. Keep feedback concise and practical.`;

  const contextPayload = {
    track: context.track ?? null,
    mode: context.mode ?? null,
    professorProfile: context.professorProfile ?? null,
    lesson: lesson ? {
      title: lesson.title ?? null,
      objectives: lesson.objectives ?? [],
      technicalBrief: lesson.technicalBrief ?? null,
      irelandOverlay: lesson.irelandOverlay ?? null,
      interviewAngle: lesson.interviewAngle ?? null,
    } : null,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  timeout.unref?.();

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          { role: 'system', content: rubric },
          {
            role: 'user',
            content: `SESSION CONTEXT\n${JSON.stringify(contextPayload)}\n\nTRANSCRIPT\n${compactTranscript(turns)}`,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'professor_evaluation',
            strict: true,
            schema: evaluationSchema,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('Professor evaluation request failed', response.status, await response.text().catch(() => ''));
      return null;
    }

    const payload = await response.json() as any;
    const content = extractOutputText(payload);
    if (!content.trim()) {
      console.error('Professor evaluation returned no output text');
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Professor evaluation returned invalid JSON');
      return null;
    }

    const inputTokens = Number(payload?.usage?.input_tokens) || 0;
    const outputTokens = Number(payload?.usage?.output_tokens) || 0;
    const estimatedCostUsd = model === 'gpt-5.6-terra'
      ? (inputTokens * 2 + outputTokens * 12) / 1_000_000
      : 0;

    return parseEvaluation(parsed, model, Math.round(estimatedCostUsd * 1_000_000) / 1_000_000);
  } catch (cause) {
    console.error('Professor evaluation failed', cause instanceof Error ? cause.message : 'unknown_error');
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

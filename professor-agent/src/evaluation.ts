import {guardEvaluation,renderEvidenceTranscript,scoreEvidenceSchema,EVIDENCE_RUBRIC} from './evaluationEvidence.js';
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

function parseEvaluation(raw:unknown,model:string,estimatedCostUsd:number,turns:TranscriptTurn[]):ProfessorEvaluation|null {
 const result=guardEvaluation(raw,turns);
 return result?{...result,model,estimatedCostUsd}:null;
}
function compactTranscript(turns:TranscriptTurn[]):string { return renderEvidenceTranscript(turns); }

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
    scoreEvidence: scoreEvidenceSchema,
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
          evidenceTurn: { type: 'integer', minimum:1, maximum:120 },
          domain: { type: 'string', enum: ['technical', 'grammar', 'vocabulary', 'pronunciation', 'fluency', 'register'] },
          pattern: { type: 'string' },
          normalizedPattern: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 100 },
          example: { type: 'string' },
          correction: { type: 'string' },
        },
        required: ['evidenceTurn', 'domain', 'pattern', 'normalizedPattern', 'confidence', 'example', 'correction'],
        additionalProperties: false,
      },
    },
    needsSpacedReview: { type: 'boolean' },
    assessmentConfidence: nullableScoreSchema,
  },
  required: [
    'scoreEvidence',
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
  const rubric = EVIDENCE_RUBRIC + '\n\n' + `You are the independent evaluator for an adult-learning voice tutor. Evaluate only evidence actually demonstrated by the learner. Do not reward or punish the tutor.\n\nScores are 0-100 or null when there is not enough evidence. pronunciationScore MUST be null because this evaluation receives transcript text rather than acoustic evidence. technicalScore must be null when the learner did not demonstrate technical knowledge. englishScore should reflect demonstrated written-transcript language evidence, not unobserved acoustic fluency or subject-matter knowledge. professionalCommunicationScore measures concise, structured, professional communication. assessmentConfidence is 0-100 and should be lower for short conversations. Error-item confidence must also use a 0-100 percentage scale, never a 0-1 probability.\n\nDo not create pronunciation errors from transcript text. Record only meaningful, teachable patterns; ignore harmless transcription noise or obviously corrupted speech-to-text fragments. An admitted uncertainty or request for help alone is not a demonstrated technical mistake; identify a substantive incorrect claim before recording an error. normalizedPattern should be a short reusable label, not the full sentence.\n\nSet needsSpacedReview true only for a substantive demonstrated weakness or an evidence-supported score below 75; not for help-seeking or unassessed topics. Keep feedback concise and practical.`;

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
      console.error('Professor evaluation request failed', response.status); // Never log provider bodies/transcripts.
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

    return parseEvaluation(parsed, model, Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,turns);
  } catch (cause) {
    console.error('Professor evaluation failed', cause instanceof Error && cause.name==='AbortError' ? 'timeout' : 'request_or_output_failure');
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

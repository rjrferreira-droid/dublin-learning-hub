export const COMPLETION_CONTRACT_VERSION = 'completion-integrity-1';
const domains = new Set(['technical', 'grammar', 'vocabulary', 'fluency', 'register']);
const dimensions = ['technicalScore', 'englishScore', 'grammarScore', 'vocabularyScore', 'fluencyScore', 'professionalCommunicationScore'] as const;
const object = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const text = (v: unknown, max: number): string => typeof v === 'string' ? v.trim().slice(0, max) : '';
export const score = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : null;
const list = (v: unknown): string[] => Array.isArray(v) ? v.map(x => text(x, 500)).filter(Boolean).slice(0, 8) : [];
const normalize = (v: string): string => v.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 180);

export function sanitizeCompletion(value: unknown) {
  const body = object(value);
  if (!body || typeof body.sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sessionId)) throw new Error('invalid_callback_credentials');
  const callbackToken = text(body.callbackToken, 256);
  if (callbackToken.length < 32) throw new Error('invalid_callback_credentials');
  if (!Array.isArray(body.transcript) || body.transcript.length > 200) throw new Error('invalid_transcript');
  const transcript = body.transcript.map(value => {
    const turn = object(value);
    if (!turn || !['user', 'assistant'].includes(String(turn.role)) || typeof turn.text !== 'string' || !turn.text.trim() || turn.text.trim().length > 4000) throw new Error('invalid_transcript_turn');
    return { role: turn.role as 'user' | 'assistant', text: turn.text.trim(), interrupted: turn.interrupted === true };
  });
  const input = object(body.evaluation);
  let evaluation: Record<string, unknown> | null = null;
  if (input) {
    const errors = new Map<string, Record<string, unknown>>();
    for (const value of (Array.isArray(input.errors) ? input.errors.slice(0, 24) : [])) {
      const item = object(value);
      if (!item) continue;
      const domain = text(item.domain, 40).toLowerCase();
      const pattern = text(item.pattern, 600);
      const normalizedPattern = normalize(text(item.normalizedPattern, 220) || pattern);
      const diagnosticConfidence = score(item.diagnosticConfidence) ?? score(item.confidence);
      if (!domains.has(domain) || !pattern || !normalizedPattern || diagnosticConfidence === null) continue;
      const key = `${domain}:${normalizedPattern}`;
      if (errors.has(key) && Number(errors.get(key)!.diagnosticConfidence) >= diagnosticConfidence) continue;
      errors.set(key, { domain, pattern, normalizedPattern, diagnosticConfidence, confidence: diagnosticConfidence, example: text(item.example, 900), correction: text(item.correction, 900) });
    }
    const scores = Object.fromEntries(dimensions.map(key => [key, score(input[key])]));
    evaluation = {
      ...scores, pronunciationScore: null,
      summary: text(input.summary, 1800), strengths: list(input.strengths), improvements: list(input.improvements), nextSessionFocus: list(input.nextSessionFocus),
      errors: [...errors.values()].slice(0, 12),
      needsSpacedReview: input.needsSpacedReview === true || errors.size > 0 || Object.values(scores).some(v => v !== null && v < 75),
      assessmentConfidence: score(input.assessmentConfidence), model: text(input.model, 120),
      estimatedCostUsd: typeof input.estimatedCostUsd === 'number' && Number.isFinite(input.estimatedCostUsd) ? Math.max(0, Math.min(5, input.estimatedCostUsd)) : 0,
    };
  }
  const duration = typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds) ? body.durationSeconds : 0;
  const usage = body.modelUsage ?? null;
  if (JSON.stringify(usage).length > 24000) throw new Error('usage_payload_too_large');
  return {
    sessionId: body.sessionId, callbackToken,
    payload: {
      transcript, evaluation, modelUsage: usage,
      durationSeconds: Math.max(0, Math.min(1200, Math.round(duration))),
      closeReason: text(body.closeReason, 120) || 'session_closed',
      dispatchId: text(body.dispatchId, 180) || null,
      contractVersion: COMPLETION_CONTRACT_VERSION,
    },
  };
}

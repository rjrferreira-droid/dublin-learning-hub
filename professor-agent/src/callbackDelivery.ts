export const CALLBACK_DELIVERY_VERSION = 'bounded-delivery-1';
export const FINALIZATION_BUDGET_MS = 25_000;
export const SHUTDOWN_GRACE_MS = 60_000;
const allowedOrigins = new Set(['https://aazfyosqqeujureksqjs.supabase.co', 'https://qwvsrcgsfoguxdbcdrxq.supabase.co']);
const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
type Stage = 'completion' | 'settlement';
export type DeliveryResult = { state: 'delivered' | 'pending' | 'failed' | 'blocked'; attempts: number; reason?: string; httpStatus?: number };
type Runtime = { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void>; now?: () => number; attemptTimeoutMs?: number; totalBudgetMs?: number };
const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
function endpoints(completionUrl: string) {
  const url = new URL(completionUrl);
  if (!allowedOrigins.has(url.origin) || url.username || url.password || url.search || url.hash || url.pathname !== '/functions/v1/professor-session-complete') throw new Error('invalid_callback_destination');
  return { completion: url.href, settlement: new URL('/functions/v1/professor-usage-settle', url.origin).href };
}
function bounded(value: number | undefined, max: number): number {
  if (value === undefined) return max;
  if (!Number.isFinite(value) || value < 1 || value > max) throw new Error('invalid_delivery_budget');
  return value;
}
/** Only retries delivery of already-created payloads. It never calls an LLM or recreates a session. */
export async function deliverProfessorFinalization(input: {
  completionUrl: string; publishableKey?: string; completion: Record<string, unknown>; settlement: Record<string, unknown>;
}, runtime: Runtime = {}): Promise<{ completion: DeliveryResult; settlement: DeliveryResult }> {
  let urls: ReturnType<typeof endpoints>;
  let completionJson: string;
  let settlementJson: string;
  try {
    urls = endpoints(input.completionUrl);
    const c = input.completion, s = input.settlement;
    if (typeof c.sessionId !== 'string' || typeof c.callbackToken !== 'string' || c.callbackToken.length < 32 || c.sessionId !== s.sessionId || c.callbackToken !== s.callbackToken) throw new Error('callback_identity_mismatch');
    // Freeze BOTH payloads before awaiting any network call; retries must remain byte-identical.
    completionJson = JSON.stringify(c); settlementJson = JSON.stringify(s);
  } catch {
    return { completion: { state:'failed',attempts:0,reason:'invalid_callback_envelope' }, settlement:{state:'blocked',attempts:0,reason:'completion_not_delivered'} };
  }
  const fetchImpl = runtime.fetchImpl ?? fetch;
  const sleep = runtime.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const now = runtime.now ?? Date.now;
  const deadline = now() + bounded(runtime.totalBudgetMs, FINALIZATION_BUDGET_MS);
  const timeoutMs = bounded(runtime.attemptTimeoutMs, 8_000);
  const headers: Record<string,string> = { 'content-type':'application/json', ...(input.publishableKey ? {apikey:input.publishableKey} : {}) };
  async function post(stage: Stage, body: string): Promise<DeliveryResult> {
    let last: DeliveryResult = {state:'failed',attempts:0,reason:'delivery_budget_exhausted'};
    for (let attempt = 1; attempt <= 3; attempt++) {
      const remaining = deadline - now();
      if (remaining <= 0) return {...last, reason:'delivery_budget_exhausted'};
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(remaining, timeoutMs));
      let retry = false;
      let waitMs = 300 * 2 ** (attempt - 1);
      try {
        // Never follow redirects carrying callback credentials to another endpoint or host.
        const response = await fetchImpl(urls[stage], {method:'POST',headers,body,signal:controller.signal,redirect:'error'});
        last = {state:'failed',attempts:attempt,httpStatus:response.status,reason:'http_error'};
        if (!response.ok) {
          retry = transientStatuses.has(response.status);
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter && /^\d+(\.\d+)?$/.test(retryAfter)) waitMs = Math.max(waitMs, Math.min(Number(retryAfter)*1000, FINALIZATION_BUDGET_MS));
          await response.body?.cancel().catch(() => undefined);
          if (!retry) return last;
        } else {
          const payload: unknown = await response.json();
          if (!isObject(payload) || payload.ok !== true) {
            last.reason = 'invalid_acknowledgement'; retry = true;
          } else if (stage === 'completion') {
            if (typeof payload.traceId !== 'string' || typeof payload.transcriptTurns !== 'number' || typeof payload.evaluated !== 'boolean') {
              last.reason = 'invalid_completion_receipt'; retry = true;
            } else return {state:'delivered',attempts:attempt,httpStatus:response.status};
          } else if (payload.state === 'settled' && payload.reservationSettled === true) {
            return {state:'delivered',attempts:attempt,httpStatus:response.status};
          } else if (payload.state === 'pending') {
            // A successful HTTP response is not proof that the cost was settled.
            return {state:'pending',attempts:attempt,httpStatus:response.status,reason:'settlement_requires_reconciliation'};
          } else {
            last.reason = 'invalid_settlement_receipt'; retry = true;
          }
        }
      } catch {
        // Do not log response bodies, transcripts, URLs with secrets, or exception messages.
        last = {state:'failed',attempts:attempt,reason:controller.signal.aborted ? 'delivery_timeout' : 'transport_failure'};
        retry = true;
      } finally { clearTimeout(timer); }
      if (!retry || attempt === 3) break;
      if (now() + waitMs >= deadline) return {...last,reason:'delivery_budget_exhausted'};
      await sleep(waitMs);
    }
    return last;
  }
  const completion = await post('completion', completionJson);
  const settlement = completion.state === 'delivered'
    ? await post('settlement', settlementJson)
    : {state:'blocked' as const,attempts:0,reason:'completion_not_delivered'};
  return {completion,settlement};
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { sanitizeCompletion } from "../_shared/professor-completion-contract.ts";

// Custom, per-session callback authentication is verified INSIDE the SQL transaction.
// The LiveKit worker does not hold a user's JWT or a service-role key.
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
async function readLimited(req: Request): Promise<unknown> {
  if (!req.body) throw new Error('invalid_json');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1_100_000) { await reader.cancel(); throw new Error('payload_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'backend_not_configured' }, 503);
  let callback: ReturnType<typeof sanitizeCompletion>;
  try { callback = sanitizeCompletion(await readLimited(req)); }
  catch (cause) {
    const code = cause instanceof Error ? cause.message : 'invalid_request';
    return json({ error: code === 'invalid_callback_credentials' ? code : 'invalid_request' }, code === 'invalid_callback_credentials' ? 401 : code === 'payload_too_large' ? 413 : 400);
  }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc('complete_professor_session_v2', { p_session_id: callback.sessionId, p_callback_token: callback.callbackToken, p_payload: callback.payload });
  if (error) {
    const code = error.message;
    if (code === 'invalid_callback_credentials' || code === 'callback_expired') return json({ error: 'invalid_callback_credentials' }, 401);
    if (code === 'completion_conflict' || code === 'session_already_finalized') return json({ error: code }, 409);
    console.error('Professor atomic completion failed', error.code);
    return json({ error: 'session_persistence_failed' }, 503);
  }
  return json(data);
});

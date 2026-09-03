import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://qwvsrcgsfoguxdbcdrxq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';

const allowedModes = new Set([
  'chapter_conversation',
  'case_feedback',
  'oral_mock',
  'english_drill',
  'general_conversation',
]);

function send(res: any, status: number, body: unknown) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }

  const livekitUrl = process.env.LIVEKIT_URL;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return send(res, 503, { error: 'professor_not_configured' });
  }

  const authHeader = String(req.headers.authorization || '');
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!jwt) return send(res, 401, { error: 'missing_authentication' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return send(res, 401, { error: 'invalid_authentication' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId : null;
  const mode = typeof body.mode === 'string' && allowedModes.has(body.mode) ? body.mode : 'general_conversation';

  // Deliberately random: LiveKit warns against placing PII in room names or participant identities.
  const roomName = `lh-${randomUUID()}`;
  const participantIdentity = `learner-${randomUUID()}`;

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: participantIdentity,
    ttl: '20m',
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwtToken = await token.toJwt();

  return send(res, 200, {
    serverUrl: livekitUrl,
    token: jwtToken,
    roomName,
    participantIdentity,
    lessonId,
    mode,
  });
}

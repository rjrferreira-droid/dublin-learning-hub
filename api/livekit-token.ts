import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { AccessToken, LiveKitAPI } from 'livekit-server-sdk';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://qwvsrcgsfoguxdbcdrxq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_k1VAFbFj5ARYfOOUYhQacQ_wSruDD_Z';
const PROFESSOR_AGENT_NAME = process.env.LIVEKIT_PROFESSOR_AGENT_NAME || 'learning-hub-professor';

const allowedModes = new Set([
  'chapter_conversation',
  'case_feedback',
  'oral_mock',
  'english_drill',
  'general_conversation',
]);
const allowedTracks = new Set(['rafael_finance', 'viviane_payroll', 'english_academy']);
const allowedCorrectionModes = new Set(['immediate', 'delayed', 'minimal']);
const allowedSupportLanguages = new Set(['pt-BR', 'en']);

type ProfessorProfile = 'finance' | 'payroll' | 'english';

function send(res: any, status: number, body: unknown) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

function liveKitHttpUrl(url: string): string {
  if (url.startsWith('wss://')) return `https://${url.slice('wss://'.length)}`;
  if (url.startsWith('ws://')) return `http://${url.slice('ws://'.length)}`;
  return url;
}

function profileForTrack(track: string): ProfessorProfile {
  if (track === 'viviane_payroll') return 'payroll';
  if (track === 'english_academy') return 'english';
  return 'finance';
}

function safeBody(req: any): Record<string, any> | null {
  try {
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeLessonId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 160 ? trimmed : null;
}

function normalizeLanguageProfile(value: unknown) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const correctionMode = typeof input.correctionMode === 'string' && allowedCorrectionModes.has(input.correctionMode)
    ? input.correctionMode
    : 'delayed';
  const supportLanguage = typeof input.supportLanguage === 'string' && allowedSupportLanguages.has(input.supportLanguage)
    ? input.supportLanguage
    : 'en';
  const rawShare = typeof input.professorEnglishSharePct === 'number' && Number.isFinite(input.professorEnglishSharePct)
    ? input.professorEnglishSharePct
    : 80;

  return {
    preferredMix: 'uk-us-mix' as const,
    includeIrishExposure: input.includeIrishExposure !== false,
    correctionMode,
    supportLanguage,
    professorEnglishSharePct: Math.max(35, Math.min(100, Math.round(rawShare))),
  };
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

  const body = safeBody(req);
  const lessonId = safeLessonId(body?.lessonId);
  const track = typeof body?.track === 'string' && allowedTracks.has(body.track) ? body.track : null;
  const mode = typeof body?.mode === 'string' && allowedModes.has(body.mode) ? body.mode : null;
  if (!body || !lessonId || !track || !mode) return send(res, 400, { error: 'invalid_professor_request' });

  const professorProfile = profileForTrack(track);
  const languageProfile = normalizeLanguageProfile(body.languageProfile);

  // Deliberately random: no names, emails or Supabase IDs are exposed in LiveKit room/participant identity.
  const roomName = `lh-${randomUUID()}`;
  const participantIdentity = `learner-${randomUUID()}`;

  // Explicit dispatch gives every room the correct Professor profile and session metadata.
  // The authenticated Supabase user ID is intentionally not included in third-party metadata.
  const jobMetadata = JSON.stringify({
    professorProfile,
    track,
    lessonId,
    mode,
    languageProfile,
  });

  try {
    const api = new LiveKitAPI({
      host: liveKitHttpUrl(livekitUrl),
      apiKey: livekitApiKey,
      secret: livekitApiSecret,
    });
    const dispatch = await api.agentDispatch.createDispatch(roomName, PROFESSOR_AGENT_NAME, {
      metadata: jobMetadata,
    });

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
      professorProfile,
      dispatchId: typeof dispatch?.id === 'string' ? dispatch.id : null,
    });
  } catch (cause) {
    console.error('Professor LiveKit dispatch failed', cause instanceof Error ? cause.message : 'unknown_error');
    return send(res, 503, { error: 'professor_agent_dispatch_failed' });
  }
}

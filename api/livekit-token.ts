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

type ProfessorTrack = 'rafael_finance' | 'viviane_payroll' | 'english_academy';
type ProfessorProfile = 'finance' | 'payroll' | 'english';
type LessonContext = {
  title: string;
  objectives: string[];
  technicalBrief?: string;
  globalCore?: string;
  irelandOverlay?: string;
  workedExample?: string;
  interviewAngle?: string;
  vocabulary?: string[];
  practiceScenario?: string;
};
type TechnicalLesson = { track: string; context: LessonContext };

type UntypedSupabaseClient = ReturnType<typeof createClient<any>>;

function send(res: any, status: number, body: unknown) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stringList(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, maxItems);
}

function isProfessorTrackAllowed(profileTrack: unknown, requestedTrack: ProfessorTrack): boolean {
  if (profileTrack !== 'rafael_finance' && profileTrack !== 'viviane_payroll') return false;
  return requestedTrack === 'english_academy' || profileTrack === requestedTrack;
}

function requiresPublishedTechnicalLesson(track: ProfessorTrack): boolean {
  return track !== 'english_academy';
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

function englishGoldenLessonContext(): LessonContext {
  return {
    title: 'Tell a story naturally: past forms, rhythm & follow-up questions',
    objectives: [
      'Tell a short everyday story with a clear beginning, turning point and outcome.',
      'Choose past simple, past continuous and present perfect naturally.',
      'Reduce overuse of connectors such as “and then”.',
      'Respond to spontaneous follow-up questions without reverting to rehearsed speech.',
    ],
    technicalBrief: 'Prioritise natural spoken interaction over grammar recitation. Correct tense choice when it changes meaning or repeatedly damages naturalness.',
    globalCore: 'British and American variants are both valid. Use a balanced international-English approach and vary vocabulary/register naturally.',
    irelandOverlay: 'Use Dublin-life follow-ups when useful: housing, school, transport, services, neighbours, weather, work and family routines.',
    workedExample: 'Ask the learner for a 30–60 second real or plausible story, then probe one missing detail, one feeling/reaction and one consequence.',
    interviewAngle: 'Professional transfer: concise storytelling is also trained for behavioural interview examples, but the session must remain general-English-first.',
    vocabulary: ['follow-up question', 'natural phrasing', 'word stress', 'story arc', 'register'],
    practiceScenario: 'The learner describes an unexpected everyday event in Dublin and handles natural clarification questions from the Professor.',
  };
}

async function publishedTechnicalLesson(supabase: UntypedSupabaseClient, lessonId: string): Promise<TechnicalLesson | null> {
  const db = supabase as any;
  const { data: lesson, error: lessonError } = await db
    .from('lessons')
    .select('module_id,title,learning_objectives,technical_brief_pt,global_core_pt,ireland_overlay_pt,worked_example_pt,interview_angle_pt')
    .eq('id', lessonId)
    .maybeSingle();
  if (lessonError || !lesson?.module_id || typeof lesson.title !== 'string') return null;

  const { data: module, error: moduleError } = await db
    .from('modules')
    .select('course_id')
    .eq('id', lesson.module_id)
    .maybeSingle();
  if (moduleError || !module?.course_id) return null;

  const { data: course, error: courseError } = await db
    .from('courses')
    .select('learner_track')
    .eq('id', module.course_id)
    .maybeSingle();
  if (courseError || typeof course?.learner_track !== 'string') return null;

  const [{ data: terms }, { data: cases }] = await Promise.all([
    db.from('lesson_terms').select('term_en,definition_en').eq('lesson_id', lessonId).order('sequence').limit(8),
    db.from('cases').select('title,scenario_pt,prompt_pt').eq('lesson_id', lessonId).order('sequence').limit(1),
  ]);

  const vocabulary = (Array.isArray(terms) ? terms : [])
    .map((term: any) => {
      const label = clip(term?.term_en, 120);
      const definition = clip(term?.definition_en, 260);
      return label ? `${label}${definition ? ` — ${definition}` : ''}` : '';
    })
    .filter(Boolean)
    .slice(0, 8);
  const practice = Array.isArray(cases) ? cases[0] : null;
  const scenario = practice
    ? [clip(practice.title, 200), clip(practice.scenario_pt, 1800), clip(practice.prompt_pt, 900)].filter(Boolean).join(' — ')
    : '';

  return {
    track: course.learner_track,
    context: {
      title: clip(lesson.title, 300),
      objectives: stringList(lesson.learning_objectives),
      technicalBrief: clip(lesson.technical_brief_pt, 5000),
      globalCore: clip(lesson.global_core_pt, 3200),
      irelandOverlay: clip(lesson.ireland_overlay_pt, 3200),
      workedExample: clip(lesson.worked_example_pt, 2400),
      interviewAngle: clip(lesson.interview_angle_pt, 1800),
      vocabulary,
      practiceScenario: scenario,
    },
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
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const db = supabase as any;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return send(res, 401, { error: 'invalid_authentication' });

  const body = safeBody(req);
  const lessonId = safeLessonId(body?.lessonId);
  const track = typeof body?.track === 'string' && allowedTracks.has(body.track) ? body.track as ProfessorTrack : null;
  const mode = typeof body?.mode === 'string' && allowedModes.has(body.mode) ? body.mode : null;
  if (!body || !lessonId || !track || !mode) return send(res, 400, { error: 'invalid_professor_request' });

  const { data: learnerProfile, error: profileError } = await db
    .from('profiles')
    .select('learner_track')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profileError || !learnerProfile || !isProfessorTrackAllowed(learnerProfile.learner_track, track)) {
    return send(res, 403, { error: 'professor_track_forbidden' });
  }

  let lessonContext: LessonContext;
  if (requiresPublishedTechnicalLesson(track)) {
    const technicalLesson = await publishedTechnicalLesson(supabase as UntypedSupabaseClient, lessonId);
    if (!technicalLesson || technicalLesson.track !== track) return send(res, 403, { error: 'professor_lesson_forbidden' });
    lessonContext = technicalLesson.context;
  } else {
    lessonContext = englishGoldenLessonContext();
  }

  const professorProfile = profileForTrack(track);
  const languageProfile = normalizeLanguageProfile(body.languageProfile);
  const roomName = `lh-${randomUUID()}`;
  const participantIdentity = `learner-${randomUUID()}`;

  const jobMetadata = JSON.stringify({
    professorProfile,
    track,
    lessonId,
    mode,
    languageProfile,
    lessonContext,
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

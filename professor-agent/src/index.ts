import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { type JobContext, ServerOptions, cli, defineAgent, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { evaluateProfessorSession } from './evaluation.js';
import { professorInstructions, type ProfessorProfile } from './prompts.js';

dotenv.config({ path: '.env.local' });

const PROFESSOR_AGENT_NAME = process.env.LIVEKIT_PROFESSOR_AGENT_NAME || 'learning-hub-professor';
const PROFESSOR_ABSOLUTE_MAX_SESSION_SECONDS = 1200;

type ProfessorQualityTier = 'standard' | 'premium';
type CoachingIntensity = 'normal' | 'coach' | 'pressure';
type LessonContext = {
  title?: string;
  objectives?: string[];
  technicalBrief?: string;
  globalCore?: string;
  irelandOverlay?: string;
  workedExample?: string;
  interviewAngle?: string;
  vocabulary?: string[];
  practiceScenario?: string;
};

type ProfessorPersistenceMetadata = {
  sessionId?: string;
  callbackToken?: string;
  completionUrl?: string;
  publishableKey?: string;
};

type ProfessorJobMetadata = {
  professorProfile?: ProfessorProfile;
  track?: 'rafael_finance' | 'viviane_payroll' | 'english_academy';
  lessonId?: string;
  mode?: 'chapter_conversation' | 'case_feedback' | 'oral_mock' | 'english_drill' | 'general_conversation';
  qualityTier?: ProfessorQualityTier;
  budgetReservationId?: string;
  budgetReservationUsd?: number;
  globalAiCapUsd?: number;
  maxSessionSeconds?: number;
  languageProfile?: {
    preferredMix?: 'uk-us-mix';
    includeIrishExposure?: boolean;
    correctionMode?: 'immediate' | 'delayed' | 'minimal';
    professorEnglishSharePct?: number;
    supportLanguage?: 'pt-BR' | 'en';
  };
  lessonContext?: LessonContext;
  persistence?: ProfessorPersistenceMetadata;
};

type TranscriptTurn = {
  role: 'user' | 'assistant';
  text: string;
  interrupted: boolean;
};

type LearningMemoryContext = {
  priorSessions?: Array<{
    lessonTitle?: string;
    summary?: string;
    improvements?: string[];
    nextSessionFocus?: string[];
    scores?: Record<string, number | null>;
  }>;
  activeErrors?: Array<{
    domain?: string;
    pattern?: string;
    frequency?: number;
    confidence?: number;
  }>;
  competencyProfile?: Array<{
    name?: string;
    category?: string;
    score?: number;
    confidence?: number;
    evidenceCount?: number;
  }>;
  upcomingReviews?: Array<{
    stage?: string;
    dueDate?: string;
    status?: string;
    lessonTitle?: string;
  }>;
};

function defaultProfile(): ProfessorProfile {
  const value = process.env.DEFAULT_PROFESSOR_PROFILE;
  return value === 'payroll' || value === 'english' ? value : 'finance';
}

function sessionMetadata(ctx: JobContext): ProfessorJobMetadata {
  try {
    const value = JSON.parse(ctx.job.metadata || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as ProfessorJobMetadata : {};
  } catch {
    return {};
  }
}

function sessionProfile(metadata: ProfessorJobMetadata): ProfessorProfile {
  return metadata.professorProfile === 'finance' || metadata.professorProfile === 'payroll' || metadata.professorProfile === 'english'
    ? metadata.professorProfile
    : defaultProfile();
}

function sessionQualityTier(metadata: ProfessorJobMetadata): ProfessorQualityTier {
  return metadata.qualityTier === 'premium' ? 'premium' : 'standard';
}

function modelForQualityTier(qualityTier: ProfessorQualityTier): string {
  if (qualityTier === 'premium') {
    return process.env.OPENAI_REALTIME_MODEL_PREMIUM || 'gpt-realtime-2.1';
  }
  return process.env.OPENAI_REALTIME_MODEL_STANDARD || process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini';
}

function maxSessionSeconds(metadata: ProfessorJobMetadata): number {
  const requested = typeof metadata.maxSessionSeconds === 'number' && Number.isFinite(metadata.maxSessionSeconds)
    ? Math.round(metadata.maxSessionSeconds)
    : PROFESSOR_ABSOLUTE_MAX_SESSION_SECONDS;
  return Math.max(60, Math.min(PROFESSOR_ABSOLUTE_MAX_SESSION_SECONDS, requested));
}

function coachingIntensity(profile: ProfessorProfile, metadata: ProfessorJobMetadata): CoachingIntensity {
  if (metadata.mode === 'oral_mock') return 'pressure';
  if (metadata.mode === 'case_feedback') return profile === 'english' ? 'coach' : 'pressure';
  if (metadata.mode === 'english_drill' || metadata.mode === 'chapter_conversation') return 'coach';
  if (metadata.mode === 'general_conversation') return 'normal';
  return profile === 'english' ? 'normal' : 'coach';
}

function coachingGuidance(profile: ProfessorProfile, metadata: ProfessorJobMetadata): string {
  const intensity = coachingIntensity(profile, metadata);
  const level = intensity === 'pressure'
    ? `PRESSURE mode: simulate a demanding but fair high-stakes conversation. Interrupt vague or overlong reasoning when useful, challenge assumptions, ask for the conclusion first, change the angle unexpectedly, and require concise restatements. Do not become hostile or theatrical.`
    : intensity === 'coach'
      ? `COACH mode: be actively involved. Ask follow-ups instead of accepting first-pass answers, correct important errors quickly, ask for rephrasing, examples and causal links, and occasionally cut in when the learner circles the point. Aim for productive friction, not constant interruption.`
      : `NORMAL mode: keep the conversation warm and natural, but still behave like a real tutor. Clarify vague answers, make selective corrections, ask spontaneous follow-ups and occasionally request a second phrasing. Interrupt only when the learner is clearly overlong or stuck.`;

  const profileRule = profile === 'english'
    ? `English coaching: favour brief spoken recasts for meaningful or recurring errors. After a useful correction, sometimes ask the learner to repeat only the corrected phrase or sentence, then continue. If wording is understandable but unnatural, ask for another version before giving your own. Do not correct every minor error and do not treat valid UK/US variants as mistakes.`
    : profile === 'finance'
      ? `Finance coaching: if a technical assumption is questionable, stop the chain before it compounds. Ask the learner to defend the assumption, connect the accounting point to business impact, and periodically demand a 20–30 second executive answer.`
      : `Payroll coaching: if an explanation skips a control, dependency, employee impact or sequencing step, ask for the missing link. Use concise English reformulation practice for employee-facing explanations without confusing language accuracy with payroll accuracy.`;

  return `\nACTIVE COACHING MODE: ${intensity.toUpperCase()}.\n${level}\n${profileRule}\nThe learner may interrupt you naturally; keep your own spoken turns concise and responsive.`;
}

function languageGuidance(metadata: ProfessorJobMetadata): string {
  const language = metadata.languageProfile;
  if (!language) return '';
  const share = typeof language.professorEnglishSharePct === 'number'
    ? Math.max(35, Math.min(100, Math.round(language.professorEnglishSharePct)))
    : null;
  const support = language.supportLanguage === 'pt-BR' ? 'Brazilian Portuguese' : 'English';
  const correction = language.correctionMode ?? 'delayed';
  const exposure = language.includeIrishExposure === false ? 'not required' : 'deliberately included when natural';
  return `\nSession adaptation: ${share == null ? 'adapt English share to performance' : `aim for approximately ${share}% English`}. Support language is ${support}. Correction mode is ${correction}; even with delayed correction, a brief immediate recast is appropriate for a meaning-changing, target-skill or clearly recurring error. Irish exposure is ${exposure}.`;
}

function lessonGuidance(metadata: ProfessorJobMetadata): string {
  const lesson = metadata.lessonContext;
  if (!lesson?.title) return '';
  const lines = [
    `\nAUTHORITATIVE LESSON CONTEXT — use it to teach and question, but do not read it out as a source dump.`,
    `Lesson: ${lesson.title}`,
    lesson.objectives?.length ? `Objectives: ${lesson.objectives.join(' | ')}` : '',
    lesson.technicalBrief ? `Technical brief: ${lesson.technicalBrief}` : '',
    lesson.globalCore ? `Global/core context: ${lesson.globalCore}` : '',
    lesson.irelandOverlay ? `Ireland overlay: ${lesson.irelandOverlay}` : '',
    lesson.workedExample ? `Worked example: ${lesson.workedExample}` : '',
    lesson.interviewAngle ? `Professional/interview transfer: ${lesson.interviewAngle}` : '',
    lesson.vocabulary?.length ? `Useful vocabulary: ${lesson.vocabulary.join(' | ')}` : '',
    lesson.practiceScenario ? `Practice scenario: ${lesson.practiceScenario}` : '',
    `Teaching sequence: verify understanding, require retrieval, apply to a realistic scenario, challenge judgement, then finish with one concise take-away.`,
    `Never invent a current Irish rule or rate outside this supplied context.`,
  ];
  return `\n${lines.filter(Boolean).join('\n')}`;
}

async function loadLearningMemory(metadata: ProfessorJobMetadata): Promise<LearningMemoryContext | null> {
  const persistence = metadata.persistence;
  if (!persistence?.sessionId || !persistence.callbackToken || !persistence.completionUrl) return null;
  const url = persistence.completionUrl.replace(/professor-session-complete\/?$/, 'professor-memory-context');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  timeout.unref?.();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(persistence.publishableKey ? { apikey: persistence.publishableKey } : {}),
      },
      body: JSON.stringify({ sessionId: persistence.sessionId, callbackToken: persistence.callbackToken }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error('Professor learning memory unavailable', response.status);
      return null;
    }
    const value = await response.json() as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as LearningMemoryContext : null;
  } catch (cause) {
    console.error('Professor learning memory error', cause instanceof Error ? cause.message : 'unknown_error');
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function learningMemoryGuidance(memory: LearningMemoryContext | null): string {
  if (!memory) return '';
  const errors = (memory.activeErrors ?? [])
    .filter((item) => item.pattern)
    .slice(0, 4)
    .map((item) => `${item.domain ?? 'learning'}: ${item.pattern} (${Math.round(item.confidence ?? 0)}% confidence)`);
  const competencies = (memory.competencyProfile ?? [])
    .filter((item) => item.name && typeof item.score === 'number')
    .slice(0, 4)
    .map((item) => `${item.name}: ${Math.round(item.score ?? 0)}% from ${item.evidenceCount ?? 0} evidence item(s)`);
  const previousFocus = (memory.priorSessions ?? [])
    .flatMap((item) => item.nextSessionFocus ?? item.improvements ?? [])
    .filter(Boolean)
    .slice(0, 4);
  const dueReviews = (memory.upcomingReviews ?? [])
    .filter((item) => item.status === 'due')
    .slice(0, 3)
    .map((item) => `${item.stage ?? 'review'}: ${item.lessonTitle ?? 'adaptive review'}`);

  if (!errors.length && !competencies.length && !previousFocus.length && !dueReviews.length) return '';
  const lines = [
    `\nPRIVATE LEARNING MEMORY — use this silently to adapt the session. Never mention a database, stored profile, score table or memory system to the learner.`,
    errors.length ? `Recurring teachable patterns: ${errors.join(' | ')}` : '',
    competencies.length ? `Measured capabilities (still provisional when evidence is low): ${competencies.join(' | ')}` : '',
    previousFocus.length ? `Previous evaluator focus: ${previousFocus.join(' | ')}` : '',
    dueReviews.length ? `Due retrieval opportunities: ${dueReviews.join(' | ')}` : '',
    `Use at most one or two relevant memory signals naturally in this session. Prefer current-session evidence over historical scores. Do not overcorrect. If a prior weakness has improved, acknowledge the improvement naturally and move on.`,
  ];
  return `\n${lines.filter(Boolean).join('\n')}`;
}

function openingInstruction(profile: ProfessorProfile, metadata: ProfessorJobMetadata): string {
  const share = metadata.languageProfile?.professorEnglishSharePct;
  const lesson = metadata.lessonContext?.title ? ` The session topic is “${metadata.lessonContext.title}”.` : '';
  const intensity = coachingIntensity(profile, metadata);
  const tone = intensity === 'pressure' ? ' Set a demanding pace from the first question.' : intensity === 'coach' ? ' Be actively curious and ready to challenge the first answer.' : '';
  if (profile === 'payroll') {
    return `Cumprimente de forma breve e profissional.${lesson} Pergunte qual parte do cenário a aluna quer explicar primeiro. Use English progressively according to the session language target.${tone}`;
  }
  if (profile === 'english') {
    return typeof share === 'number' && share < 70
      ? `Greet the learner with accessible natural English.${lesson} Ask one open question that immediately starts the task. Keep the first turn short and allow brief Portuguese support only if needed.${tone}`
      : `Greet the learner naturally.${lesson} Start with one open question that immediately starts the task. Do not sound like an exam.${tone}`;
  }
  return `Greet the learner briefly as a senior finance coach.${lesson} Ask for a concise explanation of the central issue before giving any teaching.${tone}`;
}

function transcriptTurnFromItem(item: any): TranscriptTurn | null {
  if (!item || item.type !== 'message') return null;
  const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
  const text = typeof item.textContent === 'string' ? item.textContent.trim() : '';
  if (!role || !text) return null;
  return {
    role,
    text: text.slice(0, 4000),
    interrupted: Boolean(item.interrupted),
  };
}

function historyTranscript(session: any): TranscriptTurn[] {
  const items = Array.isArray(session?.history?.items) ? session.history.items : [];
  return items.map(transcriptTurnFromItem).filter((item: TranscriptTurn | null): item is TranscriptTurn => Boolean(item)).slice(0, 200);
}

function safeJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value, (_key, inner) => typeof inner === 'bigint' ? Number(inner) : inner));
  } catch {
    return [];
  }
}

function mergeStreamingTranscript(current: string, next: string): string {
  const a = current.trim();
  const b = next.trim();
  if (!b) return a;
  if (!a) return b;
  if (b.startsWith(a)) return b;
  if (a.endsWith(b)) return a;
  return `${a} ${b}`.replace(/\s+/g, ' ').slice(-1800);
}

function spokenWordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function interruptionThresholdWords(profile: ProfessorProfile, intensity: CoachingIntensity): number {
  if (intensity === 'pressure') return 48;
  if (intensity === 'coach') return profile === 'english' ? 58 : 66;
  return 88;
}

function maxMidTurnInterruptions(intensity: CoachingIntensity): number {
  if (intensity === 'pressure') return 3;
  if (intensity === 'coach') return 2;
  return 1;
}

function interruptionLead(profile: ProfessorProfile, intensity: CoachingIntensity): string {
  if (profile === 'english') {
    if (intensity === 'pressure') return `Stop there for a second. Start that answer again: main point first, in about twenty seconds.`;
    if (intensity === 'coach') return `Can I stop you there? Give me the same point again in one or two clearer, more natural sentences.`;
    return `Hang on a second. Give me the main point again, a little more simply.`;
  }
  if (profile === 'payroll') {
    if (intensity === 'pressure') return `Let me stop you there. Give me the decision or control point first, then one reason.`;
    return `Can I pause you there? What is the key payroll point? Give me that first, then the supporting step.`;
  }
  if (intensity === 'pressure') return `Stop there. Give me the conclusion first, then the single reason that matters most.`;
  if (intensity === 'coach') return `Let me stop you there. What is the core point? Give me the executive answer first.`;
  return `Can I pause you there? Give me the main conclusion first.`;
}

async function postProfessorCallback(url: string, publishableKey: string | undefined, body: Record<string, unknown>, label: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  timeout.unref?.();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(publishableKey ? { apikey: publishableKey } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`${label} failed`, response.status, await response.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (cause) {
    console.error(`${label} error`, cause instanceof Error ? cause.message : 'unknown_error');
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function persistSessionCompletion(
  metadata: ProfessorJobMetadata,
  transcript: TranscriptTurn[],
  session: any,
  startedAt: number,
  closeReason: string,
  realtimeModel: string,
): Promise<void> {
  const persistence = metadata.persistence;
  if (!persistence?.sessionId || !persistence.callbackToken || !persistence.completionUrl) return;

  const turns = transcript.length > 0 ? transcript.slice(0, 200) : historyTranscript(session);
  const modelUsage = safeJson(session?.usage?.modelUsage ?? []);
  const durationSeconds = Math.max(0, Math.min(PROFESSOR_ABSOLUTE_MAX_SESSION_SECONDS, Math.round((Date.now() - startedAt) / 1000)));
  const evaluation = await evaluateProfessorSession(turns, {
    track: metadata.track,
    mode: metadata.mode,
    professorProfile: metadata.professorProfile,
    lessonContext: metadata.lessonContext,
  });

  const callbackBody = {
    sessionId: persistence.sessionId,
    callbackToken: persistence.callbackToken,
    transcript: turns,
    modelUsage,
    durationSeconds,
    closeReason: closeReason.slice(0, 120),
    evaluation,
  };

  await postProfessorCallback(
    persistence.completionUrl,
    persistence.publishableKey,
    callbackBody,
    'Professor session completion callback',
  );

  const settlementUrl = persistence.completionUrl.replace(/professor-session-complete\/?$/, 'professor-usage-settle');
  await postProfessorCallback(
    settlementUrl,
    persistence.publishableKey,
    {
      sessionId: persistence.sessionId,
      callbackToken: persistence.callbackToken,
      modelUsage,
      realtimeModel,
      evaluation,
    },
    'Professor usage settlement callback',
  );
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const metadata = sessionMetadata(ctx);
    const profile = sessionProfile(metadata);
    const qualityTier = sessionQualityTier(metadata);
    const model = modelForQualityTier(qualityTier);
    const voiceName = process.env.OPENAI_REALTIME_VOICE || 'marin';
    const sessionLimitSeconds = maxSessionSeconds(metadata);
    const intensity = coachingIntensity(profile, metadata);
    const startedAt = Date.now();
    const transcript: TranscriptTurn[] = [];
    let closeReason = 'session_closed';
    let persistencePromise: Promise<void> | null = null;
    let sessionTimer: ReturnType<typeof setTimeout> | null = null;
    let partialUserTranscript = '';
    let midTurnInterruptions = 0;
    let midTurnInterrupting = false;
    let lastMidTurnInterruptAt = 0;
    const learningMemory = await loadLearningMemory(metadata);

    const agent = voice.Agent.create({
      instructions: `${professorInstructions(profile)}${coachingGuidance(profile, metadata)}${languageGuidance(metadata)}${lessonGuidance(metadata)}${learningMemoryGuidance(learningMemory)}`,
    });

    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({
        model,
        voice: voiceName,
      }),
    });

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (event: any) => {
      const turn = transcriptTurnFromItem(event?.item);
      if (turn && transcript.length < 200) transcript.push(turn);
    });

    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event: any) => {
      const spoken = typeof event?.transcript === 'string' ? event.transcript.trim() : '';
      if (!spoken) return;
      if (event?.isFinal) {
        partialUserTranscript = '';
        return;
      }

      partialUserTranscript = mergeStreamingTranscript(partialUserTranscript, spoken);
      const threshold = interruptionThresholdWords(profile, intensity);
      const cooldownMs = intensity === 'pressure' ? 18000 : 26000;
      const now = Date.now();
      if (spokenWordCount(partialUserTranscript) < threshold) return;
      if (midTurnInterrupting || midTurnInterruptions >= maxMidTurnInterruptions(intensity)) return;
      if (now - lastMidTurnInterruptAt < cooldownMs) return;

      partialUserTranscript = '';
      midTurnInterrupting = true;
      midTurnInterruptions += 1;
      lastMidTurnInterruptAt = now;

      void (async () => {
        try {
          await session.say(interruptionLead(profile, intensity), { allowInterruptions: false });
        } catch (cause) {
          console.error('Professor mid-turn coaching interruption failed', cause instanceof Error ? cause.message : 'unknown_error');
        } finally {
          midTurnInterrupting = false;
        }
      })();
    });

    const persistOnce = () => {
      if (!persistencePromise) {
        persistencePromise = persistSessionCompletion(metadata, transcript, session, startedAt, closeReason, model);
      }
      return persistencePromise;
    };

    session.on(voice.AgentSessionEventTypes.Close, (event: any) => {
      closeReason = typeof event?.reason === 'string' ? event.reason : 'session_closed';
      void persistOnce();
    });

    ctx.addShutdownCallback(async () => {
      if (sessionTimer) clearTimeout(sessionTimer);
      await persistOnce();
    });

    await ctx.connect();
    await session.start({
      agent,
      room: ctx.room,
    });

    sessionTimer = setTimeout(() => {
      closeReason = 'professor_session_time_limit';
      session.shutdown({ drain: true, reason: 'professor_session_time_limit' });
      void ctx.deleteRoom().catch(() => undefined);
    }, sessionLimitSeconds * 1000);
    sessionTimer.unref?.();

    await session.generateReply({
      instructions: openingInstruction(profile, metadata),
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: PROFESSOR_AGENT_NAME,
  }),
);

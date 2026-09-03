import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { type JobContext, ServerOptions, cli, defineAgent, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { professorInstructions, type ProfessorProfile } from './prompts.js';

dotenv.config({ path: '.env.local' });

const PROFESSOR_AGENT_NAME = process.env.LIVEKIT_PROFESSOR_AGENT_NAME || 'learning-hub-professor';

type ProfessorJobMetadata = {
  professorProfile?: ProfessorProfile;
  track?: 'rafael_finance' | 'viviane_payroll' | 'english_academy';
  lessonId?: string;
  mode?: 'chapter_conversation' | 'case_feedback' | 'oral_mock' | 'english_drill' | 'general_conversation';
  languageProfile?: {
    preferredMix?: 'uk-us-mix';
    includeIrishExposure?: boolean;
    correctionMode?: 'immediate' | 'delayed' | 'minimal';
    professorEnglishSharePct?: number;
    supportLanguage?: 'pt-BR' | 'en';
  };
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

function languageGuidance(metadata: ProfessorJobMetadata): string {
  const language = metadata.languageProfile;
  if (!language) return '';
  const share = typeof language.professorEnglishSharePct === 'number'
    ? Math.max(35, Math.min(100, Math.round(language.professorEnglishSharePct)))
    : null;
  const support = language.supportLanguage === 'pt-BR' ? 'Brazilian Portuguese' : 'English';
  const correction = language.correctionMode ?? 'delayed';
  const exposure = language.includeIrishExposure === false ? 'not required' : 'deliberately included when natural';
  return `\nSession adaptation: ${share == null ? 'adapt English share to performance' : `aim for approximately ${share}% English`}. Support language is ${support}. Correction mode is ${correction}. Irish exposure is ${exposure}.`;
}

function openingInstruction(profile: ProfessorProfile, metadata: ProfessorJobMetadata): string {
  const share = metadata.languageProfile?.professorEnglishSharePct;
  if (profile === 'payroll') {
    return 'Cumprimente de forma breve e profissional. Pergunte qual parte do cenário de payroll a aluna quer explicar primeiro. Use English progressively according to the session language target.';
  }
  if (profile === 'english') {
    return typeof share === 'number' && share < 70
      ? 'Greet the learner with accessible natural English, then ask one open everyday-life question. Keep the first turn short and allow brief Portuguese support only if needed.'
      : 'Greet the learner naturally and start with one open everyday-life question. Do not sound like an exam.';
  }
  return 'Greet the learner briefly as a senior finance coach and ask for a concise explanation of today’s case or lesson objective.';
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const metadata = sessionMetadata(ctx);
    const profile = sessionProfile(metadata);
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
    const voiceName = process.env.OPENAI_REALTIME_VOICE || 'marin';

    const agent = voice.Agent.create({
      instructions: `${professorInstructions(profile)}${languageGuidance(metadata)}`,
    });

    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({
        model,
        voice: voiceName,
      }),
    });

    await ctx.connect();
    await session.start({
      agent,
      room: ctx.room,
    });

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

import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { type JobContext, ServerOptions, cli, defineAgent, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { professorInstructions, type ProfessorProfile } from './prompts.js';

dotenv.config({ path: '.env.local' });

function defaultProfile(): ProfessorProfile {
  const value = process.env.DEFAULT_PROFESSOR_PROFILE;
  return value === 'payroll' || value === 'english' ? value : 'finance';
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const profile = defaultProfile();
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
    const voiceName = process.env.OPENAI_REALTIME_VOICE || 'marin';

    const agent = voice.Agent.create({
      instructions: professorInstructions(profile),
    });

    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({
        model,
        voice: voiceName,
      }),
    });

    await session.start({
      agent,
      room: ctx.room,
    });

    await ctx.connect();

    await session.generateReply({
      instructions:
        profile === 'payroll'
          ? 'Cumprimente de forma breve e profissional. Pergunte qual parte do cenário de payroll a aluna quer explicar primeiro.'
          : profile === 'english'
            ? 'Greet the learner naturally and start with one open everyday-life question. Do not sound like an exam.'
            : 'Greet the learner briefly as a senior finance coach and ask for a concise explanation of today’s case or lesson objective.',
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
  }),
);

import { createHash } from 'node:crypto';
import type { LessonModule } from '../src/learning/lessonModules.js';
import type { StudyPack, StudyTrack } from '../src/learning/teachingPacks.js';

export const WRITTEN_CONTEXT_VERSION = 'written-foundation-2026-09-13-v1';
export const MAX_WRITTEN_CONTEXT_BYTES = 24000;
export const MAX_SHARED_BRIEF_CHARACTERS = 14000;
export type WrittenLessonContext = {
  title: string; objectives: string[]; technicalBrief: string;
  workedExample: string; practiceScenario: string; interviewAngle: string; vocabulary: string[];
};
export type WrittenContextInput = {
  profileTrack: unknown; requestedTrack: string;
  requestedLessonId: string; resolvedLessonId: string;
};
const tracks: Readonly<Record<string, StudyTrack>> = {
  rafael_finance: 'finance', viviane_payroll: 'payroll', english_academy: 'english',
};
const supportedProfiles = new Set(['rafael_finance', 'viviane_payroll']);
const sourceHosts = new Set(['www.ifrs.org', 'www.frc.org.uk', 'www.revenue.ie', 'learnenglish.britishcouncil.org']);

/** The caller supplies server-imported registries only, NEVER a browser body or learner draft. */
export function buildWrittenLessonContext(
  input: WrittenContextInput,
  modules: Readonly<Record<StudyTrack, LessonModule>>,
  packs: Readonly<Record<StudyTrack, StudyPack>>,
) {
  if (typeof input.profileTrack !== 'string' || !supportedProfiles.has(input.profileTrack)
      || (input.requestedTrack !== 'english_academy' && input.requestedTrack !== input.profileTrack)) {
    throw new Error('written_context_track_forbidden');
  }
  const studyTrack = tracks[input.requestedTrack];
  const module = studyTrack ? modules[studyTrack] : null;
  const pack = studyTrack ? packs[studyTrack] : null;
  if (!module || !pack) return null;
  // Do not attach one lesson's answer key to another resolved/requested lesson.
  const matchesRequest = input.requestedLessonId === module.lessonId
    || (studyTrack === 'english' && input.requestedLessonId === 'english-golden-lesson');
  if (!matchesRequest || input.resolvedLessonId !== module.lessonId) return null;
  if (module.track !== studyTrack || pack.track !== studyTrack || pack.lessonId !== module.lessonId) {
    throw new Error('written_context_registry_mismatch');
  }
  for (const source of module.sources) {
    const url = new URL(source.url);
    if (url.protocol !== 'https:' || !sourceHosts.has(url.hostname) || url.username || url.password) {
      throw new Error('written_context_source_invalid');
    }
  }
  const scope = [
    `SERVER-AUTHORED WRITTEN LESSON REFERENCE (${WRITTEN_CONTEXT_VERSION}).`,
    module.scope,
    'These are reference explanations and fictional exercises, NOT statements made by the learner.',
    'The learner may not have read this page or attempted its exercises. No local drafts, answers, scores or browsing history are supplied.',
    'Ask before assuming prior completion. Do not count the model responses below as demonstrated learner evidence.',
    'For teaching: use one relevant example or question at a time; do not read this source packet aloud or reveal the entire answer before a learner attempt.',
    'For assessment: assess only what the learner actually says. Alternative correct wording is valid. This packet does not justify acoustic or pronunciation judgments from text.',
    'Fictional amounts must never be converted into current payroll rates or universal accounting rules. Retain the stated assumptions.',
  ].join('\n');
  const sections = module.sections.map(section =>
    `${section.title}\n${section.paragraphs.join('\n')}\nSource references: ${section.sourceIds.join(', ') || 'original teaching guidance'}`,
  ).join('\n\n');
  const caseReference = [
    'AUTHORED CASE REFERENCE — not a learner answer:',
    module.caseStudy.title, ...module.caseStudy.scenario,
    `Task: ${module.caseStudy.task}`,
    `Model response for teacher/evaluator reference only: ${module.caseStudy.modelAnswer}`,
    `Review criteria: ${module.caseStudy.reviewChecks.join(' | ')}`,
  ].join('\n');
  const references = module.sources.map(source =>
    `${source.id}: ${source.label}; reviewed ${source.reviewedOn}; ${source.url}; supports: ${source.supports}`,
  ).join('\n');
  // The deployed evaluator reads technicalBrief but not workedExample/practiceScenario.
  // Put the common scope, explanations, case facts AND reference criteria into this shared field.
  const technicalBrief = [scope, sections, caseReference, `OFFICIAL SOURCE REFERENCES\n${references}`].join('\n\n');
  const context: WrittenLessonContext = {
    title: module.title,
    objectives: [module.goal, ...pack.skills.map(skill => `Apply: ${skill}`)],
    technicalBrief,
    workedExample: [pack.example.title, pack.example.assumptions, ...pack.example.steps].join('\n'),
    practiceScenario: [module.caseStudy.title, ...module.caseStudy.scenario, `Task: ${module.caseStudy.task}`].join('\n'),
    interviewAngle: `${module.caseStudy.transfer}\n${pack.transfer}`,
    vocabulary: module.terms.map(term => `${term.term}: ${term.meaning}`),
  };
  const encoded = JSON.stringify(context);
  const contextBytes = Buffer.byteLength(encoded, 'utf8');
  if (technicalBrief.length > MAX_SHARED_BRIEF_CHARACTERS || contextBytes > MAX_WRITTEN_CONTEXT_BYTES) {
    // Fail before any reservation/dispatch rather than silently clipping assumptions or evidence.
    throw new Error('written_context_exceeds_budget');
  }
  const descriptor = {
    version: WRITTEN_CONTEXT_VERSION, lessonId: module.lessonId, track: studyTrack,
    source: 'server-authored-written-module',
    sha256: createHash('sha256').update(encoded).digest('hex'),
    contextBytes, includesLearnerDrafts: false,
  } as const;
  return { context, descriptor };
}

import { DEFAULT_LANGUAGE_EXPOSURE } from './adaptiveEngine';

export type CefrBand = 'A2' | 'A2+' | 'B1' | 'B1+' | 'B2' | 'B2+' | 'C1' | 'C1+';
export type EnglishSkill =
  | 'conversation'
  | 'listening'
  | 'reading'
  | 'grammar'
  | 'vocabulary'
  | 'pronunciation'
  | 'writing'
  | 'professional';

export type ProfessorMode =
  | 'free-conversation'
  | 'british-session'
  | 'american-session'
  | 'international-meeting'
  | 'dublin-life'
  | 'debate'
  | 'storytelling'
  | 'interview';

export type WeeklyEnglishSession = {
  day: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  primarySkills: EnglishSkill[];
  minutes: number;
  optional?: boolean;
};

export const ENGLISH_ACADEMY_PRINCIPLES = {
  exposure: DEFAULT_LANGUAGE_EXPOSURE,
  generalEnglishMustRemainProminent: true,
  acceptsBritishAndAmericanVariants: true,
  dublinProfessionalWritingPreference: 'uk-irish' as const,
  copyrightedBookPolicy: 'assign-external-units-never-copy-proprietary-exercises' as const,
  correctionModes: ['immediate', 'delayed', 'minimal'] as const,
};

export const DEFAULT_WEEK: WeeklyEnglishSession[] = [
  { day: 1, title: 'Grammar into speech', primarySkills: ['grammar', 'conversation'], minutes: 12 },
  { day: 2, title: 'Real listening + reaction', primarySkills: ['listening', 'conversation'], minutes: 12 },
  { day: 3, title: 'Reading, vocabulary & oral summary', primarySkills: ['reading', 'vocabulary', 'conversation'], minutes: 12 },
  { day: 4, title: 'Professor conversation', primarySkills: ['conversation', 'pronunciation'], minutes: 15 },
  { day: 5, title: 'Writing, rewrite & weekly retrieval', primarySkills: ['writing', 'grammar', 'vocabulary'], minutes: 15 },
  { day: 6, title: 'Film, podcast or open conversation', primarySkills: ['listening', 'conversation'], minutes: 25, optional: true },
];

export const PROFESSOR_MODES: Array<{ mode: ProfessorMode; purpose: string }> = [
  { mode: 'free-conversation', purpose: 'Sustain natural everyday conversation across unpredictable themes.' },
  { mode: 'british-session', purpose: 'Increase comprehension of British vocabulary, rhythm and pragmatic choices.' },
  { mode: 'american-session', purpose: 'Increase comprehension of American vocabulary, rhythm and pragmatic choices.' },
  { mode: 'international-meeting', purpose: 'Practise clear multinational English without overfitting to one accent.' },
  { mode: 'dublin-life', purpose: 'Handle housing, school, services, neighbours, appointments and everyday Ireland.' },
  { mode: 'debate', purpose: 'Defend an opinion, disagree naturally and respond under pressure.' },
  { mode: 'storytelling', purpose: 'Build narrative fluency, tense control, rhythm and follow-up interaction.' },
  { mode: 'interview', purpose: 'Practise professional interviews with concise evidence-based answers.' },
];

export type LearnerEnglishProfile = {
  cefr: CefrBand;
  targetCefr: CefrBand;
  weakSkills: EnglishSkill[];
  recurringErrors: string[];
  preferredCorrectionMode: 'immediate' | 'delayed' | 'minimal';
  professorEnglishSharePct: number;
};

export function nextProfessorEnglishShare(profile: LearnerEnglishProfile, latestOverallScore: number): number {
  const step = latestOverallScore >= 80 ? 8 : latestOverallScore >= 70 ? 4 : latestOverallScore < 60 ? -5 : 0;
  return Math.max(35, Math.min(100, profile.professorEnglishSharePct + step));
}

export function shouldIncreaseChallenge(latestScores: number[]): boolean {
  if (latestScores.length < 3) return false;
  const recent = latestScores.slice(-3);
  return recent.every((score) => score >= 78) && recent.reduce((a, b) => a + b, 0) / recent.length >= 82;
}

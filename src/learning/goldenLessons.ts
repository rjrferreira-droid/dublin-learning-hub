export type GoldenLessonKey = 'finance-reporting' | 'payroll-gross-to-net' | 'english-explaining-problems';

export type GoldenLessonDefinition = {
  key: GoldenLessonKey;
  track: 'finance' | 'payroll' | 'english';
  learner: 'Rafael' | 'Viviane' | 'Rafael & Viviane';
  title: string;
  durationMinutes: number;
  publishedLessonId?: string;
  learningObjective: string;
  professorGoal: string;
  evaluationDimensions: string[];
};

export const GOLDEN_LESSONS: Record<GoldenLessonKey, GoldenLessonDefinition> = {
  'finance-reporting': {
    key: 'finance-reporting',
    track: 'finance',
    learner: 'Rafael',
    title: 'IFRS 18, Group Reporting & Irish Statutory Accounts',
    durationMinutes: 15,
    publishedLessonId: '15358b9f-01e0-4c3b-afad-07a493b961f5f',
    learningObjective: 'Connect group reporting, statutory reporting and management judgement in an Irish multinational context.',
    professorGoal: 'Challenge Rafael to brief a Regional CFO concisely and defend reporting judgements.',
    evaluationDimensions: ['Technical Accuracy', 'Judgement', 'Structure', 'Professional English'],
  },
  'payroll-gross-to-net': {
    key: 'payroll-gross-to-net',
    track: 'payroll',
    learner: 'Viviane',
    title: 'Gross-to-Net: RPN, PAYE, USC & PRSI',
    durationMinutes: 15,
    publishedLessonId: '3ea8155e-a952-4039-87dc-1dd42851f16e',
    learningObjective: 'Explain and operate the core Irish gross-to-net payroll flow using current Revenue concepts.',
    professorGoal: 'Use patient payroll scenarios, gradually increasing English while checking technical accuracy.',
    evaluationDimensions: ['Payroll Accuracy', 'Vocabulary', 'Grammar', 'Fluency', 'Professional Communication'],
  },
  'english-explaining-problems': {
    key: 'english-explaining-problems',
    track: 'english',
    learner: 'Rafael & Viviane',
    title: 'Explaining a problem clearly in everyday life',
    durationMinutes: 15,
    learningObjective: 'Describe a real-life problem clearly, sequence events and respond naturally to follow-up questions.',
    professorGoal: 'Run a realistic Dublin-life conversation while accepting UK and US variants and testing Irish listening exposure.',
    evaluationDimensions: ['Grammar', 'Vocabulary', 'Fluency', 'Pronunciation', 'Interaction', 'Naturalness'],
  },
};

export function publishedGoldenLessons(): GoldenLessonDefinition[] {
  return Object.values(GOLDEN_LESSONS).filter((lesson) => Boolean(lesson.publishedLessonId));
}

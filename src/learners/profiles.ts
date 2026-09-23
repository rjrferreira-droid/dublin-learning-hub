import type { CefrBand, LearnerEnglishProfile } from '../learning/englishAcademy';

export type LearnerKey = 'rafael' | 'viviane';

export type LearningProfile = {
  key: LearnerKey;
  displayName: string;
  initials: string;
  primaryTrack: 'rafael_finance' | 'viviane_payroll';
  destinationRoles: string[];
  english: LearnerEnglishProfile & {
    placementStatus: 'provisional' | 'assessed';
    curriculumMix: {
      everydayPct: number;
      professionalPct: number;
      professionalLabel: string;
      professionalDomains: readonly string[];
    };
  };
  professor: {
    defaultLanguage: 'pt-BR' | 'en';
    style: string;
    technicalFocus: string[];
  };
};

const englishProfile = (
  cefr: CefrBand,
  targetCefr: CefrBand,
  professorEnglishSharePct: number,
  weakSkills: LearnerEnglishProfile['weakSkills'],
  curriculumMix: LearningProfile['english']['curriculumMix'],
): LearningProfile['english'] => ({
  cefr,
  targetCefr,
  weakSkills,
  recurringErrors: [],
  preferredCorrectionMode: 'delayed',
  professorEnglishSharePct,
  placementStatus: 'provisional',
  curriculumMix,
});

export const LEARNER_PROFILES: Record<LearnerKey, LearningProfile> = {
  rafael: {
    key: 'rafael',
    displayName: 'Rafael',
    initials: 'RF',
    primaryTrack: 'rafael_finance',
    destinationRoles: [
      'Financial Controller',
      'Senior Finance Manager',
      'Regional Finance Manager',
      'Commercial Finance',
      'Senior Finance Business Partner',
      'Finance Transformation',
    ],
    english: englishProfile('B2+', 'C1+', 85, ['pronunciation', 'conversation', 'professional'], {
      everydayPct: 50,
      professionalPct: 50,
      professionalLabel: 'technical',
      professionalDomains: ['finance', 'accounting', 'tax', 'payroll', 'treasury', 'contracts and compliance'],
    }),
    professor: {
      defaultLanguage: 'en',
      style: 'Executive, challenging, concise and evidence-driven.',
      technicalFocus: ['Irish/EMEA finance', 'statutory reporting', 'treasury', 'FP&A', 'governance', 'SAP', 'leadership', 'business partnering'],
    },
  },
  viviane: {
    key: 'viviane',
    displayName: 'Viviane',
    initials: 'VF',
    primaryTrack: 'viviane_payroll',
    destinationRoles: ['Payroll Specialist', 'Irish Payroll', 'HR Operations'],
    english: englishProfile('B1+', 'B2+', 55, ['conversation', 'listening', 'grammar', 'pronunciation'], {
      everydayPct: 80,
      professionalPct: 20,
      professionalLabel: 'Payroll/People Ops',
      professionalDomains: ['payroll', 'Departamento Pessoal', 'People Operations', 'benefits', 'onboarding and offboarding', 'employee service'],
    }),
    professor: {
      defaultLanguage: 'pt-BR',
      style: 'Patient and supportive, but progressively less accommodating as fluency improves.',
      technicalFocus: ['PAYE', 'USC', 'PRSI', 'Revenue', 'RPN', 'payroll operations', 'controls', 'professional English'],
    },
  },
};

export function getLearnerProfile(key: LearnerKey): LearningProfile {
  return LEARNER_PROFILES[key];
}

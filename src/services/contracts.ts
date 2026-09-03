export type LearnerTrack = 'rafael_finance' | 'viviane_payroll' | 'english_academy';

export type ReviewInterval = 'D+1' | 'D+7' | 'D+30' | 'D+90';

export type CompetencySignal = {
  competencyId: string;
  label: string;
  score: number;
  priority: boolean;
};

export type ErrorBankItem = {
  id: string;
  learnerId: string;
  domain: 'technical' | 'grammar' | 'vocabulary' | 'pronunciation' | 'fluency' | 'register';
  pattern: string;
  confidence: number;
  frequency?: number;
  status?: 'active' | 'mastered' | 'archived';
  lastSeenAt: string;
  nextReviewAt: string;
};

export type TutorLanguageProfile = {
  preferredMix: 'uk-us-mix';
  includeIrishExposure: boolean;
  correctionMode: 'immediate' | 'delayed' | 'minimal';
  professorEnglishSharePct?: number;
  supportLanguage?: 'pt-BR' | 'en';
};

export type TutorSessionRequest = {
  lessonId: string;
  learnerId: string;
  track: LearnerTrack;
  mode: 'chapter_conversation' | 'case_feedback' | 'oral_mock' | 'english_drill' | 'general_conversation';
  languageProfile?: TutorLanguageProfile;
};

export type TutorSessionResult = {
  sessionId: string;
  provider: 'livekit-openai';
  roomToken?: string;
  roomUrl?: string;
};

export type EvaluationResult = {
  technicalAccuracy?: number;
  judgement?: number;
  grammar?: number;
  vocabulary?: number;
  fluency?: number;
  pronunciation?: number;
  professionalCommunication?: number;
  overall: number;
  strengths: string[];
  priorities: string[];
  retryPrompt?: string;
};

export interface ProfessorService {
  startSession(request: TutorSessionRequest): Promise<TutorSessionResult>;
  endSession(sessionId: string): Promise<void>;
}

export interface EvaluationService {
  evaluateSession(sessionId: string): Promise<EvaluationResult>;
}

export interface PremiumAudioService {
  getOrCreateLessonAudio(lessonId: string): Promise<{ audioUrl: string; cached: boolean; estimatedCostUsd?: number }>;
}

export interface PronunciationService {
  assess(input: { transcript: string; audioRef: string }): Promise<{ accuracy: number; fluency: number; prosody?: number; feedback: string[] }>;
}

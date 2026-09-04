export type FeatureKey =
  | 'premiumAudio'
  | 'professor'
  | 'independentEvaluation'
  | 'errorBank'
  | 'adaptiveCurriculum'
  | 'englishAcademy'
  | 'pronunciationAssessment';

export type FeatureFlags = Record<FeatureKey, boolean>;

function envFlag(name: string, fallback: boolean): boolean {
  const value = import.meta.env[name];
  if (value == null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

/**
 * V2 safety boundary: expensive or failure-prone services can be switched off
 * without taking down core learning/navigation.
 */
export const featureFlags: FeatureFlags = {
  premiumAudio: envFlag('VITE_FEATURE_PREMIUM_AUDIO', true),
  professor: envFlag('VITE_FEATURE_PROFESSOR', true),
  independentEvaluation: envFlag('VITE_FEATURE_EVALUATION', true),
  errorBank: envFlag('VITE_FEATURE_ERROR_BANK', true),
  adaptiveCurriculum: envFlag('VITE_FEATURE_ADAPTIVE_CURRICULUM', true),
  englishAcademy: envFlag('VITE_FEATURE_ENGLISH_ACADEMY', true),
  pronunciationAssessment: envFlag('VITE_FEATURE_PRONUNCIATION', false),
};

export function isFeatureEnabled(key: FeatureKey): boolean {
  return featureFlags[key];
}

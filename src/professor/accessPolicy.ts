import type { LearnerTrack } from '../services/contracts';

export type ProfileLearnerTrack = 'rafael_finance' | 'viviane_payroll';

export function isKnownProfileTrack(value: unknown): value is ProfileLearnerTrack {
  return value === 'rafael_finance' || value === 'viviane_payroll';
}

export function isProfessorTrackAllowed(profileTrack: unknown, requestedTrack: LearnerTrack): boolean {
  if (!isKnownProfileTrack(profileTrack)) return false;
  if (requestedTrack === 'english_academy') return true;
  return profileTrack === requestedTrack;
}

export function requiresPublishedTechnicalLesson(track: LearnerTrack): boolean {
  return track !== 'english_academy';
}

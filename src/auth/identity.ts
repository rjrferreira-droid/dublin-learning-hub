export type AccountLearnerKey = 'rafael' | 'viviane';
export type AccountTrack = 'rafael_finance' | 'viviane_payroll';

/** Presentation helpers only; backend authentication/RLS remain authoritative. */
export function learnerKeyFromTrack(track: unknown): AccountLearnerKey | null {
  if (track === 'rafael_finance') return 'rafael';
  if (track === 'viviane_payroll') return 'viviane';
  return null;
}

export function canUseLearnerActions(account: unknown, displayed: unknown, track: unknown): boolean {
  if ((account !== 'rafael' && account !== 'viviane') || account !== displayed) return false;
  return track === 'english' || (track === 'finance' && account === 'rafael') || (track === 'payroll' && account === 'viviane');
}

/** Optional only for compatibility with the existing V2 client, which omits this field. */
export function requestedLearnerMatchesAccount(profileTrack: unknown, requestedLearner: unknown): boolean {
  const account = learnerKeyFromTrack(profileTrack);
  return account !== null && (requestedLearner === undefined || requestedLearner === account);
}

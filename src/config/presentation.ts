// The archived technical courses remain in storage and source control, but are
// excluded from the active language portal. This does not erase learner history.
export const presentation = { showPayroll: false, showManuLauncher: false };
export function isTrackVisible(track: string): boolean {
  return track === 'english' || track === 'spanish';
}
export function primaryVisibleTrack(_learner: string): 'finance' | 'payroll' | 'english' {
  return 'english';
}

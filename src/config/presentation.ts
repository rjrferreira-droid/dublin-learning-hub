// Presentation only: does not change accounts, permissions, content or history.
// Restore either switch to show the corresponding area again.
export const presentation = { showPayroll: true, showManuLauncher: false };
export function isTrackVisible(track: string): boolean {
  return track !== 'payroll' || presentation.showPayroll;
}
export function primaryVisibleTrack(learner: string): 'finance' | 'payroll' | 'english' {
  return learner === 'viviane' ? 'payroll' : 'finance';
}

/** Exact original lessons admitted to the protected authored-audio pipeline.
 * Payroll remains on standby. Sequence/slug alone never grants admission. */
export const GOLDEN_AUDIO_LESSONS = Object.freeze({
  finance: Object.freeze({lessonId:'b3639582-3c32-4147-a4b3-84237d11a66e',
    lessonSlug:'ifrs-18-group-reporting-irish-statutory',requestedTrack:'rafael_finance'}),
  english: Object.freeze({lessonId:'f455a740-f50f-4eb7-95a7-9e4129ca4a68',
    lessonSlug:'story-past-forms-rhythm-follow-up',requestedTrack:'english_academy'}),
});

export function goldenAudioTrack(identity:{lessonId:unknown;lessonSlug:unknown;requestedTrack:unknown;sequence:unknown}){
  if(identity.sequence!==1)return null;
  for(const track of ['finance','english'] as const){
    const expected=GOLDEN_AUDIO_LESSONS[track];
    if(identity.lessonId===expected.lessonId&&identity.lessonSlug===expected.lessonSlug
      &&identity.requestedTrack===expected.requestedTrack)return track;
  }
  return null;
}

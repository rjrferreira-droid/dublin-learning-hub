import {buildP1WrittenLessonContext} from './p1-written-lesson-context.ts';
import {p1SlugFor,type P1Track} from '../../src/learning/p1RuntimeRegistry.ts';

export type P1RequestTrack='rafael_finance'|'viviane_payroll'|'english_academy';
export type ResolvedPublishedLesson={id:string;slug:string;learnerTrack:string;isPublished:boolean};
export type P1HandoffInput={profileTrack:unknown;requestedTrack:P1RequestTrack;requestedLessonId:string;resolvedLesson:ResolvedPublishedLesson;approachBrief?:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const trackFor=(track:P1RequestTrack):P1Track=>track==='rafael_finance'?'finance':track==='viviane_payroll'?'payroll':'english';

/** CANDIDATE ONLY. A pure pre-reservation gate for a future API integration.
 * The caller must obtain resolvedLesson from authenticated server-side DB reads. */
export function resolveP1ProfessorHandoff(input:P1HandoffInput){
 const row=input.resolvedLesson;
 if(!uuid.test(input.requestedLessonId)||!uuid.test(row.id))throw new Error('p1_handoff_invalid_identity');
 if(input.requestedLessonId!==row.id)throw new Error('p1_handoff_resolved_identity_mismatch');
 if(row.isPublished!==true)throw new Error('p1_handoff_lesson_not_published');
 if(row.learnerTrack!==input.requestedTrack)throw new Error('p1_handoff_track_mismatch');
 const track=trackFor(input.requestedTrack);
 if(row.slug!==p1SlugFor(track))throw new Error('p1_handoff_slug_mismatch');
 const packet=buildP1WrittenLessonContext({profileTrack:input.profileTrack,requestedTrack:input.requestedTrack,requestedLessonId:input.requestedLessonId,resolvedLessonId:row.id,resolvedLessonSlug:row.slug,approachBrief:input.approachBrief});
 if(!packet)throw new Error('p1_handoff_reviewed_reference_missing');
 if(packet.descriptor.lessonId!==row.id||packet.descriptor.lessonSlug!==row.slug||packet.descriptor.track!==track)throw new Error('p1_handoff_reference_identity_mismatch');
 return {lessonId:row.id,lessonSlug:row.slug,requestedTrack:input.requestedTrack,studyTrack:track,context:packet.context,teachingContent:packet.descriptor} as const;
}

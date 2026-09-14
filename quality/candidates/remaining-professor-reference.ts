import {createHash} from 'node:crypto';
import {loadRemainingModuleFor} from '../../src/learning/remainingWrittenModules.ts';
import {remainingSequenceFor} from '../../src/learning/remainingWrittenRegistry.ts';
import type {P1Track} from '../../src/learning/p1RuntimeRegistry.ts';
const tracks={rafael_finance:'finance',viviane_payroll:'payroll',english_academy:'english'} as const;
type RequestTrack=keyof typeof tracks;
type Chain={
 lesson:{id:string;moduleId:string;slug:string;sequence:number;contentVersion:number;isPublished:boolean};
 module:{id:string;courseId:string;isPublished:boolean};
 course:{id:string;learnerTrack:string;isActive:boolean};
};
type Input={profileTrack:unknown;requestedTrack:RequestTrack;requestedLessonId:string;resolved:Chain};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hosts=new Set(['www.ifrs.org','www.frc.org.uk','www.revenue.ie','learnenglish.britishcouncil.org']);
/** OFFLINE CANDIDATE ONLY. resolved must come from authenticated server reads, never browser JSON.
 * No live API imports this function; it does not reserve budget, start sessions or call providers. */
export async function prepareRemainingProfessorReference(input:Input){
 if(!Object.hasOwn(tracks,input.requestedTrack))throw Error('future_reference_track_invalid');
 if(input.profileTrack!=='rafael_finance'&&input.profileTrack!=='viviane_payroll')throw Error('future_reference_profile_forbidden');
 if(input.requestedTrack!=='english_academy'&&input.profileTrack!==input.requestedTrack)throw Error('future_reference_profile_forbidden');
 const {lesson,module,course}=input.resolved;
 if(![input.requestedLessonId,lesson.id,lesson.moduleId,module.id,module.courseId,course.id].every(id=>uuid.test(id)))throw Error('future_reference_identity_invalid');
 if(input.requestedLessonId!==lesson.id||lesson.moduleId!==module.id||module.courseId!==course.id)throw Error('future_reference_chain_mismatch');
 if(!lesson.isPublished||lesson.isPublished!==true||module.isPublished!==true||course.isActive!==true)throw Error('future_reference_unpublished');
 if(course.learnerTrack!==input.requestedTrack)throw Error('future_reference_track_mismatch');
 if(!Number.isSafeInteger(lesson.contentVersion)||lesson.contentVersion<1)throw Error('future_reference_version_invalid');
 const track:P1Track=tracks[input.requestedTrack];
 const sequence=remainingSequenceFor(track,lesson.slug);
 if(sequence===null||lesson.sequence!==sequence)throw Error('future_reference_slug_sequence_mismatch');
 const m=await loadRemainingModuleFor(track,lesson);
 if(!m)throw Error('future_reference_missing');
 let guide;
 switch(sequence){
 case 5:guide=(await import('../../src/learning/sequence5Drafts.ts')).draftFor(track).professorGuide;break;
 case 6:guide=(await import('../../src/learning/sequence6Drafts.ts')).draftFor(track).professorGuide;break;
 case 7:guide=(await import('../../src/learning/sequence7Drafts.ts')).draftFor(track).professorGuide;break;
 case 8:guide=(await import('../../src/learning/sequence8Drafts.ts')).draftFor(track).professorGuide;break;
 }
 for(const s of m.sources){const u=new URL(s.url);if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.username||u.password)throw Error('future_reference_source_invalid');}
 const context={
 title:m.title,goal:m.goal,scope:m.scope,
 evidenceBoundary:'Server-authored reference, not learner evidence. No local drafts, answers, reading history or completion are supplied. Assess only actual session evidence; text cannot establish pronunciation or acoustic fluency.',
 teachingSteps:m.sections.map(s=>({title:s.title,paragraphs:s.paragraphs,sourceIds:s.sourceIds})),
 authoredCase:{facts:m.caseStudy.scenario,task:m.caseStudy.task,hints:m.caseStudy.hints,referenceAnswer:m.caseStudy.modelAnswer,reviewChecks:m.caseStudy.reviewChecks},
 teachingGuide:{opening:guide.opening,whenCorrect:guide.whenCorrect,whenUncertain:guide.whenUncertain,whenMisconception:guide.whenMisconception,whenSelfCorrected:guide.whenSelfCorrected,whenAskedForAnswer:guide.whenAskedForAnswer,evidenceBoundary:guide.evidenceBoundary},
 sources:m.sources.map(s=>({id:s.id,url:s.url,supports:s.supports,reviewedOn:s.reviewedOn})),
 };
 const identity={lessonId:lesson.id,lessonSlug:lesson.slug,contentVersion:lesson.contentVersion,requestedTrack:input.requestedTrack,studyTrack:track,sequence};
 const encoded=JSON.stringify({identity,context}),bytes=Buffer.byteLength(encoded,'utf8');
 if(bytes>24000)throw Error('future_reference_size_exceeded');
 return {identity,context,descriptor:{version:'remaining-written-reference-candidate-v1',sha256:createHash('sha256').update(encoded).digest('hex'),contextBytes:bytes,includesLearnerDrafts:false,includesLocalCheckpointResults:false,providerAdmission:false}} as const;
}

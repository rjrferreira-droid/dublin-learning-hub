import {createHash} from 'node:crypto';
import {loadRemainingModuleFor} from '../../src/learning/remainingWrittenModules.ts';
import {remainingSequenceFor} from '../../src/learning/remainingWrittenRegistry.ts';
import {isSequence3Slug} from '../../src/learning/sequence3Registry.ts';
import {isSequence4Slug} from '../../src/learning/sequence4Registry.ts';
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
export async function prepareWrittenProfessorReference(input:Input){
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
 const sequence=isSequence3Slug(track,lesson.slug)?3:isSequence4Slug(track,lesson.slug)?4:remainingSequenceFor(track,lesson.slug);
 if(sequence===null||lesson.sequence!==sequence)throw Error('future_reference_slug_sequence_mismatch');
 const m=sequence===3?(await import('../../src/learning/sequence3Modules.ts')).sequence3ModuleFor(track,lesson):sequence===4?(await import('../../src/learning/sequence4Modules.ts')).sequence4ModuleFor(track,lesson):await loadRemainingModuleFor(track,lesson);
 if(!m)throw Error('future_reference_missing');
 let guide;
 switch(sequence){
 case 3:{const all={finance:await import('../drafts/p1-finance-leases.json',{with:{type:'json'}}),payroll:await import('../drafts/p1-payroll-pay-bases.json',{with:{type:'json'}}),english:await import('../drafts/p1-english-variances.json',{with:{type:'json'}})};guide=all[track].default.professorGuide;break;}
 case 4:{const all={finance:await import('../drafts/sequence4-finance.json',{with:{type:'json'}}),payroll:await import('../drafts/sequence4-payroll.json',{with:{type:'json'}}),english:await import('../drafts/sequence4-english.json',{with:{type:'json'}})};guide=all[track].default.professorGuide;break;}
 case 5:guide=(await import('../../src/learning/sequence5Drafts.ts')).draftFor(track).professorGuide;break;
 case 6:guide=(await import('../../src/learning/sequence6Drafts.ts')).draftFor(track).professorGuide;break;
 case 7:guide=(await import('../../src/learning/sequence7Drafts.ts')).draftFor(track).professorGuide;break;
 case 8:guide=(await import('../../src/learning/sequence8Drafts.ts')).draftFor(track).professorGuide;break;
 }
 for(const s of m.sources){const u=new URL(s.url);if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.username||u.password)throw Error('future_reference_source_invalid');}
 const context={
 title:m.title,goal:m.goal,scope:m.scope,
 evidenceBoundary:'Server-authored reference, not learner evidence. No local drafts, answers, reading history or completion are supplied. Assess only actual session evidence; text cannot establish pronunciation or acoustic fluency.',
 teachingSteps:m.sections.map(s=>({title:s.title,paragraphs:s.paragraphs,supportPt:s.supportPt,sourceIds:s.sourceIds})),
 authoredCase:{facts:m.caseStudy.scenario,task:m.caseStudy.task,hints:m.caseStudy.hints,referenceAnswer:m.caseStudy.modelAnswer,reviewChecks:m.caseStudy.reviewChecks},
 teachingGuide:{opening:guide.opening,whenCorrect:guide.whenCorrect,whenUncertain:guide.whenUncertain,whenMisconception:guide.whenMisconception,whenSelfCorrected:guide.whenSelfCorrected,whenAskedForAnswer:guide.whenAskedForAnswer,evidenceBoundary:guide.evidenceBoundary,
  challengePrompts:'challengePrompts' in guide?guide.challengePrompts:[],conversationRules:'conversationRules' in guide?guide.conversationRules:[],
  helpBehaviour:'helpBehaviour' in guide?guide.helpBehaviour:null,correctionBoundary:'correctionBoundary' in guide?guide.correctionBoundary:null,languageCoaching:'languageCoaching' in guide?guide.languageCoaching:null},
 sources:m.sources.map(s=>({id:s.id,url:s.url,supports:s.supports,reviewedOn:s.reviewedOn})),
 };
 const identity={lessonId:lesson.id,lessonSlug:lesson.slug,contentVersion:lesson.contentVersion,requestedTrack:input.requestedTrack,studyTrack:track,sequence};
 const technicalBrief='SERVER-AUTHORED WRITTEN REFERENCE. Not learner evidence.\n'+JSON.stringify(context);
 if(technicalBrief.length>14000)throw Error('future_reference_shared_brief_exceeded');
 const lessonContext={title:m.title,objectives:[m.goal,...m.sections.map(s=>s.title)],technicalBrief,interviewAngle:m.caseStudy.transfer};
 const encoded=JSON.stringify({identity,context}),bytes=Buffer.byteLength(encoded,'utf8');
 if(bytes>24000)throw Error('future_reference_size_exceeded');
 return {identity,context,lessonContext,descriptor:{version:'written-reference-candidate-v2',sha256:createHash('sha256').update(encoded).digest('hex'),contextBytes:bytes,includesLearnerDrafts:false,includesLocalCheckpointResults:false,providerAdmission:false}} as const;
}

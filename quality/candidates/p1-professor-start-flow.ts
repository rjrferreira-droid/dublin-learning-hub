import {resolveP1ProfessorHandoff,type P1RequestTrack,type ResolvedPublishedLesson} from './p1-professor-handoff.ts';
import {parseSessionPreparation,teachingApproachBrief,type SessionPreparation} from '../../src/learning/sessionPreparation.ts';
import {startProfessorAtomically} from '../../server/professor-start.ts';

export type P1ProfessorStartInput={
 profileTrack:unknown;
 requestedTrack:P1RequestTrack;
 requestedLessonId:string;
 resolvedLesson:ResolvedPublishedLesson;
 sessionPreparation?:unknown;
 validationMode?:boolean;
 roomName:string;
};

type RpcClient={rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:any;error:{message:string}|null}>};

const studyTrack=(track:P1RequestTrack)=>track==='rafael_finance'?'finance' as const:track==='viviane_payroll'?'payroll' as const:'english' as const;
const modeFor=(track:P1RequestTrack)=>track==='english_academy'?'general_conversation' as const:'chapter_conversation' as const;

/** CANDIDATE ONLY. Pure request/reference validation; no budget call and no provider. */
export function prepareP1ProfessorStart(input:P1ProfessorStartInput){
 const sessionPreparation:SessionPreparation=parseSessionPreparation(input.sessionPreparation);
 const track=studyTrack(input.requestedTrack);
 const approachBrief=teachingApproachBrief(sessionPreparation,track);
 const handoff=resolveP1ProfessorHandoff({
  profileTrack:input.profileTrack,
  requestedTrack:input.requestedTrack,
  requestedLessonId:input.requestedLessonId,
  resolvedLesson:input.resolvedLesson,
  approachBrief,
 });
 if(typeof input.roomName!=='string'||!/^validation:lh-[a-z0-9-]+$/i.test(input.roomName)&&!/^lh-[a-z0-9-]+$/i.test(input.roomName))throw new Error('p1_start_invalid_room');
 const validationMode=input.validationMode===true;
 if(validationMode!==input.roomName.startsWith('validation:'))throw new Error('p1_start_validation_room_mismatch');
 return {
  handoff,
  sessionPreparation,
  startInput:{lessonId:handoff.lessonId,mode:modeFor(input.requestedTrack),roomName:input.roomName,validationMode},
 } as const;
}

/** CANDIDATE ONLY. Executes the REAL atomic Professor budget/start contract against the supplied client.
 * Tests supply a fictional client. No LiveKit/provider primitive exists in this candidate. */
export async function executeP1BudgetGateCandidate(db:RpcClient,input:P1ProfessorStartInput){
 const prepared=prepareP1ProfessorStart(input);
 const startup=await startProfessorAtomically(db,prepared.startInput);
 if(startup.persistence.sessionId.length<8||startup.budget.allowed!==true||startup.budget.qualityTier!=='premium')throw new Error('p1_start_contract_mismatch');
 const metadata={
  requestedTrack:prepared.handoff.requestedTrack,
  studyTrack:prepared.handoff.studyTrack,
  lessonId:prepared.handoff.lessonId,
  lessonSlug:prepared.handoff.lessonSlug,
  mode:prepared.startInput.mode,
  validationMode:startup.validationMode,
  lessonContext:prepared.handoff.context,
  teachingContent:prepared.handoff.teachingContent,
  sessionPreparation:prepared.sessionPreparation,
  budgetReservationId:startup.budget.reservationId,
  budgetReservationUsd:startup.budget.reservationUsd,
  maxSessionSeconds:startup.budget.maxSessionSeconds,
  persistenceSessionId:startup.persistence.sessionId,
  roomName:startup.roomName,
 } as const;
 return {prepared,startup,metadata};
}

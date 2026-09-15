import {premiumAudioBudgetDecision,type PremiumUsageRow} from './premium-audio-budget.ts';
import type {ReservationExposure} from './reservation-exposure.ts';
import {p1SlugFor,type P1Track} from '../../../src/learning/p1RuntimeRegistry.ts';

export type P1AudioRequestTrack='rafael_finance'|'viviane_payroll'|'english_academy';
export type P1AudioLesson={id:string;slug:string;learnerTrack:string;isPublished:boolean;contentVersion:number};
export type P1AudioGateInput={
 profileTrack:unknown;
 requestedTrack:P1AudioRequestTrack;
 requestedLessonId:string;
 resolvedLesson:P1AudioLesson;
 cachedStoragePath?:string|null;
 scriptWords:number;
 usageRows:readonly PremiumUsageRow[];
 exposure:ReservationExposure;
 aiHardCapUsd:unknown;
 premiumAudioCapUsd:unknown;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const trackFor=(track:P1AudioRequestTrack):P1Track=>track==='rafael_finance'?'finance':track==='viviane_payroll'?'payroll':'english';
function accountAllows(profileTrack:unknown,requestedTrack:P1AudioRequestTrack){
 if(profileTrack!=='rafael_finance'&&profileTrack!=='viviane_payroll')return false;
 return requestedTrack==='english_academy'||requestedTrack===profileTrack;
}
function estimate(words:number){
 if(!Number.isSafeInteger(words)||words<=0||words>5000)throw new Error('p1_audio_invalid_script_words');
 const estimatedMinutes=Math.max(0.35,words/145);
 const estimatedCostUsd=Math.max(0.01,estimatedMinutes*0.015*1.30);
 const reservationUsd=Math.max(0.10,estimatedCostUsd*2);
 return {estimatedMinutes,estimatedCostUsd,reservationUsd};
}
/** Pure gate shared with the undeployed Edge handler; no side effects. */
export function p1PremiumAudioGate(input:P1AudioGateInput){
 const {row,track,expectedPath}=p1AudioIdentity(input);
 if(input.cachedStoragePath!=null){
  if(input.cachedStoragePath!==expectedPath)throw new Error('p1_audio_cache_identity_mismatch');
  return {action:'serve-cache' as const,lessonId:row.id,lessonSlug:row.slug,track,contentVersion:row.contentVersion,expectedPath,reservationUsd:0};
 }
 const cost=estimate(input.scriptWords);
 const budget=premiumAudioBudgetDecision({usageRows:input.usageRows,exposure:input.exposure,aiHardCapUsd:input.aiHardCapUsd,premiumAudioCapUsd:input.premiumAudioCapUsd,reservationUsd:cost.reservationUsd});
 if(!budget.allowed)return {action:'blocked' as const,lessonId:row.id,lessonSlug:row.slug,track,contentVersion:row.contentVersion,expectedPath,reservationUsd:cost.reservationUsd,reason:budget.reason,budget};
 return {action:'claim-before-provider' as const,lessonId:row.id,lessonSlug:row.slug,track,contentVersion:row.contentVersion,expectedPath,reservationUsd:cost.reservationUsd,estimatedCostUsd:cost.estimatedCostUsd,budget,claimKey:{lessonId:row.id,contentVersion:row.contentVersion,audioType:'commentary' as const}};
}

export function p1AudioIdentity(input:Pick<P1AudioGateInput,'profileTrack'|'requestedTrack'|'requestedLessonId'|'resolvedLesson'>){
 const row=input.resolvedLesson;
 if(!accountAllows(input.profileTrack,input.requestedTrack))throw new Error('p1_audio_track_forbidden');
 if(!uuid.test(input.requestedLessonId)||!uuid.test(row.id)||row.id!==input.requestedLessonId)throw new Error('p1_audio_identity_mismatch');
 if(row.isPublished!==true)throw new Error('p1_audio_lesson_not_published');
 if(row.learnerTrack!==input.requestedTrack)throw new Error('p1_audio_track_mismatch');
 const track=trackFor(input.requestedTrack);
 if(row.slug!==p1SlugFor(track))throw new Error('p1_audio_slug_mismatch');
 if(!Number.isSafeInteger(row.contentVersion)||row.contentVersion<1||row.contentVersion>100000)throw new Error('p1_audio_invalid_content_version');
 const expectedPath=`lessons/${row.id}/commentary-v${row.contentVersion}.mp3`;
 return {row,track,expectedPath};
}

import type {ReservationExposure} from './reservation-exposure.ts';
export type PremiumUsageRow={feature:unknown;estimated_cost_usd:unknown};
export type PremiumAudioBudgetDecision={allowed:boolean;reason:null|'global_ai_budget_reached'|'premium_audio_budget_reached';loggedAiUsd:number;premiumBucketSpentUsd:number;professorProtectedUsd:number;globalCommittedUsd:number;reservationUsd:number};
const amount=(value:unknown,label:string):number=>{const n=typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;if(!Number.isFinite(n)||n<0||n>10000)throw new Error(`invalid_${label}`);return n;};
export function premiumAudioBudgetDecision(input:{usageRows:readonly PremiumUsageRow[];exposure:ReservationExposure;aiHardCapUsd:unknown;premiumAudioCapUsd:unknown;reservationUsd:unknown}):PremiumAudioBudgetDecision{
 const aiCap=amount(input.aiHardCapUsd,'ai_hard_cap');const premiumCap=amount(input.premiumAudioCapUsd,'premium_audio_cap');const reservation=amount(input.reservationUsd,'reservation');
 let loggedAi=0,premiumBucket=0;
 for(const row of input.usageRows){const value=amount(row.estimated_cost_usd,'usage');loggedAi+=value;const feature=typeof row.feature==='string'?row.feature:'';if(feature==='lesson_audio'||feature==='lesson_tts'||feature==='professor_evaluation')premiumBucket+=value;}
 loggedAi=Number(loggedAi.toFixed(6));premiumBucket=Number(premiumBucket.toFixed(6));const protectedProfessor=Number(input.exposure.protectedReservationUsd.toFixed(6));const committed=Number((loggedAi+protectedProfessor).toFixed(6));
 const reason=committed+reservation>aiCap?'global_ai_budget_reached':premiumBucket+reservation>premiumCap?'premium_audio_budget_reached':null;
 return {allowed:reason===null,reason,loggedAiUsd:loggedAi,premiumBucketSpentUsd:premiumBucket,professorProtectedUsd:protectedProfessor,globalCommittedUsd:committed,reservationUsd:reservation};
}

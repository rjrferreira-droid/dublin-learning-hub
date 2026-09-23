import type {VivianeEnglishCode} from './vivianeEnglishLessonRegistry.ts';

export type VivianeEnglishStudyDay={
 week:1|2|3|4;
 day:1|2|3|4|5;
 lesson:VivianeEnglishCode;
 strand:'everyday'|'professional';
 focus:string;
};

export const VIVIANE_ENGLISH_MONTH_DIRECTION={
 learner:'viviane' as const,
 level:{current:'B1+',target:'B2+'} as const,
 split:{everydayPct:80,professionalPct:20},
 everydayThemes:['conversation','family','services','healthcare-communication','transport','community','travel','everyday-admin'] as const,
 professionalDomains:['payroll','departamento-pessoal','people-operations','employee-service','benefits','onboarding-offboarding','manager-communication'] as const,
 excludedProfessionalCentres:['finance','accounting','tax','treasury','financial-reporting'] as const,
 professor:{referenceMinutes:10,hardLimit:false,startingEnglishSharePct:55} as const,
 premiumAudio:{role:'core-contextual-listening',status:'outline-only-no-generation'} as const,
} as const;

/** Four five-day weeks. Every week keeps the agreed 4:1 everyday/professional ratio. */
export const VIVIANE_ENGLISH_MONTH_PLAN:readonly VivianeEnglishStudyDay[]=[
 {week:1,day:1,lesson:'VE1',strand:'everyday',focus:'past narration and follow-up questions'},
 {week:1,day:2,lesson:'VE2',strand:'everyday',focus:'small talk, weather and plans'},
 {week:1,day:3,lesson:'VE3',strand:'everyday',focus:'appointments and phone clarification'},
 {week:1,day:4,lesson:'VE4',strand:'everyday',focus:'housing repairs and access'},
 {week:1,day:5,lesson:'VP1',strand:'professional',focus:'Payroll interview evidence'},
 {week:2,day:1,lesson:'VE5',strand:'everyday',focus:'school conversations and neutral questions'},
 {week:2,day:2,lesson:'VE6',strand:'everyday',focus:'shopping comparisons and returns'},
 {week:2,day:3,lesson:'VE7',strand:'everyday',focus:'restaurants and preferences'},
 {week:2,day:4,lesson:'VE8',strand:'everyday',focus:'family plans and changes'},
 {week:2,day:5,lesson:'VP2',strand:'professional',focus:'employee payroll queries and privacy'},
 {week:3,day:1,lesson:'VE9',strand:'everyday',focus:'opinions and polite disagreement'},
 {week:3,day:2,lesson:'VE10',strand:'everyday',focus:'recommendations and hobbies'},
 {week:3,day:3,lesson:'VE11',strand:'everyday',focus:'pharmacy communication and instructions'},
 {week:3,day:4,lesson:'VE12',strand:'everyday',focus:'transport directions and delays'},
 {week:3,day:5,lesson:'VP3',strand:'professional',focus:'employee movements, benefits and cut-off'},
 {week:4,day:1,lesson:'VE13',strand:'everyday',focus:'neighbours, invitations and boundaries'},
 {week:4,day:2,lesson:'VE14',strand:'everyday',focus:'utilities and customer service'},
 {week:4,day:3,lesson:'VE15',strand:'everyday',focus:'airports, hotels and lost luggage'},
 {week:4,day:4,lesson:'VE16',strand:'everyday',focus:'forms, deliveries and deadlines'},
 {week:4,day:5,lesson:'VP4',strand:'professional',focus:'Payroll status, controls and escalation'},
];

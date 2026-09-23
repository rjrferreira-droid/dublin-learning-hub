import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';

export type LocalEnglishCode='E1'|'E2'|'E3'|'E4'|'E5'|'E6'|'E7'|'E8'|'E9'|'E10'|'P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7'|'P8'|'P9'|'P10';
export const ENGLISH_E1_MODEL_ID='e1100000-2026-4e11-8e01-000000000001';
export const ENGLISH_E1_MODEL_SLUG='story-past-forms-rhythm-follow-up';
export const ENGLISH_E2_MODEL_ID='e1200000-2026-4e12-8e02-000000000002';
export const ENGLISH_E2_MODEL_SLUG='everyday-dublin-weather-plans-small-talk';
export const ENGLISH_E3_MODEL_ID='e1300000-2026-4e13-8e05-000000000005';
export const ENGLISH_E3_MODEL_SLUG='appointments-rescheduling-phone-clarification';
export const ENGLISH_E4_MODEL_ID='e1400000-2026-4e14-8e06-000000000006';
export const ENGLISH_E4_MODEL_SLUG='housing-repairs-access-follow-up';
export const ENGLISH_E5_MODEL_ID='e1500000-2026-4e15-8e09-000000000009';
export const ENGLISH_E5_MODEL_SLUG='school-conversation-observation-next-step';
export const ENGLISH_E6_MODEL_ID='e1600000-2026-4e16-8e0b-000000000011';
export const ENGLISH_E6_MODEL_SLUG='shopping-returns-comparisons-resolution';
export const ENGLISH_E7_MODEL_ID='e1700000-2026-4e17-8e0c-000000000012';
export const ENGLISH_E7_MODEL_SLUG='restaurants-preferences-orders-problems';
export const ENGLISH_E8_MODEL_ID='e1800000-2026-4e18-8e0d-000000000013';
export const ENGLISH_E8_MODEL_SLUG='family-plans-playdates-routines';
export const ENGLISH_E9_MODEL_ID='e1900000-2026-4e19-8e0e-000000000014';
export const ENGLISH_E9_MODEL_SLUG='news-politics-opinions-disagreement';
export const ENGLISH_E10_MODEL_ID='e1a00000-2026-4e1a-8e0f-000000000015';
export const ENGLISH_E10_MODEL_SLUG='tv-films-hobbies-recommendations';
export const ENGLISH_P1_MODEL_ID='e2100000-2026-4e21-8e03-000000000003';
export const ENGLISH_P1_MODEL_SLUG='clarify-check-understanding-handle-meetings';
export const ENGLISH_P2_MODEL_ID='e2200000-2026-4e22-8e04-000000000004';
export const ENGLISH_P2_MODEL_SLUG='explain-variances-numbers-recommendations';
export const ENGLISH_P3_MODEL_ID='e2300000-2026-4e23-8e07-000000000007';
export const ENGLISH_P3_MODEL_SLUG='professional-emails-requests-follow-up';
export const ENGLISH_P4_MODEL_ID='e2400000-2026-4e24-8e08-000000000008';
export const ENGLISH_P4_MODEL_SLUG='recommendation-presentation-follow-up';
export const ENGLISH_P5_MODEL_ID='e2500000-2026-4e25-8e0a-000000000010';
export const ENGLISH_P5_MODEL_SLUG='job-interview-evidence-concise-follow-up';
export const ENGLISH_P6_MODEL_ID='e2600000-2026-4e26-8e10-000000000016';
export const ENGLISH_P6_MODEL_SLUG='month-end-reconciliations-errors-estimates';
export const ENGLISH_P7_MODEL_ID='e2700000-2026-4e27-8e11-000000000017';
export const ENGLISH_P7_MODEL_SLUG='tax-facts-positions-exposure-evidence';
export const ENGLISH_P8_MODEL_ID='e2800000-2026-4e28-8e12-000000000018';
export const ENGLISH_P8_MODEL_SLUG='payroll-inputs-deductions-queries-controls';
export const ENGLISH_P9_MODEL_ID='e2900000-2026-4e29-8e13-000000000019';
export const ENGLISH_P9_MODEL_SLUG='treasury-cash-forecast-liquidity-controls';
export const ENGLISH_P10_MODEL_ID='e2a00000-2026-4e2a-8e14-000000000020';
export const ENGLISH_P10_MODEL_SLUG='contracts-obligations-risks-compliance';

const LOCAL_ENGLISH_SOURCE:readonly CatalogLesson[]=[
 {id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG,title:'Tell a story naturally: past forms, rhythm & follow-up questions',subtitle:'Everyday English · tell a clear story and keep the conversation moving',sequence:1,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E2_MODEL_ID,slug:ENGLISH_E2_MODEL_SLUG,title:'Everyday Dublin: weather, plans and natural small talk',subtitle:'Everyday English · react naturally, adjust plans and ask useful follow-up questions',sequence:2,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E3_MODEL_ID,slug:ENGLISH_E3_MODEL_SLUG,title:'Appointments: confirm, reschedule and clarify by phone',subtitle:'Everyday English · manage times, spell details and repair misunderstandings',sequence:3,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E4_MODEL_ID,slug:ENGLISH_E4_MODEL_SLUG,title:'Housing: report a repair and arrange access',subtitle:'Everyday English · describe evidence, avoid guessing and confirm the next step',sequence:4,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E5_MODEL_ID,slug:ENGLISH_E5_MODEL_SLUG,title:'School conversations: share observations and agree a next step',subtitle:'Everyday English · ask neutral questions, clarify routines and confirm follow-up',sequence:5,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E6_MODEL_ID,slug:ENGLISH_E6_MODEL_SLUG,title:'Shopping and returns: compare options and resolve a problem',subtitle:'Everyday English · ask about products, explain an issue and negotiate a practical outcome',sequence:6,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E7_MODEL_ID,slug:ENGLISH_E7_MODEL_SLUG,title:'Restaurants: express preferences and handle the order naturally',subtitle:'Everyday English · choose, order, clarify and solve a small problem politely',sequence:7,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E8_MODEL_ID,slug:ENGLISH_E8_MODEL_SLUG,title:'Family plans: arrange playdates, routines and weekends',subtitle:'Everyday English · coordinate people, preferences, timing and changes',sequence:8,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E9_MODEL_ID,slug:ENGLISH_E9_MODEL_SLUG,title:'News and politics: express a view without ending the conversation',subtitle:'Everyday English · distinguish fact from opinion, disagree and ask genuine follow-ups',sequence:9,moduleSequence:1,estimatedMinutes:50,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E10_MODEL_ID,slug:ENGLISH_E10_MODEL_SLUG,title:'TV, films and hobbies: recommend, react and keep talking',subtitle:'Everyday English · describe taste, avoid spoilers and build a natural exchange',sequence:10,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P1_MODEL_ID,slug:ENGLISH_P1_MODEL_SLUG,title:'Clarify, check understanding & handle meetings',subtitle:'Technical English · clarify finance and control issues without sounding defensive or abrupt',sequence:11,moduleSequence:2,estimatedMinutes:50,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P2_MODEL_ID,slug:ENGLISH_P2_MODEL_SLUG,title:'Explain numbers and variances to a stakeholder',subtitle:'Technical English · give the financial headline, evidence, uncertainty and next action',sequence:12,moduleSequence:2,estimatedMinutes:50,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P3_MODEL_ID,slug:ENGLISH_P3_MODEL_SLUG,title:'Professional emails: clear requests and useful follow-up',subtitle:'Technical English · request evidence across finance, tax and payroll with a workable deadline',sequence:13,moduleSequence:2,estimatedMinutes:50,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P4_MODEL_ID,slug:ENGLISH_P4_MODEL_SLUG,title:'Present a recommendation and handle questions',subtitle:'Technical English · connect control evidence, limitations and a clear decision request',sequence:14,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P5_MODEL_ID,slug:ENGLISH_P5_MODEL_SLUG,title:'Job interviews: give concise, evidence-based answers',subtitle:'Technical English · explain finance experience, contribution and results without overclaiming',sequence:15,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P6_MODEL_ID,slug:ENGLISH_P6_MODEL_SLUG,title:'Month-end: explain reconciliations, errors and estimates',subtitle:'Technical English · separate facts, accounting judgements, corrections and open evidence',sequence:16,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P7_MODEL_ID,slug:ENGLISH_P7_MODEL_SLUG,title:'Tax: explain facts, positions, exposure and evidence',subtitle:'Technical English · communicate a tax issue without inventing law, rates or certainty',sequence:17,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P8_MODEL_ID,slug:ENGLISH_P8_MODEL_SLUG,title:'Payroll: explain inputs, deductions, queries and controls',subtitle:'Technical English · reconcile supplied pay data and respond without exposing private information',sequence:18,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P9_MODEL_ID,slug:ENGLISH_P9_MODEL_SLUG,title:'Treasury: communicate cash, forecasts and liquidity risk',subtitle:'Technical English · distinguish balance, forecast, availability, exposure and action',sequence:19,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P10_MODEL_ID,slug:ENGLISH_P10_MODEL_SLUG,title:'Contracts and compliance: identify obligations and escalate risk',subtitle:'Technical English · read clauses carefully, separate interpretation from advice and assign follow-up',sequence:20,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
];

const ALTERNATING_MONTH_IDS=[
 ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID,ENGLISH_E2_MODEL_ID,ENGLISH_P2_MODEL_ID,ENGLISH_E3_MODEL_ID,
 ENGLISH_P3_MODEL_ID,ENGLISH_E4_MODEL_ID,ENGLISH_P4_MODEL_ID,ENGLISH_E5_MODEL_ID,ENGLISH_P5_MODEL_ID,
 ENGLISH_E6_MODEL_ID,ENGLISH_P6_MODEL_ID,ENGLISH_E7_MODEL_ID,ENGLISH_P7_MODEL_ID,ENGLISH_E8_MODEL_ID,
 ENGLISH_P8_MODEL_ID,ENGLISH_E9_MODEL_ID,ENGLISH_P9_MODEL_ID,ENGLISH_E10_MODEL_ID,ENGLISH_P10_MODEL_ID,
] as const;
const alternatingSequence=new Map<string,number>(ALTERNATING_MONTH_IDS.map((id,index)=>[id,index+1]));

/** One unified course: an everyday unit is followed by a technical unit across the month. */
export const LOCAL_ENGLISH_LESSONS:readonly CatalogLesson[]=LOCAL_ENGLISH_SOURCE
 .map(lesson=>({...lesson,sequence:alternatingSequence.get(lesson.id)??lesson.sequence}))
 .sort((a,b)=>a.sequence-b.sequence);

export function localEnglishCodeFor(track:P1Track,lesson:{id:string;slug:string}):LocalEnglishCode|null{
 if(track!=='english')return null;
 if(lesson.id===ENGLISH_E1_MODEL_ID&&lesson.slug===ENGLISH_E1_MODEL_SLUG)return 'E1';
 if(lesson.id===ENGLISH_E2_MODEL_ID&&lesson.slug===ENGLISH_E2_MODEL_SLUG)return 'E2';
 if(lesson.id===ENGLISH_E3_MODEL_ID&&lesson.slug===ENGLISH_E3_MODEL_SLUG)return 'E3';
 if(lesson.id===ENGLISH_E4_MODEL_ID&&lesson.slug===ENGLISH_E4_MODEL_SLUG)return 'E4';
 if(lesson.id===ENGLISH_E5_MODEL_ID&&lesson.slug===ENGLISH_E5_MODEL_SLUG)return 'E5';
 if(lesson.id===ENGLISH_E6_MODEL_ID&&lesson.slug===ENGLISH_E6_MODEL_SLUG)return 'E6';
 if(lesson.id===ENGLISH_E7_MODEL_ID&&lesson.slug===ENGLISH_E7_MODEL_SLUG)return 'E7';
 if(lesson.id===ENGLISH_E8_MODEL_ID&&lesson.slug===ENGLISH_E8_MODEL_SLUG)return 'E8';
 if(lesson.id===ENGLISH_E9_MODEL_ID&&lesson.slug===ENGLISH_E9_MODEL_SLUG)return 'E9';
 if(lesson.id===ENGLISH_E10_MODEL_ID&&lesson.slug===ENGLISH_E10_MODEL_SLUG)return 'E10';
 if(lesson.id===ENGLISH_P1_MODEL_ID&&lesson.slug===ENGLISH_P1_MODEL_SLUG)return 'P1';
 if(lesson.id===ENGLISH_P2_MODEL_ID&&lesson.slug===ENGLISH_P2_MODEL_SLUG)return 'P2';
 if(lesson.id===ENGLISH_P3_MODEL_ID&&lesson.slug===ENGLISH_P3_MODEL_SLUG)return 'P3';
 if(lesson.id===ENGLISH_P4_MODEL_ID&&lesson.slug===ENGLISH_P4_MODEL_SLUG)return 'P4';
 if(lesson.id===ENGLISH_P5_MODEL_ID&&lesson.slug===ENGLISH_P5_MODEL_SLUG)return 'P5';
 if(lesson.id===ENGLISH_P6_MODEL_ID&&lesson.slug===ENGLISH_P6_MODEL_SLUG)return 'P6';
 if(lesson.id===ENGLISH_P7_MODEL_ID&&lesson.slug===ENGLISH_P7_MODEL_SLUG)return 'P7';
 if(lesson.id===ENGLISH_P8_MODEL_ID&&lesson.slug===ENGLISH_P8_MODEL_SLUG)return 'P8';
 if(lesson.id===ENGLISH_P9_MODEL_ID&&lesson.slug===ENGLISH_P9_MODEL_SLUG)return 'P9';
 if(lesson.id===ENGLISH_P10_MODEL_ID&&lesson.slug===ENGLISH_P10_MODEL_SLUG)return 'P10';
 return null;
}

export function isLocalEnglishLesson(track:P1Track,lesson:{id:string;slug:string}){return localEnglishCodeFor(track,lesson)!==null;}

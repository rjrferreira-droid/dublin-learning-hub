import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';

export type LocalEnglishCode='E1'|'E2'|'E3'|'E4'|'P1'|'P2'|'P3'|'P4';
export const ENGLISH_E1_MODEL_ID='e1100000-2026-4e11-8e01-000000000001';
export const ENGLISH_E1_MODEL_SLUG='story-past-forms-rhythm-follow-up';
export const ENGLISH_E2_MODEL_ID='e1200000-2026-4e12-8e02-000000000002';
export const ENGLISH_E2_MODEL_SLUG='everyday-dublin-weather-plans-small-talk';
export const ENGLISH_E3_MODEL_ID='e1300000-2026-4e13-8e05-000000000005';
export const ENGLISH_E3_MODEL_SLUG='appointments-rescheduling-phone-clarification';
export const ENGLISH_E4_MODEL_ID='e1400000-2026-4e14-8e06-000000000006';
export const ENGLISH_E4_MODEL_SLUG='housing-repairs-access-follow-up';
export const ENGLISH_P1_MODEL_ID='e2100000-2026-4e21-8e03-000000000003';
export const ENGLISH_P1_MODEL_SLUG='clarify-check-understanding-handle-meetings';
export const ENGLISH_P2_MODEL_ID='e2200000-2026-4e22-8e04-000000000004';
export const ENGLISH_P2_MODEL_SLUG='explain-variances-numbers-recommendations';
export const ENGLISH_P3_MODEL_ID='e2300000-2026-4e23-8e07-000000000007';
export const ENGLISH_P3_MODEL_SLUG='professional-emails-requests-follow-up';
export const ENGLISH_P4_MODEL_ID='e2400000-2026-4e24-8e08-000000000008';
export const ENGLISH_P4_MODEL_SLUG='recommendation-presentation-follow-up';

export const LOCAL_ENGLISH_LESSONS:readonly CatalogLesson[]=[
 {id:ENGLISH_E1_MODEL_ID,slug:ENGLISH_E1_MODEL_SLUG,title:'Tell a story naturally: past forms, rhythm & follow-up questions',subtitle:'Everyday English · tell a clear story and keep the conversation moving',sequence:1,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E2_MODEL_ID,slug:ENGLISH_E2_MODEL_SLUG,title:'Everyday Dublin: weather, plans and natural small talk',subtitle:'Everyday English · react naturally, adjust plans and ask useful follow-up questions',sequence:2,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E3_MODEL_ID,slug:ENGLISH_E3_MODEL_SLUG,title:'Appointments: confirm, reschedule and clarify by phone',subtitle:'Everyday English · manage times, spell details and repair misunderstandings',sequence:3,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_E4_MODEL_ID,slug:ENGLISH_E4_MODEL_SLUG,title:'Housing: report a repair and arrange access',subtitle:'Everyday English · describe evidence, avoid guessing and confirm the next step',sequence:4,moduleSequence:1,estimatedMinutes:45,track:'english',moduleSlug:'english-everyday',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P1_MODEL_ID,slug:ENGLISH_P1_MODEL_SLUG,title:'Clarify, check understanding & handle meetings',subtitle:'Professional English · clarify meaning without sounding defensive or abrupt',sequence:5,moduleSequence:2,estimatedMinutes:50,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P2_MODEL_ID,slug:ENGLISH_P2_MODEL_SLUG,title:'Explain numbers and variances to a stakeholder',subtitle:'Professional English · give the headline, evidence, uncertainty and next action',sequence:6,moduleSequence:2,estimatedMinutes:50,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P3_MODEL_ID,slug:ENGLISH_P3_MODEL_SLUG,title:'Professional emails: clear requests and useful follow-up',subtitle:'Professional English · state the action, reason, deadline and workable next step',sequence:7,moduleSequence:2,estimatedMinutes:50,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
 {id:ENGLISH_P4_MODEL_ID,slug:ENGLISH_P4_MODEL_SLUG,title:'Present a recommendation and handle questions',subtitle:'Professional English · connect evidence, limitations and a clear decision request',sequence:8,moduleSequence:2,estimatedMinutes:55,track:'english',moduleSlug:'english-professional',courseSlug:'english-balanced-local',origin:'local-model'},
];

export function localEnglishCodeFor(track:P1Track,lesson:{id:string;slug:string}):LocalEnglishCode|null{
 if(track!=='english')return null;
 if(lesson.id===ENGLISH_E1_MODEL_ID&&lesson.slug===ENGLISH_E1_MODEL_SLUG)return 'E1';
 if(lesson.id===ENGLISH_E2_MODEL_ID&&lesson.slug===ENGLISH_E2_MODEL_SLUG)return 'E2';
 if(lesson.id===ENGLISH_E3_MODEL_ID&&lesson.slug===ENGLISH_E3_MODEL_SLUG)return 'E3';
 if(lesson.id===ENGLISH_E4_MODEL_ID&&lesson.slug===ENGLISH_E4_MODEL_SLUG)return 'E4';
 if(lesson.id===ENGLISH_P1_MODEL_ID&&lesson.slug===ENGLISH_P1_MODEL_SLUG)return 'P1';
 if(lesson.id===ENGLISH_P2_MODEL_ID&&lesson.slug===ENGLISH_P2_MODEL_SLUG)return 'P2';
 if(lesson.id===ENGLISH_P3_MODEL_ID&&lesson.slug===ENGLISH_P3_MODEL_SLUG)return 'P3';
 if(lesson.id===ENGLISH_P4_MODEL_ID&&lesson.slug===ENGLISH_P4_MODEL_SLUG)return 'P4';
 return null;
}

export function isLocalEnglishLesson(track:P1Track,lesson:{id:string;slug:string}){return localEnglishCodeFor(track,lesson)!==null;}

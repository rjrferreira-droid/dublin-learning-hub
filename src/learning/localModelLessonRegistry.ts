import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
export type LocalModelCode='A1'|'A2'|'B3'|'B4'|'B5'|'B6'|'B7'|'B8'|'B9'|'B10';
export const ACCA_A1_MODEL_ID='a1100000-2026-4acc-8a01-000000000001';
export const ACCA_A1_MODEL_SLUG='acca-fr-a1-purpose-users-reporting';
export const ACCA_A2_MODEL_ID='a1200000-2026-4acc-8a02-000000000002';
export const ACCA_A2_MODEL_SLUG='acca-fr-a2-qualitative-characteristics-cost-constraint';
export const ACCA_B3_MODEL_ID='b1300000-2026-4acc-8b03-000000000003';
export const ACCA_B3_MODEL_SLUG='acca-fr-b3-impairment-assets';
export const ACCA_B4_MODEL_ID='b1400000-2026-4acc-8b04-000000000004';
export const ACCA_B4_MODEL_SLUG='acca-fr-b4-inventories-biological-assets';
export const ACCA_B5_MODEL_ID='b1500000-2026-4acc-8b05-000000000005';
export const ACCA_B5_MODEL_SLUG='acca-fr-b5-financial-instruments';
export const ACCA_B6_MODEL_ID='b1600000-2026-4acc-8b06-000000000006';
export const ACCA_B6_MODEL_SLUG='acca-fr-b6-leasing';
export const ACCA_B7_MODEL_ID='b1700000-2026-4acc-8b07-000000000007';
export const ACCA_B7_MODEL_SLUG='acca-fr-b7-provisions-events-reporting-period';
export const ACCA_B8_MODEL_ID='b1800000-2026-4acc-8b08-000000000008';
export const ACCA_B8_MODEL_SLUG='acca-fr-b8-taxation';
export const ACCA_B9_MODEL_ID='b1900000-2026-4acc-8b09-000000000009';
export const ACCA_B9_MODEL_SLUG='acca-fr-b9-reporting-financial-non-financial-performance';
export const ACCA_B10_MODEL_ID='b2000000-2026-4acc-8b10-000000000010';
export const ACCA_B10_MODEL_SLUG='acca-fr-b10-revenue';
export const LOCAL_MODEL_LESSONS:readonly CatalogLesson[]=[
 {id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG,title:'ACCA FR A1 · Purpose and users of financial reporting',subtitle:'Local model lesson · conceptual framework, users, stewardship and materiality',sequence:1,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG,title:'ACCA FR A2 · Qualitative characteristics and the cost constraint',subtitle:'Local model lesson · relevance, faithful representation, prudence and cost',sequence:2,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B3_MODEL_ID,slug:ACCA_B3_MODEL_SLUG,title:'ACCA FR B3 · Impairment of assets',subtitle:'Local model lesson · recoverable amount, CGUs, allocation and reversals',sequence:3,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B4_MODEL_ID,slug:ACCA_B4_MODEL_SLUG,title:'ACCA FR B4 · Inventories and biological assets',subtitle:'Local model lesson · IAS 2 measurement and the IAS 41 harvest boundary',sequence:4,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B5_MODEL_ID,slug:ACCA_B5_MODEL_SLUG,title:'ACCA FR B5 · Financial instruments',subtitle:'Local model lesson · classification, effective interest and liability/equity substance',sequence:5,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B6_MODEL_ID,slug:ACCA_B6_MODEL_SLUG,title:'ACCA FR B6 · Leasing',subtitle:'Local model lesson · lease identification, liabilities and right-of-use assets',sequence:6,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B7_MODEL_ID,slug:ACCA_B7_MODEL_SLUG,title:'ACCA FR B7 · Provisions and events after the reporting period',subtitle:'Local model lesson · obligations, contingencies and IAS 10 events',sequence:7,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B8_MODEL_ID,slug:ACCA_B8_MODEL_SLUG,title:'ACCA FR B8 · Taxation',subtitle:'Local model lesson · current tax, tax bases and deferred tax',sequence:8,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B9_MODEL_ID,slug:ACCA_B9_MODEL_SLUG,title:'ACCA FR B9 · Reporting financial and non-financial performance',subtitle:'Local model lesson · disposals, IAS 8, EPS and IFRS S1',sequence:9,moduleSequence:2,estimatedMinutes:165,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B10_MODEL_ID,slug:ACCA_B10_MODEL_SLUG,title:'ACCA FR B10 · Revenue',subtitle:'Local model lesson · IFRS 15 steps, timing, costs and special arrangements',sequence:10,moduleSequence:2,estimatedMinutes:165,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
];
export function localModelCodeFor(track:P1Track,lesson:{id:string;slug:string}):LocalModelCode|null{
 if(track!=='finance')return null;
 if(lesson.id===ACCA_A1_MODEL_ID&&lesson.slug===ACCA_A1_MODEL_SLUG)return 'A1';
 if(lesson.id===ACCA_A2_MODEL_ID&&lesson.slug===ACCA_A2_MODEL_SLUG)return 'A2';
 if(lesson.id===ACCA_B3_MODEL_ID&&lesson.slug===ACCA_B3_MODEL_SLUG)return 'B3';
 if(lesson.id===ACCA_B4_MODEL_ID&&lesson.slug===ACCA_B4_MODEL_SLUG)return 'B4';
 if(lesson.id===ACCA_B5_MODEL_ID&&lesson.slug===ACCA_B5_MODEL_SLUG)return 'B5';
 if(lesson.id===ACCA_B6_MODEL_ID&&lesson.slug===ACCA_B6_MODEL_SLUG)return 'B6';
 if(lesson.id===ACCA_B7_MODEL_ID&&lesson.slug===ACCA_B7_MODEL_SLUG)return 'B7';
 if(lesson.id===ACCA_B8_MODEL_ID&&lesson.slug===ACCA_B8_MODEL_SLUG)return 'B8';
 if(lesson.id===ACCA_B9_MODEL_ID&&lesson.slug===ACCA_B9_MODEL_SLUG)return 'B9';
 if(lesson.id===ACCA_B10_MODEL_ID&&lesson.slug===ACCA_B10_MODEL_SLUG)return 'B10';
 return null;
}
export function isLocalModelLesson(track:P1Track,lesson:{id:string;slug:string}){return localModelCodeFor(track,lesson)!==null;}
export function curriculumModelPreviewEnabled(search:string){return new URLSearchParams(search).get('curriculumPreview')==='1';}

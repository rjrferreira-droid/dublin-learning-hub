import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
export type LocalModelCode='A1'|'A2'|'B3'|'B4';
export const ACCA_A1_MODEL_ID='a1100000-2026-4acc-8a01-000000000001';
export const ACCA_A1_MODEL_SLUG='acca-fr-a1-purpose-users-reporting';
export const ACCA_A2_MODEL_ID='a1200000-2026-4acc-8a02-000000000002';
export const ACCA_A2_MODEL_SLUG='acca-fr-a2-qualitative-characteristics-cost-constraint';
export const ACCA_B3_MODEL_ID='b1300000-2026-4acc-8b03-000000000003';
export const ACCA_B3_MODEL_SLUG='acca-fr-b3-impairment-assets';
export const ACCA_B4_MODEL_ID='b1400000-2026-4acc-8b04-000000000004';
export const ACCA_B4_MODEL_SLUG='acca-fr-b4-inventories-biological-assets';
export const LOCAL_MODEL_LESSONS:readonly CatalogLesson[]=[
 {id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG,title:'ACCA FR A1 · Purpose and users of financial reporting',subtitle:'Local model lesson · conceptual framework, users, stewardship and materiality',sequence:1,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG,title:'ACCA FR A2 · Qualitative characteristics and the cost constraint',subtitle:'Local model lesson · relevance, faithful representation, prudence and cost',sequence:2,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B3_MODEL_ID,slug:ACCA_B3_MODEL_SLUG,title:'ACCA FR B3 · Impairment of assets',subtitle:'Local model lesson · recoverable amount, CGUs, allocation and reversals',sequence:3,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B4_MODEL_ID,slug:ACCA_B4_MODEL_SLUG,title:'ACCA FR B4 · Inventories and biological assets',subtitle:'Local model lesson · IAS 2 measurement and the IAS 41 harvest boundary',sequence:4,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
];
export function localModelCodeFor(track:P1Track,lesson:{id:string;slug:string}):LocalModelCode|null{
 if(track!=='finance')return null;
 if(lesson.id===ACCA_A1_MODEL_ID&&lesson.slug===ACCA_A1_MODEL_SLUG)return 'A1';
 if(lesson.id===ACCA_A2_MODEL_ID&&lesson.slug===ACCA_A2_MODEL_SLUG)return 'A2';
 if(lesson.id===ACCA_B3_MODEL_ID&&lesson.slug===ACCA_B3_MODEL_SLUG)return 'B3';
 if(lesson.id===ACCA_B4_MODEL_ID&&lesson.slug===ACCA_B4_MODEL_SLUG)return 'B4';
 return null;
}
export function isLocalModelLesson(track:P1Track,lesson:{id:string;slug:string}){return localModelCodeFor(track,lesson)!==null;}
export function curriculumModelPreviewEnabled(search:string){return new URLSearchParams(search).get('curriculumPreview')==='1';}

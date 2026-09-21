import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
export type LocalModelCode='A1'|'A2';
export const ACCA_A1_MODEL_ID='a1100000-2026-4acc-8a01-000000000001';
export const ACCA_A1_MODEL_SLUG='acca-fr-a1-purpose-users-reporting';
export const ACCA_A2_MODEL_ID='a1200000-2026-4acc-8a02-000000000002';
export const ACCA_A2_MODEL_SLUG='acca-fr-a2-qualitative-characteristics-cost-constraint';
export const LOCAL_MODEL_LESSONS:readonly CatalogLesson[]=[
 {id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG,title:'ACCA FR A1 · Purpose and users of financial reporting',subtitle:'Local model lesson · conceptual framework, users, stewardship and materiality',sequence:1,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG,title:'ACCA FR A2 · Qualitative characteristics and the cost constraint',subtitle:'Local model lesson · relevance, faithful representation, prudence and cost',sequence:2,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
];
export function localModelCodeFor(track:P1Track,lesson:{id:string;slug:string}):LocalModelCode|null{
 if(track!=='finance')return null;
 if(lesson.id===ACCA_A1_MODEL_ID&&lesson.slug===ACCA_A1_MODEL_SLUG)return 'A1';
 if(lesson.id===ACCA_A2_MODEL_ID&&lesson.slug===ACCA_A2_MODEL_SLUG)return 'A2';
 return null;
}
export function isLocalModelLesson(track:P1Track,lesson:{id:string;slug:string}){return localModelCodeFor(track,lesson)!==null;}
export function curriculumModelPreviewEnabled(search:string){return new URLSearchParams(search).get('curriculumPreview')==='1';}

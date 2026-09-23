import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
export type LocalModelCode='A1'|'A2'|'A3'|'A4'|'B1'|'B2'|'B3'|'B4'|'B5'|'B6'|'B7'|'B8'|'B9'|'B10'|'B11'|'B12'|'C1'|'C2'|'C3'|'C4'|'D1'|'D2'|'E';
export const ACCA_A1_MODEL_ID='a1100000-2026-4acc-8a01-000000000001';
export const ACCA_A1_MODEL_SLUG='acca-fr-a1-purpose-users-reporting';
export const ACCA_A2_MODEL_ID='a1200000-2026-4acc-8a02-000000000002';
export const ACCA_A2_MODEL_SLUG='acca-fr-a2-qualitative-characteristics-cost-constraint';
export const ACCA_A3_MODEL_ID='a1300000-2026-4acc-8a03-000000000003';
export const ACCA_A3_MODEL_SLUG='acca-fr-a3-recognition-derecognition-measurement';
export const ACCA_A4_MODEL_ID='a1400000-2026-4acc-8a04-000000000004';
export const ACCA_A4_MODEL_SLUG='acca-fr-a4-regulation-standard-setting-ethics';
export const ACCA_B1_MODEL_ID='b1100000-2026-4acc-8b01-000000000005';
export const ACCA_B1_MODEL_SLUG='acca-fr-b1-property-plant-equipment';
export const ACCA_B2_MODEL_ID='b1200000-2026-4acc-8b02-000000000006';
export const ACCA_B2_MODEL_SLUG='acca-fr-b2-intangible-assets-development';
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
export const ACCA_B11_MODEL_ID='b2100000-2026-4acc-8b11-000000000011';
export const ACCA_B11_MODEL_SLUG='acca-fr-b11-government-grants';
export const ACCA_B12_MODEL_ID='b2200000-2026-4acc-8b12-000000000012';
export const ACCA_B12_MODEL_SLUG='acca-fr-b12-foreign-currency-transactions';
export const ACCA_C1_MODEL_ID='c1100000-2026-4acc-8c01-000000000013';
export const ACCA_C1_MODEL_SLUG='acca-fr-c1-limitations-financial-statements';
export const ACCA_C2_MODEL_ID='c1200000-2026-4acc-8c02-000000000014';
export const ACCA_C2_MODEL_SLUG='acca-fr-c2-accounting-ratios-trends';
export const ACCA_C3_MODEL_ID='c1300000-2026-4acc-8c03-000000000015';
export const ACCA_C3_MODEL_SLUG='acca-fr-c3-limitations-interpretation-techniques';
export const ACCA_C4_MODEL_ID='c1400000-2026-4acc-8c04-000000000016';
export const ACCA_C4_MODEL_SLUG='acca-fr-c4-not-for-profit-public-sector';
export const ACCA_D1_MODEL_ID='d1100000-2026-4acc-8d01-000000000017';
export const ACCA_D1_MODEL_SLUG='acca-fr-d1-single-entity-financial-statements';
export const ACCA_D2_MODEL_ID='d1200000-2026-4acc-8d02-000000000018';
export const ACCA_D2_MODEL_SLUG='acca-fr-d2-consolidated-financial-statements';
export const ACCA_E_MODEL_ID='e1000000-2026-4acc-8e01-000000000019';
export const ACCA_E_MODEL_SLUG='acca-fr-e-employability-technology-skills';
export const LOCAL_MODEL_LESSONS:readonly CatalogLesson[]=[
 {id:ACCA_A1_MODEL_ID,slug:ACCA_A1_MODEL_SLUG,title:'ACCA FR A1 · Purpose and users of financial reporting',subtitle:'Local model lesson · conceptual framework, users, stewardship and materiality',sequence:1,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_A2_MODEL_ID,slug:ACCA_A2_MODEL_SLUG,title:'ACCA FR A2 · Qualitative characteristics and the cost constraint',subtitle:'Local model lesson · relevance, faithful representation, prudence and cost',sequence:2,moduleSequence:1,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_A3_MODEL_ID,slug:ACCA_A3_MODEL_SLUG,title:'ACCA FR A3 · Recognition, derecognition and measurement',subtitle:'Local model lesson · elements, recognition, measurement bases and unit of account',sequence:3,moduleSequence:1,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_A4_MODEL_ID,slug:ACCA_A4_MODEL_SLUG,title:'ACCA FR A4 · Regulation, standard setting and ethical reporting judgement',subtitle:'Local model lesson · regulation, institutional roles, due process and ethics',sequence:4,moduleSequence:1,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-conceptual-framework',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B1_MODEL_ID,slug:ACCA_B1_MODEL_SLUG,title:'ACCA FR B1 · Property, plant and equipment',subtitle:'Local model lesson · cost, depreciation, components, revaluation and disposal',sequence:5,moduleSequence:2,estimatedMinutes:180,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B2_MODEL_ID,slug:ACCA_B2_MODEL_SLUG,title:'ACCA FR B2 · Intangible assets and development expenditure',subtitle:'Local model lesson · identifiability, development criteria and amortisation',sequence:6,moduleSequence:2,estimatedMinutes:180,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B3_MODEL_ID,slug:ACCA_B3_MODEL_SLUG,title:'ACCA FR B3 · Impairment of assets',subtitle:'Local model lesson · recoverable amount, CGUs, allocation and reversals',sequence:7,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B4_MODEL_ID,slug:ACCA_B4_MODEL_SLUG,title:'ACCA FR B4 · Inventories and biological assets',subtitle:'Local model lesson · IAS 2 measurement and the IAS 41 harvest boundary',sequence:8,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B5_MODEL_ID,slug:ACCA_B5_MODEL_SLUG,title:'ACCA FR B5 · Financial instruments',subtitle:'Local model lesson · classification, effective interest and liability/equity substance',sequence:9,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B6_MODEL_ID,slug:ACCA_B6_MODEL_SLUG,title:'ACCA FR B6 · Leasing',subtitle:'Local model lesson · lease identification, liabilities and right-of-use assets',sequence:10,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B7_MODEL_ID,slug:ACCA_B7_MODEL_SLUG,title:'ACCA FR B7 · Provisions and events after the reporting period',subtitle:'Local model lesson · obligations, contingencies and IAS 10 events',sequence:11,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B8_MODEL_ID,slug:ACCA_B8_MODEL_SLUG,title:'ACCA FR B8 · Taxation',subtitle:'Local model lesson · current tax, tax bases and deferred tax',sequence:12,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B9_MODEL_ID,slug:ACCA_B9_MODEL_SLUG,title:'ACCA FR B9 · Reporting financial and non-financial performance',subtitle:'Local model lesson · disposals, IAS 8, EPS and IFRS S1',sequence:13,moduleSequence:2,estimatedMinutes:165,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B10_MODEL_ID,slug:ACCA_B10_MODEL_SLUG,title:'ACCA FR B10 · Revenue',subtitle:'Local model lesson · IFRS 15 steps, timing, costs and special arrangements',sequence:14,moduleSequence:2,estimatedMinutes:165,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B11_MODEL_ID,slug:ACCA_B11_MODEL_SLUG,title:'ACCA FR B11 · Government grants',subtitle:'Local model lesson · recognition, presentation, asset grants and repayment',sequence:15,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_B12_MODEL_ID,slug:ACCA_B12_MODEL_SLUG,title:'ACCA FR B12 · Foreign currency transactions',subtitle:'Local model lesson · functional currency, initial recognition and reporting-date translation',sequence:16,moduleSequence:2,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-accounting-transactions',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_C1_MODEL_ID,slug:ACCA_C1_MODEL_SLUG,title:'ACCA FR C1 · Limitations of financial statements',subtitle:'Local model lesson · historical information, manipulation, seasonality and group limits',sequence:17,moduleSequence:3,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-analysis-interpretation',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_C2_MODEL_ID,slug:ACCA_C2_MODEL_SLUG,title:'ACCA FR C2 · Accounting ratios and trends',subtitle:'Local model lesson · profitability, liquidity, efficiency, gearing and stakeholder analysis',sequence:18,moduleSequence:3,estimatedMinutes:180,track:'finance',moduleSlug:'acca-fr-analysis-interpretation',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_C3_MODEL_ID,slug:ACCA_C3_MODEL_SLUG,title:'ACCA FR C3 · Limitations of interpretation techniques',subtitle:'Local model lesson · ratio limits, policies, cash-flow evidence and EPS trends',sequence:19,moduleSequence:3,estimatedMinutes:165,track:'finance',moduleSlug:'acca-fr-analysis-interpretation',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_C4_MODEL_ID,slug:ACCA_C4_MODEL_SLUG,title:'ACCA FR C4 · Not-for-profit and public sector entities',subtitle:'Local model lesson · service objectives, accountability, funding and outcome measures',sequence:20,moduleSequence:3,estimatedMinutes:150,track:'finance',moduleSlug:'acca-fr-analysis-interpretation',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_D1_MODEL_ID,slug:ACCA_D1_MODEL_SLUG,title:'ACCA FR D1 · Single entity financial statements',subtitle:'Local model lesson · primary statements, equity movements and indirect cash flow',sequence:21,moduleSequence:4,estimatedMinutes:210,track:'finance',moduleSlug:'acca-fr-financial-statements',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_D2_MODEL_ID,slug:ACCA_D2_MODEL_SLUG,title:'ACCA FR D2 · Consolidated financial statements',subtitle:'Local model lesson · control, goodwill, NCI, associates and group adjustments',sequence:22,moduleSequence:4,estimatedMinutes:240,track:'finance',moduleSlug:'acca-fr-financial-statements',courseSlug:'acca-fr-local-model',origin:'local-model'},
 {id:ACCA_E_MODEL_ID,slug:ACCA_E_MODEL_SLUG,title:'ACCA FR E · Employability and technology skills',subtitle:'Local capstone · efficient information handling, response tools and presentation',sequence:23,moduleSequence:5,estimatedMinutes:120,track:'finance',moduleSlug:'acca-fr-employability-technology',courseSlug:'acca-fr-local-model',origin:'local-model'},
];
export function localModelCodeFor(track:P1Track,lesson:{id:string;slug:string}):LocalModelCode|null{
 if(track!=='finance')return null;
 if(lesson.id===ACCA_A1_MODEL_ID&&lesson.slug===ACCA_A1_MODEL_SLUG)return 'A1';
 if(lesson.id===ACCA_A2_MODEL_ID&&lesson.slug===ACCA_A2_MODEL_SLUG)return 'A2';
 if(lesson.id===ACCA_A3_MODEL_ID&&lesson.slug===ACCA_A3_MODEL_SLUG)return 'A3';
 if(lesson.id===ACCA_A4_MODEL_ID&&lesson.slug===ACCA_A4_MODEL_SLUG)return 'A4';
 if(lesson.id===ACCA_B1_MODEL_ID&&lesson.slug===ACCA_B1_MODEL_SLUG)return 'B1';
 if(lesson.id===ACCA_B2_MODEL_ID&&lesson.slug===ACCA_B2_MODEL_SLUG)return 'B2';
 if(lesson.id===ACCA_B3_MODEL_ID&&lesson.slug===ACCA_B3_MODEL_SLUG)return 'B3';
 if(lesson.id===ACCA_B4_MODEL_ID&&lesson.slug===ACCA_B4_MODEL_SLUG)return 'B4';
 if(lesson.id===ACCA_B5_MODEL_ID&&lesson.slug===ACCA_B5_MODEL_SLUG)return 'B5';
 if(lesson.id===ACCA_B6_MODEL_ID&&lesson.slug===ACCA_B6_MODEL_SLUG)return 'B6';
 if(lesson.id===ACCA_B7_MODEL_ID&&lesson.slug===ACCA_B7_MODEL_SLUG)return 'B7';
 if(lesson.id===ACCA_B8_MODEL_ID&&lesson.slug===ACCA_B8_MODEL_SLUG)return 'B8';
 if(lesson.id===ACCA_B9_MODEL_ID&&lesson.slug===ACCA_B9_MODEL_SLUG)return 'B9';
 if(lesson.id===ACCA_B10_MODEL_ID&&lesson.slug===ACCA_B10_MODEL_SLUG)return 'B10';
 if(lesson.id===ACCA_B11_MODEL_ID&&lesson.slug===ACCA_B11_MODEL_SLUG)return 'B11';
 if(lesson.id===ACCA_B12_MODEL_ID&&lesson.slug===ACCA_B12_MODEL_SLUG)return 'B12';
 if(lesson.id===ACCA_C1_MODEL_ID&&lesson.slug===ACCA_C1_MODEL_SLUG)return 'C1';
 if(lesson.id===ACCA_C2_MODEL_ID&&lesson.slug===ACCA_C2_MODEL_SLUG)return 'C2';
 if(lesson.id===ACCA_C3_MODEL_ID&&lesson.slug===ACCA_C3_MODEL_SLUG)return 'C3';
 if(lesson.id===ACCA_C4_MODEL_ID&&lesson.slug===ACCA_C4_MODEL_SLUG)return 'C4';
 if(lesson.id===ACCA_D1_MODEL_ID&&lesson.slug===ACCA_D1_MODEL_SLUG)return 'D1';
 if(lesson.id===ACCA_D2_MODEL_ID&&lesson.slug===ACCA_D2_MODEL_SLUG)return 'D2';
 if(lesson.id===ACCA_E_MODEL_ID&&lesson.slug===ACCA_E_MODEL_SLUG)return 'E';
 return null;
}
export function isLocalModelLesson(track:P1Track,lesson:{id:string;slug:string}){return localModelCodeFor(track,lesson)!==null;}

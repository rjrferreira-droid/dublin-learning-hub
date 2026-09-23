import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';

export type LocalPayrollCode='P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7';

type PayrollIdentity={id:string;slug:string};

export const PAYROLL_IDENTITIES:Readonly<Record<LocalPayrollCode,PayrollIdentity>>={
 P1:{id:'fa110000-2026-4fa1-8a01-000000000001',slug:'rpn-pay-date-employment-id-payroll-submission'},
 P2:{id:'fa120000-2026-4fa1-8a02-000000000002',slug:'gross-pay-taxable-bases-deductions-pension'},
 P3:{id:'fa130000-2026-4fa1-8a03-000000000003',slug:'benefits-notional-pay-employer-items'},
 P4:{id:'fa140000-2026-4fa1-8a04-000000000004',slug:'payroll-corrections-overpayments-reconciliation'},
 P5:{id:'fa150000-2026-4fa1-8a05-000000000005',slug:'starters-leavers-post-cessation-identity'},
 P6:{id:'fa160000-2026-4fa1-8a06-000000000006',slug:'employee-queries-net-pay-evidence'},
 P7:{id:'fa170000-2026-4fa1-8a07-000000000007',slug:'payroll-controls-month-end-finance-handoff'},
};

export const LOCAL_PAYROLL_LESSONS:readonly CatalogLesson[]=[
 {id:PAYROLL_IDENTITIES.P1.id,slug:PAYROLL_IDENTITIES.P1.slug,title:'Unit 1 · Payroll identity, RPN and pay-date workflow',subtitle:'Irish Payroll · connect employee identity, the applicable RPN, pay date and submission evidence',sequence:1,moduleSequence:1,estimatedMinutes:75,track:'payroll',moduleSlug:'payroll-foundations',courseSlug:'irish-payroll-viviane-local',origin:'local-model'},
 {id:PAYROLL_IDENTITIES.P2.id,slug:PAYROLL_IDENTITIES.P2.slug,title:'Unit 2 · Gross pay, taxable bases and deductions',subtitle:'Irish Payroll · build a controlled gross-to-net explanation without inventing statutory inputs',sequence:2,moduleSequence:2,estimatedMinutes:90,track:'payroll',moduleSlug:'payroll-calculation',courseSlug:'irish-payroll-viviane-local',origin:'local-model'},
 {id:PAYROLL_IDENTITIES.P3.id,slug:PAYROLL_IDENTITIES.P3.slug,title:'Unit 3 · Benefits, notional pay and employer items',subtitle:'Irish Payroll · classify employee and employer items and protect the calculation boundary',sequence:3,moduleSequence:2,estimatedMinutes:80,track:'payroll',moduleSlug:'payroll-calculation',courseSlug:'irish-payroll-viviane-local',origin:'local-model'},
 {id:PAYROLL_IDENTITIES.P4.id,slug:PAYROLL_IDENTITIES.P4.slug,title:'Unit 4 · Corrections, overpayments and reconciliation',subtitle:'Irish Payroll · investigate differences, correct the supported record and preserve the audit trail',sequence:4,moduleSequence:3,estimatedMinutes:85,track:'payroll',moduleSlug:'payroll-controls',courseSlug:'irish-payroll-viviane-local',origin:'local-model'},
 {id:PAYROLL_IDENTITIES.P5.id,slug:PAYROLL_IDENTITIES.P5.slug,title:'Unit 5 · Starters, leavers and employment continuity',subtitle:'Irish Payroll · control effective dates, Employment ID and post-cessation processing',sequence:5,moduleSequence:4,estimatedMinutes:80,track:'payroll',moduleSlug:'payroll-lifecycle',courseSlug:'irish-payroll-viviane-local',origin:'local-model'},
 {id:PAYROLL_IDENTITIES.P6.id,slug:PAYROLL_IDENTITIES.P6.slug,title:'Unit 6 · Employee queries and net-pay evidence',subtitle:'Irish Payroll · respond calmly, protect privacy and separate facts from investigation',sequence:6,moduleSequence:5,estimatedMinutes:75,track:'payroll',moduleSlug:'payroll-employee-service',courseSlug:'irish-payroll-viviane-local',origin:'local-model'},
 {id:PAYROLL_IDENTITIES.P7.id,slug:PAYROLL_IDENTITIES.P7.slug,title:'Unit 7 · Payroll controls and month-end handoff',subtitle:'Irish Payroll · reconcile the run, communicate exceptions and complete a controlled handoff',sequence:7,moduleSequence:6,estimatedMinutes:90,track:'payroll',moduleSlug:'payroll-month-end',courseSlug:'irish-payroll-viviane-local',origin:'local-model'},
];

export function localPayrollCodeFor(track:P1Track,lesson:{id:string;slug:string}):LocalPayrollCode|null{
 if(track!=='payroll')return null;
 for(const code of Object.keys(PAYROLL_IDENTITIES) as LocalPayrollCode[]){
  const identity=PAYROLL_IDENTITIES[code];
  if(identity.id===lesson.id&&identity.slug===lesson.slug)return code;
 }
 return null;
}


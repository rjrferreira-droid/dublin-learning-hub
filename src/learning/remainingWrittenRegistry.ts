import type {P1Track} from './p1RuntimeRegistry.ts';
export type RemainingSequence=5|6|7|8;
const slugs:Readonly<Record<P1Track,Readonly<Record<RemainingSequence,string>>>>={
  "finance": {
    "5": "receivables-classification-ecl-evidence",
    "6": "consolidation-control-eliminations-package",
    "7": "income-tax-current-deferred-reporting",
    "8": "frs102-irish-reporting-basis-bridge"
  },
  "payroll": {
    "5": "payroll-corrections-overpayments-reconciliation",
    "6": "starters-leavers-post-cessation-identity",
    "7": "employee-queries-net-pay-evidence",
    "8": "payroll-controls-month-end-finance-handoff"
  },
  "english": {
    "5": "recommendation-presentation-follow-up",
    "6": "disagree-challenge-resolve-professionally",
    "7": "interview-experience-judgement-stories",
    "8": "workplace-listening-preparation-irish-exposure"
  }
};
export const remainingSlugFor=(track:P1Track,sequence:RemainingSequence)=>slugs[track][sequence];
export function remainingSequenceFor(track:P1Track,slug:string):RemainingSequence|null{
 for(const n of [5,6,7,8] as const)if(slugs[track][n]===slug)return n;
 return null;
}
export const isRemainingWrittenSlug=(track:P1Track,slug:string)=>remainingSequenceFor(track,slug)!==null;

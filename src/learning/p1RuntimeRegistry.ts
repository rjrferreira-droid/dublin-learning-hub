export type P1Track='finance'|'payroll'|'english';

const P1_SLUGS:Readonly<Record<P1Track,string>>={
 finance:'revenue-judgement-contracts-performance-obligations-cutoff',
 payroll:'rpn-pay-date-employment-id-payroll-submission',
 english:'clarify-check-understanding-handle-meetings',
};

export function p1SlugFor(track:P1Track){return P1_SLUGS[track];}
export function isP1Slug(track:P1Track,slug:string){return P1_SLUGS[track]===slug;}

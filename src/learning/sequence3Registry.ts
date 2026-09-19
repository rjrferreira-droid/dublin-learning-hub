import type {P1Track} from './p1RuntimeRegistry.ts';
const slugs:Readonly<Record<P1Track,string>>={
 finance:'leases-recognition-close-controls-local-frameworks',
 payroll:'gross-pay-taxable-bases-deductions-pension',
 english:'explain-variances-numbers-recommendations',
};
export const sequence3SlugFor=(track:P1Track)=>slugs[track];
export const isSequence3Slug=(track:P1Track,slug:string)=>slugs[track]===slug;

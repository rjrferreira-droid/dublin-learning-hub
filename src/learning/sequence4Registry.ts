import type {P1Track} from './p1RuntimeRegistry.ts';
const slugs:Readonly<Record<P1Track,string>>={
 finance:'cash-flow-working-capital-management-story',
 payroll:'benefits-notional-pay-employer-items',
 english:'professional-emails-requests-follow-up',
};
export const sequence4SlugFor=(track:P1Track)=>slugs[track];
export const isSequence4Slug=(track:P1Track,slug:string)=>slugs[track]===slug;

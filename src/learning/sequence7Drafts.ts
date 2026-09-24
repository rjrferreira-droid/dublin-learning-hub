import type {P1Track} from './p1RuntimeRegistry.ts';
import finance from '../../quality/drafts/sequence7-finance.json' with {type:'json'};
import payroll from '../../quality/drafts/sequence7-payroll.json' with {type:'json'};
import english from '../../quality/drafts/sequence7-english.json' with {type:'json'};
const drafts={finance,payroll,english};
export const draftFor=(track:P1Track)=>drafts[track];

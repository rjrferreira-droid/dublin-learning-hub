import type {CatalogLesson} from './curriculumCatalogCore.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';

export type VivianeEnglishCode=
 |'VE1'|'VE2'|'VE3'|'VE4'|'VE5'|'VE6'|'VE7'|'VE8'
 |'VE9'|'VE10'|'VE11'|'VE12'|'VE13'|'VE14'|'VE15'|'VE16'
 |'VP1'|'VP2'|'VP3'|'VP4';

type VivianeEnglishIdentity={id:string;slug:string};

export const VIVIANE_ENGLISH_IDENTITIES:Readonly<Record<VivianeEnglishCode,VivianeEnglishIdentity>>={
 VE1:{id:'f1100000-2026-4f11-8f01-000000000001',slug:'viviane-story-past-forms-rhythm-follow-up'},
 VE2:{id:'f1200000-2026-4f12-8f02-000000000002',slug:'viviane-dublin-weather-plans-small-talk'},
 VE3:{id:'f1300000-2026-4f13-8f03-000000000003',slug:'viviane-appointments-rescheduling-phone-clarification'},
 VE4:{id:'f1400000-2026-4f14-8f04-000000000004',slug:'viviane-housing-repairs-access-follow-up'},
 VE5:{id:'f1500000-2026-4f15-8f05-000000000005',slug:'viviane-school-conversation-observation-next-step'},
 VE6:{id:'f1600000-2026-4f16-8f06-000000000006',slug:'viviane-shopping-returns-comparisons-resolution'},
 VE7:{id:'f1700000-2026-4f17-8f07-000000000007',slug:'viviane-restaurants-preferences-orders-problems'},
 VE8:{id:'f1800000-2026-4f18-8f08-000000000008',slug:'viviane-family-plans-playdates-routines'},
 VE9:{id:'f1900000-2026-4f19-8f09-000000000009',slug:'viviane-news-opinions-polite-disagreement'},
 VE10:{id:'f1a00000-2026-4f1a-8f10-000000000010',slug:'viviane-tv-films-hobbies-recommendations'},
 VE11:{id:'f1b00000-2026-4f1b-8f11-000000000011',slug:'viviane-pharmacy-symptoms-instructions-follow-up'},
 VE12:{id:'f1c00000-2026-4f1c-8f12-000000000012',slug:'viviane-transport-directions-delays-alternatives'},
 VE13:{id:'f1d00000-2026-4f1d-8f13-000000000013',slug:'viviane-neighbours-community-invitations-boundaries'},
 VE14:{id:'f1e00000-2026-4f1e-8f14-000000000014',slug:'viviane-utilities-customer-service-reference-follow-up'},
 VE15:{id:'f1f00000-2026-4f1f-8f15-000000000015',slug:'viviane-travel-airport-hotel-lost-luggage'},
 VE16:{id:'f2000000-2026-4f20-8f16-000000000016',slug:'viviane-everyday-admin-forms-deliveries-deadlines'},
 VP1:{id:'f2100000-2026-4f21-8f21-000000000017',slug:'viviane-payroll-experience-interview-evidence'},
 VP2:{id:'f2200000-2026-4f22-8f22-000000000018',slug:'viviane-employee-payroll-query-privacy-follow-up'},
 VP3:{id:'f2300000-2026-4f23-8f23-000000000019',slug:'viviane-employee-movements-benefits-cut-off'},
 VP4:{id:'f2400000-2026-4f24-8f24-000000000020',slug:'viviane-payroll-status-controls-manager-update'},
};

type LessonSeed={code:VivianeEnglishCode;title:string;subtitle:string;sequence:number;minutes?:number};
const everyday=(code:VivianeEnglishCode,title:string,subtitle:string,sequence:number,minutes=45):LessonSeed=>({code,title,subtitle,sequence,minutes});
const professional=(code:VivianeEnglishCode,title:string,subtitle:string,sequence:number,minutes=50):LessonSeed=>({code,title,subtitle,sequence,minutes});

const seeds:readonly LessonSeed[]=[
 everyday('VE1','Tell a story naturally: past forms, rhythm & follow-up questions','Everyday English · tell a clear story and keep the conversation moving',1),
 everyday('VE2','Everyday Dublin: weather, plans and natural small talk','Everyday English · react naturally, adjust plans and ask useful follow-up questions',2),
 everyday('VE3','Appointments: confirm, reschedule and clarify by phone','Everyday English · manage times, spell details and repair misunderstandings',3),
 everyday('VE4','Housing: report a repair and arrange access','Everyday English · describe evidence, avoid guessing and confirm the next step',4),
 professional('VP1','Payroll interviews: explain your experience with evidence','Professional English · present Payroll and People Operations experience without overclaiming',5),
 everyday('VE5','School conversations: share observations and agree a next step','Everyday English · ask neutral questions, clarify routines and confirm follow-up',6),
 everyday('VE6','Shopping and returns: compare options and resolve a problem','Everyday English · ask about products, explain an issue and negotiate a practical outcome',7),
 everyday('VE7','Restaurants: express preferences and handle the order naturally','Everyday English · choose, order, clarify and solve a small problem politely',8),
 everyday('VE8','Family plans: arrange playdates, routines and weekends','Everyday English · coordinate people, preferences, timing and changes',9),
 professional('VP2','Employee payroll queries: clarify, protect privacy and follow up','Professional English · respond calmly, separate known facts from investigation and close the loop',10),
 everyday('VE9','News and current topics: express a view and disagree politely','Everyday English · distinguish fact from opinion and keep the conversation open',11,50),
 everyday('VE10','TV, films and hobbies: recommend, react and keep talking','Everyday English · describe taste, avoid spoilers and build a natural exchange',12),
 everyday('VE11','At the pharmacy: describe symptoms and check instructions','Everyday English · give clear information, ask for clarification and repeat instructions safely',13),
 everyday('VE12','Transport in Dublin: ask directions and handle delays','Everyday English · confirm routes, understand changes and choose an alternative',14),
 professional('VP3','Employee movements: onboarding, benefits and payroll cut-off','Professional English · coordinate dates, documents, owners and confirmed changes',15,55),
 everyday('VE13','Neighbours and community: invitations, requests and boundaries','Everyday English · make friendly contact, decline politely and solve small shared issues',16),
 everyday('VE14','Customer service: utilities, internet and reference numbers','Everyday English · explain a service problem, navigate questions and agree follow-up',17),
 everyday('VE15','Travel: airports, hotels and lost luggage','Everyday English · give booking details, report a problem and confirm the recovery process',18,50),
 everyday('VE16','Everyday admin: forms, deliveries and deadlines','Everyday English · understand requirements, correct details and track a pending action',19),
 professional('VP4','Payroll status updates: controls, blockers and manager communication','Professional English · give a concise update with evidence, ownership and escalation',20,55),
];

export const LOCAL_VIVIANE_ENGLISH_LESSONS:readonly CatalogLesson[]=seeds.map(seed=>{
 const identity=VIVIANE_ENGLISH_IDENTITIES[seed.code];
 const professionalLesson=seed.code.startsWith('VP');
 return {
  id:identity.id,slug:identity.slug,title:seed.title,subtitle:seed.subtitle,sequence:seed.sequence,
  moduleSequence:professionalLesson?2:1,estimatedMinutes:seed.minutes??45,track:'english',
  moduleSlug:professionalLesson?'english-viviane-people-operations':'english-viviane-everyday',
  courseSlug:'english-viviane-80-20-local',origin:'local-model',
 };
});

export function localVivianeEnglishCodeFor(track:P1Track,lesson:{id:string;slug:string}):VivianeEnglishCode|null{
 if(track!=='english')return null;
 for(const [code,identity] of Object.entries(VIVIANE_ENGLISH_IDENTITIES) as [VivianeEnglishCode,VivianeEnglishIdentity][]){
  if(lesson.id===identity.id&&lesson.slug===identity.slug)return code;
 }
 return null;
}

export function isLocalVivianeEnglishLesson(track:P1Track,lesson:{id:string;slug:string}){return localVivianeEnglishCodeFor(track,lesson)!==null;}

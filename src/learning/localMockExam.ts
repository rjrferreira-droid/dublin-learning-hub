import {ACCA_FR_FULL_MOCK_1} from './localFullMockExam.ts';

export const LOCAL_MOCK_PROGRESS_KEY_PREFIX='learning-hub:local-mock-progress:v1';
export const LOCAL_MOCK_REVIEW_STAGES=['D+1','D+7','D+30'] as const;
export type LocalMockReviewStage=typeof LOCAL_MOCK_REVIEW_STAGES[number];

export type MockObjectiveQuestion={id:string;topic:string;prompt:string;options:readonly string[];correctIndex:number;explanation:string};
export type MockMarkingPoint={id:string;label:string;guidance:string;marks:number};
export type MockConstructedResponse={id:string;title:string;scenario:readonly string[];requirements:readonly string[];markingGuide:readonly MockMarkingPoint[]};
type LocalMockBase={id:string;title:string;subtitle:string;focusAreas:readonly string[];durationMinutes:number;objectiveMarks:number;constructedMarks:number;equivalenceNotice:string};
export type LocalMiniMockExam=LocalMockBase&{format:'mini';objectiveQuestions:readonly MockObjectiveQuestion[];constructed:MockConstructedResponse};
export type MockCase={id:string;title:string;scenario:readonly string[];questions:readonly MockObjectiveQuestion[]};
export type LocalFullMockExam=LocalMockBase&{format:'full';sectionAQuestions:readonly MockObjectiveQuestion[];sectionBCases:readonly MockCase[];sectionCResponses:readonly MockConstructedResponse[]};
export type LocalMockExam=LocalMiniMockExam|LocalFullMockExam;
export type LocalMockAttempt={id:string;submittedAt:string;objectiveCorrect:number;objectiveTotal:number;constructedMarks:number;totalMarks:number;elapsedSeconds:number};
export type LocalMockReview={reviewedAt:string;totalMarks:number;maximumMarks:number};
export type LocalMockProgress={version:1;attempts:Record<string,LocalMockAttempt[]>;reviews:Record<string,Partial<Record<LocalMockReviewStage,LocalMockReview>>>};
export type LocalMockReviewItem={stage:LocalMockReviewStage;dueAt:string;status:'due'|'scheduled'};

const DAY_MS=24*60*60*1000;
const REVIEW_DAYS:Record<LocalMockReviewStage,number>={'D+1':1,'D+7':7,'D+30':30};
const empty=():LocalMockProgress=>({version:1,attempts:{},reviews:{}});
const validId=(value:unknown)=>typeof value==='string'&&/^[0-9a-z-]{3,100}$/i.test(value);
const validDate=(value:unknown)=>typeof value==='string'&&!Number.isNaN(Date.parse(value));
const boundedInt=(value:unknown,min:number,max:number)=>Number.isInteger(value)&&Number(value)>=min&&Number(value)<=max?Number(value):null;
const scopedKey=(scope:string)=>`${LOCAL_MOCK_PROGRESS_KEY_PREFIX}:${/^[0-9a-z-]{1,80}$/i.test(scope)?scope:'default'}`;

export const ACCA_FR_MOCK_1:LocalMiniMockExam={
 format:'mini',equivalenceNotice:'Partial 30-minute drill. It is not equivalent to the official 3-hour, 100-mark ACCA FR examination.',
 id:'acca-fr-mini-mock-01',title:'ACCA FR Mini Mock 01',subtitle:'Recognition, measurement, group reporting and performance analysis',focusAreas:['PPE and revenue','Provisions and tax','Consolidation','Performance analysis'],durationMinutes:30,objectiveMarks:12,constructedMarks:8,
 objectiveQuestions:[
  {id:'fr-m1-q1',topic:'IAS 16 · PPE',prompt:'A machine costs €120,000, has a €12,000 residual value and a six-year useful life. Using straight-line depreciation, what is the annual charge?',options:['€18,000','€20,000','€22,000','€108,000'],correctIndex:0,explanation:'Depreciable amount is €108,000 (€120,000 less €12,000), divided by six years: €18,000.'},
  {id:'fr-m1-q2',topic:'IFRS 15 · Revenue',prompt:'When is revenue recognised for a performance obligation satisfied over time?',options:['Only when cash is collected','As progress towards complete satisfaction is measured','Only when the legal contract expires','Whenever management forecasts a profit'],correctIndex:1,explanation:'For an obligation satisfied over time, revenue follows a faithful measure of progress towards complete satisfaction.'},
  {id:'fr-m1-q3',topic:'IAS 37 · Provisions',prompt:'Which combination supports recognition of a provision?',options:['Possible obligation and remote outflow','Present obligation, probable outflow and reliable estimate','Future operating loss approved by the board','Possible inflow and reliable estimate'],correctIndex:1,explanation:'A provision requires a present obligation from a past event, a probable outflow and a sufficiently reliable estimate.'},
  {id:'fr-m1-q4',topic:'IAS 12 · Deferred tax',prompt:'An asset has a carrying amount of €90,000 and a tax base of €70,000. Ignoring exemptions, what arises?',options:['Deductible temporary difference of €20,000','Taxable temporary difference of €20,000','Permanent difference of €90,000','No difference until the asset is sold'],correctIndex:1,explanation:'For an asset, carrying amount above tax base creates a taxable temporary difference of €20,000.'},
  {id:'fr-m1-q5',topic:'Consolidation',prompt:'A parent sells inventory to its subsidiary for €50,000 at a 25% mark-up on cost. Half remains in the group at year end. What unrealised profit is eliminated?',options:['€5,000','€6,250','€10,000','€12,500'],correctIndex:0,explanation:'Cost is €40,000 and total profit is €10,000. Half remains, so €5,000 is unrealised.'},
  {id:'fr-m1-q6',topic:'Performance analysis',prompt:'Revenue rises by 20% while operating profit falls. Which conclusion is best supported?',options:['Liquidity definitely improved','Operating margin fell','Gross margin must have risen','The entity generated positive cash flow'],correctIndex:1,explanation:'If operating profit falls while revenue rises, operating profit as a percentage of revenue necessarily falls. The other conclusions require more evidence.'}
 ],
 constructed:{id:'fr-m1-cr',title:'Performance analysis drill',
  scenario:[
   'North Quay Ltd reported revenue of €12.0m, gross profit of €3.6m, operating profit of €1.2m and capital employed of €7.5m for 2026.',
   'For 2025, revenue was €10.0m, gross profit €3.4m, operating profit €1.4m and capital employed €7.0m.',
   'Management says the new product launch made 2026 an unequivocally stronger year. No cash-flow, segment or industry benchmark information has been provided.'
  ],
  requirements:[
   'Calculate revenue growth, gross margin, operating margin and return on capital employed for both years where applicable.',
   'Write a concise note evaluating the claim, using the calculated trends and at least one limitation of the available evidence.'
  ],
  markingGuide:[
   {id:'fr-m1-m1',label:'Revenue growth: 20%',guidance:'(€12.0m − €10.0m) / €10.0m = 20%.',marks:1},
   {id:'fr-m1-m2',label:'Gross margin: 30.0% in 2026',guidance:'€3.6m / €12.0m = 30.0%.',marks:1},
   {id:'fr-m1-m3',label:'Gross margin: 34.0% in 2025',guidance:'€3.4m / €10.0m = 34.0%.',marks:1},
   {id:'fr-m1-m4',label:'Operating margin: 10.0% vs 14.0%',guidance:'€1.2m / €12.0m = 10.0%; €1.4m / €10.0m = 14.0%.',marks:1},
   {id:'fr-m1-m5',label:'ROCE: 16.0% vs 20.0%',guidance:'€1.2m / €7.5m = 16.0%; €1.4m / €7.0m = 20.0%.',marks:1},
   {id:'fr-m1-m6',label:'Interprets gross-margin pressure',guidance:'Explains that gross profit grew more slowly than revenue, so cost of sales consumed a larger share.',marks:1},
   {id:'fr-m1-m7',label:'Challenges the unequivocal claim',guidance:'Balances strong revenue growth against weaker operating margin and ROCE.',marks:1},
   {id:'fr-m1-m8',label:'States an evidence limitation',guidance:'For example, the absence of cash-flow, segment, one-off cost or industry benchmark data.',marks:1}
  ]
 }
};

export const ACCA_FR_MOCK_2:LocalMiniMockExam={
 format:'mini',equivalenceNotice:'Partial 30-minute drill. It is not equivalent to the official 3-hour, 100-mark ACCA FR examination.',
 id:'acca-fr-mini-mock-02',title:'ACCA FR Mini Mock 02',subtitle:'Inventory, foreign currency, financial instruments, leases and cash-flow interpretation',focusAreas:['Inventory and FX','Financial instruments','Leases and EPS','Cash flow and liquidity'],durationMinutes:30,objectiveMarks:12,constructedMarks:8,
 objectiveQuestions:[
  {id:'fr-m2-q1',topic:'IAS 2 · Inventories',prompt:'An item of inventory cost €48,000. Its estimated selling price is €50,000 and the costs necessary to complete and sell it are €5,000. At what amount should it be measured?',options:['€45,000','€48,000','€50,000','€53,000'],correctIndex:0,explanation:'Net realisable value is €45,000 (€50,000 less €5,000). IAS 2 requires the lower of cost and net realisable value, so the inventory is written down to €45,000.'},
  {id:'fr-m2-q2',topic:'IAS 21 · Foreign currency',prompt:'A euro-functional entity records a $100,000 supplier payable when €1 = $1.25. It settles when €1 = $1.20. Ignoring transaction costs, what exchange difference arises?',options:['€3,333 gain','€3,333 loss','€5,000 gain','No exchange difference'],correctIndex:1,explanation:'The payable rises from €80,000 ($100,000 / 1.25) to about €83,333 ($100,000 / 1.20). The €3,333 increase is an exchange loss in profit or loss.'},
  {id:'fr-m2-q3',topic:'IFRS 9 · Financial assets',prompt:'Which pair of conditions supports amortised-cost measurement of a financial asset?',options:['Held for trading and variable equity returns','Held to collect contractual cash flows that are solely principal and interest','Held to sell immediately and designated at fair value','Managed on a fair-value basis and containing equity exposure'],correctIndex:1,explanation:'Amortised cost requires a hold-to-collect business model and contractual cash flows that are solely payments of principal and interest on the principal outstanding.'},
  {id:'fr-m2-q4',topic:'IFRS 16 · Leases',prompt:'Subject to the permitted recognition exemptions, what does a lessee recognise at lease commencement?',options:['Only straight-line rent expense','A right-of-use asset and a lease liability','Only the underlying legal asset','A provision with no corresponding asset'],correctIndex:1,explanation:'IFRS 16 generally requires a lessee to recognise a right-of-use asset for the right to use the underlying asset and a lease liability for the payment obligation.'},
  {id:'fr-m2-q5',topic:'IAS 7 · Cash flows',prompt:'How is cash paid to acquire an item of property, plant and equipment normally classified in the statement of cash flows?',options:['Operating activity','Investing activity','Financing activity','Cash equivalent movement'],correctIndex:1,explanation:'Acquiring a long-term productive asset is normally an investing cash flow because it represents expenditure on a resource intended to generate future income and cash flows.'},
  {id:'fr-m2-q6',topic:'IAS 33 · Earnings per share',prompt:'Profit attributable to ordinary shareholders is €2.4m and the weighted-average number of ordinary shares is 1.2m. What is basic earnings per share?',options:['€0.50','€1.20','€2.00','€2.88'],correctIndex:2,explanation:'Basic earnings per share is profit attributable to ordinary shareholders divided by the weighted-average number of ordinary shares: €2.4m / 1.2m = €2.00.'}
 ],
 constructed:{id:'fr-m2-cr',title:'Cash-flow interpretation drill',
  scenario:[
   'Harbour Tech Ltd reported revenue of €15.0m and operating profit of €1.8m for 2026. Revenue was €13.5m and operating profit was €1.9m for 2025.',
   'The 2026 operating profit includes depreciation of €0.6m and a €0.1m loss on disposal of equipment. During 2026, inventory increased by €0.7m, trade receivables decreased by €0.2m and trade payables decreased by €0.3m.',
   'At 31 December 2026, current assets were €3.52m, including inventory of €1.40m, and current liabilities were €3.20m. Cash generated from operations in 2025 was €2.4m. No industry, covenant or post-year-end information is available.'
  ],
  requirements:[
   'Using the indirect approach, calculate 2026 cash generated from operations before interest and tax. Also calculate revenue growth, operating margin for both years, and the 2026 current and quick ratios.',
   'Write a concise evaluation of performance, cash conversion and liquidity, including at least one limitation of the available evidence.'
  ],
  markingGuide:[
   {id:'fr-m2-m1',label:'Cash generated from operations: €1.7m',guidance:'€1.8m + €0.6m + €0.1m − €0.7m + €0.2m − €0.3m = €1.7m.',marks:1},
   {id:'fr-m2-m2',label:'Revenue growth: 11.1%',guidance:'(€15.0m − €13.5m) / €13.5m = 11.1% approximately.',marks:1},
   {id:'fr-m2-m3',label:'Operating margins: 12.0% and 14.1%',guidance:'2026: €1.8m / €15.0m = 12.0%; 2025: €1.9m / €13.5m = 14.1% approximately.',marks:1},
   {id:'fr-m2-m4',label:'Current ratio: 1.10',guidance:'€3.52m / €3.20m = 1.10.',marks:1},
   {id:'fr-m2-m5',label:'Quick ratio: 0.66',guidance:'(€3.52m − €1.40m) / €3.20m = 0.66 approximately.',marks:1},
   {id:'fr-m2-m6',label:'Interprets weaker margin',guidance:'Revenue grew, but operating profit and operating margin fell, so growth did not translate into stronger operating profitability.',marks:1},
   {id:'fr-m2-m7',label:'Evaluates cash conversion and liquidity',guidance:'Connects lower cash generation and the inventory build to working-capital pressure; notes that the quick ratio below 1 may indicate reliance on inventory conversion.',marks:1},
   {id:'fr-m2-m8',label:'States an evidence limitation',guidance:'For example, ratios need industry/covenant comparison and year-end figures do not reveal seasonality, facilities or post-year-end cash movements.',marks:1}
  ]
 }
};

export const LOCAL_ACCA_FR_MOCKS:readonly LocalMiniMockExam[]=[ACCA_FR_MOCK_1,ACCA_FR_MOCK_2];
export const LOCAL_ACCA_FR_PRACTICE:readonly LocalMockExam[]=[...LOCAL_ACCA_FR_MOCKS,ACCA_FR_FULL_MOCK_1];

export function objectiveQuestionsFor(exam:LocalMockExam):readonly MockObjectiveQuestion[]{return exam.format==='mini'?exam.objectiveQuestions:[...exam.sectionAQuestions,...exam.sectionBCases.flatMap(item=>item.questions)];}
export function constructedResponsesFor(exam:LocalMockExam):readonly MockConstructedResponse[]{return exam.format==='mini'?[exam.constructed]:exam.sectionCResponses;}

export function gradeMockObjectives(exam:LocalMockExam,answers:Readonly<Record<string,number|undefined>>){
 return objectiveQuestionsFor(exam).reduce((score,question)=>score+(answers[question.id]===question.correctIndex?1:0),0);
}

export function mockProgressKey(scope='default'){return scopedKey(scope);}

export function parseLocalMockProgress(value:unknown):LocalMockProgress{
 if(!value||typeof value!=='object'||Array.isArray(value))return empty();
 const raw=value as Record<string,unknown>;if(raw.version!==1||!raw.attempts||typeof raw.attempts!=='object'||Array.isArray(raw.attempts))return empty();
 const attempts:LocalMockProgress['attempts']={};
 for(const [mockId,candidates] of Object.entries(raw.attempts as Record<string,unknown>)){
  if(!validId(mockId)||!Array.isArray(candidates))continue;const parsed:LocalMockAttempt[]=[];
  for(const candidate of candidates.slice(-10)){if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))continue;const row=candidate as Record<string,unknown>;const objectiveCorrect=boundedInt(row.objectiveCorrect,0,100),objectiveTotal=boundedInt(row.objectiveTotal,1,100),constructedMarks=boundedInt(row.constructedMarks,0,100),totalMarks=boundedInt(row.totalMarks,1,200),elapsedSeconds=boundedInt(row.elapsedSeconds,0,24*60*60);if(!validId(row.id)||!validDate(row.submittedAt)||objectiveCorrect===null||objectiveTotal===null||objectiveCorrect>objectiveTotal||constructedMarks===null||totalMarks===null||elapsedSeconds===null)continue;parsed.push({id:row.id as string,submittedAt:row.submittedAt as string,objectiveCorrect,objectiveTotal,constructedMarks,totalMarks,elapsedSeconds});}
  if(parsed.length)attempts[mockId]=parsed;
 }
 const reviews:LocalMockProgress['reviews']={};
 if(raw.reviews&&typeof raw.reviews==='object'&&!Array.isArray(raw.reviews))for(const [mockId,candidate] of Object.entries(raw.reviews as Record<string,unknown>)){
  if(!validId(mockId)||!attempts[mockId]?.length||!candidate||typeof candidate!=='object'||Array.isArray(candidate))continue;const parsed:Partial<Record<LocalMockReviewStage,LocalMockReview>>={};
  for(const stage of LOCAL_MOCK_REVIEW_STAGES){const item=(candidate as Record<string,unknown>)[stage];if(!item||typeof item!=='object'||Array.isArray(item))continue;const row=item as Record<string,unknown>,totalMarks=boundedInt(row.totalMarks,0,200),maximumMarks=boundedInt(row.maximumMarks,1,200);if(validDate(row.reviewedAt)&&totalMarks!==null&&maximumMarks!==null&&totalMarks<=maximumMarks)parsed[stage]={reviewedAt:row.reviewedAt as string,totalMarks,maximumMarks};}
  if(Object.keys(parsed).length)reviews[mockId]=parsed;
 }
 return {version:1,attempts,reviews};
}

export function readLocalMockProgress(storage:Pick<Storage,'getItem'>|null|undefined,scope='default'){
 if(!storage)return empty();try{const raw=storage.getItem(mockProgressKey(scope));return raw?parseLocalMockProgress(JSON.parse(raw)):empty();}catch{return empty();}
}
export function writeLocalMockProgress(storage:Pick<Storage,'setItem'>|null|undefined,progress:LocalMockProgress,scope='default'){
 if(!storage)return false;try{storage.setItem(mockProgressKey(scope),JSON.stringify(progress));return true;}catch{return false;}
}
export function mergeLocalMockProgress(primary:LocalMockProgress,secondary:LocalMockProgress):LocalMockProgress{
 const left=parseLocalMockProgress(primary),right=parseLocalMockProgress(secondary);
 const attempts:LocalMockProgress['attempts']={};
 const reviews:LocalMockProgress['reviews']={};
 for(const mockId of new Set([...Object.keys(right.attempts),...Object.keys(left.attempts)])){
  const byId=new Map<string,LocalMockAttempt>();
  for(const attempt of [...(right.attempts[mockId]??[]),...(left.attempts[mockId]??[])]){
   const existing=byId.get(attempt.id);
   if(!existing||Date.parse(attempt.submittedAt)>=Date.parse(existing.submittedAt))byId.set(attempt.id,attempt);
  }
  const merged=[...byId.values()].sort((a,b)=>Date.parse(a.submittedAt)-Date.parse(b.submittedAt)).slice(-10);
  if(!merged.length)continue;
  attempts[mockId]=merged;
  const latestId=merged.at(-1)!.id,mergedReviews:Partial<Record<LocalMockReviewStage,LocalMockReview>>={};
  const candidates=[left,right].filter(source=>source.attempts[mockId]?.at(-1)?.id===latestId);
  for(const stage of LOCAL_MOCK_REVIEW_STAGES){
   for(const source of candidates){const candidate=source.reviews[mockId]?.[stage],existing=mergedReviews[stage];if(candidate&&(!existing||Date.parse(candidate.reviewedAt)>=Date.parse(existing.reviewedAt)))mergedReviews[stage]=candidate;}
  }
  if(Object.keys(mergedReviews).length)reviews[mockId]=mergedReviews;
 }
 return parseLocalMockProgress({version:1,attempts,reviews});
}
export function recordLocalMockAttempt(progress:LocalMockProgress,mockId:string,attempt:LocalMockAttempt):LocalMockProgress{
 const parsed=parseLocalMockProgress({version:1,attempts:{[mockId]:[attempt]},reviews:{}}).attempts[mockId]?.[0];if(!parsed)return progress;
 const previous=progress.attempts[mockId]??[];if(previous.some(item=>item.id===parsed.id))return progress;
 const reviews={...progress.reviews};delete reviews[mockId];
 return {...progress,attempts:{...progress.attempts,[mockId]:[...previous,parsed].slice(-10)},reviews};
}
export function buildLocalMockReviewSchedule(progress:LocalMockProgress,mockId:string,now=new Date()):LocalMockReviewItem[]{
 const attempt=progress.attempts[mockId]?.at(-1);if(!attempt)return[];const submitted=Date.parse(attempt.submittedAt);if(!Number.isFinite(submitted))return[];
 return LOCAL_MOCK_REVIEW_STAGES.filter(stage=>!progress.reviews[mockId]?.[stage]).map(stage=>{const dueAt=new Date(submitted+REVIEW_DAYS[stage]*DAY_MS);return{stage,dueAt:dueAt.toISOString(),status:dueAt.getTime()<=now.getTime()?'due' as const:'scheduled' as const};}).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
}
export function completeLocalMockReview(progress:LocalMockProgress,mockId:string,stage:LocalMockReviewStage,totalMarks:number,maximumMarks:number,reviewedAt=new Date().toISOString()):LocalMockProgress{
 const due=buildLocalMockReviewSchedule(progress,mockId,new Date(reviewedAt)).find(item=>item.stage===stage&&item.status==='due');if(!due||progress.reviews[mockId]?.[stage]||boundedInt(totalMarks,0,200)===null||boundedInt(maximumMarks,1,200)===null||totalMarks>maximumMarks)return progress;
 return {...progress,reviews:{...progress.reviews,[mockId]:{...progress.reviews[mockId],[stage]:{reviewedAt,totalMarks,maximumMarks}}}};
}

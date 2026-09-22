export const LOCAL_MOCK_PROGRESS_KEY_PREFIX='learning-hub:local-mock-progress:v1';
export const LOCAL_MOCK_REVIEW_STAGES=['D+1','D+7','D+30'] as const;
export type LocalMockReviewStage=typeof LOCAL_MOCK_REVIEW_STAGES[number];

export type MockObjectiveQuestion={id:string;topic:string;prompt:string;options:readonly string[];correctIndex:number;explanation:string};
export type MockMarkingPoint={id:string;label:string;guidance:string;marks:number};
export type LocalMockExam={id:string;title:string;subtitle:string;durationMinutes:number;objectiveMarks:number;constructedMarks:number;objectiveQuestions:readonly MockObjectiveQuestion[];constructed:{scenario:readonly string[];requirements:readonly string[];markingGuide:readonly MockMarkingPoint[]}};
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

export const ACCA_FR_MOCK_1:LocalMockExam={
 id:'acca-fr-mini-mock-01',title:'ACCA FR Mini Mock 01',subtitle:'Recognition, measurement, group reporting and performance analysis',durationMinutes:30,objectiveMarks:12,constructedMarks:8,
 objectiveQuestions:[
  {id:'fr-m1-q1',topic:'IAS 16 · PPE',prompt:'A machine costs €120,000, has a €12,000 residual value and a six-year useful life. Using straight-line depreciation, what is the annual charge?',options:['€18,000','€20,000','€22,000','€108,000'],correctIndex:0,explanation:'Depreciable amount is €108,000 (€120,000 less €12,000), divided by six years: €18,000.'},
  {id:'fr-m1-q2',topic:'IFRS 15 · Revenue',prompt:'When is revenue recognised for a performance obligation satisfied over time?',options:['Only when cash is collected','As progress towards complete satisfaction is measured','Only when the legal contract expires','Whenever management forecasts a profit'],correctIndex:1,explanation:'For an obligation satisfied over time, revenue follows a faithful measure of progress towards complete satisfaction.'},
  {id:'fr-m1-q3',topic:'IAS 37 · Provisions',prompt:'Which combination supports recognition of a provision?',options:['Possible obligation and remote outflow','Present obligation, probable outflow and reliable estimate','Future operating loss approved by the board','Possible inflow and reliable estimate'],correctIndex:1,explanation:'A provision requires a present obligation from a past event, a probable outflow and a sufficiently reliable estimate.'},
  {id:'fr-m1-q4',topic:'IAS 12 · Deferred tax',prompt:'An asset has a carrying amount of €90,000 and a tax base of €70,000. Ignoring exemptions, what arises?',options:['Deductible temporary difference of €20,000','Taxable temporary difference of €20,000','Permanent difference of €90,000','No difference until the asset is sold'],correctIndex:1,explanation:'For an asset, carrying amount above tax base creates a taxable temporary difference of €20,000.'},
  {id:'fr-m1-q5',topic:'Consolidation',prompt:'A parent sells inventory to its subsidiary for €50,000 at a 25% mark-up on cost. Half remains in the group at year end. What unrealised profit is eliminated?',options:['€5,000','€6,250','€10,000','€12,500'],correctIndex:0,explanation:'Cost is €40,000 and total profit is €10,000. Half remains, so €5,000 is unrealised.'},
  {id:'fr-m1-q6',topic:'Performance analysis',prompt:'Revenue rises by 20% while operating profit falls. Which conclusion is best supported?',options:['Liquidity definitely improved','Operating margin fell','Gross margin must have risen','The entity generated positive cash flow'],correctIndex:1,explanation:'If operating profit falls while revenue rises, operating profit as a percentage of revenue necessarily falls. The other conclusions require more evidence.'}
 ],
 constructed:{
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

export function gradeMockObjectives(exam:LocalMockExam,answers:Readonly<Record<string,number|undefined>>){
 return exam.objectiveQuestions.reduce((score,question)=>score+(answers[question.id]===question.correctIndex?1:0),0);
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

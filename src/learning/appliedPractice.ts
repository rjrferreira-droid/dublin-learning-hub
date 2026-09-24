export type WorkshopTrack = 'finance' | 'payroll' | 'english';
export type WorkshopField = {id:string;label:string;explanation:string} & (
  {kind:'amount';expectedCents:number} | {kind:'choice';options:readonly string[];correctIndex:number}
);
export type WorkshopCase = {
  id:string;track:WorkshopTrack;title:string;facts:readonly string[];scope:string;
  fields:readonly WorkshopField[];hints:readonly [string,string];reasoningPrompt:string;
  workedReasoning:string;transfer:string;
};
export type LocalCheck = 'unanswered' | 'invalid' | 'correct' | 'review';
export const WORKSHOP_VERSION = 'applied-practice-2026-09-13-v1';
const money=(cents:number)=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(cents/100);
/** Strict decimal input, not a locale-guessing money parser. No thousands separators. */
export function parsePracticeCents(value:unknown):number|null {
  if(typeof value!=='string')return null;
  const cleaned=value.trim();
  if(!/^-?\d{1,7}(?:[.,]\d{1,2})?$/.test(cleaned))return null;
  const negative=cleaned.startsWith('-');
  const [whole,decimals='']=cleaned.replace('-','').split(/[.,]/);
  const cents=Number(whole)*100+Number(decimals.padEnd(2,'0'));
  return negative?-cents:cents;
}
export function checkWorkshopField(field:WorkshopField,value:unknown):LocalCheck {
  if(value===undefined||value===null||value==='')return 'unanswered';
  if(field.kind==='amount'){
    if(typeof value==='string'&&!value.trim())return 'unanswered';
    const parsed=parsePracticeCents(value);
    return parsed===null?'invalid':parsed===field.expectedCents?'correct':'review';
  }
  if(typeof value!=='string'||!/^\d$/.test(value)||Number(value)>=field.options.length)return 'invalid';
  return Number(value)===field.correctIndex?'correct':'review';
}
export function workedValue(field:WorkshopField):string {
  return field.kind==='amount'?money(field.expectedCents):field.options[field.correctIndex];
}
function finance(id:string,title:string,revenue:number,operatingExpenses:number,investmentIncome:number,financeCost:number,tax:number):WorkshopCase {
  const operating=revenue-operatingExpenses,before=operating+investmentIncome,profit=before-financeCost-tax;
  return {id,track:'finance',title,
    scope:'Fictional non-financial company. Categories are supplied assumptions, not universal IFRS classifications. This is arithmetic and reasoning practice, not a compliant financial-statement preparation tool.',
    facts:[`Revenue: ${money(revenue)}. Operating expenses: ${money(operatingExpenses)}.`, `Investment income, assumed in the investing category: ${money(investmentIncome)}. Finance costs, assumed in the financing category: ${money(financeCost)}. Income tax: ${money(tax)}.`],
    fields:[
      {id:'operating',kind:'amount',label:'Operating profit',expectedCents:operating,explanation:'Subtract the supplied operating expenses from revenue. Do not include the assumed investing or financing items in this subtotal.'},
      {id:'before-financing',kind:'amount',label:'Profit before financing and income taxes',expectedCents:before,explanation:'Start with operating profit and add the income explicitly assigned to the investing category. Financing and income tax have not been deducted yet.'},
      {id:'profit',kind:'amount',label:'Profit after income tax',expectedCents:profit,explanation:'Continue the same bridge by deducting the supplied finance cost and income tax. Preserve the sign of each item.'},
    ],
    hints:['Work from the top of the statement; calculate one subtotal before the next.','Revenue minus operating expenses gives the first answer. Add investing income for the second. Subtract finance cost and tax for the third.'],
    reasoningPrompt:'Explain why the three answers differ, then name one assumption you would verify before applying the bridge to a real company.',
    workedReasoning:`The bridge is ${money(revenue)} − ${money(operatingExpenses)} = ${money(operating)}; then + ${money(investmentIncome)} = ${money(before)}; then − ${money(financeCost)} − ${money(tax)} = ${money(profit)}. These are different definitions, not alternative labels for the same result. For a real entity, verify its activities and the applicable category treatment rather than copying these fictional assumptions.`,
    transfer:'Change only finance cost by EUR 10. Which subtotal remains unchanged, and why? Explain without recomputing the entire statement.',
  };
}
function payroll(id:string,title:string,gross:number,paye:number,usc:number,employeePrsi:number,pension:number,employerPrsi:number,comparisonPaye:number):WorkshopCase {
  const net=gross-paye-usc-employeePrsi-pension,cost=gross+employerPrsi,comparisonNet=gross-comparisonPaye-usc-employeePrsi-pension;
  const changed=comparisonPaye!==paye;
  const comparisonFact=changed
    ? `In the comparison run, only supplied PAYE changes to ${money(comparisonPaye)}; every other input is unchanged.`
    : `In the comparison run, supplied PAYE remains ${money(comparisonPaye)}, and every other input is also unchanged.`;
  const interpretation=changed
    ? 'The different supplied PAYE amount explains the arithmetic change in net cash; why PAYE changed is not established. Reconcile the payslips, the pay-date inputs and the payroll/RPN information before promising a correction.'
    : 'The supplied inputs are identical, so net cash is unchanged. Do not invent a PAYE change, refund or missing deduction to make the comparison look different. If an employee reports a difference, first obtain the actual payslips and payment records: the supplied facts do not yet show it.';
  return {id,track:'payroll',title,
    scope:'Every amount below is a supplied fictional input. No current Irish rates, eligibility, tax credits or pension tax bases are calculated. Employer cost here means gross pay plus employer PRSI only, excluding any other employer costs.',
    facts:[`Gross pay ${money(gross)}; supplied PAYE ${money(paye)}, USC ${money(usc)}, employee PRSI ${money(employeePrsi)} and employee pension cash deduction ${money(pension)}.`,`Employer PRSI is ${money(employerPrsi)}. ${comparisonFact}`],
    fields:[
      {id:'net',kind:'amount',label:'Employee net cash in the first run',expectedCents:net,explanation:'Subtract the four supplied employee deductions from gross pay. Employer PRSI is not an employee cash deduction.'},
      {id:'cost',kind:'amount',label:'Employer cost within the stated scope',expectedCents:cost,explanation:'Add gross pay and employer PRSI. Do not subtract employee deductions from this employer-cost measure.'},
      {id:'net-change',kind:'amount',label:'Comparison net cash minus first-run net cash',expectedCents:comparisonNet-net,explanation:changed?'Use a signed difference. When the only changed input is PAYE, net cash moves by the opposite amount. The arithmetic does not identify why PAYE changed.':'All supplied inputs are identical in both runs. The signed change in net cash is zero; this does not imply that any extra payment or refund is due.'},
    ],
    hints:['Keep employee cash and employer cost in separate columns.',changed?'Calculate the first net cash. The comparison changes only one supplied deduction, so the change in net cash has the opposite sign to the PAYE change.':'Calculate the first net cash and compare every supplied input. With identical inputs, there is no net-cash change to explain.'],
    reasoningPrompt:changed?'Explain the difference to an employee without inventing its cause or promising a refund. What would you check next?':'Explain why the supplied runs show no net-cash change. What evidence would you request if an employee nevertheless reported a different payment?',
    workedReasoning:`Employee net cash is ${money(net)}. Employer cost in this restricted illustration is ${money(cost)}. Comparison net cash is ${money(comparisonNet)}, a signed difference of ${money(comparisonNet-net)}. ${interpretation}`,
    transfer:'If only employer PRSI changed, would employee net cash change in this illustration? Explain the separation rather than guessing a rate.',
  };
}
function english(id:string,title:string,facts:readonly string[],sentences:readonly [string,string,string],workedReasoning:string):WorkshopCase {
  return {id,track:'english',title,scope:'An original written sequencing exercise. Classify the supplied sentences using the explicit timeline, not by guessing what the speaker meant. The checks do not measure spoken fluency, pronunciation, CEFR or the quality of your free-text story.',facts,
    fields:[
      {id:'background',kind:'choice',label:'Which sentence describes the background in progress?',options:sentences,correctIndex:1,explanation:'The supplied ongoing action is the background to the main event. Notice the was/were + -ing form and check it against the facts.'},
      {id:'main-event',kind:'choice',label:'Which sentence gives the main completed event?',options:sentences,correctIndex:2,explanation:'Identify the event that moves this particular story forward. In these supplied sentences it is expressed with the simple past.'},
      {id:'earlier',kind:'choice',label:'Which sentence identifies the earlier completed action?',options:sentences,correctIndex:0,explanation:'Use the explicit chronology. The supplied had + past participle sentence looks back to an earlier completed action.'},
    ],
    hints:['Separate what was already complete, what was happening in the background and what happened next.','Look for had + past participle for the earlier event, was/were + -ing for background, and the supplied simple-past sentence for the main event. These are clues within this scenario, not rules that every story must follow.'],
    reasoningPrompt:'Retell the events in three or four connected sentences. Then write one relevant follow-up question a listener could ask.',
    workedReasoning,transfer:'Retell the same facts to a friend, then to a manager. Change the register and level of detail without changing what happened.',
  };
}
export const WORKSHOP_CASES:Readonly<Record<WorkshopTrack,readonly WorkshopCase[]>> = {
  finance:[finance('finance-bridge-a','Reporting bridge · first attempt',150000,112000,2000,5000,7000),finance('finance-bridge-b','Reporting bridge · new numbers',180000,138000,1500,6500,8500),finance('finance-bridge-c','Reporting bridge · smaller business',125000,101000,800,3800,4000)],
  payroll:[payroll('payroll-cash-a','Employee cash and employer cost',320000,40000,6400,12800,9600,35200,47000),payroll('payroll-cash-b','One changed deduction',360000,45000,7200,14400,10800,39600,43000),payroll('payroll-cash-c','Unchanged inputs, unchanged net cash',280000,31000,5600,11200,8400,30800,31000)],
  english:[
    english('english-story-a','A delayed train',['At 08:00 you bought your ticket. At 08:20 you were waiting on the platform. At 08:25 the train finally arrived.'],['I had bought my ticket earlier.','I was waiting on the platform.','The train finally arrived.'],'I was waiting on the platform when the train finally arrived. I had bought my ticket earlier, so I had it with me. A relevant follow-up is: Did you arrive in time? This is one possible retelling, not the only valid wording.'),
    english('english-story-b','A file at work',['At 09:00 you saved a backup. At 10:00 you were preparing a report. At 10:05 the computer restarted unexpectedly.'],['I had saved a backup before the restart.','I was preparing the report.','The computer restarted unexpectedly.'],'I was preparing the report when the computer restarted unexpectedly. I had saved a backup earlier. A relevant follow-up is: Were you able to recover the latest changes? The backup is known; successful recovery is not, so do not invent it.'),
    english('english-story-c','Meeting a friend',['At 14:00 your friend sent a message. At 14:30 you were looking for the cafe. At 14:35 you spotted your friend outside.'],['My friend had sent me a message earlier.','I was looking for the cafe.','I spotted my friend outside.'],'I was looking for the cafe when I spotted my friend outside. They had sent me a message earlier. A relevant follow-up is: Was the cafe easy to find? Different connected wordings are valid; this local check does not grade the retelling.'),
  ],
};

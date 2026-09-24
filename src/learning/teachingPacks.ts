export type StudyTrack = 'finance' | 'payroll' | 'english';
export type StudyExercise = {id:string;question:string;hints:readonly [string,string];answer:string;explanation:string};
export type StudyPack = {
 id:string;track:StudyTrack;lessonId:string;title:string;goal:string;skills:readonly string[];
 concept:string;conceptPt:string;example:{title:string;assumptions:string;steps:readonly string[]};
 exercises:readonly StudyExercise[];transfer:string;coverageNote:string;
 sources:readonly {label:string;url:string}[];reviewedOn:string;
};
// Original study companions, NOT completed courses, official translations or a published tutor prompt.
// No learner answers, model call, storage write, mastery claim, current tax-rate table or timing analytics.
export const STUDY_PACKS:Readonly<Record<StudyTrack,StudyPack>> = {
 finance:{
  id:'finance-ifrs18-companion-v1',track:'finance',lessonId:'b3639582-3c32-4147-a4b3-84237d11a66e',
  title:'From a reporting rule to a finance decision',
  goal:'Explain the IFRS 18 presentation change, work through a small profit bridge, and identify one implementation control.',
  skills:['Presentation','Profit bridge','Business judgement'],
  concept:'IFRS 18 replaces IAS 1 for annual periods beginning on or after 1 January 2027, with earlier application permitted. Its focus includes defined profit-or-loss subtotals, management-defined performance measures and clearer grouping of information. This presentation change is not a new tax charge.',
  conceptPt:'A ideia é explicar melhor como o resultado é apresentado, não criar um imposto ou substituir a análise das operações. Separe a estrutura exigida nas demonstrações das medidas ajustadas usadas pela administração.',
  example:{title:'A five-line profit bridge',assumptions:'Fictional non-financial entity. For this exercise only, classification has already been assessed: revenue and operating expenses are operating; investment income is investing; borrowing expense is financing. No discontinued operation. These assumptions are not universal classification rules.',steps:['Revenue 1,000 − operating expenses 760 = operating profit 240.','Operating profit 240 + investing income 12 = profit before financing and income taxes 252.','Then financing expense 32 and income tax 55: profit for the period = 165.']},
  exercises:[
   {id:'fin-bridge',question:'Using the example, what is profit before financing and income taxes, and why is it not the final profit?',hints:['Start with the operating result, not revenue.','Add the assumed investing income. Financing and tax come after this subtotal.'],answer:'252. Final profit is 165 after financing expense of 32 and income tax of 55.',explanation:'The calculation follows the categories assumed in this case. Explaining the bridge matters more than naming a number.'},
   {id:'fin-mpm',question:'A CFO calls an internal dashboard ratio an MPM. Is that label alone enough?',hints:['Ask what the metric measures and where it is communicated.','An MPM is a qualifying subtotal of income and expenses used in public communication, not simply any internal KPI.'],answer:'No. Test the definition: subtotal of income and expenses, public communications, management view of the entity as a whole, and exclusions for specified IFRS measures.',explanation:'A label or an internal ratio alone does not establish that the metric meets the definition. Request the missing facts before deciding.'},
   {id:'fin-control',question:'What is one useful implementation action beyond renaming report headings?',hints:['Think about how account-level data reaches the report.','Consider mapping, reconciliation and ownership.'],answer:'Document and test the account-to-category mapping, reconcile the new presentation to the ledger and assign a reviewer to exceptions.',explanation:'This is an original control example, not a complete implementation checklist.'}
  ],
  transfer:'Explain one presentation change and one control to a CFO in your own words. Do not memorise the example response.',
  coverageNote:'IFRS 18 companion only. It does not complete the broader group-reporting or Irish statutory-accounts lesson. Do not assume IFRS is the reporting basis for every Irish entity.',
  sources:[{label:'IFRS Foundation · IFRS 18 overview',url:'https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/'},{label:'IFRS Foundation · key terms',url:'https://www.ifrs.org/supporting-implementation/supporting-materials-by-ifrs-standards/ifrs-18/key-terms/'}],reviewedOn:'2026-09-13'
 },
 payroll:{
  id:'payroll-gross-net-companion-v1',track:'payroll',lessonId:'6ffda415-3b18-46ab-afaa-414f81a7eb31',
  title:'From payroll inputs to a clear employee explanation',
  goal:'Distinguish the latest RPN, employee deductions and employer cost, then explain a pay difference without guessing a rate.',
  skills:['RPN inputs','Net pay','Payroll controls'],
  concept:'Request and use the latest Revenue Payroll Notification before payroll. An RPN provides tax information for Income Tax, USC and, where relevant, LPT; it is not the source of the employee’s PRSI classification. Payroll information must be submitted to Revenue on or before the pay date.',
  conceptPt:'Antes do cálculo, consulte o RPN atualizado. Separe os descontos do empregado do custo do empregador. Confira a competência, a data de pagamento e os dados aplicáveis; não invente uma alíquota quando faltar informação.',
  example:{title:'Net pay is not total employer cost',assumptions:'Fictional arithmetic-only payslip. Amounts below are supplied inputs, not current Irish tax rates or a payroll calculator. Assume gross cash pay only, deductions already validated, no benefits in kind, additional pension/auto-enrolment or other items. Pension tax-base effects are outside this exercise.',steps:['Gross cash pay 3,000; PAYE 350; USC 60; employee PRSI 120; employee pension deduction 90.','Net cash pay = 3,000 − 350 − 60 − 120 − 90 = 2,380.','Separately, assumed employer PRSI 330 gives an employer cost of 3,330 before any other employer costs.']},
  exercises:[
   {id:'pay-net',question:'What is the employee’s net cash pay? Should the assumed employer PRSI of 330 also be deducted?',hints:['Subtract only the employee deductions shown.','The employer’s own PRSI is a separate employer liability.'],answer:'Net cash pay is 2,380. Do not subtract the additional 330 of employer PRSI from the employee’s pay.',explanation:'These are fictional amounts. In a real run, verify each deduction and the applicable PRSI class and effective date.'},
   {id:'pay-rpn',question:'You cannot retrieve an RPN. Is it safe to invent tax credits and submit the payroll next month?',hints:['Missing information is not permission to choose a convenient deduction.','Revenue’s guidance requires emergency treatment when no RPN can be retrieved, and reporting still follows the pay date.'],answer:'No. Apply the relevant emergency-basis rules, investigate why the RPN is unavailable and report on or before payment. Do not invent credits or assume reporting can wait.',explanation:'The exact calculation depends on the facts and current official guidance. The companion does not supply emergency-tax rates.'},
   {id:'pay-explain',question:'An employee asks why net pay changed while gross pay stayed the same. What would you check before giving a reason?',hints:['Compare the deductions, not only the net total.','Inspect current versus prior payroll inputs, the RPN and employee-specific changes.'],answer:'Identify which deduction changed; check the relevant RPN/tax basis and payroll inputs, then explain only the verified cause in plain language.',explanation:'Do not promise a refund amount or blame Revenue before checking the records. This is a process-control example.'}
  ],
  transfer:'Explain gross pay, employee deductions and net pay to an employee in two or three sentences, using only the fictional data.',
  coverageNote:'Operational foundation and arithmetic only. Live PAYE/USC/PRSI rates, emergency calculations, benefits, pension and auto-enrolment treatment require separate dated examples and official checks.',
  sources:[{label:'Revenue · latest RPN',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/employer-obligations-from-01-01-2019/revenue-payroll-notification.aspx'},{label:'Revenue · payroll obligations',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/employer-obligations-from-01-01-2019/index.aspx'},{label:'Department of Social Protection · PRSI employer guide',url:'https://www.gov.ie/en/department-of-social-protection/publications/prsi-employer-guide/'}],reviewedOn:'2026-09-13'
 },
 english:{
  id:'english-story-companion-v1',track:'english',lessonId:'f455a740-f50f-4eb7-95a7-9e4129ca4a68',
  title:'Tell a story that invites a real conversation',
  goal:'Set the scene, explain what happened and ask a natural follow-up. A personal story is as useful here as a workplace example.',
  skills:['Past forms','Clear sequence','Follow-up questions'],
  concept:'Use the past continuous for an action in progress at a past time and the past simple for a completed event. When used together, they can distinguish background from the main event. The meaning and context decide the choice: “when” does not mechanically force one tense.',
  conceptPt:'Conte primeiro o contexto e depois o que aconteceu. O passado contínuo ajuda a mostrar uma ação em andamento; o passado simples pode destacar o evento. Não precisa transformar cada frase da história em um exercício de gramática.',
  example:{title:'A small surprise on the way home',assumptions:'Original fictional story. This written example demonstrates sequence and grammar only; it cannot measure speaking rhythm, accent or pronunciation.',steps:['I was walking home when I noticed a small bookshop.','I went inside and found a novel I had been looking for.','What was the last place you discovered by chance?']},
  exercises:[
   {id:'eng-forms',question:'Complete the intended background/event contrast: “I ___ (wait) for the bus when a friend ___ (call).”',hints:['The waiting was already in progress.','Use was/were + -ing for that background, then the completed event.'],answer:'“I was waiting for the bus when a friend called.”',explanation:'This is the intended contrast in this exercise. Other tenses can be grammatical when the intended meaning changes.'},
   {id:'eng-repair',question:'A learner says, “Yesterday I go to a new café and meet a friend.” Give one brief repair, then a question that continues the story.',hints:['Focus on the two past forms rather than correcting every possible stylistic detail.','After a short recast, ask about what happened or how the person felt.'],answer:'“You went to a new café and met a friend. What was the café like?”',explanation:'This is one possible response, not the only acceptable wording. The repair should support the conversation rather than end it.'},
   {id:'eng-followup',question:'Someone says, “The train was delayed, but something nice happened.” Ask one natural follow-up.',hints:['Follow the surprising part of the story.','One short question is enough; avoid turning it into an interview.'],answer:'For example: “What happened?” or “What made the delay worthwhile?”',explanation:'Several responses are valid. There is no single exact-match sentence to memorise.'}
  ],
  transfer:'Tell a true or invented everyday story, then tell it differently for a colleague. Practise meaning and interaction, not a memorised script.',
  coverageNote:'Written companion only. It does not test listening, fluency timing or pronunciation, and it does not certify a CEFR level. UK and US variants must not be marked wrong simply for differing.',
  sources:[{label:'British Council · past continuous and past simple',url:'https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/past-continuous-past-simple'}],reviewedOn:'2026-09-13'
 }
};
export function studyPackFor(track:StudyTrack,lessonId?:string):StudyPack|null {
 const pack=STUDY_PACKS[track];
 if(!pack)return null;
 return lessonId===undefined||lessonId===pack.lessonId||(track==='english'&&lessonId==='english-golden-lesson')?pack:null;
}

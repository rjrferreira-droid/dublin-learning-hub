/**
 * Deep local model for Viviane's first Irish Payroll / People Operations unit.
 *
 * This is authored study content only. It does not call a provider, persist learner
 * data, publish a lesson, or calculate live statutory deductions. Date-sensitive
 * rules must be rechecked against the linked Revenue guidance before publication
 * or operational use.
 */

export type PayrollPracticeStage='notice'|'understand'|'choose'|'build'|'use';
export type PayrollPracticeFormat='single-select'|'multi-select'|'short-written'|'extended-written';

export type PayrollSource={
 id:string;
 label:string;
 url:string;
 supports:string;
 reviewedOn:string;
 dateSensitive:boolean;
};

export type PayrollObjective={id:string;text:string;successEvidence:readonly string[]};

export type PayrollLearningBlock={
 id:string;
 title:string;
 plannedMinutes:number;
 objectiveIds:readonly string[];
 sourceIds:readonly string[];
 paragraphs:readonly string[];
 supportPt:string;
 stopAndCheck:{prompt:string;expectedElements:readonly string[]};
};

export type PayrollWorkedExample={
 id:string;
 title:string;
 plannedMinutes:number;
 facts:readonly string[];
 task:string;
 reasoning:readonly string[];
 modelResponse:string;
 boundary:string;
 objectiveIds:readonly string[];
 sourceIds:readonly string[];
};

type PracticeBase={
 id:string;
 stage:PayrollPracticeStage;
 format:PayrollPracticeFormat;
 prompt:string;
 objectiveIds:readonly string[];
 sourceIds:readonly string[];
 hints:readonly [string,string];
 errorBankTag:string;
};

export type PayrollSelectionPractice=PracticeBase&{
 format:'single-select'|'multi-select';
 options:readonly {id:string;text:string}[];
 correctOptionIds:readonly string[];
 rationale:string;
};

export type PayrollWrittenPractice=PracticeBase&{
 format:'short-written'|'extended-written';
 expectedElements:readonly string[];
 modelAnswer:string;
 selfCheck:string;
};

export type PayrollPracticeItem=PayrollSelectionPractice|PayrollWrittenPractice;

export type PayrollAudioSegment={
 id:string;
 title:string;
 plannedSeconds:number;
 purpose:string;
 script:string;
 learnerAction?:string;
};

export interface DeepPayrollUnit{
 schemaVersion:'deep-payroll-unit/1.0';
 status:'authored_local_not_published';
 identity:{lessonId:string;slug:string;code:'P1';track:'payroll';strand:'payroll-people-operations'};
 title:string;
 subtitle:string;
 audience:string;
 scope:string;
 language:{instruction:'en';support:'pt-BR';workplaceOutput:'en'};
 objectives:readonly PayrollObjective[];
 priorKnowledge:{required:readonly string[];notRequired:readonly string[];entryCheck:readonly {id:string;prompt:string;answer:string}[]};
 workload:{totalMinutes:number;rangeMinutes:readonly [number,number];phases:readonly {id:string;kind:string;title:string;plannedMinutes:number;evidenceIds:readonly string[]}[]};
 learningBlocks:readonly PayrollLearningBlock[];
 workedExamples:readonly PayrollWorkedExample[];
 misconceptions:readonly {id:string;belief:string;whyItFails:string;repair:string;sourceIds:readonly string[]}[];
 practice:{attemptsBeforeReveal:2;items:readonly PayrollPracticeItem[]};
 caseStudy:{
  id:string;title:string;plannedMinutes:number;scenario:readonly string[];documents:readonly {name:string;contents:readonly string[]}[];
  task:string;requiredOutput:readonly string[];hints:readonly [string,string];modelAnswer:string;markingCriteria:readonly {id:string;description:string;weight:number}[];
  boundary:string;objectiveIds:readonly string[];sourceIds:readonly string[];
 };
 retrieval:{plannedMinutes:number;items:readonly {id:string;prompt:string;answer:string;objectiveIds:readonly string[];reviewAfterDays:readonly number[]}[]};
 evidenceRules:{
  automaticallyAddToErrorBank:readonly string[];
  doNotInfer:readonly string[];
  writtenEvidencePolicy:string;
  retention:string;
 };
 completionRules:{
  completionIsNotMastery:boolean;
  requiredPhaseIds:readonly string[];
  selectionThresholdPct:number;
  requiredWrittenItemIds:readonly string[];
  caseMinimumCriteria:readonly string[];
  audioMinimumEvidence:readonly string[];
  retrievalThresholdPct:number;
 };
 audioEpisode:{
  status:'authored_script_no_generation';role:'distinct_contextual_episode';estimatedMinutes:number;distinctFromLearn:boolean;
  title:string;listeningGoals:readonly string[];segments:readonly PayrollAudioSegment[];
  comprehension:readonly PayrollSelectionPractice[];shadowing:readonly {id:string;line:string;focus:string}[];
  generationRequested:false;storageKey:null;
 };
 sources:readonly PayrollSource[];
 publicationGate:readonly string[];
}

const REVIEWED_ON='2026-09-14';

export const DEEP_PAYROLL_UNIT_1:DeepPayrollUnit={
 schemaVersion:'deep-payroll-unit/1.0',
 status:'authored_local_not_published',
 identity:{
  lessonId:'fa110000-2026-4fa1-8a01-000000000001',
  slug:'rpn-pay-date-employment-id-payroll-submission',
  code:'P1',
  track:'payroll',
  strand:'payroll-people-operations',
 },
 title:'Unit 1 · Payroll identity, RPN and pay-date workflow',
 subtitle:'Move from a People Operations record to a controlled Irish payroll submission and an evidence-safe employee response',
 audience:'Viviane · Payroll and People Operations pathway · no prior Irish payroll calculation experience required',
 scope:'An operational foundation for Irish Payroll and People Operations. The unit teaches how to connect employee and employment identity, the applicable Revenue Payroll Notification, pay date, submission evidence, exception handling and employee communication. It does not teach bookkeeping, corporate reporting, investment analysis or live deduction rates. It is not payroll software instruction, legal advice or a statutory calculator.',
 language:{instruction:'en',support:'pt-BR',workplaceOutput:'en'},
 objectives:[
  {id:'obj-identity',text:'Distinguish the employee, employer registration, employment record and Employment ID before acting on a payroll exception.',successEvidence:['Names the four identity layers in a case.','Explains why a continuous employment is not given a new Employment ID merely because a tax year changes.']},
  {id:'obj-rpn',text:'Treat the applicable RPN as controlled payroll evidence and choose a safe response when an RPN is unavailable.',successEvidence:['Rejects reuse of a prior-year RPN for a current-year payment.','Chooses the supported emergency-basis route instead of inventing credits.']},
  {id:'obj-pay-date',text:'Use the actual pay date to identify the reporting period and the on-or-before reporting deadline.',successEvidence:['Separates pay date from file creation, approval and ledger dates.','Names the submission deadline in a supplied scenario.']},
  {id:'obj-correction',text:'Classify an exception before correcting it and preserve a traceable link between evidence, action and review.',successEvidence:['Identifies whether the issue concerns identity, RPN, pay date, amount or reporting.','Avoids changing an unrelated current payment to hide a prior error.']},
  {id:'obj-employee',text:'Respond to an employee calmly while protecting privacy and separating confirmed facts from an amount still under investigation.',successEvidence:['Uses an approved channel and minimum necessary detail.','Gives a bounded next action and update time without promising an unsupported outcome.']},
  {id:'obj-transfer',text:'Apply the complete identity-to-submission chain to an unfamiliar payroll and People Operations case.',successEvidence:['Builds a sequenced control plan.','Supports every conclusion with a supplied document or a named item still to obtain.']},
 ],
 priorKnowledge:{
  required:[
   'Recognise the difference between an employee record, an employment and a payslip.',
   'Understand that gross pay, deductions and net pay are different fields; no calculation is required at entry.',
   'Be able to compare two short records and mark whether a fact matches or differs.',
  ],
  notRequired:[
   'Current PAYE, USC or PRSI rates and bands.',
   'Experience with ROS or a particular payroll application.',
   'Knowledge of journal entries or corporate accounts.',
  ],
  entryCheck:[
   {id:'entry-1',prompt:'A person has two genuinely separate employments with the same employer. Is “one person” enough to identify the payroll record?',answer:'No. Payroll must identify the relevant employment as well as the person; separate employments must remain distinguishable.'},
   {id:'entry-2',prompt:'A payslip total changed. Does that fact alone prove that Revenue made an error?',answer:'No. It identifies an outcome to investigate, not the cause. Check identity, inputs, the applicable RPN, pay date and submission evidence.'},
   {id:'entry-3',prompt:'Do you need to memorise statutory rates to complete this unit?',answer:'No. The unit assesses control reasoning and communication. It deliberately supplies no live rates.'},
  ],
 },
 workload:{
  totalMinutes:80,
  rangeMinutes:[60,90],
  phases:[
   {id:'phase-orient',kind:'orientation',title:'Purpose, boundaries and entry check',plannedMinutes:4,evidenceIds:['entry-1','entry-2','entry-3']},
   {id:'phase-learn',kind:'instruction',title:'Six evidence-chain learning blocks',plannedMinutes:24,evidenceIds:['block-identity-check','block-employment-check','block-rpn-check','block-pay-date-check','block-correction-check','block-employee-check']},
   {id:'phase-examples',kind:'worked-examples',title:'Two narrated payroll decisions',plannedMinutes:10,evidenceIds:['example-year-turn','example-no-rpn']},
   {id:'phase-practice',kind:'progressive-practice',title:'Notice, understand, choose, build and use',plannedMinutes:15,evidenceIds:['pr-n1','pr-n2','pr-u1','pr-u2','pr-u3','pr-c1','pr-c2','pr-c3','pr-b1','pr-b2','pr-use1','pr-use2']},
   {id:'phase-case',kind:'case',title:'Integrated employee query and evidence review',plannedMinutes:10,evidenceIds:['case-query-1']},
   {id:'phase-audio',kind:'audio',title:'Contextual episode, second listen and shadowing',plannedMinutes:12,evidenceIds:['audio-q1','audio-q2','audio-q3','audio-q4','shadow-1','shadow-2','shadow-3']},
   {id:'phase-retrieval',kind:'retrieval',title:'Closed-note recall and next review plan',plannedMinutes:5,evidenceIds:['ret-1','ret-2','ret-3','ret-4','ret-5','ret-6']},
  ],
 },
 learningBlocks:[
  {
   id:'block-identity',title:'1. Begin with identity, not the deduction',plannedMinutes:4,objectiveIds:['obj-identity','obj-transfer'],sourceIds:['revenue-employment-id','revenue-submission-details'],
   paragraphs:[
    'A payroll question often arrives as a number: “Why is my net pay different?” The first control question is not a rate question. It is “Which employee, which employer registration and which employment does this payment belong to?” A person can have more than one employment, and the same person can have separate periods of employment with one employer. If the record is attached to the wrong employment, a calculation that looks arithmetically tidy may still be wrong.',
    'Use an identity chain. Confirm the employee through the organisation’s approved process; confirm the employer registration used for the payroll; identify the relevant employment; then confirm the Employment ID carried by the payroll record and the submission. PPSN and other personal data are evidence, but they should be viewed and communicated only through approved systems. Do not copy unnecessary personal details into an email or training note.',
    'This order prevents premature explanations. A changed deduction may come from a valid current RPN, a missing RPN, the wrong employment record, a pay-date issue, a changed payroll input or a reporting error. Until the identity layer is sound, the team cannot know which evidence belongs to the payment. “The tax changed” is therefore a hypothesis, not a diagnosis.',
    'A good case note makes the chain visible without reproducing sensitive values: employee identity verified through the approved route; employer registration confirmed; employment record matched; Employment ID compared between payroll and Revenue-facing evidence. Record what matched, what did not and who owns the next check.',
   ],
   supportPt:'Comece pela identidade da pessoa, do empregador e do vínculo. Um valor diferente é o ponto de partida da investigação, não a prova da causa.',
   stopAndCheck:{prompt:'List the four identity questions you should settle before explaining a deduction.',expectedElements:['employee verified','employer registration','relevant employment','Employment ID']},
  },
  {
   id:'block-employment',title:'2. Understand what the Employment ID distinguishes',plannedMinutes:4,objectiveIds:['obj-identity','obj-correction'],sourceIds:['revenue-employment-id','revenue-submission-transition'],
   paragraphs:[
    'The Employment ID distinguishes employments or periods of employment. It is not a payslip number, an RPN number or a payroll-run reference. Those identifiers may appear in the same workflow, but they answer different questions. When investigating an exception, label each identifier instead of referring vaguely to “the reference”.',
    'For a continuous period of employment, the Employment ID remains the same across a tax-year boundary. The arrival of January is not, by itself, a new employment event. Conversely, a genuinely separate employment or a new period of employment may need to remain distinct under the applicable Revenue process. The operational decision must come from the employment facts, not from convenience or a desire to make the software accept a file.',
    'People Operations evidence supports this decision. Start date, cessation date, rehire documentation, employer registration and approved worker status help the payroll specialist determine whether the record represents continuity or a new period. Payroll should not silently “repair” unclear People Operations data. It should raise a precise question: “Is this employment continuous, or is there an evidenced cessation and new start?”',
    'If an incorrect Employment ID was used, changing the employee-facing payslip alone does not repair the record. Identify the affected submission, follow the supported correction route and preserve the link between the original record, the evidence and the correction. The unit does not prescribe buttons in a specific application because software routes differ.',
   ],
   supportPt:'Employment ID identifica o vínculo ou período de vínculo. Não confunda com número do RPN nem com referência da rodada de payroll.',
   stopAndCheck:{prompt:'Why is “new year, new Employment ID” an unsafe rule?',expectedElements:['tax year is not an employment event','continuous employment keeps continuity','decision requires employment evidence']},
  },
  {
   id:'block-rpn',title:'3. Treat the applicable RPN as evidence, not as a guess',plannedMinutes:4,objectiveIds:['obj-rpn','obj-employee'],sourceIds:['revenue-rpn-transition','revenue-rpn-overview'],
   paragraphs:[
    'A Revenue Payroll Notification provides employer-facing tax information used in payroll. The safe control is to retrieve and operate the RPN that is applicable to the employee, employment and payment. For payments in 2026, the reviewed transition guidance states that a 2025 RPN must not be reused. An unchanged salary does not make a prior-year notification current.',
    'The RPN is controlled input, not a story to tell the employee. Record which notification was used and when it was retrieved through the approved process. If the notification contains values that look surprising, do not overwrite them with last month’s values merely to reproduce a familiar net-pay amount. Escalate the evidence question and use the supported workflow.',
    'If no RPN is available, absence is not permission to invent credits or copy another record. Follow the current emergency-basis guidance, investigate why the notification is unavailable and retain evidence of the action taken. This unit deliberately avoids rates and bands because they are date-sensitive and belong in current official guidance and approved software, not in a static lesson.',
    'When speaking with an employee, distinguish process from outcome: “I am checking which notification applied to this payment” is supported; “Revenue definitely changed your tax” is not supported until the record has been reconciled. If emergency basis was operated, explain the confirmed process fact and the next check, but do not promise the amount or timing of a later adjustment.',
   ],
   supportPt:'Use o RPN aplicável como evidência controlada. Se ele não estiver disponível, siga a rota vigente de emergency basis; nunca invente créditos.',
   stopAndCheck:{prompt:'What are the two safe actions when no RPN is available?',expectedElements:['follow current emergency-basis guidance','investigate and document why the RPN is unavailable']},
  },
  {
   id:'block-pay-date',title:'4. Let pay date control period and deadline',plannedMinutes:4,objectiveIds:['obj-pay-date','obj-correction'],sourceIds:['revenue-pay-date','revenue-submission-details'],
   paragraphs:[
    'Pay date is the date the employee is paid. Revenue uses it to determine the payroll reporting period, and the employer reports pay and deductions on or before that date. The reviewed guidance describes the bank-transfer pay date by reference to when funds are scheduled to be available to the employee. Always recheck the current wording before operational use.',
    'Do not substitute an internal milestone. File creation date, People Operations approval date, payroll calculation date, bank-file upload date and general-ledger posting date can all be useful controls, but none automatically replaces pay date. A team may process payroll several days before payment; the reporting period still follows the actual payment facts.',
    'A practical run checklist records the scheduled pay date before calculation and keeps it visible through approval, submission and release. It also records the payroll-run reference and accepted or rejected submission evidence. The reference helps the team trace an event; it does not become the Employment ID.',
    'If the pay date itself is wrong, classify that as a reporting-data issue. Do not disguise it by changing a later period. Identify the affected record, confirm the actual payment evidence, follow the supported correction route and document review. Whether another employee action is required depends on the specific facts and current guidance.',
   ],
   supportPt:'Pay date é a data em que o empregado recebe. Datas internas de processamento, aprovação ou lançamento não substituem essa data.',
   stopAndCheck:{prompt:'A file was created on 24 January and funds are scheduled to be available on 30 January. Which date controls the reporting period in this scenario?',expectedElements:['30 January','actual scheduled availability of funds','report on or before that pay date']},
  },
  {
   id:'block-correction',title:'5. Classify the exception before changing a record',plannedMinutes:4,objectiveIds:['obj-correction','obj-transfer'],sourceIds:['revenue-corrections','revenue-submission-details'],
   paragraphs:[
    'A correction begins with classification. Ask whether the evidence points to the wrong person or employment, the wrong Employment ID, the wrong or unavailable RPN, the wrong pay date, an incorrect pay input, an incorrect reported amount or a submission-status problem. More than one break can exist. Naming the category makes it harder to apply a convenient but unrelated fix.',
    'Build a three-column note: expected fact, observed fact and evidence. For example: expected continuous Employment ID 7; observed ID 8 in the file; evidence is the People Operations continuity record and prior accepted submission. Then name the proposed action and reviewer. This creates an audit trail that another specialist can understand without relying on memory.',
    'Do not force a current net-pay result to match a prior payslip, and do not use an unrelated later payment merely to offset a reporting error. Revenue provides correction routes through payroll software or ROS, but the correct route depends on the error and current instructions. Follow the approved operational process and preserve the original and corrected evidence.',
    'A submission marked accepted proves that the technical submission was accepted; it does not prove every underlying input was accurate. Likewise, a checklist signature proves a review was recorded; it does not guarantee that no error exists. Evidence supports a bounded claim. State exactly what the evidence shows.',
   ],
   supportPt:'Primeiro classifique a divergência. Depois relacione fato esperado, fato observado, evidência, ação e revisão.',
   stopAndCheck:{prompt:'Why does an “accepted” submission not close every employee query?',expectedElements:['acceptance is submission status','underlying input can still be wrong','reconcile evidence before concluding']},
  },
  {
   id:'block-employee',title:'6. Close the loop with the employee and People Operations',plannedMinutes:4,objectiveIds:['obj-employee','obj-transfer'],sourceIds:['dpc-data-minimisation','dpc-security-guidance'],
   paragraphs:[
    'Payroll queries combine personal data, money and uncertainty. Use the organisation’s approved identity check and communication channel before discussing a payslip. Share only what the recipient needs. A crowded email thread or a manager copied “for visibility” is not automatically an appropriate place for detailed payroll data.',
    'Use a four-part response. First acknowledge the issue. Second state the verified fact: which payment or field is under review. Third name the action and owner. Fourth give a realistic update point. Example: “I can see that your PAYE line differs from the previous payslip. I am checking the employment record and the notification used for this payment. Payroll owns the review, and I will update you by 15:00 tomorrow.”',
    'Avoid blame and unsupported promises. “Revenue made a mistake”, “you will receive a refund” and “the next payslip will definitely correct it” all exceed the evidence unless the investigation and approved process support those conclusions. Calibrated language is not evasive when it is paired with a clear action and update time.',
    'Close the internal loop as well. If People Operations owns a start, cessation or approval fact, request the precise evidence and record the response. If Payroll owns the RPN, pay-date or submission check, keep that responsibility visible. Once the matter is resolved, record the confirmed cause, action, reviewer, employee update and any control improvement without retaining unnecessary personal detail in a learning system.',
   ],
   supportPt:'Proteja a privacidade, diga apenas o que foi confirmado, nomeie ação e responsável e combine um horário realista para a próxima atualização.',
   stopAndCheck:{prompt:'Draft the four moves of an evidence-safe employee response.',expectedElements:['acknowledge','verified fact','action and owner','bounded update time']},
  },
 ],
 workedExamples:[
  {
   id:'example-year-turn',title:'Worked example 1 · Continuous employment at the year turn',plannedMinutes:5,
   facts:[
    'A fictional employee remains continuously employed from December 2025 into January 2026.',
    'The January payment has a pay date of 30 January 2026.',
    'The payroll file contains a 2025 RPN and changes Employment ID 7 to 8.',
    'Salary is unchanged, and no current RPN values or live rates are supplied.',
   ],
   task:'Identify what is definitely wrong, what evidence must be obtained, the reporting deadline and what cannot yet be promised to the employee.',
   reasoning:[
    'Classify the first break as RPN control: a prior-year RPN is not the applicable notification for a 2026 payment.',
    'Classify the second break as employment identity: the facts describe continuity, so the year change alone does not justify a new Employment ID.',
    'Retrieve or reconcile the applicable 2026 RPN and match payroll to the evidenced continuous employment.',
    'Use 30 January as pay date; the submission is due on or before that date and belongs to the period determined by that date.',
    'Do not calculate or promise a tax difference because the applicable RPN values and full payroll inputs are absent.',
   ],
   modelResponse:'Two control failures are confirmed: the file uses a prior-year RPN for a 2026 payment, and it changes the Employment ID even though the supplied evidence says the employment is continuous. Payroll should retrieve and operate the applicable 2026 RPN, reconcile the payroll and Revenue-facing records to the supported Employment ID, and report on or before the 30 January pay date. If a submission was already made, the team should classify the exact error and use the approved correction route with review evidence. We cannot state the correct deduction or promise an adjustment until the applicable RPN and all required payroll inputs are reconciled.',
   boundary:'This example tests the evidence sequence; it supplies no rates and is not a live payroll calculation.',
   objectiveIds:['obj-identity','obj-rpn','obj-pay-date','obj-correction'],sourceIds:['revenue-employment-id','revenue-rpn-transition','revenue-pay-date','revenue-corrections'],
  },
  {
   id:'example-no-rpn',title:'Worked example 2 · New starter with no RPN at cut-off',plannedMinutes:5,
   facts:[
    'A fictional new starter has completed the employer’s approved onboarding steps.',
    'Payroll has verified the employee and new employment record, but no RPN is available at the calculation cut-off.',
    'The pay date remains Friday, and the employee asks whether Payroll can copy the notification from a previous employer.',
    'The exercise supplies no rates, credits, rate bands or later Revenue outcome.',
   ],
   task:'Choose the operational path and draft a two-sentence employee update.',
   reasoning:[
    'Do not copy another employment’s notification or invent credits.',
    'Follow the current emergency-basis guidance and investigate why the expected RPN is unavailable.',
    'Keep the reporting obligation connected to Friday’s pay date.',
    'Explain the confirmed process and next check without promising a refund, amount or timing.',
   ],
   modelResponse:'Payroll should use the current supported emergency-basis process, investigate the missing RPN and keep the submission aligned to Friday’s pay date. Employee update: “The notification needed for this employment was not available when this payroll was calculated, so the approved temporary treatment was used. I am checking the employment record and notification status and will update you by Tuesday; I cannot confirm a later amount until that evidence is available.”',
   boundary:'A later adjustment, its amount and its timing are intentionally unknown; the learner must not invent them.',
   objectiveIds:['obj-rpn','obj-pay-date','obj-employee'],sourceIds:['revenue-rpn-transition','revenue-pay-date'],
  },
 ],
 misconceptions:[
  {id:'mis-year-id',belief:'A new tax year always requires a new Employment ID.',whyItFails:'A tax-year boundary is not itself a new employment event and can break continuity for an unchanged employment.',repair:'Establish whether the employment is continuous from the People Operations and Revenue-facing records.',sourceIds:['revenue-employment-id','revenue-submission-transition']},
  {id:'mis-old-rpn',belief:'An unchanged salary makes last year’s RPN safe to reuse.',whyItFails:'The RPN is year- and record-specific controlled input; unchanged salary does not make an old notification current.',repair:'Retrieve and operate the applicable notification for the payment or follow current no-RPN guidance.',sourceIds:['revenue-rpn-transition']},
  {id:'mis-process-date',belief:'The date Payroll creates the file is the pay date.',whyItFails:'An internal processing milestone does not replace the date on which the employee is paid.',repair:'Record the scheduled payment facts and use the actual pay date for period and deadline.',sourceIds:['revenue-pay-date']},
  {id:'mis-accepted',belief:'An accepted submission proves every input was correct.',whyItFails:'Acceptance describes submission status; it does not independently validate employment facts or payroll inputs.',repair:'Reconcile the accepted record to source evidence when an exception is raised.',sourceIds:['revenue-submission-details']},
  {id:'mis-match-net',belief:'The safest correction is to make net pay match last month.',whyItFails:'It substitutes a desired result for diagnosis and can conceal a valid change or create a second error.',repair:'Classify the exception and correct the supported field through the approved route.',sourceIds:['revenue-corrections']},
  {id:'mis-promise',belief:'A calm response should promise a refund to reassure the employee.',whyItFails:'A promise without reconciled evidence can be false and creates a second service failure.',repair:'State the verified process fact, next action, owner and bounded update time.',sourceIds:['revenue-corrections']},
  {id:'mis-copy-all',belief:'More personal information in the case note makes the control stronger.',whyItFails:'Unnecessary personal data increases exposure without improving the decision.',repair:'Use approved systems and retain only the minimum evidence needed for the control and follow-up.',sourceIds:['dpc-data-minimisation','dpc-security-guidance']},
 ],
 practice:{
  attemptsBeforeReveal:2,
  items:[
   {
    id:'pr-n1',stage:'notice',format:'single-select',prompt:'Which statement is a confirmed observation rather than an unsupported cause?',
    options:[{id:'a',text:'Revenue changed the employee’s tax incorrectly.'},{id:'b',text:'The PAYE line is €96 higher than on the prior supplied payslip.'},{id:'c',text:'The employee will receive €96 next month.'},{id:'d',text:'Payroll software caused the difference.'}],correctOptionIds:['b'],
    rationale:'The comparison is visible in the supplied records. The cause and any later adjustment still require evidence.',objectiveIds:['obj-employee'],sourceIds:[],hints:['Look for a statement that only describes what the records show.','A number can be observed without proving why it changed.'],errorBankTag:'fact-vs-conclusion',
   },
   {
    id:'pr-n2',stage:'notice',format:'multi-select',prompt:'Select every identifier that must remain conceptually distinct in the workflow.',
    options:[{id:'a',text:'Employment ID'},{id:'b',text:'RPN reference/details'},{id:'c',text:'Payroll run reference'},{id:'d',text:'Employee’s preferred explanation'}],correctOptionIds:['a','b','c'],
    rationale:'The three identifiers support different control questions. A preferred explanation is not evidence.',objectiveIds:['obj-identity'],sourceIds:['revenue-employment-id','revenue-submission-details'],hints:['Three choices refer to records.','One choice is a preference rather than an identifier.'],errorBankTag:'identifier-boundaries',
   },
   {
    id:'pr-u1',stage:'understand',format:'single-select',prompt:'Why is “new year, new Employment ID” unsafe for a continuous employment?',
    options:[{id:'a',text:'Because Employment IDs are optional.'},{id:'b',text:'Because a tax-year change does not itself create a new employment period.'},{id:'c',text:'Because the RPN becomes the Employment ID.'},{id:'d',text:'Because every employee must use ID 1.'}],correctOptionIds:['b'],
    rationale:'Continuity is determined from employment facts, not the calendar alone.',objectiveIds:['obj-identity'],sourceIds:['revenue-employment-id','revenue-submission-transition'],hints:['Ask what event the identifier represents.','A calendar boundary and an employment event are different things.'],errorBankTag:'employment-continuity',
   },
   {
    id:'pr-u2',stage:'understand',format:'single-select',prompt:'A file is calculated on Monday and funds are scheduled to be available to the employee on Friday. Which date controls the reporting period in the supplied facts?',
    options:[{id:'a',text:'Monday'},{id:'b',text:'Friday'},{id:'c',text:'The manager approval date'},{id:'d',text:'The month-end close date'}],correctOptionIds:['b'],
    rationale:'Friday is the stated pay date. The internal calculation date does not replace it.',objectiveIds:['obj-pay-date'],sourceIds:['revenue-pay-date'],hints:['Separate processing from payment.','Use the date on which the employee is paid.'],errorBankTag:'pay-date-boundary',
   },
   {
    id:'pr-u3',stage:'understand',format:'single-select',prompt:'What does an accepted payroll submission prove?',
    options:[{id:'a',text:'Every input is accurate.'},{id:'b',text:'The employee agrees with the payslip.'},{id:'c',text:'The submission reached an accepted technical status.'},{id:'d',text:'No correction can ever be needed.'}],correctOptionIds:['c'],
    rationale:'Status evidence must not be extended into a claim that it does not support.',objectiveIds:['obj-correction'],sourceIds:['revenue-submission-details'],hints:['Use the narrowest supported claim.','Technical status and input accuracy are not identical.'],errorBankTag:'evidence-boundaries',
   },
   {
    id:'pr-c1',stage:'choose',format:'single-select',prompt:'No RPN is available for a current payment. What is the safest next step?',
    options:[{id:'a',text:'Copy last year’s notification.'},{id:'b',text:'Use a colleague’s credits as an estimate.'},{id:'c',text:'Follow current emergency-basis guidance and investigate the missing RPN.'},{id:'d',text:'Ignore the pay date and report next month.'}],correctOptionIds:['c'],
    rationale:'Missing evidence triggers the supported temporary route and investigation, not invention or delay.',objectiveIds:['obj-rpn'],sourceIds:['revenue-rpn-transition'],hints:['Absence of evidence is not permission to invent it.','Choose the route explicitly designed for no RPN.'],errorBankTag:'rpn-unavailable',
   },
   {
    id:'pr-c2',stage:'choose',format:'single-select',prompt:'Which opening best protects the evidence boundary in an employee query?',
    options:[{id:'a',text:'Revenue definitely made an error.'},{id:'b',text:'You will receive the difference next month.'},{id:'c',text:'I can see the deduction changed; I am checking the employment record and notification used.'},{id:'d',text:'The system is always right.'}],correctOptionIds:['c'],
    rationale:'It acknowledges the observed issue, names the check and avoids an unsupported cause or promise.',objectiveIds:['obj-employee'],sourceIds:[],hints:['Keep the observation and investigation separate.','Do not choose wording that promises the cause or result.'],errorBankTag:'employee-communication',
   },
   {
    id:'pr-c3',stage:'choose',format:'multi-select',prompt:'Which actions belong in a controlled correction trail? Select all that apply.',
    options:[{id:'a',text:'Record expected and observed facts.'},{id:'b',text:'Name the evidence and reviewer.'},{id:'c',text:'Delete the original record so it cannot confuse anyone.'},{id:'d',text:'Link the approved correction to the affected submission.'}],correctOptionIds:['a','b','d'],
    rationale:'A traceable correction preserves rather than erases the relationship between original evidence and approved action.',objectiveIds:['obj-correction'],sourceIds:['revenue-corrections'],hints:['A reviewer should be able to reconstruct what happened.','Erasing the original breaks the trail.'],errorBankTag:'correction-trail',
   },
   {
    id:'pr-b1',stage:'build',format:'short-written',prompt:'Build a five-line control note for this fact: a continuous employee appears with Employment ID 7 in the prior accepted record and ID 8 in the current file.',
    expectedElements:['expected fact','observed fact','supporting evidence','next action','owner or reviewer'],
    modelAnswer:'Expected: continuous employment should remain linked to the supported Employment ID. Observed: prior accepted record shows 7; current file shows 8. Evidence: People Operations continuity record plus the prior accepted submission. Action: pause the affected item, reconcile the employment record and follow the approved correction route if needed. Owner/reviewer: Payroll specialist prepares; authorised reviewer approves.',
    selfCheck:'Underline the evidence. Circle the proposed action. If either is missing, revise before revealing the model.',objectiveIds:['obj-identity','obj-correction'],sourceIds:['revenue-employment-id','revenue-corrections'],hints:['Use expected, observed and evidence as separate labels.','Finish with an action and accountable review.'],errorBankTag:'control-note',
   },
   {
    id:'pr-b2',stage:'build',format:'short-written',prompt:'Repair this message: “Revenue got your tax wrong, but do not worry — you will receive €96 next month.”',
    expectedElements:['remove unsupported blame','remove unsupported amount or timing promise','state observed issue','name next check','give bounded update point'],
    modelAnswer:'“I can see that the PAYE line on this payslip differs from the prior record. I am checking the employment details and the notification used for this payment, and I will update you by 15:00 tomorrow. I cannot confirm an adjustment amount until that review is complete.”',
    selfCheck:'Check that every claim could be supported by the supplied records and that the employee knows what happens next.',objectiveIds:['obj-employee'],sourceIds:[],hints:['Keep only what the evidence proves today.','Replace the promise with an action and update time.'],errorBankTag:'unsupported-promise',
   },
   {
    id:'pr-use1',stage:'use',format:'extended-written',prompt:'A new starter is verified, but no RPN is available at cut-off and the pay date is tomorrow. Write the operational sequence in no more than 120 words.',
    expectedElements:['confirm employee and employment identity','record RPN unavailability','follow current emergency-basis guidance','preserve tomorrow’s pay-date reporting obligation','investigate missing RPN','record evidence and review','avoid invented rates or credits'],
    modelAnswer:'Confirm the employee, employer registration, employment and Employment ID in the approved records. Record that no RPN was available at cut-off and retain the retrieval evidence. Follow the current emergency-basis process in approved payroll software; do not copy old credits or invent values. Keep the submission aligned to tomorrow’s actual pay date and obtain review under the normal run control. Investigate why the RPN is unavailable and record the owner and next check. Give the employee a factual update without promising a later amount.',
    selfCheck:'Number each action. The order should move from identity to RPN handling, pay date, evidence, investigation and communication.',objectiveIds:['obj-identity','obj-rpn','obj-pay-date','obj-employee'],sourceIds:['revenue-rpn-transition','revenue-pay-date'],hints:['Start before the calculation.','End with evidence and a bounded employee update.'],errorBankTag:'full-control-sequence',
   },
   {
    id:'pr-use2',stage:'use',format:'extended-written',prompt:'An accepted submission has the wrong pay date for one employee. Write a correction plan that does not create a second unsupported change.',
    expectedElements:['verify actual payment evidence','identify affected submission and field','do not treat acceptance as proof of accuracy','follow approved software or ROS correction route','preserve original and corrected evidence','independent review','employee impact assessed separately'],
    modelAnswer:'Verify the actual date of payment from the approved payment evidence and compare it with the pay date reported for the employee. Identify the exact submission and field affected; accepted status does not prove the date was correct. Use the organisation’s current approved payroll-software or ROS correction route rather than changing a later payment to compensate. Preserve the original record, corrected evidence, reason, operator and reviewer. Assess any employee-facing impact from the corrected facts and communicate only what has been confirmed.',
    selfCheck:'Remove any step that changes an unrelated payment merely to make totals look right.',objectiveIds:['obj-pay-date','obj-correction','obj-employee'],sourceIds:['revenue-pay-date','revenue-corrections'],hints:['First prove the actual payment date.','Correct the affected fact through the supported route and preserve the trail.'],errorBankTag:'pay-date-correction',
   },
  ],
 },
 caseStudy:{
  id:'case-query-1',title:'Integrated case · A lower net-pay query with a timing clue',plannedMinutes:10,
  scenario:[
   'Fictional employee Elena is continuously employed and contacts a shared People Operations inbox because her February net pay is lower than January.',
   'Her gross pay is unchanged. The supplied payslips show PAYE is €96 higher; other supplied deductions are unchanged. No live rates or correct deduction amount are provided.',
   'The February payroll record uses the same Employment ID as January and shows a 27 February pay date. The submission has accepted status.',
   'The run log shows RPN reference A was retrieved on 23 February and used in calculation. The training Revenue extract shows RPN reference B became available on 25 February. The documents do not state which notification the approved process required the employer to operate for this run.',
   'The employee asks Payroll to confirm today that €96 will be refunded in March. The shared inbox includes colleagues who do not need payslip detail.',
  ],
  documents:[
   {name:'People Operations continuity note',contents:['Continuous employment confirmed.','No cessation or rehire event.','Employment ID 4 in the approved record.']},
   {name:'Payroll run log',contents:['Employment ID 4.','RPN reference A retrieved 23 February.','Pay date 27 February.','Submission status accepted.']},
   {name:'Training Revenue extract',contents:['RPN reference B visible from 25 February.','No values, effective instruction or live employee record supplied.']},
   {name:'Employee message',contents:['Net pay is lower.','Please confirm that €96 will be refunded in March.']},
  ],
  task:'Prepare an internal triage note and a four-sentence employee response. Decide what is confirmed, what remains unresolved, what evidence or approved guidance must be checked, who owns each action and what must not be promised.',
  requiredOutput:['identity conclusion','RPN timing question','pay-date and submission-status boundary','privacy action','owner and next checkpoint','employee response without unsupported cause or promise'],
  hints:['Accepted status and matching identity narrow the investigation but do not decide which RPN should have been operated.','Move the employee exchange to an approved restricted channel before discussing detail.'],
  modelAnswer:'Internal triage: identity continuity is supported because the People Operations record, prior record and current file all use Employment ID 4. The supplied evidence confirms only that PAYE is €96 higher and that RPN A was used; it does not establish whether A or B was applicable under the approved process. Payroll should restrict the case to the appropriate channel, compare retrieval timestamps and the notifications through the approved system, check current Revenue guidance and software procedure, and have an authorised reviewer decide whether a correction is required. The 27 February pay date and accepted submission status are documented, but acceptance does not validate the RPN choice. Employee response: “Thank you for raising the February payslip difference. I can confirm that the PAYE line is €96 higher, and Payroll is checking the notification used for this payment against the current record. I have moved the case to our restricted payroll channel and will update you by 15:00 tomorrow. I cannot yet confirm the cause or a March adjustment because that depends on the completed review.”',
  markingCriteria:[
   {id:'case-mark-identity',description:'Uses the matching continuous Employment ID as evidence without claiming the whole payroll is correct.',weight:15},
   {id:'case-mark-rpn',description:'Identifies the RPN timing/applicability question and requests the missing approved-process evidence.',weight:25},
   {id:'case-mark-date',description:'Treats pay date and accepted status as bounded evidence.',weight:15},
   {id:'case-mark-privacy',description:'Moves detailed discussion away from the over-broad shared inbox.',weight:15},
   {id:'case-mark-action',description:'Names owner, reviewer, next check and update point.',weight:15},
   {id:'case-mark-language',description:'Avoids blame, invented cause and unsupported amount/timing promise.',weight:15},
  ],
  boundary:'The case intentionally withholds notification values and an applicability conclusion. The correct learner action is controlled investigation, not a deduction calculation.',
  objectiveIds:['obj-identity','obj-rpn','obj-pay-date','obj-correction','obj-employee','obj-transfer'],sourceIds:['revenue-rpn-overview','revenue-pay-date','revenue-corrections','dpc-data-minimisation'],
 },
 retrieval:{
  plannedMinutes:5,
  items:[
   {id:'ret-1',prompt:'Without notes, name the four identity layers checked before a deduction explanation.',answer:'Employee, employer registration, relevant employment and Employment ID.',objectiveIds:['obj-identity'],reviewAfterDays:[1,3,7]},
   {id:'ret-2',prompt:'What should happen if no RPN is available?',answer:'Use the current supported emergency-basis process, investigate why the RPN is unavailable and document the evidence; never invent or copy credits.',objectiveIds:['obj-rpn'],reviewAfterDays:[1,3,7]},
   {id:'ret-3',prompt:'Which date controls the payroll reporting period?',answer:'The actual pay date, based on the payment facts, not an internal processing milestone.',objectiveIds:['obj-pay-date'],reviewAfterDays:[1,3,7]},
   {id:'ret-4',prompt:'What are the three columns in the minimum exception note?',answer:'Expected fact, observed fact and evidence; then add action, owner and review.',objectiveIds:['obj-correction'],reviewAfterDays:[1,3,7]},
   {id:'ret-5',prompt:'What four moves make an employee response evidence-safe?',answer:'Acknowledge, state the verified fact, name action and owner, and give a bounded update point.',objectiveIds:['obj-employee'],reviewAfterDays:[1,3,7]},
   {id:'ret-6',prompt:'What does an accepted submission not prove?',answer:'It does not prove that every underlying employment fact, RPN, pay input or reported amount was accurate.',objectiveIds:['obj-correction'],reviewAfterDays:[1,3,7]},
  ],
 },
 evidenceRules:{
  automaticallyAddToErrorBank:[
   'A selection item answered incorrectly on both allowed attempts.',
   'A retrieval item answered incorrectly twice in the same review session.',
   'A case marking criterion explicitly marked absent by an authorised evaluator or by the learner during guided self-check.',
  ],
  doNotInfer:[
   'Opening or scrolling through a block does not prove understanding.',
   'Revealing a model answer does not prove that the learner produced it independently.',
   'Completion does not establish competence in live payroll operation or current statutory calculation.',
   'A written answer does not prove speaking, listening or pronunciation performance.',
   'An accepted fictional submission does not prove the correctness of all source inputs.',
  ],
  writtenEvidencePolicy:'Written responses are stored as attempts, but an error is recorded only when a learner self-check or an authorised evaluator identifies a missing required element. Keyword matching alone must not label an open response correct or incorrect.',
  retention:'Store item outcome, attempt count, criterion tags and the learner’s written response under the learner account. Do not copy PPSN, real payslip data, voice recordings or other live employee personal data into lesson evidence.',
 },
 completionRules:{
  completionIsNotMastery:true,
  requiredPhaseIds:['phase-orient','phase-learn','phase-examples','phase-practice','phase-case','phase-audio','phase-retrieval'],
  selectionThresholdPct:80,
  requiredWrittenItemIds:['pr-b1','pr-b2','pr-use1','pr-use2'],
  caseMinimumCriteria:['case-mark-identity','case-mark-rpn','case-mark-privacy','case-mark-action','case-mark-language'],
  audioMinimumEvidence:['Complete first listen before opening the annotated pass.','Answer at least three of four comprehension items correctly after no more than two attempts.','Record completion of all three shadowing lines; no pronunciation score is inferred without a valid evaluator.'],
  retrievalThresholdPct:80,
 },
 audioEpisode:{
  status:'authored_script_no_generation',role:'distinct_contextual_episode',estimatedMinutes:12,distinctFromLearn:true,
  title:'The missing notification: a first-payslip conversation',
  listeningGoals:[
   'Follow a realistic People Operations handoff without seeing the evidence chain as a list.',
   'Notice how a payroll specialist separates what is known from what remains under investigation.',
   'Hear calm employee-facing language for emergency-basis and RPN follow-up without an unsupported promise.',
   'Shadow three short workplace chunks with clear stress on the fact, action and update time.',
  ],
  segments:[
   {
    id:'audio-intro',title:'Set the listening question',plannedSeconds:45,purpose:'Prime the learner for meaning rather than repeat the written lesson.',
    script:'You are about to hear a fictional conversation involving Elena, a new employee; Aisling, a People Operations coordinator; and Niamh, a payroll specialist. Elena’s first payslip shows a higher deduction than she expected. Your job is not to calculate the deduction. Listen for three things: what the team can confirm, what they still need to check, and how Niamh gives a useful next step without promising an amount. Keep your notes closed for the first pass. At the end, you should be able to say why “I will investigate” can be a strong answer when it includes evidence, ownership and a clear update time.',
    learnerAction:'Close the transcript after hearing the listening question; write only three headings: confirmed, checking, next update.',
   },
   {
    id:'audio-first-listen',title:'First listen · the employee query',plannedSeconds:180,purpose:'Present a new-starter scenario as a natural workplace exchange.',
    script:'Elena: Hi, Aisling. I have just received my first payslip, and the deduction is much higher than I expected. A colleague said I would probably get it all back next month. Can you confirm that for me?\n\nAisling: Thanks for telling me, Elena. I cannot confirm a later amount from the payslip alone, but I can make sure the right team checks the record. Before we discuss the details, I am moving this conversation from the shared People inbox to the restricted payroll case channel. You will receive a secure message in a moment.\n\nElena: That is fine. Is there something wrong with my employee record?\n\nAisling: Your onboarding checklist shows that your identity and start date were verified, and the employment record was approved before the cut-off. I will ask Niamh to check the payroll and Revenue-facing evidence.\n\nNiamh: Hi, Elena. I have opened the restricted case. I can confirm that this was your first payment from us and that no RPN was available to Payroll when the run was calculated. The approved temporary treatment was therefore used. That explains the process we followed; it does not yet tell me why the notification was unavailable or what may happen later.\n\nElena: Can you use the notification from my previous employer?\n\nNiamh: No. We should not copy another employment’s notification or invent credits. I am checking that this employment was registered correctly and whether a current notification is now available for this employment. I will also confirm the Employment ID and retain the retrieval evidence in the case.\n\nElena: So will the difference come back in the next payslip?\n\nNiamh: I cannot promise an amount or date before the current record is checked. I can promise the next action: Payroll owns the notification check, and People Operations owns any correction needed in the employment data. I will update you by two o’clock tomorrow, even if the investigation is still open.\n\nAisling: I will remain on the internal task, but the detailed payslip information will stay in the restricted channel.\n\nElena: Thank you. I understand that the process is confirmed, but the later result is not confirmed yet.\n\nNiamh: Exactly. I will send a short summary now: what we know, what we are checking and when you will hear from us again.',
    learnerAction:'Without replaying, write one confirmed fact, one unresolved question and the promised update point.',
   },
   {
    id:'audio-retrieval-pause',title:'Retrieval pause',plannedSeconds:75,purpose:'Force recall before explanation.',
    script:'Pause here. Do not read the transcript yet. Question one: why did Aisling move the conversation? Question two: what process fact could Niamh confirm? Question three: what did she refuse to promise? Question four: which team owned the RPN check, and which team owned any employment-data correction? Say your answers aloud in complete sentences. Now reduce the whole conversation to one line using this structure: confirmed fact, current check, next update. When you are ready, continue to the annotated second pass.',
    learnerAction:'Answer all four questions aloud, then create the one-line summary.',
   },
   {
    id:'audio-second-listen',title:'Second listen · notice the control language',plannedSeconds:180,purpose:'Revisit the scenario with explicit language and evidence cues rather than replay Learn text.',
    script:'Listen again to the key turns, this time with commentary. Aisling says, “I cannot confirm a later amount from the payslip alone.” Notice the boundary: the document proves what appeared on the payslip, but not the cause or the future result. She then moves the discussion to a restricted channel. Privacy is not a closing sentence added after the technical work; it changes how the work is handled.\n\nNext, Niamh says, “No RPN was available to Payroll when the run was calculated. The approved temporary treatment was therefore used.” This is a bounded statement about the team’s process. She does not say that Revenue made an error. She does not guess which credits should have applied. She names the missing evidence and keeps the next investigation open.\n\nWhen Elena asks about using another employer’s notification, Niamh says no and immediately replaces the unsafe shortcut with a control sequence: check that the employment was registered correctly, look for the notification for this employment, confirm the Employment ID and retain retrieval evidence. A strong refusal is easier to accept when it comes with a practical next step.\n\nFinally, listen to the commitment: “I cannot promise an amount or date before the current record is checked. I can promise the next action.” The contrast is important. Niamh is cautious about an outcome she cannot support, but specific about work she controls. Payroll owns the notification check. People Operations owns a possible employment-data correction. The employee receives an update time whether or not the final answer is ready. That is not vague language. It is accountable language.\n\nNow say the evidence chain from memory: verified employee and employment; notification availability; Employment ID; pay-date obligation; submission evidence; correction if supported; employee update. Your words can differ, but the logic should remain in that order.',
    learnerAction:'Mark each sentence in your notes F for fact, C for check, O for owner or U for update.',
   },
   {
    id:'audio-language-clinic',title:'Language clinic · certainty, action and ownership',plannedSeconds:120,purpose:'Teach reusable workplace chunks from the scenario.',
    script:'Here are four language contrasts. First: “The deduction is wrong” versus “The deduction is higher than on the comparison payslip.” The first sentence claims a conclusion; the second reports an observation. Stress higher and comparison payslip.\n\nSecond: “Revenue caused the problem” versus “I am checking which notification was available for this employment.” The second sentence names the evidence question without assigning blame. Stress checking, notification and this employment.\n\nThird: “You will get it back next month” versus “I cannot confirm a later amount until the record is checked.” Cannot confirm is not the end of the response. Add a controlled commitment: “I will update you by two o’clock tomorrow.”\n\nFourth: “Someone will look at it” versus “Payroll owns the notification check; People Operations owns any employment-data correction.” Naming an owner turns reassurance into a plan.\n\nPractise a three-part rhythm: fact, action, update. “The notification was unavailable. Payroll is checking the current record. I will update you tomorrow.” Pause briefly between the parts. Keep the voice calm and the final update firm. You are not apologising for uncertainty; you are managing it responsibly.',
    learnerAction:'Repeat each safer alternative once, then say the three-part rhythm twice with stress on the bold ideas in your own notes.',
   },
   {
    id:'audio-shadowing',title:'Shadowing · three controlled commitments',plannedSeconds:60,purpose:'Practise rhythm and stress without claiming automated pronunciation accuracy.',
    script:'Shadow each line after the tone. Line one: “I can confirm the process we followed; I am still checking the cause.” Line two: “Payroll owns the notification check, and I will update you by two o’clock.” Line three: “I cannot promise an amount until the current record is reconciled.” Repeat the three lines once more. On the second round, shorten unstressed words and make the contrast words clear: confirm and checking; Payroll and two o’clock; cannot promise and reconciled. The learning hub records completion only. It must not assign a pronunciation score unless a valid pronunciation evaluator is active.',
    learnerAction:'Complete two rounds. If recording is available, keep it only under the learner’s selected retention setting; otherwise practise locally without upload.',
   },
   {
    id:'audio-transfer',title:'Transfer challenge and recap',plannedSeconds:60,purpose:'Require a new response rather than imitation alone.',
    script:'Transfer the pattern to a different situation. A leaver says the final payslip is missing an expected item. You can confirm the item is absent, but you do not yet know whether the People Operations approval reached Payroll before cut-off. Give a four-sentence response: acknowledge the concern, state the observed fact, name the evidence and owner you will check, and give a realistic update point. Do not blame a team and do not promise an amount.\n\nFinish with the unit’s control sentence: identity before explanation; evidence before correction; pay date before reporting; confirmed fact before promise. The audio has given you a workplace conversation, not a spoken copy of the Learn page. Return to the case only if you can now explain what Niamh knew, what she did not know and why her answer was still useful.',
    learnerAction:'Record or say a four-sentence response, then compare it with the four required moves in the employee-response block.',
   },
  ],
  comprehension:[
   {id:'audio-q1',stage:'understand',format:'single-select',prompt:'Why did Aisling move the conversation to a restricted channel?',options:[{id:'a',text:'To avoid answering Elena.'},{id:'b',text:'Because detailed payslip information should be limited to an approved audience.'},{id:'c',text:'Because shared inboxes cannot receive any messages.'},{id:'d',text:'To guarantee a refund.'}],correctOptionIds:['b'],rationale:'The move protects personal payroll information while the work continues.',objectiveIds:['obj-employee'],sourceIds:['dpc-data-minimisation'],hints:['Listen for who needed access to the detail.','The channel decision is a privacy control.'],errorBankTag:'audio-privacy'},
   {id:'audio-q2',stage:'understand',format:'single-select',prompt:'What could Niamh confirm in the first conversation?',options:[{id:'a',text:'The exact later adjustment.'},{id:'b',text:'Revenue made an error.'},{id:'c',text:'No RPN was available at calculation time and the approved temporary process was used.'},{id:'d',text:'The next payslip would be correct.'}],correctOptionIds:['c'],rationale:'She confirmed the process evidence, not the cause or later amount.',objectiveIds:['obj-rpn','obj-employee'],sourceIds:['revenue-rpn-transition'],hints:['Separate a process fact from a future result.','Which statement was supported by the run evidence?'],errorBankTag:'audio-evidence-boundary'},
   {id:'audio-q3',stage:'understand',format:'multi-select',prompt:'Which commitments were under Niamh’s control? Select all that apply.',options:[{id:'a',text:'Check the current notification record.'},{id:'b',text:'Update Elena by two o’clock tomorrow.'},{id:'c',text:'Guarantee a particular adjustment.'},{id:'d',text:'Retain retrieval evidence in the case.'}],correctOptionIds:['a','b','d'],rationale:'The process actions and update are controllable; a future monetary outcome is not yet supported.',objectiveIds:['obj-rpn','obj-employee'],sourceIds:[],hints:['Choose actions, not an unknown result.','Three options describe work the team can perform.'],errorBankTag:'audio-controlled-commitment'},
   {id:'audio-q4',stage:'use',format:'single-select',prompt:'Which summary best follows fact, action and update?',options:[{id:'a',text:'Your tax is wrong, and it will be fixed.'},{id:'b',text:'The notification was unavailable; Payroll is checking the current record; you will receive an update tomorrow.'},{id:'c',text:'Someone is looking at something.'},{id:'d',text:'The payslip is final because the submission was accepted.'}],correctOptionIds:['b'],rationale:'It states the confirmed process fact, the current action and a bounded update.',objectiveIds:['obj-employee'],sourceIds:[],hints:['Find all three moves.','Avoid a cause or outcome that was not confirmed.'],errorBankTag:'audio-response-structure'},
  ],
  shadowing:[
   {id:'shadow-1',line:'I can confirm the process we followed; I am still checking the cause.',focus:'Contrastive stress on confirm and checking; short pause at the semicolon.'},
   {id:'shadow-2',line:'Payroll owns the notification check, and I will update you by two o’clock.',focus:'Stress the owner and the update time.'},
   {id:'shadow-3',line:'I cannot promise an amount until the current record is reconciled.',focus:'Keep cannot promise firm, then fall on reconciled.'},
  ],
  generationRequested:false,storageKey:null,
 },
 sources:[
  {id:'revenue-rpn-transition',label:'Revenue · Requesting RPNs for 2026',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/transitional-arrangements/requesting-rpn.aspx',supports:'Reviewed 2026 transition statements: request applicable RPNs, do not use a 2025 RPN for 2026 payments, and follow current emergency-basis guidance when no RPN is available.',reviewedOn:REVIEWED_ON,dateSensitive:true},
  {id:'revenue-submission-transition',label:'Revenue · Payroll submissions for 2026',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/transitional-arrangements/payroll-submissions.aspx',supports:'Reviewed year-transition controls and Employment ID continuity.',reviewedOn:REVIEWED_ON,dateSensitive:true},
  {id:'revenue-employment-id',label:'Revenue · Employment Identifier',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/information-on-payroll-submission/employment-identifier.aspx',supports:'Purpose of Employment ID, continuity and distinction between separate employments or periods.',reviewedOn:REVIEWED_ON,dateSensitive:true},
  {id:'revenue-rpn-overview',label:'Revenue · Revenue Payroll Notification',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/revenue-payroll-notification.aspx',supports:'Role of the RPN as employer payroll input and the need to use the applicable notification.',reviewedOn:REVIEWED_ON,dateSensitive:true},
  {id:'revenue-pay-date',label:'Revenue · Pay date',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/information-on-payroll-submission/pay-date.aspx',supports:'Pay date, reporting period and on-or-before payment reporting boundary.',reviewedOn:REVIEWED_ON,dateSensitive:true},
  {id:'revenue-submission-details',label:'Revenue · Details in a payroll submission',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/information-on-payroll-submission/what-other-details-go-into-payroll-submission.aspx',supports:'Employment ID, RPN details, pay date, payroll-run reference and submission fields.',reviewedOn:REVIEWED_ON,dateSensitive:true},
  {id:'revenue-corrections',label:'Revenue · Correcting payroll submissions',url:'https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/information-on-payroll-submission/corrections.aspx',supports:'Correction routes through supported payroll software or ROS and replacement of incorrect information.',reviewedOn:REVIEWED_ON,dateSensitive:true},
  {id:'dpc-data-minimisation',label:'Data Protection Commission · Principles of data protection',url:'https://www.dataprotection.ie/en/organisations/know-your-obligations/principles-data-protection',supports:'Data minimisation, purpose limitation and appropriate handling of employee personal data.',reviewedOn:REVIEWED_ON,dateSensitive:false},
  {id:'dpc-security-guidance',label:'Data Protection Commission · Security of personal data',url:'https://www.dataprotection.ie/en/organisations/know-your-obligations/security-personal-data',supports:'Security and access considerations for payroll-related personal data.',reviewedOn:REVIEWED_ON,dateSensitive:false},
 ],
 publicationGate:[
  'Recheck every date-sensitive Revenue source immediately before publication and record the new review date.',
  'Have an experienced Irish payroll reviewer validate the control sequence and terminology.',
  'Keep live rates, credits, bands and real employee data out of the static lesson.',
  'Validate item-level evidence, Error Bank routing and completion rules without claiming open-response grading from keyword matching.',
  'Generate Premium Audio only after a separate paid-action authorisation; this file contains script only.',
  'Publish or deploy only after a separate repository and environment authorisation.',
 ],
};

export default DEEP_PAYROLL_UNIT_1;

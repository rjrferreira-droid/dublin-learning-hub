import {
 DEEP_LESSON_SCHEMA_VERSION,ENGLISH_PRACTICE_MIX,GRAMMAR_STAGE_ORDER,LEARN_TEXT_EVIDENCE_ID,
 type AudioSegmentKind,type DeepLessonContract,type GrammarItem,type GrammarStage,type PracticeSourceBucket,type ProgressivePracticeItem,
} from './deepLessonContract.ts';
import type {LessonSection,LessonSource} from './lessonModules.ts';
import {ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from './vivianeEnglishLessonRegistry.ts';

type GrammarSeed={id:string;stage:GrammarStage;prompt:string;answer:string;options?:readonly string[]};
type PracticeSeed={id:string;bucket:PracticeSourceBucket;prompt:string;answer:string;options?:readonly string[]};
type EnglishDeepConfig={
 prefix:string;lessonId:string;title:string;register:'everyday'|'technical';audience:string;goal:string;scope:string;
 sections:readonly LessonSection[];sources:readonly LessonSource[];grammarTarget:string;grammarSeeds:readonly GrammarSeed[];
 practiceSeeds:readonly PracticeSeed[];dialogue:readonly {speaker:string;text:string}[];
 examples:DeepLessonContract['workedExamples'];speakingPrompts:readonly [string,string,string,string,string];
 audioTitle:string;audioScripts:readonly [string,string,string,string,string];
};

const evidence=(objectiveIds:readonly string[],errorBank:'after-final-incorrect'|'confirmed-only'='after-final-incorrect')=>({objectiveIds,record:'item-result' as const,errorBank});
const makeEvaluation=(id:string,answer:string,options?:readonly string[])=>options?{
 kind:'selection' as const,correctOptionIds:[`${id}-o1`],explanation:answer,
}:{kind:'rubric' as const,criteria:[{id:`${id}-meaning`,description:'Meaning is accurate and fits the supplied context.',points:1},{id:`${id}-language`,description:'Target language is used in a clear, natural sentence.',points:1}],modelAnswer:answer};

function grammarItems(config:EnglishDeepConfig):readonly GrammarItem[]{
 return config.grammarSeeds.map(seed=>({
  id:seed.id,stage:seed.stage,prompt:seed.prompt,responseMode:seed.options?'single-select':'short-text',estimatedMinutes:1,
  ...(seed.options?{options:seed.options.map((label,index)=>({id:`${seed.id}-o${index+1}`,label}))}:{}),
  evaluation:makeEvaluation(seed.id,seed.answer,seed.options),evidence:evidence([`${config.prefix}-obj-grammar`]),
 }));
}

function practiceItems(config:EnglishDeepConfig):readonly ProgressivePracticeItem[]{
 const progressions=['retrieve','explain','apply','integrate','transfer'] as const;
 return config.practiceSeeds.map((seed,index)=>({
  id:seed.id,prompt:seed.prompt,progression:progressions[Math.min(progressions.length-1,Math.floor(index/4))],sourceBucket:seed.bucket,
  responseMode:seed.options?'single-select':'short-text',estimatedMinutes:1,
  ...(seed.options?{options:seed.options.map((label,optionIndex)=>({id:`${seed.id}-o${optionIndex+1}`,label}))}:{}),
  evaluation:makeEvaluation(seed.id,seed.answer,seed.options),
  evidence:evidence([`${config.prefix}-obj-interaction`],seed.bucket==='confirmed-error-bank'?'confirmed-only':'after-final-incorrect'),
 }));
}

function buildEnglishUnit(config:EnglishDeepConfig){
 const grammar=grammarItems(config),practice=practiceItems(config);
 const learnText=config.sections.flatMap(section=>[section.title,...section.paragraphs,section.supportPt]);
 const speakingFocus=['chunks','stress','linking','shadowing','transfer'] as const;
 const speaking=config.speakingPrompts.map((prompt,index)=>({
  id:`${config.prefix}-speak-${index+1}`,focus:speakingFocus[index],prompt,model:config.speakingPrompts[index],
  evidence:evidence([`${config.prefix}-obj-speaking`],'confirmed-only'),estimatedMinutes:index===4?2.5:index===3?2:1.25,
 }));
 const audioKinds:readonly AudioSegmentKind[]=['opening','dialogue','retrieval-pause','pronunciation','transfer'];
 const audio=config.audioScripts.map((script,index)=>({id:`${config.prefix}-audio-${index+1}`,kind:audioKinds[index],title:['Set the task','Independent scene','Retrieve and notice','Sound clinic','Transfer'][index],estimatedMinutes:[.75,2.25,1,1,1][index],script}));
 const practiceSession=[...practice.filter(item=>item.sourceBucket==='current').slice(0,7),...practice.filter(item=>item.sourceBucket==='previous').slice(0,3),...practice.filter(item=>item.sourceBucket==='confirmed-error-bank').slice(0,2)];
 const contract:DeepLessonContract={
  schemaVersion:DEEP_LESSON_SCHEMA_VERSION,editorial:{status:'deep-reviewed',depthVersion:`${config.prefix}-depth-2026-09-24`,reviewedOn:'2026-09-24'},
  course:{kind:'english',level:'B1+ → B2',register:config.register,audience:config.audience},
  curriculum:{provider:'Learning Hub',framework:'Unified English Academy',version:'2026-09 deep model',outcomeIds:[`${config.prefix}-interaction`,`${config.prefix}-grammar`,`${config.prefix}-listening`,`${config.prefix}-speaking`]},
  prerequisites:['Complete or diagnose the first English unit.','Attempt written responses before opening models.','Use pronunciation feedback as coaching evidence, never as a fabricated acoustic score.'],
  objectives:[
   {id:`${config.prefix}-obj-interaction`,statement:config.goal,evidenceIds:[LEARN_TEXT_EVIDENCE_ID,...practiceSession.map(item=>item.id)],level:'apply'},
   {id:`${config.prefix}-obj-grammar`,statement:`Choose and build ${config.grammarTarget} according to meaning and context.`,evidenceIds:grammar.map(item=>item.id),level:'apply'},
   {id:`${config.prefix}-obj-listening`,statement:'Understand the independent audio scene on first listen for gist and on second listen for language choices.',evidenceIds:audio.map(item=>item.id),level:'understand'},
   {id:`${config.prefix}-obj-speaking`,statement:'Produce intelligible chunks, stress, linking, shadowing and spontaneous transfer without claiming an acoustic score.',evidenceIds:speaking.map(item=>item.id),level:'create'},
  ],
  workload:{totalMinutes:50.25,phases:[
   {id:`${config.prefix}-phase-learn`,kind:'learn',title:'Context, language map and worked examples',plannedMinutes:12,evidenceIds:[LEARN_TEXT_EVIDENCE_ID,...config.examples.map(item=>item.id)]},
   {id:`${config.prefix}-phase-audio`,kind:'audio',title:'Independent listen, retrieval and sound clinic',plannedMinutes:6,evidenceIds:audio.map(item=>item.id)},
   {id:`${config.prefix}-phase-grammar`,kind:'grammar',title:'Notice → Understand → Choose → Build → Use',plannedMinutes:10,evidenceIds:grammar.map(item=>item.id)},
   {id:`${config.prefix}-phase-practice`,kind:'practice',title:'60/25/15 session',plannedMinutes:12,evidenceIds:practiceSession.map(item=>item.id)},
   {id:`${config.prefix}-phase-speaking`,kind:'speaking',title:'Five-stage speaking practice',plannedMinutes:8.25,evidenceIds:speaking.map(item=>item.id)},
   {id:`${config.prefix}-phase-revision`,kind:'revision',title:'Closed-book transfer',plannedMinutes:2,evidenceIds:[`${config.prefix}-revision`]},
  ],paceNote:'A normal sitting takes about 50–55 minutes. Audio is a separate learning route, not a reading of Learn.'},
  workedExamples:config.examples,
  practice:{items:practice,sessionItemIds:practiceSession.map(item=>item.id),targetMix:ENGLISH_PRACTICE_MIX,attemptsBeforeReveal:2},
  misconceptions:[
   {id:`${config.prefix}-mis-1`,misconception:'More formal or longer language is always more polite.',correction:'Politeness comes from fit, clarity, tone and proportion; unnecessary distance can obstruct the task.',diagnosticPrompt:'Replace an overlong sentence with a clear, proportionate version.',objectiveIds:[`${config.prefix}-obj-interaction`]},
   {id:`${config.prefix}-mis-2`,misconception:'One grammar form always maps to one calendar time.',correction:'Choose the form from speaker meaning, evidence and degree of arrangement.',diagnosticPrompt:`Explain one contrast inside ${config.grammarTarget}.`,objectiveIds:[`${config.prefix}-obj-grammar`]},
   {id:`${config.prefix}-mis-3`,misconception:'A transcript match proves pronunciation quality.',correction:'A transcript can offer limited intelligibility evidence; stress, rhythm and sounds require appropriate feedback.',diagnosticPrompt:'Name two pronunciation features a word-overlap transcript cannot score.',objectiveIds:[`${config.prefix}-obj-speaking`]},
  ],
  revisionTargets:[{id:`${config.prefix}-revision`,prompt:'Complete a new 60-second role-play without reading a model, then identify one language choice to keep and one to repair.',objectiveIds:[`${config.prefix}-obj-interaction`,`${config.prefix}-obj-grammar`,`${config.prefix}-obj-speaking`],successCriterion:'Message is complete, target form fits the intended meaning, and the learner identifies evidence for one self-correction.',revisitAfterDays:[1,7,21],estimatedMinutes:2}],
  audioEpisode:{format:'authored-script',title:config.audioTitle,editorialGoal:'Provide a new listening scene, retrieval pauses, a sound clinic and spontaneous transfer rather than rereading Learn.',estimatedMinutes:6,distinctiveElements:['New cast and scenario','First-listen gist before language analysis','Explicit sound and chunk practice','Unscripted transfer prompt'],segments:audio},
  completion:{itemLevelEvidenceRequired:true,requirements:[
   {id:`${config.prefix}-complete-learn`,targetIds:[LEARN_TEXT_EVIDENCE_ID,...config.examples.map(item=>item.id)],rule:'view'},
   {id:`${config.prefix}-complete-audio`,targetIds:audio.map(item=>item.id),rule:'submit'},
   {id:`${config.prefix}-complete-grammar`,targetIds:grammar.map(item=>item.id),rule:'attempt'},
   {id:`${config.prefix}-complete-practice`,targetIds:practiceSession.map(item=>item.id),rule:'attempt'},
   {id:`${config.prefix}-complete-speaking`,targetIds:speaking.map(item=>item.id),rule:'attempt'},
  ]},
  english:{
   contextualInput:{id:`${config.prefix}-context`,title:config.title,mode:config.register==='technical'?'workplace-scene':'dialogue',turns:config.dialogue,comprehensionItemIds:practice.filter(item=>item.sourceBucket==='current').slice(0,3).map(item=>item.id)},
   grammar:{target:config.grammarTarget,stages:GRAMMAR_STAGE_ORDER.map(stage=>({stage,purpose:{notice:'Find the form in context.',understand:'Explain the meaning choice.',choose:'Select the form that fits.',build:'Construct an accurate sentence.',use:'Use the form for a real communicative task.'}[stage],itemIds:grammar.filter(item=>item.stage===stage).map(item=>item.id)})),items:grammar},
   speaking:{tasks:speaking,attemptsPerTask:3,recordingRetention:'discard-after-feedback',acousticScore:false},
  },
 };
 return {lessonId:config.lessonId,title:config.title,goal:config.goal,scope:config.scope,sections:config.sections,sources:config.sources,contract,learnText};
}

const rafaelSections:readonly LessonSection[]=[
 {id:'rp1-context',title:'1. Diagnose before you defend',paragraphs:[
  'In a finance meeting, clarification is not an admission of failure. It is a control. Before answering a challenge, separate the confirmed fact, the interpretation, the evidence still missing and the next action. “I do not know” can be professional when it becomes “I have confirmed X; Y is still being reconciled; I will return with the evidence by 3 p.m.”',
  'Start with the purpose of the question. A stakeholder asking “Why is the balance wrong?” may be asking about a true error, a timing difference, a classification issue or simply an unexpected movement. A defensive answer accepts the accusation before the facts are clear. A useful answer reframes neutrally: “Could we confirm which balance and comparison you are using?”',
  'Use a short evidence ladder: source, period, definition, owner. Confirm the source report, the relevant date, what the number includes and who can validate it. This prevents two people from arguing about different figures with the same label.',
 ],supportPt:'Esclarecer é um controle: confirme fonte, período, definição e responsável antes de aceitar que existe um erro.',sourceIds:['bc-requests']},
 {id:'rp1-language',title:'2. Ask clear questions without sounding abrupt',paragraphs:[
  'Direct questions are not automatically rude, but a high-pressure meeting often benefits from a brief frame. Compare “What changed?” with “Could you walk me through what changed after the final upload?” The second question identifies the action and invites evidence without adding unnecessary apology.',
  'Embedded questions keep statement word order: “Could you confirm when the file was approved?” not “Could you confirm when was the file approved?” Use whether or if for yes/no content: “Do we know whether the mapping changed?” The opening phrase carries the question form; the embedded clause does not invert again.',
  'Soften certainty, not facts. “It looks as though the variance starts in May” is appropriate when evidence is incomplete. Once the source is confirmed, say “The variance starts in May.” Avoid vague hedges that conceal ownership: “perhaps someone might look at it” is weaker than “I will reconcile the May upload by 3 p.m.”',
 ],supportPt:'Em perguntas indiretas, a oração interna usa ordem afirmativa: “Could you confirm when the file was approved?”',sourceIds:['bc-requests']},
 {id:'rp1-check',title:'3. Check understanding as a two-way control',paragraphs:[
  'Checking understanding is more than asking “Do you understand?” Summarise the decision and invite correction: “So we are keeping the current mapping for this close, and I will document the proposed change for next month. Have I captured that correctly?” The listener can verify a concrete statement.',
  'When receiving an instruction, use playback: owner, action, evidence and deadline. “Just to check: I will reconcile the ledger to the uploaded report, attach the exception list and send it to Aisha by noon tomorrow.” This reduces ambiguous handoffs and provides a natural closing point.',
  'When disagreeing, separate the shared fact from the disputed interpretation. “We agree the report changed after Friday. I am not yet convinced the journal caused it because the mapping file also changed.” Then ask for the next evidence. This keeps the discussion analytical rather than personal.',
 ],supportPt:'Repita decisão, responsável, ação, evidência e prazo; peça correção de algo concreto, não apenas “entendeu?”.',sourceIds:['bc-requests']},
 {id:'rp1-close',title:'4. Close the meeting with an evidence trail',paragraphs:[
  'A good close answers four questions: what was decided, what remains open, who owns each action and when the next update will happen. If no decision was reached, say so. “No accounting conclusion was reached today” is safer than letting silence appear to mean approval.',
  'Use proportionate language: “Mina will validate the source data by 11 a.m.; Rafael will reconcile the classification and circulate the exception list by 3 p.m.; we will decide after both checks.” This is clearer than “We will investigate and revert.”',
  'Your final meeting note should preserve confirmed facts and open questions without inventing certainty. The purpose is not to create a transcript of every sentence; it is to leave an operational record that another person can follow.',
 ],supportPt:'Feche com decisão, pendências, responsáveis, evidências e prazo do próximo retorno.',sourceIds:['bc-requests']},
];

const rafaelGrammar:readonly GrammarSeed[]=[
 {id:'rp1-g-n1',stage:'notice',prompt:'Find the embedded question: “Could you confirm when the file was approved?”',answer:'when the file was approved',options:['when the file was approved','Could you','confirm','the file']},
 {id:'rp1-g-n2',stage:'notice',prompt:'Which phrase marks limited certainty? “It looks as though the change began in May.”',answer:'It looks as though',options:['It looks as though','the change','began','in May']},
 {id:'rp1-g-u1',stage:'understand',prompt:'Why is “Could you confirm when was the file approved?” incorrect?',answer:'The opening phrase already carries the question; the embedded clause uses statement order: when the file was approved.'},
 {id:'rp1-g-u2',stage:'understand',prompt:'Explain the difference between “The journal caused it” and “The journal may have caused it.”',answer:'The first presents a confirmed conclusion; the second marks a supported possibility while evidence remains incomplete.'},
 {id:'rp1-g-c1',stage:'choose',prompt:'Choose the clearest neutral clarification.',answer:'Could we confirm which balance and comparison you are using?',options:['Could we confirm which balance and comparison you are using?','Why are your numbers wrong?','You clearly used the wrong report.']},
 {id:'rp1-g-c2',stage:'choose',prompt:'Choose the correct embedded order.',answer:'Do we know whether the mapping changed?',options:['Do we know whether the mapping changed?','Do we know whether did the mapping change?','Do we know did the mapping changed?']},
 {id:'rp1-g-b1',stage:'build',prompt:'Rewrite as a proportionate question: “Who changed this?”',answer:'Could you confirm who changed the file and when the change was approved?'},
 {id:'rp1-g-b2',stage:'build',prompt:'Build a playback sentence with owner, action and deadline.',answer:'Just to check, I will reconcile the two reports and send the exception list to Aisha by 3 p.m.'},
 {id:'rp1-g-use1',stage:'use',prompt:'Write one sentence that separates a confirmed fact from an open interpretation.',answer:'The report changed after Friday; I have not yet confirmed whether the journal or mapping update caused the movement.'},
 {id:'rp1-g-use2',stage:'use',prompt:'Close a disputed item without pretending it is resolved.',answer:'No conclusion has been reached; Mina will validate the source by noon, and we will decide after that check.'},
];

const rafaelCurrent:readonly PracticeSeed[]=[
 {id:'rp1-p-c1',bucket:'current',prompt:'Choose the best first response to “Why is the balance wrong?”',answer:'Could we confirm which balance, period and comparison you are using?',options:['Could we confirm which balance, period and comparison you are using?','It is not wrong.','Your report must be old.']},
 {id:'rp1-p-c2',bucket:'current',prompt:'Correct: “Could you tell me when did the upload finish?”',answer:'Could you tell me when the upload finished?'},
 {id:'rp1-p-c3',bucket:'current',prompt:'Turn “maybe someone will check” into clear ownership.',answer:'I will check the source report and return with the exception list by 3 p.m.'},
 {id:'rp1-p-c4',bucket:'current',prompt:'State a confirmed fact and an open question about a May variance.',answer:'The variance begins in May; we still need to confirm whether the journal or mapping update caused it.'},
 {id:'rp1-p-c5',bucket:'current',prompt:'Choose the useful understanding check.',answer:'So we are keeping the current mapping for this close. Have I captured that correctly?',options:['So we are keeping the current mapping for this close. Have I captured that correctly?','Do you understand?','OK?']},
 {id:'rp1-p-c6',bucket:'current',prompt:'Write a neutral request for the source and approval date.',answer:'Could you share the source file and confirm when the change was approved?'},
 {id:'rp1-p-c7',bucket:'current',prompt:'Repair an overconfident claim when evidence is incomplete.',answer:'The journal may have contributed to the difference, but the mapping change still needs to be tested.'},
 {id:'rp1-p-c8',bucket:'current',prompt:'Give a three-part meeting close: decision, owner, deadline.',answer:'We will retain the current mapping; I will document the exceptions and circulate them by 3 p.m.'},
 {id:'rp1-p-c9',bucket:'current',prompt:'Ask a yes/no embedded question about a mapping change.',answer:'Do we know whether the mapping changed after the final upload?'},
 {id:'rp1-p-c10',bucket:'current',prompt:'Disagree analytically with “the journal caused it”.',answer:'The timing is consistent with the journal, but the mapping file changed too, so we need to test both.'},
 {id:'rp1-p-c11',bucket:'current',prompt:'Write the evidence ladder for one figure.',answer:'Please confirm the source report, reporting date, balance definition and reviewer.'},
 {id:'rp1-p-c12',bucket:'current',prompt:'State that no conclusion was reached and assign next evidence.',answer:'No conclusion was reached; Mina will validate the source data before the next review.'},
];
const priorAndDiagnostic=(prefix:string):readonly PracticeSeed[]=>[
 {id:`${prefix}-p-prev1`,bucket:'previous',prompt:'Retell a short work problem with background, event and outcome.',answer:'I was reconciling the report when I noticed the mapping had changed, so I checked the final upload.'},
 {id:`${prefix}-p-prev2`,bucket:'previous',prompt:'Use past perfect for a relevant earlier action.',answer:'The team had approved the file before the variance appeared.'},
 {id:`${prefix}-p-prev3`,bucket:'previous',prompt:'React and ask one connected follow-up question.',answer:'That sounds frustrating. What did you check first?'},
 {id:`${prefix}-p-prev4`,bucket:'previous',prompt:'Choose the relevant story detail rather than every detail.',answer:'Keep the detail that explains the change or outcome.'},
 {id:`${prefix}-p-prev5`,bucket:'previous',prompt:'Give a 30-second problem–action–result retell.',answer:'The mapping changed during close, I reconciled both versions, and we corrected the final report.'},
 {id:`${prefix}-p-error1`,bucket:'confirmed-error-bank',prompt:'Diagnostic substitute when no confirmed Error Bank item is available: build one accurate embedded question.',answer:'Could you confirm when the source file was approved?'},
 {id:`${prefix}-p-error2`,bucket:'confirmed-error-bank',prompt:'Diagnostic substitute when no confirmed Error Bank item is available: mark certainty honestly.',answer:'The upload may have caused the difference, but I have not confirmed it yet.'},
 {id:`${prefix}-p-error3`,bucket:'confirmed-error-bank',prompt:'Diagnostic substitute when no confirmed Error Bank item is available: give owner, evidence and deadline.',answer:'I will reconcile the source and send the exception list by 3 p.m.'},
];

const rafaelExamples:DeepLessonContract['workedExamples']=[
 {id:'rp1-example-clarify',title:'Turn an accusation into a testable question',scenario:['Stakeholder: “Why is the balance wrong?”','Two reports use the same label but different dates.'],estimatedMinutes:3,steps:[{id:'r1',action:'Do not accept the premise',reasoning:'The facts do not yet establish an error.',result:'Use a neutral clarification.'},{id:'r2',action:'Specify the evidence ladder',reasoning:'Source, period and definition may differ.',result:'Ask which balance, report and comparison are being used.'},{id:'r3',action:'Set the next move',reasoning:'Clarification should lead to evidence.',result:'Agree who will reconcile the two sources and by when.'}],conclusion:'“Could we confirm which balance, period and source you are comparing? I will reconcile the two reports and return by 3 p.m.”'},
 {id:'rp1-example-close',title:'Convert discussion into an operational close',scenario:['The mapping may have changed.','No accounting conclusion is yet supported.','Mina owns the source validation; Rafael owns the reconciliation.'],estimatedMinutes:3,steps:[{id:'c1',action:'State decision status',reasoning:'Silence must not look like approval.',result:'No conclusion was reached.'},{id:'c2',action:'Assign evidence and owner',reasoning:'Each open question needs a named check.',result:'Mina validates source; Rafael reconciles mapping.'},{id:'c3',action:'Set the next decision point',reasoning:'A deadline closes the loop.',result:'Both checks circulate before the 3 p.m. review.'}],conclusion:'“No conclusion was reached. Mina will validate the source, Rafael will reconcile the mapping, and we will decide at 3 p.m.”'},
];

const rafaelAudio:readonly [string,string,string,string,string]=[
 'You are joining a short close meeting. On the first listen, do not write every number. Identify the problem, the evidence that is confirmed, and the next owner. The scene is different from Learn: a controller, Niamh, is speaking with Rafael and a data analyst, Theo, about a movement in operating expenses. Listen for moments when a speaker clarifies rather than defends. You will hear one uncertain claim, one embedded question and one playback close. After the scene, reconstruct the evidence ladder from memory.',
 'NIAMH: The operating expense line is ninety thousand higher than yesterday. Why is the ledger wrong? RAFAEL: Could we first confirm which report and cut-off time you are comparing? NIAMH: Yesterday’s close pack and the version I opened this morning. THEO: The morning report was refreshed at eight, but the close pack was exported at six yesterday evening. RAFAEL: So we have confirmed that the reports use different cut-off times. Do we know whether any late journals were posted between six and eight? THEO: Two journals were posted, but the mapping file was also replaced at seven thirty. NIAMH: Then the journals caused it. RAFAEL: They may have contributed, but I am not yet convinced they explain the full movement because the mapping changed too. Could you tell me when the replacement file was approved? THEO: I can check the approval log. RAFAEL: Great. I will reconcile the two journals; Theo will validate the mapping and approval time. We will send the exception list by eleven and decide whether a correction is needed after that. NIAMH: Good. Please say clearly if there is no error. RAFAEL: Absolutely. At this point, we have a timing difference and two possible causes, not a confirmed ledger error.',
 'Pause and retrieve four things. First, what fact was confirmed? The two reports had different cut-off times. Second, what remained uncertain? Whether the journals, the mapping change or both caused the movement. Third, which sentence prevented premature blame? “Could we first confirm which report and cut-off time you are comparing?” Fourth, what was the close? Rafael owned the journal reconciliation; Theo owned the mapping and approval check; both would provide evidence by eleven. Notice that Rafael did not apologise repeatedly or use complicated language. He made the uncertainty precise. That is professional control language. Now listen to three weaker alternatives and repair them. “Your figure is wrong” accepts neither shared definition nor evidence; replace it with a question about report, period and source. “Maybe someone can look later” hides both owner and deadline; replace it with a named action and return time. “The journals definitely caused it” overstates the evidence; replace definitely with may have, then name the competing mapping explanation. Finally, build one playback sentence: “Just to check, Theo will validate the approval log, I will reconcile the journals, and we will review the evidence at eleven.” The playback is useful because each participant can correct the record before leaving the meeting.',
 'Now shadow three chunks. “Could we first confirm / which report and cut-off time / you are comparing?” Keep could-we light and stress CONFIRM, REPORT and CUT-OFF TIME. Next: “They may have contributed / but I am not yet convinced / they explain the full movement.” Stress MAY, NOT YET and FULL. Link “may-have” smoothly without losing the /h/ completely. Finally: “At this point / we have two possible causes / not a confirmed error.” Group the framing phrase separately and contrast POSSIBLE with CONFIRMED. Record three attempts. Feedback may comment on intelligibility, stress and chunking, but it must not invent an acoustic score.',
 'Transfer the pattern to a new case. A stakeholder says, “The tax report is wrong.” You know that two extracts used different exchange-rate dates, but you have not established the cause. Speak for sixty seconds: clarify report and period, state the confirmed fact, mark the open cause, assign one evidence check and close with a deadline. Then write the best embedded question you used. Do not reuse the complete model. Your success criterion is a listener who knows what is true, what is open, who will check it and when the answer returns. Make the evidence check specific: name the source extract, the exchange-rate date on each report and the person who can confirm the required date. If the stakeholder presses for a yes-or-no answer, repeat the confirmed comparison first. Explain which check will support a decision, and give a time when you will return. On a second attempt, the stakeholder interrupts: “I only need to know whether we must correct it today.” Acknowledge the decision without inventing an answer. You could say, “I understand the timing matters. The extracts use different rate dates, but that does not yet establish an error. I will validate the required date and quantify the difference by two; then we can decide whether a correction is needed today.” On a third attempt, shorten the same message to thirty seconds while preserving fact, uncertainty, evidence, owner and deadline. Brevity is successful only if the control trail survives.',
];

export const DEEP_RP1=buildEnglishUnit({
 prefix:'rp1',lessonId:ENGLISH_P1_MODEL_ID,title:'Clarify, check understanding & handle meetings',register:'technical',audience:'Rafael · English Unit 2',
 goal:'Clarify finance and control issues, mark uncertainty and close a meeting with evidence, owner and deadline.',
 scope:'Technical English for Finance, Accounting, Tax, Payroll, Treasury and Compliance. It teaches communication, not a substantive accounting conclusion.',sections:rafaelSections,
 sources:[{id:'bc-requests',label:'British Council LearnEnglish · Requests, offers and invitations',url:'https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/requests-offers-invitations',supports:'Could/would forms and proportionate polite requests.',reviewedOn:'2026-09-24'}],
 grammarTarget:'embedded questions, modal softening and evidence-based certainty',grammarSeeds:rafaelGrammar,
 practiceSeeds:[...rafaelCurrent,...priorAndDiagnostic('rp1')],dialogue:[{speaker:'Niamh',text:'Why is the balance wrong?'},{speaker:'Rafael',text:'Could we confirm which report and period you are using?'},{speaker:'Niamh',text:'The final pack against this morning’s extract.'},{speaker:'Rafael',text:'The cut-off times differ. I will reconcile the two sources and return by 3 p.m.'}],
 examples:rafaelExamples,speakingPrompts:['Chunk: Could we confirm / which report and period / you are using?','Stress the contrast: We have a TIMING difference, not a CONFIRMED error.','Link: could-we-confirm; may-have-changed; send-it-by-three.','Shadow the meeting close with owner, evidence and deadline.','Give a 60-second clarification and close for a new disputed figure.'],
 audioTitle:'Not a confirmed error yet',audioScripts:rafaelAudio,
});

const vivianeSections:readonly LessonSection[]=[
 {id:'ve2-context',title:'1. Use weather to open a real conversation',paragraphs:[
  'Weather is useful small talk because it creates shared context, but the goal is not to exchange forecasts. Use one observation, one natural reaction and one connected question: “It has turned chilly, hasn’t it? Are you still going to the market later?” The question moves from safe context to a real plan.',
  'Avoid a sequence of interview questions. Offer a small piece of your own information before asking: “I was going to walk, but I may take the bus if the rain gets heavier. What about you?” Reciprocity makes the exchange feel balanced.',
  'In Dublin, quick changes make probability language useful: it might clear up, it looks as though it is going to rain, we may get a shower. These phrases express evidence and uncertainty; they are not promises about the forecast.',
 ],supportPt:'Use clima como ponte: observação + reação + informação sua + pergunta conectada.',sourceIds:['bc-small-talk','bc-future']},
 {id:'ve2-future',title:'2. Match the future form to the kind of plan',paragraphs:[
  'Use the present continuous for an arrangement with some organisation: “We are meeting Aoife at two.” Use be going to for an intention already decided: “I am going to bring a raincoat.” Use will for a decision made at the moment, an offer or a neutral prediction: “I will grab the umbrella.” Context matters more than a mechanical time label.',
  'Forms can overlap when speakers view the same event differently. “I am meeting Tom” presents an arrangement; “I am going to meet Tom” presents an intention. The listener may understand both, but the speaker chooses the angle. Your task is to make the intended degree of commitment clear.',
  'For conditions, use if + present for a realistic future condition: “If it rains, we will take the bus.” Do not put will in the normal if-clause. When making plans, the result can also use an imperative or modal: “If it rains, take the bus”; “If it rains, we might stay nearby.”',
 ],supportPt:'Arranjo: present continuous. Intenção: going to. Decisão no momento/oferta: will. Condição real: if + present.',sourceIds:['bc-future']},
 {id:'ve2-adjust',title:'3. Adjust a plan without cancelling the conversation',paragraphs:[
  'A change of plan needs acknowledgement, reason and alternative. “That sounds lovely, but the showers are getting heavier. Shall we meet at the café instead?” This protects the social intention even when the activity changes.',
  'Use tentative options when the evidence is uncertain: “We could wait twenty minutes,” “We might go after lunch,” or “How about the indoor market?” A good alternative is specific enough to answer but open enough for the other person to contribute.',
  'Confirm the final arrangement with time, place and contingency: “Great, we are meeting inside the main entrance at two. If the bus is delayed, I will message you.” This is clearer than ending with “see you later” after several alternatives.',
 ],supportPt:'Mudança de plano: reconheça, dê a razão, proponha alternativa e confirme horário/local/contingência.',sourceIds:['bc-future','bc-small-talk']},
 {id:'ve2-sound',title:'4. Sound engaged rather than rehearsed',paragraphs:[
  'Stress new information, not every word: “We are meeting INSIDE at TWO.” Reduce grammar words and keep content words clear. Short idea groups help: “If it stays dry / we will walk along the canal. / If not / we will take the bus.”',
  'Use reactions that match the information: “Typical!” for an unsurprising change, “That sounds good” for an alternative, or “Good idea” for a practical solution. Avoid using “interesting” as the same response to every detail.',
  'Speaking practice should create multiple attempts: first for message, second for chunks and stress, third for a spontaneous variation. The recording is discarded after feedback unless the learner explicitly saves text; no pronunciation percentage is created without acoustic evidence.',
 ],supportPt:'Primeira tentativa: mensagem. Segunda: blocos e ênfase. Terceira: variação espontânea. Sem nota acústica inventada.',sourceIds:['bc-small-talk']},
];

const vivianeGrammar:readonly GrammarSeed[]=[
 {id:'ve2-g-n1',stage:'notice',prompt:'Which form presents an arranged meeting? “We are meeting Aoife at two.”',answer:'are meeting',options:['are meeting','at two','Aoife','We']},
 {id:'ve2-g-n2',stage:'notice',prompt:'Which words show an intention? “I am going to bring a raincoat.”',answer:'am going to bring',options:['am going to bring','a raincoat','I','bring']},
 {id:'ve2-g-u1',stage:'understand',prompt:'Explain the viewpoint difference: “I am meeting Tom” vs “I am going to meet Tom.”',answer:'The continuous highlights an arrangement; going to highlights a prior intention.'},
 {id:'ve2-g-u2',stage:'understand',prompt:'Why is present used after if in “If it rains, we will take the bus”?',answer:'A realistic future condition normally uses present form in the if-clause; will appears in the result.'},
 {id:'ve2-g-c1',stage:'choose',prompt:'You decide now to take an umbrella. Choose the natural form.',answer:'I will take an umbrella.',options:['I will take an umbrella.','I took an umbrella tomorrow.','I am take an umbrella.']},
 {id:'ve2-g-c2',stage:'choose',prompt:'Choose the arranged plan.',answer:'We are meeting outside the library at six.',options:['We are meeting outside the library at six.','We might perhaps meet sometime.','We met outside tomorrow.']},
 {id:'ve2-g-b1',stage:'build',prompt:'Build a first conditional about rain and the bus.',answer:'If it rains, we will take the bus.'},
 {id:'ve2-g-b2',stage:'build',prompt:'Build a sentence for a prior intention to visit the market.',answer:'I am going to visit the market after lunch.'},
 {id:'ve2-g-use1',stage:'use',prompt:'Change an outdoor plan and offer an indoor alternative.',answer:'It looks as though it is going to rain, so shall we meet at the café instead?'},
 {id:'ve2-g-use2',stage:'use',prompt:'Confirm time, place and one contingency.',answer:'We are meeting inside the main entrance at two; if the bus is delayed, I will message you.'},
];

const vivianeCurrent:readonly PracticeSeed[]=[
 {id:'ve2-p-c1',bucket:'current',prompt:'Choose the spontaneous decision.',answer:'I will grab my umbrella.',options:['I will grab my umbrella.','I am grabbing it yesterday.','I going grab it.']},
 {id:'ve2-p-c2',bucket:'current',prompt:'Choose the organised arrangement.',answer:'We are meeting at the café at three.',options:['We are meeting at the café at three.','We may maybe meet someday.','We met at three tomorrow.']},
 {id:'ve2-p-c3',bucket:'current',prompt:'Complete: If the rain gets heavier, ...',answer:'If the rain gets heavier, we will take the bus.'},
 {id:'ve2-p-c4',bucket:'current',prompt:'React to a sudden shower and ask about the plan.',answer:'Typical! Are you still going to the market?'},
 {id:'ve2-p-c5',bucket:'current',prompt:'Offer an alternative without cancelling the social plan.',answer:'Shall we meet at the indoor market instead?'},
 {id:'ve2-p-c6',bucket:'current',prompt:'State a weather prediction based on visible dark clouds.',answer:'It looks as though it is going to rain.'},
 {id:'ve2-p-c7',bucket:'current',prompt:'Share one small piece of information before a follow-up question.',answer:'I was going to walk, but I may take the bus. What about you?'},
 {id:'ve2-p-c8',bucket:'current',prompt:'Confirm an arrangement and a delay contingency.',answer:'We are meeting at the main entrance at two; if I am delayed, I will message you.'},
 {id:'ve2-p-c9',bucket:'current',prompt:'Choose the correct if-clause.',answer:'If it stays dry, we will walk.',options:['If it stays dry, we will walk.','If it will stay dry, we will walk.','If it stayed dry tomorrow, we walk.']},
 {id:'ve2-p-c10',bucket:'current',prompt:'Use might for an uncertain alternative.',answer:'We might go after lunch if the showers become lighter.'},
 {id:'ve2-p-c11',bucket:'current',prompt:'Move from weather small talk to a genuine plan question.',answer:'It has turned chilly, hasn’t it? Are you doing anything indoors later?'},
 {id:'ve2-p-c12',bucket:'current',prompt:'Close the plan with time and place.',answer:'Great, we are meeting inside the library entrance at half past two.'},
];

const vivianePractice:readonly PracticeSeed[]=[...vivianeCurrent,
 {id:'ve2-p-prev1',bucket:'previous',prompt:'Retell yesterday’s travel problem with background and event.',answer:'I was waiting for the bus when the rain started.'},
 {id:'ve2-p-prev2',bucket:'previous',prompt:'Use past perfect for an earlier preparation.',answer:'I had checked the forecast before I left.'},
 {id:'ve2-p-prev3',bucket:'previous',prompt:'React and ask a connected follow-up.',answer:'That was lucky. Did you have an umbrella?'},
 {id:'ve2-p-prev4',bucket:'previous',prompt:'Give a story outcome in one sentence.',answer:'In the end, the driver stopped close to my house.'},
 {id:'ve2-p-prev5',bucket:'previous',prompt:'Tell a 30-second weather surprise.',answer:'I was walking home when a sudden shower started, but a neighbour gave me a lift.'},
 {id:'ve2-p-error1',bucket:'confirmed-error-bank',prompt:'Diagnostic substitute when no confirmed Error Bank item is available: choose a future form for an arranged meeting.',answer:'We are meeting at two.'},
 {id:'ve2-p-error2',bucket:'confirmed-error-bank',prompt:'Diagnostic substitute when no confirmed Error Bank item is available: build if + present, result with will.',answer:'If it rains, we will take the bus.'},
 {id:'ve2-p-error3',bucket:'confirmed-error-bank',prompt:'Diagnostic substitute when no confirmed Error Bank item is available: offer a specific alternative.',answer:'Shall we meet at the café instead?'},
];

const vivianeExamples:DeepLessonContract['workedExamples']=[
 {id:'ve2-example-smalltalk',title:'Move from weather to a real exchange',scenario:['Two neighbours enter the lift.','Rain has started and one carries a market bag.'],estimatedMinutes:3,steps:[{id:'v1',action:'Share the context',reasoning:'A shared observation opens safely.',result:'“The rain arrived quickly, didn’t it?”'},{id:'v2',action:'Offer personal information',reasoning:'Reciprocity avoids an interview.',result:'“I was going to walk, but I may take the bus.”'},{id:'v3',action:'Ask a connected question',reasoning:'The market bag supplies the bridge.',result:'“Are you still going to the market?”'}],conclusion:'“The rain arrived quickly, didn’t it? I was going to walk, but I may take the bus. Are you still going to the market?”'},
 {id:'ve2-example-adjust',title:'Change the activity, keep the invitation',scenario:['A canal walk is planned for two.','The showers are getting heavier.'],estimatedMinutes:3,steps:[{id:'a1',action:'Acknowledge the plan',reasoning:'Show that the social intention remains.',result:'“I am still free at two.”'},{id:'a2',action:'Give the evidence',reasoning:'The reason is visible and proportionate.',result:'“The showers are getting heavier.”'},{id:'a3',action:'Offer and confirm',reasoning:'A specific alternative can be answered.',result:'“Shall we meet inside the café at two instead?”'}],conclusion:'“I am still free at two, but the showers are getting heavier. Shall we meet inside the café instead?”'},
];

const vivianeAudio:readonly [string,string,string,string,string]=[
 'On the first listen, follow the social purpose rather than collecting every weather word. Ciara and Viviane have planned a walk near the canal, but the forecast keeps changing. Identify the original plan, the evidence that causes a change, the alternative and the final arrangement. The scene is new and does not repeat Learn. After the dialogue, you will retrieve the timeline before hearing any language explanation. Notice whether each future form presents an arrangement, an intention, a decision made now or an uncertain possibility.',
 'CIARA: Morning! It has turned cold, hasn’t it? VIVIANE: It really has. I was going to leave my coat at home, but I am definitely bringing it now. CIARA: Are we still meeting by the canal at two? VIVIANE: I would like to, but those clouds look heavy. CIARA: The forecast says there may be short showers, not constant rain. VIVIANE: If it stays light, we will walk. If it gets worse, we could go to the indoor market. CIARA: Good idea. I will check again at one. VIVIANE: Great. Shall we meet inside the station entrance at two anyway? Then we can decide together. CIARA: Perfect. I am taking the bus that arrives at one forty-five. If it is delayed, I will message you. VIVIANE: Lovely. I might arrive a few minutes early and get coffee. CIARA: That sounds good. I will join you if I am early too. VIVIANE: Done. Inside the station at two, and the market is our wet-weather plan.',
 'Pause. What was already arranged? They were meeting at two. What was Viviane’s prior intention? She was going to leave her coat at home, but changed it. Which decisions were made during the conversation? Ciara would check the forecast; they would use the market if the weather worsened. Which form marked uncertainty? May and might. Now notice the if-clauses: “If it stays light” and “If it gets worse” use present forms, while the result uses will or could. The grammar reflects the speaker’s view of the plan, not simply a future date. Retrieve the final time, place and contingency before continuing. Compare two more viewpoints. “I am meeting Ciara at two” presents the arrangement as organised. “I am going to meet Ciara” presents Viviane’s intention; it does not tell us as clearly whether the details are fixed. “I will meet Ciara” can sound like a decision or promise made now. More than one form can be grammatical, but the context changes what the listener understands about commitment. Say each sentence aloud and explain the viewpoint in simple English.',
 'Shadow in idea groups. “If it stays light / we will walk. / If it gets worse / we could go to the indoor market.” Stress STAYS LIGHT, WALK, GETS WORSE and INDOOR MARKET. Reduce “we will” naturally, but keep the meaning clear. Next: “Shall we meet / inside the station entrance / at two anyway?” Make shall-we one smooth invitation chunk and stress STATION and TWO. Finally: “If it is delayed / I will message you.” Keep the condition separate from the result. Record three attempts: first for meaning, second for stress and chunks, third with one new weather condition. Feedback must not create a pronunciation percentage without acoustic evidence.',
 'Create a new plan. You are meeting a neighbour at a park at four, but strong wind may arrive. Speak for sixty seconds. Open with one weather observation, share one intention, confirm the arranged time, give an if-condition, offer one indoor alternative and close with time, place and a message contingency. Then change one fact: the neighbour prefers to wait rather than go indoors. Respond naturally without restarting your script. Success means the listener can identify what is arranged, what is only possible and what will happen if conditions change. Try a second version in which you meet someone new in the lift. Begin with a weather observation, but do not ask three questions in a row. Share one small detail about your plan, react to the other person’s answer and ask one connected follow-up. Try a third version with no weather opening at all: use a shared local event or weekend plan. The language goal is not a memorised weather conversation; it is a balanced exchange that can move from safe context to a genuine plan.',
];

export const DEEP_VE2=buildEnglishUnit({
 prefix:'ve2',lessonId:VIVIANE_ENGLISH_IDENTITIES.VE2.id,title:'Everyday Dublin: weather, plans and natural small talk',register:'everyday',audience:'Viviane · English Unit 2',
 goal:'Open natural small talk, express plans with the intended degree of commitment and adjust an arrangement when the weather changes.',
 scope:'Everyday English for Dublin life. Professional content is deliberately excluded from this unit; Viviane’s technical units remain Payroll and People Operations only.',sections:vivianeSections,
 sources:[
  {id:'bc-future',label:"British Council LearnEnglish · Future forms: will, be going to and present continuous",url:'https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/future-forms-will-be-going-present-continuous',supports:'Meaning-based choice among spontaneous decisions, intentions and arrangements.',reviewedOn:'2026-09-24'},
  {id:'bc-small-talk',label:'British Council LearnEnglish · Small talk',url:'https://learnenglish.britishcouncil.org/free-resources/learning-hub/discussions/small-talk',supports:'Social purpose and everyday small-talk context.',reviewedOn:'2026-09-24'},
 ],
 grammarTarget:'will, be going to, present continuous and first conditional for plans',grammarSeeds:vivianeGrammar,practiceSeeds:vivianePractice,
 dialogue:[{speaker:'Ciara',text:'It has turned chilly, hasn’t it? Are we still meeting by the canal?'},{speaker:'Viviane',text:'Yes, but if the rain gets heavier, we could go to the indoor market.'},{speaker:'Ciara',text:'Good idea. Shall we meet inside the station at two?'},{speaker:'Viviane',text:'Perfect. If my bus is delayed, I will message you.'}],
 examples:vivianeExamples,speakingPrompts:['Chunk: If it stays dry / we will walk / along the canal.','Stress the change: We are meeting INSIDE at TWO.','Link: going-to-bring; shall-we-meet; if-it-rains.','Shadow the plan, alternative and contingency in three idea groups.','Make and adjust a 60-second Dublin weekend plan.'],
 audioTitle:'Inside the station if it rains',audioScripts:vivianeAudio,
});

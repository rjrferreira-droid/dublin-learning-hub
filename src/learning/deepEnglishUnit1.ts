import {
 DEEP_LESSON_SCHEMA_VERSION,
 ENGLISH_PRACTICE_MIX,
 LEARN_TEXT_EVIDENCE_ID,
 type ActivityEvaluation,
 type DeepLessonContract,
 type GrammarItem,
 type ItemEvidenceRule,
 type ProgressivePracticeItem,
} from './deepLessonContract.ts';

export type EnglishLearnerProfile='rafael'|'viviane';
export type EnglishGrammarStage='notice'|'understand'|'choose'|'build'|'use';
export type EnglishPracticeSource='current-unit'|'previous-unit'|'confirmed-error-bank';
export type EnglishResponseMode='single-select'|'short-written'|'extended-written'|'spoken';

export type EnglishItemEvidence={
 skillTags:readonly string[];
 capture:'objective-answer'|'criteria-self-check'|'attempt-metadata';
 retain:readonly string[];
 neverInfer:readonly string[];
 errorBankTrigger:'second-incorrect-objective-attempt'|'learner-confirmed-criterion-gap'|'confirmed-error-required'|'never';
};

export type EnglishChoiceItem={
 id:string;
 responseMode:'single-select';
 prompt:string;
 context?:string;
 options:readonly {id:string;text:string}[];
 correctOptionId:string;
 explanation:string;
 hint:string;
 maxAttemptsBeforeReveal:2;
 evidence:EnglishItemEvidence;
};

export type EnglishWrittenItem={
 id:string;
 responseMode:'short-written'|'extended-written';
 prompt:string;
 context?:string;
 modelResponse:string;
 criteria:readonly string[];
 hint:string;
 maxAttemptsBeforeReveal:2;
 evidence:EnglishItemEvidence;
};

export type EnglishGrammarItem=(EnglishChoiceItem|EnglishWrittenItem)&{
 stage:EnglishGrammarStage;
 target:string;
};

export type EnglishPracticeItem=(EnglishChoiceItem|EnglishWrittenItem)&{
 source:EnglishPracticeSource;
 sourceResolution:string;
};

export type DeepEnglishUnit={
 schemaVersion:'deep-english-unit-v1';
 id:string;
 title:string;
 strand:'everyday';
 level:{entry:'B1+';destination:'B2+'};
 profilePlacement:Readonly<Record<EnglishLearnerProfile,{
  code:'E1'|'VE1';sequence:1;monthlyMix:{everydayPct:50|80;professionalPct:50|20};
 }>>;
 estimatedMinutes:{minimum:45;target:55;maximum:60;byPhase:{learn:12;audio:12;grammar:10;practice:13;speaking:8}};
 prerequisites:readonly string[];
 outcomes:readonly string[];
 boundaries:readonly string[];
 learn:{
  title:string;
  purpose:string;
  warmUp:readonly string[];
  setting:string;
  dialogue:readonly {speaker:'Maya'|'Leo';text:string;teachingNote?:string}[];
  meaningChecks:readonly EnglishChoiceItem[];
  languageMap:readonly {form:string;job:string;example:string;contrast:string}[];
  conversationMoves:readonly {move:string;why:string;examples:readonly string[]}[];
  guidedRetell:{facts:readonly string[];plan:readonly string[];model:string;variation:string};
  portugueseSupport:readonly string[];
 };
 audio:{
  title:string;
  status:'authored-script-no-generation-requested';
  isIndependentFromLearn:true;
  estimatedMinutes:12;
  delivery:{accent:'clear international English with a light Irish setting';paceWpm:125;pauseSeconds:90};
  firstListen:{instruction:string;questions:readonly string[]};
  secondListen:{instruction:string;questions:readonly string[]};
  segments:readonly {id:string;label:string;phase:'orientation'|'first-listen'|'comprehension'|'second-listen'|'language-clinic'|'shadowing'|'transfer';lines:readonly {voice:'host'|'Nora'|'Sam';text:string;pauseMs?:number}[]}[];
  answerKey:readonly {question:string;answer:string;evidence:string}[];
  shadowing:readonly {text:string;chunks:readonly string[];stress:readonly string[];connectedSpeech:string}[];
  transferPrompt:string;
  generationRequested:false;
 };
 grammar:{
  target:string;
  stages:readonly {id:EnglishGrammarStage;purpose:string;itemIds:readonly string[]}[];
  items:readonly EnglishGrammarItem[];
 };
 practice:{
  sessionSize:12;
  estimatedMinutes:13;
  allocation:readonly {source:EnglishPracticeSource;weight:0.6|0.25|0.15}[];
  selectionPlan:{
   algorithm:'seeded-largest-remainder';
   seed:string;
   exampleSession:readonly {source:EnglishPracticeSource;count:7|3|2;itemIds:readonly string[]}[];
   roundingNote:string;
  };
  firstUnitFallback:{previousUnit:string;errorBank:string;reportingRule:string};
  items:readonly EnglishPracticeItem[];
 };
 speaking:{
  goal:string;
  attemptsPerPrompt:3;
  recordingPolicy:{audio:'local-until-lesson-close';transcript:'ephemeral-unless-learner-explicitly-saves-text';retained:readonly string[]};
  scorePolicy:{allowed:readonly string[];prohibited:readonly string[]};
  activities:readonly {
   id:string;kind:'chunking'|'stress'|'connected-speech'|'shadowing'|'transfer';
   prompt:string;model:string;chunks:readonly string[];stress:readonly string[];coachChecks:readonly string[];
  }[];
 };
 completion:{
  rule:'all-required-evidence-not-tab-visits';
  requirements:readonly {id:string;description:string;minimum:string;evidenceIds:readonly string[]}[];
  masteryBoundary:string;
 };
};

const objectiveEvidence=(...skillTags:string[]):EnglishItemEvidence=>({
 skillTags,capture:'objective-answer',retain:['item id','selected option','attempt count','correct after attempt','review target'],
 neverInfer:['pronunciation','spontaneous fluency','overall CEFR level'],errorBankTrigger:'second-incorrect-objective-attempt',
});

const writtenEvidence=(...skillTags:string[]):EnglishItemEvidence=>({
 skillTags,capture:'criteria-self-check',retain:['item id','criteria confirmed by learner','attempt count','review target'],
 neverInfer:['automatic correctness from unreviewed free text','pronunciation','spontaneous fluency','overall CEFR level'],errorBankTrigger:'learner-confirmed-criterion-gap',
});

const diagnosticEvidence=(...skillTags:string[]):EnglishItemEvidence=>({
 skillTags,capture:'attempt-metadata',retain:['item id','attempt count'],
 neverInfer:['a confirmed learner error','a resolved Error Bank item','pronunciation','overall CEFR level'],errorBankTrigger:'never',
});

const grammarItems:readonly EnglishGrammarItem[]=[
 {
  id:'e1-g-notice-1',stage:'notice',target:'past continuous as background; past simple as event',responseMode:'single-select',
  prompt:'Which verb phrase sets the background already in progress?',context:'I was walking home when I heard someone call my name.',
  options:[{id:'a',text:'was walking'},{id:'b',text:'heard'},{id:'c',text:'call'},{id:'d',text:'my name'}],correctOptionId:'a',
  explanation:'“Was walking” presents an activity in progress around the moment when the shorter event happened.',hint:'Ask which action was already happening before the new event interrupted the scene.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('form recognition','background-event contrast'),
 },
 {
  id:'e1-g-notice-2',stage:'notice',target:'past perfect as the earlier past',responseMode:'single-select',
  prompt:'Which part looks back to an event that happened before Maya reached the stop?',context:'When Maya reached the stop, the bus had already left.',
  options:[{id:'a',text:'When Maya'},{id:'b',text:'reached the stop'},{id:'c',text:'had already left'},{id:'d',text:'the bus'}],correctOptionId:'c',
  explanation:'“Had left” places the departure before the later past reference point, Maya reaching the stop.',hint:'Find had + past participle.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('form recognition','earlier-past relationship'),
 },
 {
  id:'e1-g-understand-1',stage:'understand',target:'meaning contrast',responseMode:'single-select',
  prompt:'What meaning does this sentence most naturally express?',context:'I was making dinner when Paula arrived.',
  options:[{id:'a',text:'Paula arrived first and then the cooking began.'},{id:'b',text:'The cooking was in progress at the time of Paula’s arrival.'},{id:'c',text:'The cooking finished before Paula arrived.'},{id:'d',text:'Paula made dinner.'}],correctOptionId:'b',
  explanation:'The continuous form frames making dinner as the ongoing background to the arrival.',hint:'Draw one long action and one point event on a timeline.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('timeline interpretation','background-event contrast'),
 },
 {
  id:'e1-g-understand-2',stage:'understand',target:'meaning contrast',responseMode:'single-select',
  prompt:'Why does the speaker use the past perfect here?',context:'I recognised the café because I had been there once before.',
  options:[{id:'a',text:'To make the story sound formal.'},{id:'b',text:'To show that the earlier visit explains the later recognition.'},{id:'c',text:'To describe an action happening now.'},{id:'d',text:'Because every story needs a past perfect verb.'}],correctOptionId:'b',
  explanation:'The earlier visit is relevant because it explains how the speaker recognised the café later.',hint:'Ask which event happened first and why the listener needs it.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('timeline interpretation','relevant earlier past'),
 },
 {
  id:'e1-g-choose-1',stage:'choose',target:'past simple vs past continuous',responseMode:'single-select',
  prompt:'Choose the version that clearly expresses an action in progress interrupted by a shorter event.',
  options:[{id:'a',text:'I waited for the train when the lights went out.'},{id:'b',text:'I was waiting for the train when the lights went out.'},{id:'c',text:'I had wait for the train when the lights went out.'},{id:'d',text:'I am waiting for the train when the lights went out.'}],correctOptionId:'b',
  explanation:'“Was waiting” establishes the ongoing background; “went out” introduces the shorter event.',hint:'The background needs was/were + -ing.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('controlled grammar choice','background-event contrast'),
 },
 {
  id:'e1-g-choose-2',stage:'choose',target:'past perfect only when chronology needs it',responseMode:'single-select',
  prompt:'Choose the clearest completion.',context:'Leo could not show the ticket inspector his booking because he ___ his phone at home.',
  options:[{id:'a',text:'leaves'},{id:'b',text:'was leaving'},{id:'c',text:'had left'},{id:'d',text:'has left yesterday'}],correctOptionId:'c',
  explanation:'Leaving the phone happened before the later problem on the journey, so “had left” makes the relationship explicit.',hint:'The missing phone is an earlier cause of a later past problem.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('controlled grammar choice','earlier cause'),
 },
 {
  id:'e1-g-build-1',stage:'build',target:'build a background-event sentence',responseMode:'short-written',
  prompt:'Combine the facts into one sentence: “Maya walked through the market. She heard live music.” Present the walking as background.',
  modelResponse:'Maya was walking through the market when she heard live music.',
  criteria:['Uses was walking for the background action.','Uses heard for the event.','Preserves both supplied facts without adding a cause.'],
  hint:'Start with “Maya was…” and connect the event with “when”.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('sentence construction','background-event contrast'),
 },
 {
  id:'e1-g-build-2',stage:'build',target:'build an earlier-past explanation',responseMode:'short-written',
  prompt:'Combine the facts clearly: “Leo missed the exhibition opening. He wrote the time down incorrectly the day before.”',
  modelResponse:'Leo missed the exhibition opening because he had written the time down incorrectly the day before.',
  criteria:['Uses had written to mark the earlier action.','Keeps the stated cause and outcome.','Does not invent a cancellation or transport problem.'],
  hint:'Make the note-writing the earlier past action.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('sentence construction','earlier cause'),
 },
 {
  id:'e1-g-use-1',stage:'use',target:'narrate a coherent four-step event',responseMode:'extended-written',
  prompt:'Write four or five sentences about a small, real or invented surprise. Include a setting, one event, one relevant earlier fact and a result.',
  modelResponse:'I was walking back from the library when I saw an old neighbour. I had not seen her since she moved away two years earlier. We stopped for coffee and talked for half an hour. I arrived home late, but the surprise made my afternoon.',
  criteria:['The setting and main event are easy to identify.','At least one past form expresses its intended time relationship.','The earlier fact is relevant rather than decorative.','The result closes the event.'],
  hint:'Plan four boxes first: background → event → earlier explanation → result.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('guided production','narrative coherence','past-time relationships'),
 },
 {
  id:'e1-g-use-2',stage:'use',target:'continue a conversation with a relevant follow-up',responseMode:'extended-written',
  prompt:'Add a natural response and one follow-up question after this line: “I took the wrong bus, but I discovered a beautiful park.”',
  modelResponse:'That sounds like a good mistake in the end. What did you do when you realised you were in the wrong place?',
  criteria:['Responds to the positive turn in the story.','Asks one question connected to the speaker’s experience.','Does not turn the exchange into a list of unrelated questions.'],
  hint:'React first; then ask about one missing part of the story.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('interaction strategy','relevant follow-up'),
 },
];

const currentPractice:readonly EnglishPracticeItem[]=[
 {id:'e1-p-current-01',source:'current-unit',sourceResolution:'English Unit 1 · timeline relationships',responseMode:'single-select',prompt:'Which sentence gives a background action plus a new event?',options:[{id:'a',text:'I was reading when the doorbell rang.'},{id:'b',text:'I had read every day now.'},{id:'c',text:'I reading and it rang.'},{id:'d',text:'I am reading yesterday.'}],correctOptionId:'a',explanation:'The reading was in progress; the ringing moved the story forward.',hint:'Look for was/were + -ing followed by a past-simple event.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','background-event contrast')},
 {id:'e1-p-current-02',source:'current-unit',sourceResolution:'English Unit 1 · earlier past',responseMode:'single-select',prompt:'Which event happened first?',context:'Sam apologised because he had misunderstood the address.',options:[{id:'a',text:'Sam apologised.'},{id:'b',text:'Sam misunderstood the address.'},{id:'c',text:'They happened at exactly the same time.'},{id:'d',text:'The sentence does not say.'}],correctOptionId:'b',explanation:'The misunderstanding preceded and explains the apology.',hint:'The had + past participle event comes before the later past point.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','earlier-past relationship')},
 {id:'e1-p-current-03',source:'current-unit',sourceResolution:'English Unit 1 · sequencing',responseMode:'single-select',prompt:'Choose the most coherent sequence.',options:[{id:'a',text:'Eventually, first, after that, while.'},{id:'b',text:'At first, then, a few minutes later, eventually.'},{id:'c',text:'Yesterday, tomorrow, had, now.'},{id:'d',text:'Because, although, if, unless.'}],correctOptionId:'b',explanation:'The sequence moves from the opening stage through later events to the outcome.',hint:'Find the option that travels forward in time.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','story sequencing')},
 {id:'e1-p-current-04',source:'current-unit',sourceResolution:'English Unit 1 · follow-up questions',responseMode:'single-select',prompt:'A friend says, “The concert was delayed, but we met the singer while we were waiting.” What is the best follow-up?',options:[{id:'a',text:'What happened when you met her?'},{id:'b',text:'What is your postcode?'},{id:'c',text:'Did you complete the report?'},{id:'d',text:'Why do concerts exist?'}],correctOptionId:'a',explanation:'It follows the surprising part of the speaker’s story.',hint:'Use the detail the speaker seems most interested in.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','interaction strategy')},
 {id:'e1-p-current-05',source:'current-unit',sourceResolution:'English Unit 1 · fact-preserving retell',responseMode:'single-select',prompt:'Which retelling preserves the facts?',context:'Facts: Noor missed her stop because she was talking to a neighbour; she walked back and arrived ten minutes late.',options:[{id:'a',text:'Noor’s bus was cancelled, so her neighbour drove her.'},{id:'b',text:'Noor missed her stop during a conversation, walked back and arrived ten minutes late.'},{id:'c',text:'Noor was late because the driver got lost.'},{id:'d',text:'Noor arrived early after a quiet journey.'}],correctOptionId:'b',explanation:'It changes the wording without changing or inventing facts.',hint:'Check every claim against the three supplied facts.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','accurate retelling')},
 {id:'e1-p-current-06',source:'current-unit',sourceResolution:'English Unit 1 · relevance of past perfect',responseMode:'single-select',prompt:'Where is the past perfect most useful?',options:[{id:'a',text:'To list two simple events in the order they happened: I opened the door and sat down.'},{id:'b',text:'To explain an earlier event from a later past point: I could not pay because I had left my wallet at home.'},{id:'c',text:'To describe a routine now: I take the bus.'},{id:'d',text:'To make every sentence sound advanced.'}],correctOptionId:'b',explanation:'The earlier lost/left item explains the later problem and the chronology benefits from being explicit.',hint:'Choose the option with two past layers.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','past perfect relevance')},
 {id:'e1-p-current-07',source:'current-unit',sourceResolution:'English Unit 1 · rhythm and chunking',responseMode:'single-select',prompt:'Which chunking makes the meaning easiest to follow?',context:'After I had checked the address I walked back to the corner and found the café.',options:[{id:'a',text:'After / I had checked the / address I walked / back to the corner and found / the café.'},{id:'b',text:'After I had checked the address / I walked back to the corner / and found the café.'},{id:'c',text:'After I / had / checked / the / address / I / walked.'},{id:'d',text:'Read every word with equal stress and no pause.'}],correctOptionId:'b',explanation:'The pauses align with complete idea groups.',hint:'Keep closely related words inside the same idea group.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','speech chunking')},
 {id:'e1-p-current-08',source:'current-unit',sourceResolution:'English Unit 1 · conversational repair',responseMode:'single-select',prompt:'A learner says, “Yesterday I go to town and meet Anna.” Which response both repairs and continues the conversation?',options:[{id:'a',text:'Wrong.'},{id:'b',text:'You went to town and met Anna — what did you do together?'},{id:'c',text:'Repeat all English grammar rules.'},{id:'d',text:'Let us discuss something unrelated.'}],correctOptionId:'b',explanation:'The brief recast supplies the target forms and the question keeps the interaction alive.',hint:'Choose a short correction followed by a connected question.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('current unit','repair','follow-up')},
 {id:'e1-p-current-09',source:'current-unit',sourceResolution:'English Unit 1 · controlled production',responseMode:'short-written',prompt:'Rewrite with the call as the interrupting event: “I waited at the checkout. My phone rang.”',modelResponse:'I was waiting at the checkout when my phone rang.',criteria:['Uses was waiting for the background.','Uses rang for the event.','Keeps the original facts.'],hint:'Put the longer action around the shorter one with when.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('current unit','controlled production')},
 {id:'e1-p-current-10',source:'current-unit',sourceResolution:'English Unit 1 · earlier explanation',responseMode:'short-written',prompt:'Explain why Elena recognised the man. Facts: she met him at a class last month; she saw him again yesterday.',modelResponse:'Elena recognised the man yesterday because she had met him at a class the month before.',criteria:['Makes yesterday the later reference point.','Marks the class meeting as earlier.','Adds no unsupported relationship.'],hint:'Use had met for the earlier event.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('current unit','earlier-past production')},
 {id:'e1-p-current-11',source:'current-unit',sourceResolution:'English Unit 1 · coherent mini-story',responseMode:'extended-written',prompt:'Use these facts in a four-sentence story: waiting for a friend; receiving the wrong location; checking the original message; meeting at the correct café.',modelResponse:'I was waiting outside a café when my friend sent me a photo of a different street. I checked our original messages and realised that I had written down the wrong location. I walked to the other café, and we met there ten minutes later. In the end, we laughed about the confusion.',criteria:['Uses all four facts.','Makes the time order clear.','Includes a result without inventing blame.'],hint:'Use the waiting as background and the earlier note as an explanation.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('current unit','narrative coherence')},
 {id:'e1-p-current-12',source:'current-unit',sourceResolution:'English Unit 1 · listener engagement',responseMode:'extended-written',prompt:'Respond to this story ending and ask one connected question: “Eventually, a neighbour helped me carry the broken bicycle home.”',modelResponse:'That was kind of your neighbour. How far did you have to carry the bicycle?',criteria:['Acknowledges the outcome.','Asks exactly one relevant follow-up.','Uses natural, respectful wording.'],hint:'React to the help before asking for one detail.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('current unit','listener engagement')},
];

const previousPractice:readonly EnglishPracticeItem[]=[
 {id:'e1-p-previous-01',source:'previous-unit',sourceResolution:'No previous course unit: use the labelled B1+ prerequisite baseline, never present it as spaced review.',responseMode:'single-select',prompt:'Choose the correct past form of “go”.',options:[{id:'a',text:'goed'},{id:'b',text:'went'},{id:'c',text:'gone yesterday'},{id:'d',text:'goes last night'}],correctOptionId:'b',explanation:'“Went” is the past-simple form of “go”.',hint:'This verb is irregular.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('prerequisite baseline','irregular past')},
 {id:'e1-p-previous-02',source:'previous-unit',sourceResolution:'No previous course unit: use the labelled B1+ prerequisite baseline, never present it as spaced review.',responseMode:'single-select',prompt:'Choose the sentence with a clear finished past-time reference.',options:[{id:'a',text:'I have met her yesterday.'},{id:'b',text:'I met her yesterday.'},{id:'c',text:'I meet her yesterday.'},{id:'d',text:'I was meet her yesterday.'}],correctOptionId:'b',explanation:'The past simple matches the finished time expression “yesterday”.',hint:'A finished past time normally calls for the past simple here.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('prerequisite baseline','past simple')},
 {id:'e1-p-previous-03',source:'previous-unit',sourceResolution:'No previous course unit: use the labelled B1+ prerequisite baseline, never present it as spaced review.',responseMode:'single-select',prompt:'Which question invites a story rather than a yes/no answer?',options:[{id:'a',text:'Did you go?'},{id:'b',text:'What happened after you arrived?'},{id:'c',text:'Was it?'},{id:'d',text:'Are you?'}],correctOptionId:'b',explanation:'The open question asks for the next part of the event.',hint:'Look for what + a meaningful event verb.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('prerequisite baseline','open questions')},
 {id:'e1-p-previous-04',source:'previous-unit',sourceResolution:'No previous course unit: use the labelled B1+ prerequisite baseline, never present it as spaced review.',responseMode:'short-written',prompt:'Write the past-simple forms of: leave, find, feel.',modelResponse:'left, found, felt',criteria:['Writes left.','Writes found.','Writes felt.'],hint:'All three are irregular verbs.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('prerequisite baseline','irregular past')},
 {id:'e1-p-previous-05',source:'previous-unit',sourceResolution:'No previous course unit: use the labelled B1+ prerequisite baseline, never present it as spaced review.',responseMode:'short-written',prompt:'Write one natural time marker that could begin the final event in a short story.',modelResponse:'Eventually, we found the right entrance.',criteria:['Uses a marker such as eventually, in the end, finally or a few minutes later.','Provides enough wording to show how the marker functions.'],hint:'Choose a phrase that signals a later stage or outcome.',maxAttemptsBeforeReveal:2,evidence:writtenEvidence('prerequisite baseline','sequencing')},
];

const errorBankPractice:readonly EnglishPracticeItem[]=[
 {id:'e1-p-error-01',source:'confirmed-error-bank',sourceResolution:'Diagnostic substitute: no confirmed learner error is connected in this local model.',responseMode:'single-select',prompt:'Diagnostic substitute — choose the sentence with a clear background action and interrupting event. This attempt does not create or resolve an Error Bank entry.',options:[{id:'a',text:'I was walking home when my friend called.'},{id:'b',text:'I walked home when my friend was calling every day.'},{id:'c',text:'I had walking home when my friend calls.'}],correctOptionId:'a',explanation:'Was walking establishes the action in progress; called introduces the event. Because no confirmed learner error is attached, this remains diagnostic practice only.',hint:'Identify the longer action first, then the event that interrupts it.',maxAttemptsBeforeReveal:2,evidence:diagnosticEvidence('diagnostic substitute','form retrieval')},
 {id:'e1-p-error-02',source:'confirmed-error-bank',sourceResolution:'Diagnostic substitute: no second confirmed learner error is connected in this local model.',responseMode:'single-select',context:'Intended meaning: the call interrupted the journey home.',prompt:'Diagnostic substitute — which repair preserves that meaning? This attempt does not create or resolve an Error Bank entry.',options:[{id:'a',text:'I was walking home when my friend called.'},{id:'b',text:'I called my friend after I got home.'},{id:'c',text:'I walking home when my friend was call.'}],correctOptionId:'a',explanation:'Only the first repair is grammatical and keeps the call inside the journey. The second is grammatical but changes the timeline.',hint:'Protect the intended timeline before comparing the forms.',maxAttemptsBeforeReveal:2,evidence:diagnosticEvidence('diagnostic substitute','meaning-preserving repair')},
 {id:'e1-p-error-03',source:'confirmed-error-bank',sourceResolution:'Diagnostic substitute: no confirmed production gap is connected in this local model.',responseMode:'short-written',context:'Facts: Bea waited outside the wrong café; she rechecked the message; she found the correct café across the square.',prompt:'Diagnostic substitute — write two sentences that make the earlier mistake and the later correction clear. This attempt does not create or resolve an Error Bank entry.',modelResponse:'Bea had waited outside the wrong café before she rechecked the message. She then found the correct café across the square.',criteria:['Uses only the supplied facts.','Makes the waiting earlier than the recheck and correction.','Does not claim that a learner error was confirmed or resolved.'],hint:'Choose one later past reference point, then make the earlier event explicit only where it helps.',maxAttemptsBeforeReveal:2,evidence:diagnosticEvidence('diagnostic substitute','production transfer')},
];

const audioSegments:DeepEnglishUnit['audio']['segments']=[
 {
  id:'e1-audio-orientation',label:'Set a purpose before listening',phase:'orientation',lines:[
   {voice:'host',text:'Welcome. This episode is not a reading of the Learn page. You will hear a new story about a missed turn, a community event and an unexpectedly useful conversation. The first time, listen for the big picture. Do not try to catch every word.'},
   {voice:'host',text:'Keep three questions in mind. Where was Nora trying to go? What went wrong? And why did the mistake become useful? You may make a few notes, but keep your attention on the story.',pauseMs:3000},
  ],
 },
 {
  id:'e1-audio-first-listen',label:'First listen · the whole story',phase:'first-listen',lines:[
   {voice:'Nora',text:'Last Thursday evening, I was heading to a photography exhibition at a community centre I had never visited before. A colleague had sent me the poster earlier in the week, and I had saved the address on my phone. I left work with plenty of time, or at least I thought I did.'},
   {voice:'Nora',text:'When I got off the bus, the rain was getting heavier and my map seemed to be sending me down a quiet residential street. I kept walking because the blue dot was moving in the right general direction. After about five minutes, though, I reached a row of houses and realised there was no community centre anywhere nearby.'},
   {voice:'Nora',text:'I was standing under a tree, trying to keep the rain off my screen, when a man who was walking his dog asked if I needed help. I explained that I was looking for the Riverside Community Centre. He smiled and said, “You are close, but the river is behind you.” It turned out that I had selected Riverside Court, the housing estate, instead of Riverside Community Centre.'},
   {voice:'Nora',text:'The man introduced himself as Sam. He had lived in the area for years, so he knew a shortcut through a small park. He was going in roughly the same direction and offered to show me the first part of the route. As we walked, he asked what was happening at the centre.'},
   {voice:'Nora',text:'I told him about the exhibition. It featured photographs taken by people who had recently moved to the city. Sam said his daughter was interested in photography, but they had not heard about the event. I sent him the public event link, and he said they might visit at the weekend.'},
   {voice:'Nora',text:'A few minutes later, we reached the park gate. Sam pointed to a building with a bright mural and told me to take the second entrance. I thanked him and hurried across the park. The talk had already started when I arrived, but I only missed the introduction.'},
   {voice:'Nora',text:'During the break, I mentioned the wrong turn to one of the organisers. She laughed and said that several visitors had made the same mistake because the two places had similar names. She added a clearer landmark to the event page while we were talking.'},
   {voice:'Nora',text:'So my journey was not exactly smooth. I got wet, arrived late and felt a little foolish. But the mistake led to a useful update for other visitors, and it may have introduced a new family to the exhibition. In the end, getting lost was the part of the evening I remembered most clearly.'},
   {voice:'host',text:'That is the end of the first listen. Without replaying yet, say the answer to each big-picture question in one sentence: destination, problem and useful result.',pauseMs:12000},
  ],
 },
 {
  id:'e1-audio-comprehension',label:'Retrieval before the second listen',phase:'comprehension',lines:[
   {voice:'host',text:'Check the overall shape, not every detail. Nora was trying to reach a photography exhibition at Riverside Community Centre. She selected Riverside Court on her map and walked in the wrong direction. The error became useful because Sam learnt about the exhibition and an organiser improved the directions for future visitors.'},
   {voice:'host',text:'Now answer four shorter questions aloud or in your notes. You will have time for each answer.'},
   {voice:'host',text:'Question one. What was the weather doing after Nora left the bus?',pauseMs:5000},
   {voice:'host',text:'Question two. Why could Sam help?',pauseMs:5000},
   {voice:'host',text:'Question three. What had happened by the time Nora reached the centre?',pauseMs:5000},
   {voice:'host',text:'Question four. What did the organiser change?',pauseMs:5000},
  ],
 },
 {
  id:'e1-audio-second-listen',label:'Second listen · follow the timeline',phase:'second-listen',lines:[
   {voice:'host',text:'Listen again in shorter sections. This time, notice how the verb forms organise the timeline.'},
   {voice:'Nora',text:'Last Thursday evening, I was heading to a photography exhibition at a community centre I had never visited before. A colleague had sent me the poster earlier in the week, and I had saved the address on my phone.'},
   {voice:'host',text:'The ongoing journey is “I was heading”. The poster and the saved address belong to an earlier layer: the colleague had sent it, and Nora had saved it. Those earlier facts explain why she believed she had the information she needed.',pauseMs:3000},
   {voice:'Nora',text:'When I got off the bus, the rain was getting heavier and my map seemed to be sending me down a quiet street. After about five minutes, I reached a row of houses and realised there was no community centre nearby.'},
   {voice:'host',text:'The rain was getting heavier: changing background. Nora reached the houses and realised the problem: two past-simple events that move the story forward.',pauseMs:3000},
   {voice:'Nora',text:'I was standing under a tree, trying to keep the rain off my screen, when Sam asked if I needed help. I explained that I was looking for Riverside Community Centre. It turned out that I had selected Riverside Court instead.'},
   {voice:'host',text:'The long scene is Nora standing under the tree. Sam’s question enters that scene. “I had selected” looks back and identifies the earlier cause of the current problem.',pauseMs:3000},
   {voice:'Sam',text:'I had lived in the area for years, so I knew a shortcut. I was going in roughly the same direction, and I offered to show Nora the first part of the route.'},
   {voice:'host',text:'Sam’s prior experience explains his knowledge. His direction overlaps with Nora’s immediate journey, and his offer becomes the next event.',pauseMs:3000},
   {voice:'Nora',text:'As we walked, I told Sam about the exhibition. He said his daughter was interested in photography, so I sent him the public link. A few minutes later, he pointed out the correct building and I hurried across the park.'},
   {voice:'host',text:'Notice the clean chain of events: told, said, sent, pointed and hurried. A story does not need a complex tense in every sentence. Once the time order is clear, the past simple often carries the sequence.',pauseMs:3000},
   {voice:'Nora',text:'The talk had already started when I arrived, but I had only missed the introduction. During the break, an organiser added a clearer landmark to the event page because several visitors had made the same mistake.'},
   {voice:'host',text:'The talk started before Nora arrived, so the past perfect makes the relationship explicit. The visitors’ mistakes also happened before the organiser made the update.',pauseMs:3000},
   {voice:'Nora',text:'I got wet, arrived late and felt a little foolish. But the wrong turn helped other visitors and may have introduced a new family to the exhibition. In the end, getting lost became the most memorable part of the evening.'},
   {voice:'host',text:'That final contrast gives the story a point. The speaker admits the inconvenience, then explains the unexpected value. A natural story is more than a list of correctly conjugated verbs.',pauseMs:4000},
  ],
 },
 {
  id:'e1-audio-language-clinic',label:'Language clinic · form, meaning and conversation',phase:'language-clinic',lines:[
   {voice:'host',text:'Let us isolate four useful patterns. First: “I was standing under a tree when Sam asked if I needed help.” Use the past continuous to hold the background open and the past simple for the event that enters it. The word when does not choose the tense by itself; the relationship between the actions does.'},
   {voice:'host',text:'Second: “It turned out that I had selected Riverside Court.” The phrase “it turned out that” introduces information that became clear later. The past perfect then points back to the earlier selection. Do not add the past perfect merely to sound advanced. Use it when the earlier layer helps the listener understand the later situation.'},
   {voice:'host',text:'Third: “The talk had already started when I arrived.” Stress already if the timing matters: the talk had ALREADY started. In ordinary speech, had is often weak. The listener needs the time relationship, not equal stress on every word.'},
   {voice:'host',text:'Fourth: keep the conversation moving. After Nora says she got lost, a useful listener might ask, “How did you realise you were in the wrong place?” After she mentions Sam, the listener might ask, “Did he come to the exhibition later?” Each question follows a detail already offered.'},
   {voice:'host',text:'Try a quick meaning check. Which happened first: Nora arrived, or the talk started? The talk started first. Which action was in progress when Sam spoke? Nora was standing under the tree. Why does the story mention that Sam had lived in the area for years? It explains how he knew the shortcut.',pauseMs:4000},
  ],
 },
 {
  id:'e1-audio-shadowing',label:'Shadowing · chunks, stress and linking',phase:'shadowing',lines:[
   {voice:'host',text:'Now shadow three lines. Listen once, then repeat. Focus on idea groups and key words, not on copying an accent.'},
   {voice:'Nora',text:'I was STANDING under a TREE / when SAM asked if I needed HELP.'},
   {voice:'host',text:'Repeat. Keep “was” light, stress standing, tree, Sam and help. Let “asked if” connect smoothly.',pauseMs:6000},
   {voice:'Nora',text:'It turned OUT / that I had selected the WRONG place.'},
   {voice:'host',text:'Repeat in two groups: “It turned out” and “that I had selected the wrong place”. Stress wrong because it carries the correction.',pauseMs:6000},
   {voice:'Nora',text:'The TALK had already STARTED / when I arRIVED.'},
   {voice:'host',text:'Repeat. The strong beats are talk, started and the final syllable of arrived. The word had can stay short and unstressed.',pauseMs:6000},
   {voice:'host',text:'One more time, combine the three lines at a calm conversational pace. Clarity comes from grouping the message, not from rushing or forcing every sound.',pauseMs:10000},
  ],
 },
 {
  id:'e1-audio-transfer',label:'Transfer · make the pattern yours',phase:'transfer',lines:[
   {voice:'host',text:'Finish with a thirty- to forty-five-second story. Choose a small mistake, delay or surprise. Give the background, introduce the event, explain one earlier fact only if it matters, and end with the result. Then ask the listener one related question.'},
   {voice:'host',text:'You can use this frame if you need support: “I was blank when blank happened. It turned out that I had blank. In the end, blank. Has anything like that happened to you?” Replace the frame with your own facts rather than memorising Nora’s story.'},
   {voice:'host',text:'A transcript can show whether expected words were captured, but it cannot prove that your stress, vowels or rhythm were accurate. Use the Speaking tab for up to three attempts and keep the feedback within that evidence boundary.'},
  ],
 },
];

export const DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS=[
 'e1-p-current-01','e1-p-current-02','e1-p-current-03','e1-p-current-04','e1-p-current-08','e1-p-current-09','e1-p-current-11',
 'e1-p-previous-01','e1-p-previous-03','e1-p-previous-04',
 'e1-p-error-01','e1-p-error-03',
] as const;

export const DEEP_ENGLISH_UNIT_1:DeepEnglishUnit={
 schemaVersion:'deep-english-unit-v1',id:'english-everyday-deep-e1-v1',title:'Tell a story naturally: past forms, rhythm & follow-up questions',strand:'everyday',
 level:{entry:'B1+',destination:'B2+'},
 profilePlacement:{
  rafael:{code:'E1',sequence:1,monthlyMix:{everydayPct:50,professionalPct:50}},
  viviane:{code:'VE1',sequence:1,monthlyMix:{everydayPct:80,professionalPct:20}},
 },
 estimatedMinutes:{minimum:45,target:55,maximum:60,byPhase:{learn:12,audio:12,grammar:10,practice:13,speaking:8}},
 prerequisites:['Can form common past-simple verbs.','Can understand a short B1+ everyday story.','Can write or say four connected sentences with support.'],
 outcomes:[
  'Distinguish background, main events and a relevant earlier event in a short story.',
  'Choose past simple, past continuous and past perfect for an intended time relationship rather than by keyword.',
  'Organise a story as setting, change, response and result without inventing facts.',
  'Use rhythm, stress and idea groups to make a rehearsed story easier to follow.',
  'Respond to another person’s story with one relevant reaction and follow-up question.',
 ],
 boundaries:[
  'Written answers do not establish listening, pronunciation or spontaneous speaking ability.',
  'Speech recognition may support a transcript, but it is not an acoustic pronunciation score.',
  'No response certifies a CEFR level; the B1+ to B2+ label describes the instructional path.',
  'The unit uses everyday content and is safe for both learner profiles; it contains no finance curriculum for Viviane.',
 ],
 learn:{
  title:'A wrong entrance and a good conversation',
  purpose:'Read a natural exchange, reconstruct its timeline and notice how the listener helps the story develop.',
  warmUp:['Think of a small mistake that ended better than expected.','What makes a short story easy to follow?','What question helps another person continue after “You will not believe what happened”?'],
  setting:'Maya meets Leo in a café on Sunday morning. Leo asks why she arrived late to a neighbourhood film screening the night before.',
  dialogue:[
   {speaker:'Leo',text:'You made it in the end! What happened to you last night?',teachingNote:'A warm reaction plus one open question invites the story.'},
   {speaker:'Maya',text:'I was walking towards the cinema when I noticed that everyone else was going in the opposite direction.',teachingNote:'Was walking holds the background; noticed starts the change.'},
   {speaker:'Leo',text:'Had you gone to the wrong place?'},
   {speaker:'Maya',text:'Almost. I had saved the address, but I had not checked which entrance the message mentioned.'},
   {speaker:'Leo',text:'So where did you end up?'},
   {speaker:'Maya',text:'At the back of the building, beside a locked gate. While I was trying to find another way in, a woman came out with two boxes of posters.'},
   {speaker:'Leo',text:'Was she part of the event?'},
   {speaker:'Maya',text:'Yes. She was one of the organisers. She showed me the side entrance, and I helped her carry the posters upstairs.'},
   {speaker:'Leo',text:'That was lucky. Had the film already started?'},
   {speaker:'Maya',text:'No, but the introduction had begun. We slipped in at the back, and she found me a seat.'},
   {speaker:'Leo',text:'Did you get to talk to her afterwards?'},
   {speaker:'Maya',text:'I did. It turned out that we had taken the same evening course a few years ago, although we had never spoken there.'},
   {speaker:'Leo',text:'So getting lost actually helped you meet someone.'},
   {speaker:'Maya',text:'Exactly. I arrived stressed, but I left with a new contact and an invitation to the next screening.'},
   {speaker:'Leo',text:'What kind of film are they showing next time?',teachingNote:'The final question follows Maya’s invitation detail instead of changing topic.'},
  ],
  meaningChecks:[
   {id:'e1-learn-check-1',responseMode:'single-select',prompt:'Why was Maya late?',options:[{id:'a',text:'The film time changed.'},{id:'b',text:'She went to the wrong entrance.'},{id:'c',text:'Leo forgot to meet her.'},{id:'d',text:'The cinema was closed.'}],correctOptionId:'b',explanation:'Maya reached a locked gate at the back because she had not checked the entrance in the message.',hint:'Find the difference between the saved address and the unchecked detail.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('learn comprehension','main problem')},
   {id:'e1-learn-check-2',responseMode:'single-select',prompt:'Which action was in progress when the organiser appeared?',options:[{id:'a',text:'The film was ending.'},{id:'b',text:'Maya was looking for another way in.'},{id:'c',text:'Leo was ordering coffee.'},{id:'d',text:'Maya was taking the evening course.'}],correctOptionId:'b',explanation:'The dialogue says Maya was trying to find another way in when the woman came out.',hint:'Look for while + past continuous.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('learn comprehension','background-event relationship')},
   {id:'e1-learn-check-3',responseMode:'single-select',prompt:'What made the mistake end positively?',options:[{id:'a',text:'Maya avoided the screening.'},{id:'b',text:'Maya met an organiser and received another invitation.'},{id:'c',text:'The locked gate opened itself.'},{id:'d',text:'Leo carried the posters.'}],correctOptionId:'b',explanation:'The wrong entrance led to a helpful encounter and a future invitation.',hint:'Compare Maya’s stressed arrival with how she left.',maxAttemptsBeforeReveal:2,evidence:objectiveEvidence('learn comprehension','story outcome')},
  ],
  languageMap:[
   {form:'Past continuous',job:'Hold a background action open around a past moment.',example:'I was walking towards the cinema when I noticed the crowd.',contrast:'I walked to the cinema and noticed the crowd presents two completed events in sequence.'},
   {form:'Past simple',job:'Move the story through completed events.',example:'She showed me the entrance and I carried the posters.',contrast:'Use the continuous only when the in-progress viewpoint matters.'},
   {form:'Past perfect',job:'Look back from a past point to a relevant earlier event.',example:'I had not checked which entrance the message mentioned.',contrast:'Do not use it for every earlier sentence when the order is already obvious and unimportant.'},
   {form:'It turned out that…',job:'Reveal information that became clear later.',example:'It turned out that we had taken the same course.',contrast:'It signals discovery; it does not mean the speaker knew the fact at the start.'},
  ],
  conversationMoves:[
   {move:'React, then ask',why:'Shows you understood the point before requesting more detail.',examples:['That was lucky. Had the film already started?','What a strange coincidence. Did you recognise each other?']},
   {move:'Follow the newest meaningful detail',why:'Keeps the exchange connected rather than sounding like an interview checklist.',examples:['What kind of film are they showing next?','Did she remember the course too?']},
   {move:'Recast briefly',why:'Repairs an important form without stopping the conversation.',examples:['You went to the wrong entrance — how did you find the right one?','You met an organiser — what did she say?']},
  ],
  guidedRetell:{
   facts:['Maya had saved the address but not checked the entrance.','She was looking for another way in when an organiser appeared.','Maya helped carry posters.','The introduction had begun, but the film had not.','The two women discovered a prior shared course.','Maya received an invitation to the next screening.'],
   plan:['Set the scene in one sentence.','Explain the earlier oversight.','Tell the encounter as the turning point.','Close with the result and one connected question.'],
   model:'Maya was heading to a film screening when she realised she was at a locked entrance. She had saved the address but had not checked the entrance details. While she was looking for another way in, she met an organiser and helped her carry some posters. The introduction had already begun, but they arrived before the film started. It turned out that they had attended the same course, and Maya left with an invitation to another screening. Have you ever met someone because a plan went wrong?',
   variation:'Retell it to a colleague in three sentences, keeping the facts but removing the conversational detail.',
  },
  portugueseSupport:[
   'Past continuous cria o pano de fundo; past simple move a sequência; past perfect recupera um fato anterior relevante.',
   'A palavra when não determina o tempo verbal sozinha. Primeiro decida qual ação estava em andamento e qual evento mudou a situação.',
   'Uma boa pergunta de continuidade nasce do detalhe que a outra pessoa acabou de oferecer.',
  ],
 },
 audio:{
  title:'The wrong Riverside',status:'authored-script-no-generation-requested',isIndependentFromLearn:true,estimatedMinutes:12,
  delivery:{accent:'clear international English with a light Irish setting',paceWpm:125,pauseSeconds:90},
  firstListen:{instruction:'Listen without the transcript and capture destination, problem and useful result.',questions:['Where was Nora trying to go?','What went wrong?','Why did the mistake become useful?']},
  secondListen:{instruction:'Listen in sections and identify background, events and earlier explanations.',questions:['Which activities are presented as ongoing background?','Which earlier actions explain later problems?','Where does the past simple carry the sequence without a perfect tense?','How does Nora turn the inconvenience into a meaningful ending?']},
  segments:audioSegments,
  answerKey:[
   {question:'Where was Nora trying to go?',answer:'A photography exhibition at Riverside Community Centre.',evidence:'Nora names the exhibition and venue in the opening.'},
   {question:'What went wrong?',answer:'She selected Riverside Court instead of Riverside Community Centre and walked away from the venue.',evidence:'Nora discovers the similar place name while sheltering under a tree.'},
   {question:'Why did the mistake become useful?',answer:'Sam learnt about the exhibition and the organiser improved the directions for later visitors.',evidence:'Nora shares the event link; the organiser adds a landmark.'},
   {question:'What had happened before Nora arrived?',answer:'The talk had already started, although she had only missed the introduction.',evidence:'Nora states both facts after Sam points out the building.'},
  ],
  shadowing:[
   {text:'I was standing under a tree when Sam asked if I needed help.',chunks:['I was standing under a tree','when Sam asked if I needed help'],stress:['standing','tree','Sam','help'],connectedSpeech:'Keep “was” light and connect “asked if” without adding a full pause.'},
   {text:'It turned out that I had selected the wrong place.',chunks:['It turned out','that I had selected the wrong place'],stress:['turned out','wrong'],connectedSpeech:'Link “turned out” smoothly; make wrong the correction focus.'},
   {text:'The talk had already started when I arrived.',chunks:['The talk had already started','when I arrived'],stress:['talk','started','arrived'],connectedSpeech:'Reduce had; do not give every word equal weight.'},
  ],
  transferPrompt:'Tell a 30–45 second story about a small mistake, delay or surprise. Include background, event, one relevant earlier fact, result and one follow-up question.',
  generationRequested:false,
 },
 grammar:{
  target:'Past simple, past continuous and past perfect for deliberate story time relationships; follow-up questions that continue the story.',
  stages:[
   {id:'notice',purpose:'Locate the target form in meaningful input before naming a rule.',itemIds:['e1-g-notice-1','e1-g-notice-2']},
   {id:'understand',purpose:'Connect each form to the timeline meaning it creates.',itemIds:['e1-g-understand-1','e1-g-understand-2']},
   {id:'choose',purpose:'Select a form for an explicitly stated intention.',itemIds:['e1-g-choose-1','e1-g-choose-2']},
   {id:'build',purpose:'Construct controlled sentences while preserving supplied facts.',itemIds:['e1-g-build-1','e1-g-build-2']},
   {id:'use',purpose:'Create a short story and a connected conversational response.',itemIds:['e1-g-use-1','e1-g-use-2']},
  ],
  items:grammarItems,
 },
 practice:{
  sessionSize:12,estimatedMinutes:13,
  allocation:[{source:'current-unit',weight:0.6},{source:'previous-unit',weight:0.25},{source:'confirmed-error-bank',weight:0.15}],
  selectionPlan:{
   algorithm:'seeded-largest-remainder',seed:'learner + unit + attempt-number',
   exampleSession:[
    {source:'current-unit',count:7,itemIds:['e1-p-current-01','e1-p-current-02','e1-p-current-03','e1-p-current-04','e1-p-current-08','e1-p-current-09','e1-p-current-11']},
    {source:'previous-unit',count:3,itemIds:['e1-p-previous-01','e1-p-previous-03','e1-p-previous-04']},
    {source:'confirmed-error-bank',count:2,itemIds:['e1-p-error-01','e1-p-error-03']},
   ],
   roundingNote:'For 12 positions, ideal counts are 7.2, 3.0 and 1.8. Largest remainder assigns 7 current, 3 previous and 2 confirmed-error positions (58.3% / 25.0% / 16.7%). The stable seed changes the chosen items without changing the bucket counts.',
  },
  firstUnitFallback:{
   previousUnit:'Because this is Unit 1, the five previous-unit slots use a clearly labelled B1+ prerequisite baseline. From Unit 2 onward they must resolve to completed earlier units.',
   errorBank:'Use only confirmed learner errors. If fewer than three exist, display diagnostic substitutes in the vacant positions and record them as diagnostic—not Error Bank review and not resolved errors.',
   reportingRule:'The interface reports planned allocation and actual resolved sources separately; a fallback must never be relabelled to make the percentage appear complete.',
  },
  items:[...currentPractice,...previousPractice,...errorBankPractice],
 },
 speaking:{
  goal:'Make a rehearsed short story intelligible through idea groups, contrastive stress and connected speech, then transfer the pattern to a new story.',attemptsPerPrompt:3,
  recordingPolicy:{audio:'local-until-lesson-close',transcript:'ephemeral-unless-learner-explicitly-saves-text',retained:['activity id','attempt count','learner self-checks','feedback categories','completion timestamp']},
  scorePolicy:{
   allowed:['attempt completed','idea groups attempted','target stress self-checked','transcript available or unavailable','transfer prompt completed'],
   prohibited:['pronunciation percentage derived from word overlap','accent quality claim','phoneme accuracy without an acoustic evaluator','fluency or CEFR mastery from one recording'],
  },
  activities:[
   {id:'e1-speak-1',kind:'chunking',prompt:'Repeat in two idea groups, pausing only at the slash.',model:'I was walking towards the cinema / when I noticed the crowd.',chunks:['I was walking towards the cinema','when I noticed the crowd'],stress:['walking','cinema','noticed','crowd'],coachChecks:['Pause aligns with the meaning boundary.','Content words carry more weight than was, the and when.']},
   {id:'e1-speak-2',kind:'stress',prompt:'Repeat twice: first neutrally, then stress WRONG to correct the listener’s assumption.',model:'I had saved the wrong entrance.',chunks:['I had saved','the wrong entrance'],stress:['saved','wrong','entrance'],coachChecks:['Wrong is the strongest contrast on the second attempt.','Had remains short; it is not the message focus.']},
   {id:'e1-speak-3',kind:'connected-speech',prompt:'Practise the connection in “asked if” and keep the question calm.',model:'Sam asked if I needed help.',chunks:['Sam asked if','I needed help'],stress:['Sam','needed','help'],coachChecks:['Asked if flows as one group.','No claim is made about exact phoneme accuracy from the transcript.']},
   {id:'e1-speak-4',kind:'shadowing',prompt:'Shadow the whole turn after the model, then repeat without reading.',model:'It turned out that we had taken the same course, although we had never spoken there.',chunks:['It turned out','that we had taken the same course','although we had never spoken there'],stress:['turned out','same course','never spoken'],coachChecks:['Three idea groups remain audible.','The contrast after although is clear.','Pace stays controlled rather than rushed.']},
   {id:'e1-speak-5',kind:'transfer',prompt:'Record a 30–45 second real or invented story with background, event, relevant earlier fact, result and one follow-up question.',model:'I was heading home when I saw a crowd outside the library. I had forgotten that a local author was speaking there that evening. I stayed for the talk and met one of my neighbours. In the end, the delay became the best part of my day. Have you ever changed your plans because of something unexpected?',chunks:['background','event','earlier explanation','result','follow-up'],stress:['event words','contrast or result','question focus'],coachChecks:['All five story moves are present.','The earlier fact helps explain the event.','The follow-up connects to the story.','Completion does not imply an acoustic pronunciation score.']},
  ],
 },
 completion:{
  rule:'all-required-evidence-not-tab-visits',
  requirements:[
   {id:'e1-complete-learn',description:'Demonstrate comprehension of the shared dialogue.',minimum:'Answer all three meaning checks; retry missed items before continuing.',evidenceIds:['e1-learn-check-1','e1-learn-check-2','e1-learn-check-3']},
   {id:'e1-complete-audio',description:'Complete both listening passes and retrieval.',minimum:'Submit the three first-listen answers and at least three second-listen timeline answers; playback alone is insufficient.',evidenceIds:['e1-audio-first-listen','e1-audio-comprehension','e1-audio-second-listen']},
   {id:'e1-complete-grammar',description:'Work through all five grammar stages.',minimum:'Attempt all ten items; objective items require a correct answer or recorded review, and written items require a criteria self-check.',evidenceIds:grammarItems.map(item=>item.id)},
   {id:'e1-complete-practice',description:'Complete the resolved practice session with honest source labels.',minimum:'Attempt all twelve selected positions (7 current, 3 previous and 2 confirmed-error positions after documented rounding), including labelled diagnostic substitutes when evidence is unavailable.',evidenceIds:DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS},
   {id:'e1-complete-speaking',description:'Produce rehearsed and transferred speech without a fake pronunciation score.',minimum:'Complete one shadowing attempt and one transfer attempt, then confirm the applicable coach checks.',evidenceIds:['e1-speak-4','e1-speak-5']},
  ],
  masteryBoundary:'Unit completion records required activity evidence. It does not by itself establish durable mastery, spontaneous fluency, pronunciation accuracy or a CEFR level; those require later retrieval and appropriate spoken evaluation.',
 },
};

export const DEEP_ENGLISH_UNIT_1_PRACTICE_COUNTS=Object.freeze({
 current:DEEP_ENGLISH_UNIT_1.practice.items.filter(item=>item.source==='current-unit').length,
 previous:DEEP_ENGLISH_UNIT_1.practice.items.filter(item=>item.source==='previous-unit').length,
 errorBank:DEEP_ENGLISH_UNIT_1.practice.items.filter(item=>item.source==='confirmed-error-bank').length,
});

const objectiveIdsFor=(id:string):readonly string[]=>{
 if(id.includes('speak'))return ['e1-objective-spoken-clarity'];
 if(id.includes('follow')||id.endsWith('current-04')||id.endsWith('current-08')||id.endsWith('current-12'))return ['e1-objective-interaction'];
 if(id.includes('use')||id.endsWith('current-11'))return ['e1-objective-story'];
 if(id.includes('perfect')||id.includes('previous')||id.includes('notice')||id.includes('understand')||id.includes('choose')||id.includes('build'))return ['e1-objective-time'];
 return ['e1-objective-form-choice'];
};

const sharedEvidence=(item:EnglishItemEvidence,id:string):ItemEvidenceRule=>({
 objectiveIds:objectiveIdsFor(id),record:'item-result',
 errorBank:item.errorBankTrigger==='second-incorrect-objective-attempt'?'after-final-incorrect':item.errorBankTrigger==='never'?'never':'confirmed-only',
});

const sharedEvaluation=(item:EnglishChoiceItem|EnglishWrittenItem):ActivityEvaluation=>{
 if(item.responseMode==='single-select')return {kind:'selection',correctOptionIds:[item.correctOptionId],explanation:item.explanation};
 return {kind:'self-check',checklist:item.criteria,modelAnswer:item.modelResponse};
};

const grammarMinutes=(item:EnglishGrammarItem):number=>item.stage==='use'?2.5:item.stage==='build'?1:0.5;
const practiceMinutes=(item:EnglishPracticeItem):number=>item.responseMode==='extended-written'?2:item.responseMode==='short-written'?1.5:1;

const sharedGrammarItems:readonly GrammarItem[]=grammarItems.map(item=>({
 id:item.id,stage:item.stage,prompt:[item.context,item.prompt].filter(Boolean).join('\n'),
 responseMode:item.responseMode==='short-written'?'short-text':item.responseMode==='extended-written'?'extended-text':'single-select',
 estimatedMinutes:grammarMinutes(item),
 options:item.responseMode==='single-select'?item.options.map(option=>({id:option.id,label:option.text})):undefined,
 evaluation:sharedEvaluation(item),evidence:sharedEvidence(item.evidence,item.id),
}));

const sharedPracticeItems:readonly ProgressivePracticeItem[]=DEEP_ENGLISH_UNIT_1.practice.items.map(item=>({
 id:item.id,prompt:[item.context,item.prompt].filter(Boolean).join('\n'),
 progression:item.source==='confirmed-error-bank'?'transfer':item.responseMode==='single-select'?'retrieve':item.responseMode==='short-written'?'apply':'integrate',
 sourceBucket:item.source==='current-unit'?'current':item.source==='previous-unit'?'previous':'confirmed-error-bank',
 responseMode:item.responseMode==='short-written'?'short-text':item.responseMode==='extended-written'?'extended-text':'single-select',
 estimatedMinutes:practiceMinutes(item),
 options:item.responseMode==='single-select'?item.options.map(option=>({id:option.id,label:option.text})):undefined,
 hints:[item.hint],evaluation:sharedEvaluation(item),evidence:sharedEvidence(item.evidence,item.id),
}));

export const DEEP_ENGLISH_UNIT_1_LEARN_TEXT=[
 DEEP_ENGLISH_UNIT_1.learn.title,DEEP_ENGLISH_UNIT_1.learn.purpose,DEEP_ENGLISH_UNIT_1.learn.setting,
 ...DEEP_ENGLISH_UNIT_1.learn.warmUp,
 ...DEEP_ENGLISH_UNIT_1.learn.dialogue.flatMap(turn=>[turn.text,turn.teachingNote??'']),
 ...DEEP_ENGLISH_UNIT_1.learn.meaningChecks.flatMap(item=>[item.context??'',item.prompt,...item.options.map(option=>option.text),item.explanation,item.hint]),
 ...DEEP_ENGLISH_UNIT_1.learn.languageMap.flatMap(item=>[item.form,item.job,item.example,item.contrast]),
 ...DEEP_ENGLISH_UNIT_1.learn.conversationMoves.flatMap(item=>[item.move,item.why,...item.examples]),
 ...DEEP_ENGLISH_UNIT_1.learn.guidedRetell.facts,...DEEP_ENGLISH_UNIT_1.learn.guidedRetell.plan,
 DEEP_ENGLISH_UNIT_1.learn.guidedRetell.model,DEEP_ENGLISH_UNIT_1.learn.guidedRetell.variation,
 ...DEEP_ENGLISH_UNIT_1.learn.portugueseSupport,
] as const;

const audioMinutes:Readonly<Record<string,number>>={
 'e1-audio-orientation':0.75,
 'e1-audio-first-listen':3.75,
 'e1-audio-comprehension':1.5,
 'e1-audio-second-listen':3,
 'e1-audio-language-clinic':1.5,
 'e1-audio-shadowing':1,
 'e1-audio-transfer':0.5,
};

const audioKinds:Readonly<Record<string,'opening'|'dialogue'|'retrieval-pause'|'explanation'|'pronunciation'|'transfer'>>={
 'e1-audio-orientation':'opening',
 'e1-audio-first-listen':'dialogue',
 'e1-audio-comprehension':'retrieval-pause',
 'e1-audio-second-listen':'explanation',
 'e1-audio-language-clinic':'explanation',
 'e1-audio-shadowing':'pronunciation',
 'e1-audio-transfer':'transfer',
};

const speakingMinutes:Readonly<Record<string,number>>={
 'e1-speak-1':1,
 'e1-speak-2':1,
 'e1-speak-3':1.25,
 'e1-speak-4':2,
 'e1-speak-5':2.75,
};

/**
 * Adapter to the shared deep-lesson quality contract. The richer English data above
 * remains available to the future UI, while this object can be attached to a
 * LessonModule once the runtime renderer supports deep lessons.
 */
export const DEEP_ENGLISH_UNIT_1_CONTRACT:DeepLessonContract={
 schemaVersion:DEEP_LESSON_SCHEMA_VERSION,
 editorial:{status:'deep-reviewed',depthVersion:'english-e1-depth-1',reviewedOn:'2026-09-24'},
 course:{kind:'english',level:'B1+ → B2+',register:'everyday',audience:'Rafael E1 and Viviane VE1'},
 curriculum:{
  provider:'Learning Hub',framework:'Unified English Academy',version:'2026-09 deep model',
  outcomeIds:['e1-outcome-time','e1-outcome-form','e1-outcome-story','e1-outcome-spoken-clarity','e1-outcome-interaction'],
 },
 prerequisites:DEEP_ENGLISH_UNIT_1.prerequisites,
 objectives:[
  {id:'e1-objective-time',statement:DEEP_ENGLISH_UNIT_1.outcomes[0],evidenceIds:['e1-g-notice-1','e1-g-notice-2','e1-g-understand-1','e1-g-understand-2'],level:'understand'},
  {id:'e1-objective-form-choice',statement:DEEP_ENGLISH_UNIT_1.outcomes[1],evidenceIds:['e1-g-choose-1','e1-g-choose-2','e1-g-build-1','e1-g-build-2'],level:'apply'},
  {id:'e1-objective-story',statement:DEEP_ENGLISH_UNIT_1.outcomes[2],evidenceIds:['e1-worked-retell','e1-g-use-1','e1-p-current-11'],level:'create'},
  {id:'e1-objective-spoken-clarity',statement:DEEP_ENGLISH_UNIT_1.outcomes[3],evidenceIds:['e1-speak-1','e1-speak-2','e1-speak-3','e1-speak-4','e1-speak-5'],level:'apply'},
  {id:'e1-objective-interaction',statement:DEEP_ENGLISH_UNIT_1.outcomes[4],evidenceIds:['e1-worked-followup','e1-g-use-2','e1-p-current-04','e1-p-current-12'],level:'create'},
 ],
 workload:{
  totalMinutes:55,paceNote:'A prepared learner may finish in 45 minutes; completing every production task carefully may take up to 60.',
  phases:[
   {id:'e1-phase-learn',kind:'learn',title:'Contextual input and guided retell',plannedMinutes:12,evidenceIds:[LEARN_TEXT_EVIDENCE_ID,'e1-worked-retell','e1-worked-followup']},
   {id:'e1-phase-audio',kind:'audio',title:'Independent two-pass listening episode',plannedMinutes:12,evidenceIds:audioSegments.map(segment=>segment.id)},
   {id:'e1-phase-grammar',kind:'grammar',title:'Notice → Understand → Choose → Build → Use',plannedMinutes:10,evidenceIds:grammarItems.map(item=>item.id)},
   {id:'e1-phase-practice',kind:'practice',title:'Weighted retrieval and transfer session',plannedMinutes:13,evidenceIds:DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS},
   {id:'e1-phase-speaking',kind:'speaking',title:'Chunks, stress, linking, shadowing and transfer',plannedMinutes:8,evidenceIds:DEEP_ENGLISH_UNIT_1.speaking.activities.map(item=>item.id)},
  ],
 },
 workedExamples:[{
  id:'e1-worked-retell',title:'Turn six facts into a listener-friendly story',estimatedMinutes:3,
  scenario:DEEP_ENGLISH_UNIT_1.learn.guidedRetell.facts,
  steps:[
   {id:'e1-worked-retell-1',action:'Choose the opening background.',reasoning:'The listener first needs the destination and the problem in progress.',result:'Maya was heading to a screening when she found a locked entrance.'},
   {id:'e1-worked-retell-2',action:'Add the relevant earlier cause.',reasoning:'The unchecked entrance detail explains the later confusion.',result:'She had saved the address but had not checked the entrance.'},
   {id:'e1-worked-retell-3',action:'Select the turning point.',reasoning:'The organiser’s arrival changes the direction of the story.',result:'While Maya was looking for another way in, she met an organiser.'},
   {id:'e1-worked-retell-4',action:'Close with result and interaction.',reasoning:'The outcome gives the story a point; a connected question invites the listener.',result:'Maya received another invitation and asks whether the listener has had a similar surprise.'},
  ],
  conclusion:DEEP_ENGLISH_UNIT_1.learn.guidedRetell.model,transferPrompt:DEEP_ENGLISH_UNIT_1.learn.guidedRetell.variation,
 },{
  id:'e1-worked-followup',title:'Turn a detail into a useful follow-up',estimatedMinutes:2,
  scenario:['A speaker says: “I went to the wrong entrance, but an organiser helped me find a seat.”','The listener wants to show interest without asking several unrelated questions.'],
  steps:[
   {id:'e1-worked-followup-1',action:'Identify the story’s meaningful turn.',reasoning:'The unexpected help is the detail that changed the result.',result:'Focus on the organiser rather than introducing a new topic.'},
   {id:'e1-worked-followup-2',action:'React briefly.',reasoning:'A reaction shows the listener understood why the detail mattered.',result:'“That was lucky.”'},
   {id:'e1-worked-followup-3',action:'Ask for one connected detail.',reasoning:'One open question invites the next part without turning the exchange into an interview.',result:'“Did you get to talk to the organiser afterwards?”'},
  ],
  conclusion:'“That was lucky. Did you get to talk to the organiser afterwards?”',
  transferPrompt:'Respond to “I missed my stop, but I found a beautiful park” with one reaction and one connected question.',
 }],
 practice:{items:sharedPracticeItems,sessionItemIds:DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS,targetMix:ENGLISH_PRACTICE_MIX,attemptsBeforeReveal:2},
 misconceptions:[
  {id:'e1-misconception-when',misconception:'The word “when” automatically requires one tense pattern.',correction:'Meaning chooses the viewpoint: identify background, event and chronology before choosing a form.',diagnosticPrompt:'Explain the difference between “I cooked when she arrived” and “I was cooking when she arrived.”',objectiveIds:['e1-objective-time','e1-objective-form-choice']},
  {id:'e1-misconception-perfect',misconception:'Past perfect makes every story more advanced and should appear often.',correction:'Use it only when an earlier past layer is relevant to a later past point.',diagnosticPrompt:'Remove the unnecessary past perfect from a simple chronological sequence and explain why.',objectiveIds:['e1-objective-time']},
  {id:'e1-misconception-detail',misconception:'A better story contains every remembered detail.',correction:'Select context, turning point and outcome that help this listener follow the event.',diagnosticPrompt:'Reduce a six-detail account to setting, change, response and result.',objectiveIds:['e1-objective-story']},
  {id:'e1-misconception-score',misconception:'A transcript word-match percentage is a pronunciation score.',correction:'Transcription can offer limited intelligibility evidence; stress, rhythm and sounds need appropriate acoustic or human evaluation.',diagnosticPrompt:'Name two pronunciation qualities a word-overlap transcript cannot establish.',objectiveIds:['e1-objective-spoken-clarity']},
 ],
 revisionTargets:[
  {id:'e1-revision-time',prompt:'Reconstruct a three-layer timeline from a new five-sentence story.',objectiveIds:['e1-objective-time','e1-objective-form-choice'],successCriterion:'Correctly identifies earlier fact, ongoing background and main event, with a reason for each form.',revisitAfterDays:[1,7,21],estimatedMinutes:3},
  {id:'e1-revision-story',prompt:'Retell a new everyday event in 45 seconds without reading a model.',objectiveIds:['e1-objective-story','e1-objective-spoken-clarity'],successCriterion:'Includes setting, change and result in intelligible idea groups; no acoustic score is inferred.',revisitAfterDays:[3,10,30],estimatedMinutes:4},
  {id:'e1-revision-interaction',prompt:'Respond to three short story endings with one reaction and one connected question each.',objectiveIds:['e1-objective-interaction'],successCriterion:'All questions follow information the speaker actually provided.',revisitAfterDays:[7,21],estimatedMinutes:3},
 ],
 audioEpisode:{
  format:'authored-script',title:DEEP_ENGLISH_UNIT_1.audio.title,
  editorialGoal:'Build independent listening and retrieval through a new story, then teach timeline language and rehearse speech in meaningful chunks.',
  estimatedMinutes:12,
  distinctiveElements:['A different Riverside story and cast from the Learn dialogue.','A first listen for gist followed by retrieval before replay.','A second listen with timeline commentary.','Language clinic, shadowing and an original transfer task.'],
  segments:audioSegments.map(segment=>({
   id:segment.id,kind:audioKinds[segment.id]??'explanation',title:segment.label,
   estimatedMinutes:audioMinutes[segment.id]??0,
   script:segment.lines.map(line=>`${line.voice.toUpperCase()}: ${line.text}${line.pauseMs?` [Pause ${Math.round(line.pauseMs/1000)} seconds.]`:''}`).join('\n'),
  })),
 },
 completion:{
  itemLevelEvidenceRequired:true,
  requirements:[
   {id:'e1-contract-complete-learn',targetIds:['e1-learn-check-1','e1-learn-check-2','e1-learn-check-3'],rule:'attempt',minimum:3},
   {id:'e1-contract-complete-audio',targetIds:['e1-audio-first-listen','e1-audio-comprehension','e1-audio-second-listen'],rule:'submit',minimum:3},
   {id:'e1-contract-complete-grammar',targetIds:grammarItems.map(item=>item.id),rule:'attempt',minimum:10},
   {id:'e1-contract-complete-practice',targetIds:DEEP_ENGLISH_UNIT_1_PRACTICE_SAMPLE_IDS,rule:'attempt',minimum:12},
   {id:'e1-contract-complete-speaking',targetIds:['e1-speak-4','e1-speak-5'],rule:'attempt',minimum:2},
  ],
 },
 english:{
  contextualInput:{
   id:'e1-context-dialogue',title:DEEP_ENGLISH_UNIT_1.learn.title,mode:'dialogue',
   turns:DEEP_ENGLISH_UNIT_1.learn.dialogue.map(turn=>({speaker:turn.speaker,text:turn.text})),
   comprehensionItemIds:DEEP_ENGLISH_UNIT_1.learn.meaningChecks.map(item=>item.id),
  },
  grammar:{
   target:DEEP_ENGLISH_UNIT_1.grammar.target,
   stages:DEEP_ENGLISH_UNIT_1.grammar.stages.map(stage=>({stage:stage.id,purpose:stage.purpose,itemIds:stage.itemIds})),
   items:sharedGrammarItems,
  },
  speaking:{
   tasks:DEEP_ENGLISH_UNIT_1.speaking.activities.map(activity=>({
    id:activity.id,
    focus:activity.kind==='chunking'?'chunks':activity.kind==='connected-speech'?'linking':activity.kind,
    prompt:`${activity.prompt} Coach checks: ${activity.coachChecks.join(' ')}`,
    model:activity.model,evidence:{objectiveIds:['e1-objective-spoken-clarity'],record:'item-result',errorBank:'confirmed-only'},
    estimatedMinutes:speakingMinutes[activity.id]??1,
   })),
   attemptsPerTask:3,recordingRetention:'local-until-lesson-close',acousticScore:false,
  },
 },
};

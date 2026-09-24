import type {LessonModule} from './lessonModules.ts';
import {lessonModuleFor} from './lessonModules.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_E1_MODEL_SLUG,ENGLISH_E2_MODEL_ID,ENGLISH_E2_MODEL_SLUG,localEnglishCodeFor} from './localEnglishLessonRegistry.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';

const reviewedOn='2026-09-22';
const golden=lessonModuleFor('english','f455a740-f50f-4eb7-95a7-9e4129ca4a68');
if(!golden)throw new Error('english_golden_module_missing');

export const ENGLISH_E1_MODEL_MODULE:LessonModule={...golden,lessonId:ENGLISH_E1_MODEL_ID};

export const ENGLISH_E2_MODEL_MODULE:LessonModule={
 track:'english',lessonId:ENGLISH_E2_MODEL_ID,title:'Everyday Dublin: weather, plans and natural small talk',
 goal:'Open an everyday conversation naturally, distinguish observation from forecast and adjust a social plan with clear, friendly English.',
 scope:'Original written everyday-English practice for a Dublin context. It does not reproduce a real conversation, assess listening or pronunciation, certify a CEFR level or claim one universal Irish style. Weather details are fictional and must not be used as a live forecast.',
 sections:[
  {id:'eng-dublin-open',title:'1. Start with what you both can see',paragraphs:[
   'Natural small talk usually begins with shared context: the weather outside, the journey, the place or the plan ahead. A short observation plus an open question gives the other person something easy to answer: “It cleared up quickly. Are you still heading into town?” The aim is connection, not a perfect line.',
   'Avoid turning one encounter into a rule about Irish people or Irish English. Some people enjoy small talk and others prefer a brief greeting. Notice the response: if the answer is short, keep it light; if the person adds detail, follow that detail rather than returning to a memorised script.',
   'A useful follow-up connects to the last idea. “The wind was awful on the way here” can lead to “Did it affect your bus?” A disconnected question can feel like an interview even when the grammar is correct.'
  ],supportPt:'Comece pelo contexto compartilhado e faça uma pergunta simples ligada ao que a pessoa acabou de dizer. Small talk é interação, não um roteiro fixo nem uma regra sobre todas as pessoas na Irlanda.',sourceIds:['bc-conversation']},
  {id:'eng-dublin-evidence',title:'2. Separate observation, forecast and assumption',paragraphs:[
   '“It is raining” reports a present observation. “The forecast says it may rain later” reports a source with uncertainty. “It looks as if it might rain” expresses an impression. These statements are not interchangeable: choose the wording that matches the evidence you actually have.',
   'Use may, might, probably and apparently to show appropriate uncertainty, not to make every sentence weak. “Apparently the service is delayed” signals that you have not independently confirmed it. If the plan matters, check the source or ask a direct question instead of presenting a guess as fact.',
   'A natural correction can be brief: “Sorry, I thought it was at seven, but the message says half seven.” Correct the information, say where the correction came from and move the plan forward.'
  ],supportPt:'Diferencie observação, previsão e suposição. Use may, might, apparently e probably para mostrar o grau real de certeza; se o plano for importante, confirme a informação.',sourceIds:['met-eireann']},
  {id:'eng-dublin-plans',title:'3. Use future forms for the intended meaning',paragraphs:[
   'Use the present continuous for a personal arrangement already organised: “We are meeting outside the cinema at seven.” Use be going to for an intention or a prediction based on present evidence: “We are going to stay nearby if the weather gets worse.” Use will for an immediate decision, offer or neutral prediction: “I will check the train times now.”',
   'Real speech often combines these forms. “We are meeting at seven, but it looks like it is going to rain, so I will book a table inside.” Each form has a job: arrangement, evidence-based expectation and decision made now.',
   'Do not force one form into every future sentence. First identify whether the speaker means a fixed arrangement, an intention, evidence or a decision at the moment of speaking. Then choose the form that makes that meaning clear.'
  ],supportPt:'Present continuous costuma indicar uma combinação já marcada; going to, intenção ou previsão baseada em evidência; will, decisão imediata, oferta ou previsão neutra. Escolha pela intenção, não por uma regra isolada.',sourceIds:['bc-present-continuous','bc-future-forms']},
  {id:'eng-dublin-repair',title:'4. Repair the plan and keep the tone natural',paragraphs:[
   'When a plan changes, give the change first, then a short reason and a workable option: “The outdoor table is no longer available because of the rain. Shall we meet inside instead?” The listener should not have to find the action inside a long apology.',
   'Humour can help when it is shared and low-risk: “A very ambitious plan for Dublin weather.” Do not use teasing about identity, accent or a sensitive mistake until you know the relationship. A friendly tone cannot rescue an unclear or disrespectful message.',
   'Close the exchange by confirming the next step: “Great, inside at seven. I will message you if the train is delayed.” This prevents a pleasant conversation from ending with an unresolved plan.'
  ],supportPt:'Ao mudar um plano, diga primeiro a mudança, depois o motivo curto e uma alternativa. Humor deve ser leve e seguro. Termine confirmando horário, local ou próximo passo.',sourceIds:['bc-conversation']}
 ],
 terms:[
  {term:'clear up',meaning:'Become brighter or stop raining.',pt:'abrir / melhorar',example:'It should clear up later, but let us keep the indoor option.'},
  {term:'a bit changeable',meaning:'Likely to vary over a short period.',pt:'um pouco instável',example:'The weather looks a bit changeable this afternoon.'},
  {term:'apparently',meaning:'According to information that has not been independently confirmed.',pt:'aparentemente / pelo que disseram',example:'Apparently the train is delayed by ten minutes.'},
  {term:'still up for it?',meaning:'Informal question asking whether someone still wants to do the plan.',pt:'ainda está a fim?',example:'It is raining — are you still up for the walk?'},
  {term:'shall we…?',meaning:'A friendly way to make or check a suggestion.',pt:'vamos…?',example:'Shall we meet inside instead?'},
  {term:'works for me',meaning:'The proposed time or option is acceptable.',pt:'funciona para mim',example:'Half seven works for me.'}
 ],
 visual:{title:'Match the sentence to its evidence and purpose',note:'Original examples. Weather and transport details are fictional, not live information.',headers:['Sentence','Evidence or purpose','Natural response'],rows:[['It is raining now.','Direct observation','Take an umbrella.'],['It might rain later.','Uncertain possibility','Keep the indoor option.'],['We are meeting at seven.','Organised arrangement','Confirm the place.'],['I will check the times.','Immediate decision','Share the result.']],question:'Which sentence would you use for a plan that is already arranged?',answer:'“We are meeting at seven.” The present continuous presents the meeting as an organised personal arrangement.'},
 caseStudy:{title:'A wet evening and a plan that still needs a decision',scenario:['You arranged to meet a neighbour outside a cinema at 19:00. It is now raining and the forecast information you saw earlier was uncertain.','Your neighbour writes: “Weather is not looking great. Still up for tonight?”','The indoor meeting point is available, but you have not checked whether your train is delayed.'],task:'Reply naturally: acknowledge the weather, keep observation separate from uncertainty, propose the indoor option and confirm what you will check next.',hints:['Do not claim the train is delayed before checking.','Use one future form for the arrangement and another for the decision you make now.'],modelAnswer:'“Yes, definitely. It is raining here too, so shall we meet inside the main entrance at seven instead? I will check the train times now and message you if anything changes.” This keeps the existing arrangement, proposes a practical change and avoids inventing a delay.',reviewChecks:['The present weather is described as an observation.','No transport delay is invented.','The new meeting point and time are clear.','The final message confirms the next check.'],transfer:'Change the situation to a family trip to a playground and make the tone slightly more informal.'},
 checkpoint:[
  {id:'eng-dublin-q1',prompt:'Which opening best supports natural small talk?',options:['Irish weather is always terrible.','It cleared up quickly. Are you still going into town?','Tell me your complete travel history.','You must enjoy talking about rain.'],correctIndex:1,explanation:'It uses shared context and an open question without stereotyping the listener.',reviewSection:'eng-dublin-open'},
  {id:'eng-dublin-q2',prompt:'You have not confirmed a reported delay. Which wording is most accurate?',options:['The train is definitely cancelled.','Apparently the train is delayed; I am checking now.','There cannot be a delay.','The delay proves the weather caused it.'],correctIndex:1,explanation:'Apparently marks the information as reported, and the second clause identifies the verification step.',reviewSection:'eng-dublin-evidence'},
  {id:'eng-dublin-q3',prompt:'Which sentence most clearly presents an organised arrangement?',options:['We are meeting outside at seven.','We might meeting outside.','We will to meeting outside.','We going meet perhaps.'],correctIndex:0,explanation:'The present continuous can present a personal future arrangement already organised.',reviewSection:'eng-dublin-plans'},
  {id:'eng-dublin-q4',prompt:'Which message repairs a plan most effectively?',options:['Long apology with no new plan.','Rain.','The outdoor table is unavailable, so shall we meet inside at seven?','You should know what I mean.'],correctIndex:2,explanation:'It states the change and gives a clear alternative and time.',reviewSection:'eng-dublin-repair'},
  {id:'eng-dublin-q5',prompt:'What can this written lesson establish?',options:['Your Irish accent is accurate.','You understand every Dublin speaker.','Your written choices match this local answer key.','A certified CEFR level.'],correctIndex:2,explanation:'The checkpoint is written practice only; it does not measure listening, accent or overall proficiency.',reviewSection:'eng-dublin-repair'}
 ],
 practiceExercises:[
  {id:'eng-dublin-p1',question:'Turn this stereotype into neutral small talk: “It always rains in Ireland, doesn’t it?”',hints:['Describe the present situation.','Invite the other person to respond.'],answer:'It changed quickly this afternoon. Did you get caught in the rain?',explanation:'The revision uses shared context without making a universal claim.'},
  {id:'eng-dublin-p2',question:'Complete a message using arrangement, evidence and an immediate decision.',hints:['Use present continuous for the arranged meeting.','Use will for what you decide to do now.'],answer:'We are meeting at seven, but it looks like it might rain, so I will check whether we can sit inside.',explanation:'Each future form reflects a different meaning rather than decorative variety.'},
  {id:'eng-dublin-p3',question:'Write a two-sentence reply to: “Still up for the walk?” The rain is real; a bus delay is only a rumour.',hints:['Acknowledge the real observation.','Do not convert the rumour into fact.'],answer:'Yes, but the rain is fairly heavy here, so shall we shorten the route? Apparently some buses are delayed; I will check before I leave.',explanation:'The reply separates observation, reported information and the next action.'}
 ],
 sources:[
  {id:'bc-conversation',label:'British Council · Speaking and keeping a conversation going',url:'https://learnenglish.britishcouncil.org/skills/speaking',supports:'General speaking practice and interaction strategies; all lesson dialogues are original.',reviewedOn},
  {id:'bc-present-continuous',label:'British Council · Present continuous',url:'https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/present-continuous',supports:'Present continuous forms and future arrangements.',reviewedOn},
  {id:'bc-future-forms',label:'British Council · Future forms',url:'https://learnenglish.britishcouncil.org/grammar/b1-b2-grammar/future-forms-will-be-going-to-and-present-continuous',supports:'Meaning contrasts among arrangements, intentions, predictions and immediate decisions.',reviewedOn},
  {id:'met-eireann',label:'Met Éireann · National forecast',url:'https://www.met.ie/forecasts/national-forecast',supports:'Example of an official source to check rather than inventing live weather information.',reviewedOn}
 ]
};

export function localEnglishLessonFor(track:P1Track,lesson:{id:string;slug:string}):LessonModule|null{
 const code=localEnglishCodeFor(track,lesson);
 if(code==='E1'&&lesson.slug===ENGLISH_E1_MODEL_SLUG)return ENGLISH_E1_MODEL_MODULE;
 if(code==='E2'&&lesson.slug===ENGLISH_E2_MODEL_SLUG)return ENGLISH_E2_MODEL_MODULE;
 return null;
}

import type {LessonModule,LessonSource} from './lessonModules.ts';
import {
 ENGLISH_E5_MODEL_ID,
 ENGLISH_E5_MODEL_SLUG,
 ENGLISH_P5_MODEL_ID,
 ENGLISH_P5_MODEL_SLUG,
 localEnglishCodeFor,
} from './localEnglishLessonRegistry.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';

const reviewedOn='2026-09-23';
const source=(id:string,label:string,url:string,supports:string):LessonSource=>({id,label,url,supports,reviewedOn});

const speakingSource=source(
 'bc-speaking',
 'British Council · Speaking',
 'https://learnenglish.britishcouncil.org/skills/speaking',
 'General speaking strategies and interaction practice; all scenarios and dialogues in this lesson are original.',
);
const requestsSource=source(
 'bc-requests',
 'British Council · Requests, offers and invitations',
 'https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/requests-offers-invitations',
 'Language choices for polite requests and offers.',
);
const questionsSource=source(
 'bc-questions',
 'British Council · Questions and negatives',
 'https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/questions-negatives',
 'Question structure used to ask for observations and clarification.',
);
const modalsSource=source(
 'bc-modals',
 'British Council · Modals: permission and obligation',
 'https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/modals-permission-obligation',
 'Distinguishing permission, possibility and obligation in everyday arrangements.',
);

export const ENGLISH_E5_MODEL_MODULE:LessonModule={
 track:'english',
 lessonId:ENGLISH_E5_MODEL_ID,
 title:'School conversations: share observations and agree a next step',
 goal:'Describe a child-related observation neutrally, ask what the school has noticed and finish with one confirmed next step without inventing a diagnosis, policy or agreement.',
 scope:'Original written everyday-English practice using a fictional school conversation. It does not contact a school, interpret an individual child’s needs, provide medical, safeguarding or education-policy advice, assess listening or pronunciation or certify a CEFR level.',
 sections:[
  {
   id:'eng-school-purpose',
   title:'1. Open with a specific purpose',
   paragraphs:[
    'A short purpose helps a teacher understand the conversation quickly: “Could we talk briefly about how Leo is settling into group activities?” This is more useful than opening with “There is a problem” before stating what you want to discuss.',
    'Include only the context needed for the conversation. A date, activity or repeated observation may matter; unrelated family information usually does not. In this lesson, every child, school and event is fictional.',
    'If the situation could involve immediate safety or a serious welfare concern, use the school’s real contact and safeguarding process. This written language exercise cannot decide what action a real situation requires.',
   ],
   supportPt:'Comece com um objetivo específico e apenas o contexto necessário. O exercício ensina linguagem; situações reais de segurança ou bem-estar exigem o canal apropriado da escola.',
   sourceIds:['bc-speaking','bc-requests'],
  },
  {
   id:'eng-school-observation',
   title:'2. Separate observation from interpretation',
   paragraphs:[
    'Describe what was said or seen before giving an interpretation: “Leo said he found the group task difficult on Monday” is an observation you can attribute. “Leo is being excluded” is a conclusion that the available fact alone does not establish.',
    'Use neutral questions to invite another perspective: “What have you noticed during group work?” and “Does this happen in one activity or across the day?” The goal is to gather information, not to force agreement with a theory.',
    'Hedging can keep uncertainty visible: “He seems quieter after school this week” or “It may be connected to the new routine.” These phrases do not make the idea true; they accurately show that it still needs checking.',
   ],
   supportPt:'Relate o que foi dito ou observado antes de interpretar. Faça perguntas neutras e use linguagem de incerteza quando a causa ainda não é conhecida.',
   sourceIds:['bc-speaking','bc-questions'],
  },
  {
   id:'eng-school-routine',
   title:'3. Clarify routine, permission and obligation',
   paragraphs:[
    'School arrangements often sound similar but have different force. “Can Leo bring the form tomorrow?” asks about permission or practical possibility. “Does he have to bring it tomorrow?” asks whether it is required.',
    'Use “should” carefully. It can express advice or an expected action, but it may not describe a formal rule. If the distinction matters, ask directly: “Is that a recommendation, or is it required by Friday?”',
    'Do not infer a school policy from a model sentence. A useful language habit is to repeat the specific arrangement you heard and ask the real school to confirm its own rule.',
   ],
   supportPt:'Diferencie permissão, possibilidade, recomendação e obrigação. Se isso mudar a ação necessária, confirme explicitamente a regra com a escola real.',
   sourceIds:['bc-modals','bc-questions'],
  },
  {
   id:'eng-school-close',
   title:'4. Close with one owner and one next step',
   paragraphs:[
    'Summarise only what was actually agreed: “You’ll observe the next two group activities, and I’ll check in on Friday.” This gives each person an action and a time without claiming that the underlying concern has been resolved.',
    'If no action has been accepted, keep the request open: “Would it be possible to arrange a short meeting next week?” Availability from one person is not yet a confirmed appointment.',
    'A final check prevents two different understandings: “Just to make sure I understood, should I email you on Friday, or will you contact me?” Specific alternatives are easier to answer than “So everything is fine?”',
   ],
   supportPt:'Resuma apenas o combinado, com responsável e prazo. Disponibilidade ou pedido ainda não confirmado não deve ser tratado como acordo.',
   sourceIds:['bc-speaking','bc-requests','bc-questions'],
  },
 ],
 terms:[
  {term:'settling in',meaning:'Becoming comfortable with a new place or routine.',pt:'adaptando-se',example:'Could we talk about how Leo is settling in?'},
  {term:'I noticed…',meaning:'Introduces a specific observation.',pt:'eu percebi…',example:'I noticed that he was quieter after school twice this week.'},
  {term:'What have you noticed?',meaning:'Invites the other person’s observations without assuming a cause.',pt:'o que você percebeu?',example:'What have you noticed during group work?'},
  {term:'seems',meaning:'Shows that something appears true but is not confirmed.',pt:'parece',example:'He seems less confident in the new routine.'},
  {term:'required',meaning:'Officially necessary rather than merely recommended.',pt:'obrigatório / exigido',example:'Is the form required by Friday?'},
  {term:'check in',meaning:'Contact someone briefly to review progress or new information.',pt:'retomar / verificar',example:'I will check in with you on Friday.'},
 ],
 visual:{
  title:'Build a neutral school conversation',
  note:'Keep the observation, interpretation, question and agreement distinct.',
  headers:['Layer','Example','Boundary'],
  rows:[
   ['Observation','Leo mentioned one difficult group task.','Attributed fact'],
   ['Possible interpretation','He may still be settling in.','Not confirmed'],
   ['Neutral question','What have you noticed in class?','Invites evidence'],
   ['Next step','Teacher observes; parent checks in Friday.','Agreed actions only'],
  ],
  question:'Which sentence invites evidence without presenting a cause as certain?',
  answer:'“What have you noticed during group work?” It asks for the teacher’s observations before drawing a conclusion.',
 },
 caseStudy:{
  title:'A calm check-in about a new routine',
  scenario:[
   'In a fictional school, Leo said that a group activity felt difficult on Monday.',
   'A parent noticed that he was quieter after school on Tuesday and Wednesday, but does not know why.',
   'No meeting or follow-up action has been agreed yet.',
  ],
  task:'Open a short conversation, separate the supplied observations from possible interpretations, ask two neutral questions and request a specific next step.',
  hints:[
   'Attribute what Leo said and what the parent noticed; do not diagnose the cause.',
   'End with a request that still needs the teacher’s confirmation.',
  ],
  modelAnswer:'“Could we talk briefly about how Leo is settling into group activities? He said Monday’s group task felt difficult, and I noticed that he was quieter after school on Tuesday and Wednesday. I don’t know whether those things are connected. What have you noticed during group work? Does it seem limited to one activity? Would it be possible for us to check in again on Friday after you have observed the next sessions?”',
  reviewChecks:[
   'The purpose is clear and concise.',
   'The child’s words and the parent’s observation remain separate from interpretation.',
   'The questions invite the teacher’s evidence.',
   'The Friday follow-up is a request, not an invented agreement.',
  ],
  transfer:'Change the topic to homework instructions and clarify whether an action is recommended or required.',
 },
 checkpoint:[
  {id:'eng-school-q1',prompt:'Which opening gives the clearest purpose?',options:['There is a terrible problem.','Could we talk briefly about how Leo is settling into group activities?','You must explain everything.','I have many things to say.'],correctIndex:1,explanation:'It identifies the topic and requests a conversation without announcing an unsupported conclusion.',reviewSection:'eng-school-purpose'},
  {id:'eng-school-q2',prompt:'Which sentence is an attributed observation?',options:['Leo is definitely being excluded.','The routine is wrong.','Leo said Monday’s group task felt difficult.','The school caused the change.'],correctIndex:2,explanation:'It reports what the child said and does not turn that report into a confirmed cause.',reviewSection:'eng-school-observation'},
  {id:'eng-school-q3',prompt:'Which question checks whether something is an obligation?',options:['Does he have to bring the form tomorrow?','Could the form be blue?','Would the form look better?','Did he enjoy the form?'],correctIndex:0,explanation:'“Have to” asks whether the action is required.',reviewSection:'eng-school-routine'},
  {id:'eng-school-q4',prompt:'A parent says Friday works for them. What is still unknown?',options:['Whether the child attends the school.','Whether the teacher has confirmed Friday.','Whether Friday exists.','Whether the parent can speak English.'],correctIndex:1,explanation:'One person’s availability does not create a confirmed meeting.',reviewSection:'eng-school-close'},
  {id:'eng-school-q5',prompt:'Which closing records only an agreed next step?',options:['The concern is solved.','You will diagnose the cause tomorrow.','You’ll observe the next two activities, and I’ll check in on Friday.','Silence means the meeting is booked.'],correctIndex:2,explanation:'It names the actions and timing without claiming that the cause or outcome is settled.',reviewSection:'eng-school-close'},
 ],
 practiceExercises:[
  {id:'eng-school-p1',question:'Rewrite the conclusion “She hates the new class” as an observation plus a neutral question.',hints:['Use only a fact you can attribute.','Ask what the teacher has noticed.'],answer:'She said the class felt difficult yesterday. What have you noticed during the lesson?',explanation:'The rewrite preserves the report and invites evidence instead of presenting an interpretation as fact.'},
  {id:'eng-school-p2',question:'Clarify whether bringing a signed form on Friday is advice or a requirement.',hints:['Contrast recommendation and obligation.','Name the day and item.'],answer:'Just to clarify, is bringing the signed form on Friday recommended, or is it required?',explanation:'The contrast makes the practical distinction explicit.'},
  {id:'eng-school-p3',question:'Request a follow-up next Tuesday without claiming it is booked.',hints:['Use “would it be possible”.','Ask for confirmation.'],answer:'Would it be possible to have a short follow-up next Tuesday? Please let me know whether that time is available.',explanation:'The wording proposes a time while leaving confirmation with the other person.'},
 ],
 sources:[speakingSource,requestsSource,questionsSource,modalsSource],
};

const interviewSource=source(
 'bc-interview',
 'British Council · A job interview',
 'https://learnenglish.britishcouncil.org/free-resources/listening/c1/job-interview',
 'Interview interaction and listening context; all prompts and answers in this lesson are original.',
);
const interviewGuidanceSource=source(
 'bc-interview-guidance',
 'British Council · How to prepare for a job interview in English',
 'https://learnenglish.britishcouncil.org/english-levels/improve-your-english-level/how-prepare-job-interview-english',
 'Preparation, clarity and practice for interviews in English.',
);
const presentPerfectSource=source(
 'bc-present-perfect',
 'British Council · Present perfect',
 'https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/present-perfect',
 'Present perfect for experience or past actions connected with the present.',
);

export const ENGLISH_P5_MODEL_MODULE:LessonModule={
 track:'english',
 lessonId:ENGLISH_P5_MODEL_ID,
 title:'Job interviews: give concise, evidence-based answers',
 goal:'Answer an interview question with a clear claim, accurate personal contribution, relevant evidence and a concise link to the role without inventing results or hiding uncertainty.',
 scope:'Original written professional-English practice using fictional interview evidence. It does not apply for a job, assess a real employer or candidate, provide immigration or employment-law advice, evaluate pronunciation or live listening, guarantee an interview result or certify a CEFR level.',
 sections:[
  {
   id:'eng-interview-headline',
   title:'1. Lead with the answer, not the entire history',
   paragraphs:[
    'For “Tell me about your experience”, begin with a role-relevant headline: “I work in finance operations, with a focus on reconciliations, controls and explaining exceptions to stakeholders.” The interviewer can then place the evidence that follows.',
    'Select evidence for the question instead of reciting every position. A useful short answer has a claim, one example, the result and why it matters for this role.',
    'If a fact is confidential, generalise it honestly: “a regional process” or “a material reconciliation issue”. Do not replace a confidential number with an invented number merely to sound precise.',
   ],
   supportPt:'Comece pela resposta central e selecione uma evidência relevante. Preserve a confidencialidade sem inventar números ou resultados.',
   sourceIds:['bc-interview','bc-interview-guidance'],
  },
  {
   id:'eng-interview-time',
   title:'2. Connect career experience to the present',
   paragraphs:[
    'Use the past simple for a finished episode with a finished time: “Last year, I redesigned the monthly reconciliation.” Use the present perfect when the experience remains connected to now and the finished time is not the focus: “I have worked with cross-functional teams in several reporting cycles.”',
    'The present perfect does not make an answer more professional by itself. Choose the form that matches the timeline, and switch to the past simple when you describe what happened in a specific example.',
    'For a current responsibility, the present simple is often clearest: “I review exceptions and coordinate the month-end follow-up.” A concise answer can move from current scope, to a past example, to a present capability.',
   ],
   supportPt:'Use o tempo verbal conforme a linha do tempo: responsabilidade atual, experiência ligada ao presente e episódio concluído. Um tempo mais complexo não é automaticamente melhor.',
   sourceIds:['bc-present-perfect','bc-interview-guidance'],
  },
  {
   id:'eng-interview-evidence',
   title:'3. Make your contribution and evidence visible',
   paragraphs:[
    'A structured example can be short: context, responsibility, action, result and learning. The labels are less important than a sequence the listener can follow.',
    'Distinguish ownership accurately. “I led the review” means something different from “I contributed to the review”. Both can be strong evidence when you explain what you personally did.',
    'Quantify only from verified information. If an exact result is unavailable, name the observable effect without fabricating precision: “The team closed the aged items and introduced a review step that reduced repeat exceptions.”',
   ],
   supportPt:'Mostre contexto, responsabilidade, ação e resultado. Diferencie liderar de contribuir e só use números que você possa sustentar.',
   sourceIds:['bc-interview','bc-interview-guidance'],
  },
  {
   id:'eng-interview-relevance',
   title:'4. Finish with relevance and handle the follow-up',
   paragraphs:[
    'Close the example by linking it to the vacancy: “That experience is relevant here because the role needs someone who can investigate exceptions and explain decisions clearly.” The link should use requirements actually stated for the role.',
    'When a follow-up exposes missing experience, acknowledge the boundary and show adjacent evidence: “I have not used that exact system, but I have migrated between two finance platforms and can explain how I validated the outputs.”',
    'Prepare one genuine question for the employer. “What would a successful first three months look like in this role?” invites concrete expectations. It does not imply that the job is already yours.',
   ],
   supportPt:'Ligue a evidência ao requisito real da vaga. Quando faltar experiência direta, reconheça o limite e apresente experiência transferível sem fingir equivalência.',
   sourceIds:['bc-interview','bc-interview-guidance'],
  },
 ],
 terms:[
  {term:'relevant experience',meaning:'Experience that directly helps with the role being discussed.',pt:'experiência relevante',example:'My most relevant experience is in reconciliation and control review.'},
  {term:'I was responsible for…',meaning:'States the part of the work that belonged to you.',pt:'eu era responsável por…',example:'I was responsible for investigating aged exceptions.'},
  {term:'I contributed to…',meaning:'Shows participation without claiming sole ownership.',pt:'eu contribuí para…',example:'I contributed to the process redesign and tested the controls.'},
  {term:'outcome',meaning:'The result produced by an action or process.',pt:'resultado',example:'The outcome was a clearer monthly review trail.'},
  {term:'transferable',meaning:'Useful in a different role, industry or system.',pt:'transferível',example:'The investigation method is transferable to a new platform.'},
  {term:'follow-up question',meaning:'A question that asks for more detail after an initial answer.',pt:'pergunta de aprofundamento',example:'The interviewer asked a follow-up question about my role.'},
 ],
 visual:{
  title:'A concise evidence-based interview answer',
  note:'The answer is strong when every claim is supported and relevant.',
  headers:['Part','Useful content','Check'],
  rows:[
   ['Headline','Finance operations and control focus','Answers the question'],
   ['Contribution','Investigated and reconciled exceptions','Personal ownership is accurate'],
   ['Outcome','Closed aged items; added review step','No invented precision'],
   ['Relevance','Matches the vacancy’s control needs','Uses an actual requirement'],
  ],
  question:'What should you change if the result belongs to the whole team?',
  answer:'State your own contribution and describe the result as the team’s outcome rather than claiming that you delivered it alone.',
 },
 caseStudy:{
  title:'A finance interview answer without overclaiming',
  scenario:[
   'In a fictional role, a finance analyst joined a team reviewing a backlog of reconciliation exceptions.',
   'The analyst personally grouped the items by cause, investigated supporting records and proposed a weekly review tracker.',
   'The team cleared the confirmed backlog and adopted the tracker. No verified percentage or cash-saving figure is available.',
  ],
  task:'Answer “Tell me about a process improvement you contributed to.” Include context, personal contribution, team outcome, learning and relevance to a role that requires control ownership.',
  hints:[
   'Use “I” for the analyst’s actions and “we” or “the team” for the shared outcome.',
   'Do not invent a percentage, saving or claim of sole leadership.',
  ],
  modelAnswer:'“In a previous finance role, I contributed to a review of a backlog of reconciliation exceptions. I grouped the items by cause, checked the supporting records and proposed a weekly tracker so owners and next actions were visible. The team cleared the confirmed backlog and kept the tracker as part of the review process. I learned that a simple ownership rhythm can be as important as the initial analysis. That experience is relevant to this role because it combines investigation, stakeholder follow-up and sustainable control ownership.”',
  reviewChecks:[
   'The opening answers the process-improvement question.',
   'Personal actions are distinguished from the team outcome.',
   'No unsupported number or saving is invented.',
   'The final relevance link matches the stated role requirement.',
  ],
  transfer:'Retell the example in sixty to ninety seconds, then prepare a shorter version for an initial recruiter call.',
 },
 checkpoint:[
  {id:'eng-interview-q1',prompt:'Which opening answers “Tell me about your experience” most directly?',options:['My career is a very long story.','I work in finance operations, focusing on reconciliations, controls and stakeholder explanations.','Everything on my CV is important.','Where would you like me to begin?'],correctIndex:1,explanation:'It gives a relevant professional headline that the interviewer can explore.',reviewSection:'eng-interview-headline'},
  {id:'eng-interview-q2',prompt:'Choose the best form for a finished event last year.',options:['Last year, I have redesigned the review.','Last year, I redesigned the review.','Last year, I redesign the review.','Last year, I am redesigning the review.'],correctIndex:1,explanation:'The past simple matches a finished event at a specified finished time.',reviewSection:'eng-interview-time'},
  {id:'eng-interview-q3',prompt:'You tested controls in a project led by your manager. Which wording is most accurate?',options:['I led the entire transformation.','I delivered every result alone.','I contributed to the project by testing the controls.','The project had no other owners.'],correctIndex:2,explanation:'It identifies a valuable personal contribution without claiming leadership that was not supplied.',reviewSection:'eng-interview-evidence'},
  {id:'eng-interview-q4',prompt:'No verified percentage is available. What should the candidate do?',options:['Invent a conservative number.','Avoid the example completely.','Describe the observable outcome without fabricated precision.','Say the result was one hundred per cent.'],correctIndex:2,explanation:'Evidence can be specific without using an unsupported metric.',reviewSection:'eng-interview-evidence'},
  {id:'eng-interview-q5',prompt:'How should you respond if you have not used the employer’s exact system?',options:['Claim that you have.','Acknowledge the gap and explain relevant transferable experience.','Say systems never matter.','Change the subject.'],correctIndex:1,explanation:'The answer preserves credibility while showing how adjacent experience may help.',reviewSection:'eng-interview-relevance'},
 ],
 practiceExercises:[
  {id:'eng-interview-p1',question:'Turn “I did everything on the project” into an accurate contribution statement for someone who investigated exceptions and tested controls.',hints:['Name the actual actions.','Do not claim sole ownership.'],answer:'I contributed to the project by investigating the exceptions and testing the revised controls.',explanation:'The statement is specific and credible without overstating ownership.'},
  {id:'eng-interview-p2',question:'Combine current responsibility, a finished example from last year and present capability in three sentences.',hints:['Use present simple, then past simple.','Use present perfect only if it matches the final meaning.'],answer:'I currently review reconciliation exceptions and coordinate follow-up. Last year, I redesigned a monthly tracker with the process owners. That experience has strengthened my ability to make control actions visible.',explanation:'Each verb form reflects a different point on the timeline.'},
  {id:'eng-interview-p3',question:'Write a relevance sentence for a role that requires clear explanations to non-finance stakeholders.',hints:['Refer to actual communication evidence.','Connect it to the stated requirement.'],answer:'That experience is relevant because I had to turn a technical reconciliation issue into a clear decision and next step for non-finance stakeholders.',explanation:'The sentence links demonstrated experience to the vacancy’s communication requirement.'},
 ],
 sources:[interviewSource,interviewGuidanceSource,presentPerfectSource],
};

export function localEnglishBalancedExpansionFor(track:P1Track,lesson:{id:string;slug:string}):LessonModule|null{
 const code=localEnglishCodeFor(track,lesson);
 if(code==='E5'&&lesson.slug===ENGLISH_E5_MODEL_SLUG)return ENGLISH_E5_MODEL_MODULE;
 if(code==='P5'&&lesson.slug===ENGLISH_P5_MODEL_SLUG)return ENGLISH_P5_MODEL_MODULE;
 return null;
}

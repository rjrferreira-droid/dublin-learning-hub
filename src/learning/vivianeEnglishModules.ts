import type {LessonModule,LessonSource} from './lessonModules.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {ENGLISH_E1_MODEL_MODULE,ENGLISH_E2_MODEL_MODULE} from './localEnglishLessonModules.ts';
import {ENGLISH_E3_MODEL_MODULE,ENGLISH_E4_MODEL_MODULE} from './localEnglishEverydayExpansion.ts';
import {ENGLISH_E5_MODEL_MODULE} from './localEnglishBalancedExpansion.ts';
import {ENGLISH_E6_MODEL_MODULE,ENGLISH_E7_MODEL_MODULE,ENGLISH_E8_MODEL_MODULE,ENGLISH_E9_MODEL_MODULE,ENGLISH_E10_MODEL_MODULE} from './localEnglishEverydayMonthExpansion.ts';
import {LOCAL_VIVIANE_ENGLISH_LESSONS,VIVIANE_ENGLISH_IDENTITIES,localVivianeEnglishCodeFor,type VivianeEnglishCode} from './vivianeEnglishLessonRegistry.ts';

const reviewedOn='2026-09-23';
const source=(id:string,label:string,url:string,supports:string):LessonSource=>({id,label,url,supports,reviewedOn});
const speaking=source('bc-speaking','British Council · Speaking','https://learnenglish.britishcouncil.org/skills/speaking','Conversation structure, clarification and interaction strategies; lesson dialogues and tasks are original.');
const grammar=source('bc-grammar','British Council · B1–B2 grammar','https://learnenglish.britishcouncil.org/grammar/b1-b2-grammar','Contextual grammar reference; examples and practice in this course are original.');
const listening=source('bc-listening','British Council · B1 listening','https://learnenglish.britishcouncil.org/skills/listening/b1-listening','Listening strategies at an intermediate level; no exercise is copied.');
const revenue=source('revenue-payroll','Revenue · Employer payroll obligations','https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/employer-obligations-from-01-01-2019/index.aspx','Public terminology for Irish payroll process context. No rates or live calculation are taught here.');
const revenueMoves=source('revenue-movements','Revenue · Commencing and ceasing employees','https://www.revenue.ie/en/employing-people/becoming-an-employer-and-ongoing-obligations/employer-obligations-from-01-01-2019/commencing-and-ceasing-employees.aspx','Public context for start and leaving dates in payroll workflows.');
const payslips=source('wrc-payslips','Workplace Relations Commission · Payslips','https://www.workplacerelations.ie/en/what_you_should_know/hours-and-wages/payslips/','Public terminology for gross pay, deductions and confidentiality.');

type NewCode='VE11'|'VE12'|'VE13'|'VE14'|'VE15'|'VE16'|'VP1'|'VP2'|'VP3'|'VP4';
type Term=LessonModule['terms'][number];
type Definition={
 code:NewCode;title:string;goal:string;scope:string;
 sections:readonly {title:string;paragraphs:readonly [string,string];supportPt:string;sourceIds:readonly string[]}[];
 terms:readonly [Term,Term,Term,Term,Term,Term];
 visual:readonly [readonly [string,string,string],readonly [string,string,string],readonly [string,string,string],readonly [string,string,string]];
 scenario:readonly [string,string,string];task:string;modelAnswer:string;transfer:string;
 correctLanguage:string;incorrectLanguage:string;sources:readonly LessonSource[];
};

const definitions:readonly Definition[]=[
 {
  code:'VE11',title:'At the pharmacy: describe symptoms and check instructions',
  goal:'Describe a common symptom and its timeline, answer basic questions and repeat back supplied instructions without diagnosing yourself or changing professional advice.',
  scope:'Original B1+ everyday-English practice. It is communication training, not medical advice, diagnosis, triage or a substitute for a pharmacist or doctor.',
  sections:[
   {title:'Open with the main problem and timeline',paragraphs:['Start with the main symptom, when it began and whether it is changing: “I have had a sore throat since yesterday, and it feels worse this morning.”','Use the present perfect with since or for when a condition started earlier and continues now. Use the past simple for a finished event: “I took one tablet at eight.”'],supportPt:'Comece pelo sintoma principal e pela duração. Use present perfect para algo que começou antes e continua agora.',sourceIds:['bc-grammar','bc-speaking']},
   {title:'Answer only what you know',paragraphs:['A pharmacist may ask about other symptoms, medicines or allergies. Say “I am not sure” when you do not know; do not invent a name or dose.','Keep observation separate from diagnosis: “I feel dizzy when I stand up” reports an experience; “I have low blood pressure” is a medical conclusion unless confirmed.'],supportPt:'Responda apenas com fatos que você conhece. Descreva a experiência sem criar um diagnóstico.',sourceIds:['bc-speaking']},
   {title:'Clarify instructions before leaving',paragraphs:['Ask one point at a time: “How often should I take it?” “Should I take it with food?” “What should I do if it gets worse?”','Repeat back the supplied instruction: “So, one tablet after food, twice a day. Is that right?” The purpose is language confirmation, not altering the instruction.'],supportPt:'Confirme frequência, condição e próximo passo. Repita a orientação recebida sem modificá-la.',sourceIds:['bc-listening','bc-speaking']},
   {title:'Know when the language task must stop',paragraphs:['If the professional advises urgent or further care, confirm where to go and what to bring. This lesson does not decide urgency.','Close with the exact next step and avoid promises about outcome: “Thank you. I will contact the clinic today as you advised.”'],supportPt:'Se houver orientação para buscar atendimento, confirme o próximo passo. A aula não decide urgência nem resultado.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'sore throat',meaning:'Pain or irritation in the throat.',pt:'dor de garganta',example:'I have had a sore throat since yesterday.'},
   {term:'since',meaning:'From a starting point until now.',pt:'desde',example:'It has felt worse since this morning.'},
   {term:'for',meaning:'During a period of time continuing to now.',pt:'há / por',example:'I have had the cough for two days.'},
   {term:'dose',meaning:'A stated amount of medicine taken at one time.',pt:'dose',example:'Could you repeat the dose, please?'},
   {term:'with food',meaning:'Taken while eating or soon after eating.',pt:'com alimento',example:'Should I take it with food?'},
   {term:'get worse',meaning:'Become more severe or difficult.',pt:'piorar',example:'What should I do if it gets worse?'},
  ],
  visual:[['Problem','Sore throat','Observed symptom'],['Timeline','Since yesterday','Continues now'],['Instruction','One tablet after food','Supplied information'],['Close','Contact clinic today','Confirmed next step']],
  scenario:['You have had a sore throat since yesterday and feel worse this morning.','You do not know the cause and have not confirmed whether another medicine is compatible.','The fictional pharmacist gives a frequency and advises contacting a clinic if a named condition occurs.'],
  task:'Explain the symptom and timeline, state uncertainty, ask three clarification questions and repeat back the supplied next step.',
  modelAnswer:'“I have had a sore throat since yesterday, and it feels worse this morning. I do not know what is causing it. How often should I take this? Should I take it with food? What should I do if it gets worse? So, one tablet after food, twice a day, and I should contact the clinic if the fever continues. Is that right?”',
  transfer:'Repeat the structure for a cough, keeping the symptoms fictional and the instructions supplied by the exercise.',
  correctLanguage:'I have had this cough for two days.',incorrectLanguage:'I am having this cough since two days.',sources:[speaking,grammar,listening],
 },
 {
  code:'VE12',title:'Transport in Dublin: ask directions and handle delays',
  goal:'Ask for a route, understand landmarks and changes, and compare two alternatives when a journey is delayed.',
  scope:'Original B1+ everyday-English practice with fictional routes. It does not provide live transport information, guarantee a connection or replace an official journey planner.',
  sections:[
   {title:'State the destination and constraint',paragraphs:['Open with destination and timing: “I need to get to Heuston Station by half past two. Which route would you recommend?”','Distinguish arrival from departure. “The bus leaves at two” does not mean it reaches the station at two.'],supportPt:'Informe destino e horário necessário. Diferencie horário de saída e horário de chegada.',sourceIds:['bc-speaking']},
   {title:'Turn directions into checkpoints',paragraphs:['Listen for action plus landmark: get off after the bridge, cross at the lights, walk past the library. Ask for one repeat if the chain is too long.','Use indirect questions naturally: “Could you tell me where I need to change?” After the opener, keep statement order: “where I need”, not “where do I need”.'],supportPt:'Transforme a rota em ações e pontos de referência. Em pergunta indireta, use ordem de frase afirmativa.',sourceIds:['bc-grammar','bc-listening']},
   {title:'Respond to a delay with bounded options',paragraphs:['Confirm the new fact first: “Is the service delayed by twenty minutes, or has it been cancelled?”','Compare alternatives by arrival time, number of changes and walking distance. A faster departure may still produce a later arrival.'],supportPt:'Confirme se é atraso ou cancelamento e compare alternativas pelo resultado real da viagem.',sourceIds:['bc-speaking','bc-listening']},
   {title:'Read back the route',paragraphs:['Summarise the first step, change point and final landmark: “So I take the 145, change at the centre and walk past the hotel.”','If the information is live or uncertain, label it: “That is the current estimate, correct?”'],supportPt:'Repita os principais passos e identifique quando o horário ainda é apenas estimado.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'get off',meaning:'Leave a bus, train or tram.',pt:'descer',example:'Get off at the stop after the bridge.'},
   {term:'change',meaning:'Move from one service to another.',pt:'fazer baldeação',example:'Where do I need to change?'},
   {term:'landmark',meaning:'A visible place used to recognise a location.',pt:'ponto de referência',example:'The library is the final landmark.'},
   {term:'delayed',meaning:'Expected later than planned.',pt:'atrasado',example:'The service is delayed by twenty minutes.'},
   {term:'cancelled',meaning:'Not operating as planned.',pt:'cancelado',example:'Has the train been cancelled?'},
   {term:'estimated arrival',meaning:'The currently predicted arrival time.',pt:'chegada estimada',example:'What is the estimated arrival time?'},
  ],
  visual:[['Need','Heuston by 14:30','Arrival constraint'],['Route A','One change; 14:20','Current estimate'],['Route B','Direct; 14:45','Too late for constraint'],['Read-back','145, centre, hotel','Route checkpoints']],
  scenario:['A fictional bus is twenty minutes late.','Route A has one change and an estimated arrival of 14:20; Route B is direct but arrives at 14:45.','You need to reach the station by 14:30 and do not know where Route A changes.'],
  task:'Clarify the delay, ask an indirect question about the change and choose an alternative using the arrival constraint.',
  modelAnswer:'“Excuse me, is the bus delayed by twenty minutes, or has it been cancelled? I need to reach Heuston by half past two. Could you tell me where I need to change for Route A? If its estimated arrival is 14:20, I will take that route even though it has one change. So I change in the centre and walk past the hotel, correct?”',
  transfer:'Adapt the conversation to a missed airport coach with one train alternative.',
  correctLanguage:'Could you tell me where I need to change?',incorrectLanguage:'Could you tell me where do I need to change?',sources:[speaking,grammar,listening],
 },
 {
  code:'VE13',title:'Neighbours and community: invitations, requests and boundaries',
  goal:'Start friendly contact, make or decline an invitation, raise a small shared issue and agree a practical boundary.',
  scope:'Original B1+ everyday-English practice. It does not mediate a real dispute, determine tenancy rights or contact a neighbour.',
  sections:[
   {title:'Make a low-pressure invitation',paragraphs:['Give activity, time and flexibility: “We are having coffee on Saturday morning. Would you like to join us?”','Add genuine room to decline: “No problem if you already have plans.” A friendly invitation should not require an excuse.'],supportPt:'Faça um convite específico e deixe espaço real para a pessoa recusar.',sourceIds:['bc-speaking']},
   {title:'Decline warmly and clearly',paragraphs:['A useful decline has thanks, a clear answer and an optional alternative: “Thanks for asking. I cannot make Saturday, but I would love to meet another week.”','Avoid “maybe” when you already know the answer is no. Clear language is kinder than creating false expectation.'],supportPt:'Agradeça, dê uma resposta clara e só ofereça alternativa se ela for verdadeira.',sourceIds:['bc-speaking']},
   {title:'Raise a shared issue without assigning motive',paragraphs:['Describe the observable event and effect: “The music was loud after midnight, and it woke us up.” Do not jump to “You do not respect anyone.”','Use a bounded request: “Could we keep it lower after eleven?” This is easier to discuss than a global demand.'],supportPt:'Descreva o fato observado e o impacto antes de fazer um pedido específico.',sourceIds:['bc-speaking']},
   {title:'Agree the boundary and future contact',paragraphs:['Check the agreement: “So, lower after eleven on weeknights, and you will text us before a party.”','If agreement is not reached, record only the next conversation or appropriate channel; do not claim the issue is resolved.'],supportPt:'Repita o limite combinado. Se não houver acordo, registre apenas o próximo passo.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'join us',meaning:'Take part in an activity with us.',pt:'juntar-se a nós',example:'Would you like to join us for coffee?'},
   {term:'make it',meaning:'Be able to attend.',pt:'conseguir comparecer',example:'I cannot make it on Saturday.'},
   {term:'another time',meaning:'On a different occasion.',pt:'outra hora / ocasião',example:'Could we meet another time?'},
   {term:'keep it down',meaning:'Make noise quieter.',pt:'fazer menos barulho',example:'Could you keep it down after eleven?'},
   {term:'weeknight',meaning:'A weekday evening.',pt:'noite durante a semana',example:'The boundary applies on weeknights.'},
   {term:'give you a heads-up',meaning:'Warn or inform in advance.',pt:'avisar com antecedência',example:'I will give you a heads-up before the party.'},
  ],
  visual:[['Invite','Coffee Saturday?','Easy to answer'],['Decline','Cannot make it','Clear answer'],['Issue','Music after midnight','Observable event'],['Boundary','Lower after eleven','Specific agreement']],
  scenario:['A fictional neighbour invites you for coffee on Saturday, but you are unavailable.','The same neighbour played loud music after midnight on a weeknight.','You want a friendly relationship and a practical noise agreement.'],
  task:'Decline the invitation warmly, raise the noise issue with observable facts and propose one clear boundary.',
  modelAnswer:'“Thanks for inviting us. We cannot make Saturday, but I would love to meet another week. Could I also mention something from last night? The music was loud after midnight and it woke us up. Could we keep it lower after eleven on weeknights? Thanks — so you will keep it lower and give us a heads-up before a party.”',
  transfer:'Use the same structure for a shared-bin or parking issue without inventing rules.',
  correctLanguage:'Could we keep it lower after eleven?',incorrectLanguage:'You are always disrespectful.',sources:[speaking,grammar],
 },
 {
  code:'VE14',title:'Customer service: utilities, internet and reference numbers',
  goal:'Explain a service problem, answer verification questions, request a workable next step and retain a clear reference for follow-up.',
  scope:'Original B1+ everyday-English practice with a fictional provider. It does not access an account, promise restoration, determine contractual rights or submit a complaint.',
  sections:[
   {title:'Lead with account and service facts',paragraphs:['State the service, broad location and when the problem began: “Our internet has been disconnecting since Monday evening.”','Share personal data only through the provider’s real secure process. This exercise uses fictional references and never asks for passwords.'],supportPt:'Explique qual serviço falhou e desde quando. Não compartilhe senha nem dados reais nesta atividade.',sourceIds:['bc-speaking']},
   {title:'Describe the troubleshooting already completed',paragraphs:['Use the present perfect for relevant recent actions: “I have restarted the router twice.” Then describe the current result.','Avoid claiming a cause: a flashing light is evidence; a damaged external cable is a hypothesis unless confirmed.'],supportPt:'Diga o que já foi tentado e o resultado atual, sem inventar a causa.',sourceIds:['bc-grammar']},
   {title:'Navigate questions and escalation',paragraphs:['If a question is unclear, ask what information they need: “Do you mean the account number or the device serial number?”','When escalation is needed, ask who owns the next step and the expected update window. “Escalated” alone is not a timetable.'],supportPt:'Esclareça qual dado foi solicitado e confirme responsável e prazo do próximo passo.',sourceIds:['bc-listening','bc-speaking']},
   {title:'Close with reference, action and status',paragraphs:['Read back the reference number slowly and confirm it in groups. Ask how the update will arrive.','Keep pending language visible: “The technician visit is requested for Thursday; it is not yet confirmed.”'],supportPt:'Anote a referência e diferencie solicitação de confirmação.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'disconnect',meaning:'Lose a network or service connection.',pt:'desconectar / cair',example:'The internet disconnects every few minutes.'},
   {term:'restart',meaning:'Turn a device or service off and on again.',pt:'reiniciar',example:'I have restarted the router twice.'},
   {term:'account holder',meaning:'The person named as responsible for an account.',pt:'titular da conta',example:'I am the account holder.'},
   {term:'reference number',meaning:'An identifier used to track a service case.',pt:'número de protocolo',example:'Could you repeat the reference number?'},
   {term:'escalate',meaning:'Pass an issue to a higher or specialist level.',pt:'escalar',example:'The agent will escalate the fault.'},
   {term:'pending',meaning:'Waiting for a decision or completion.',pt:'pendente',example:'The technician visit is still pending.'},
  ],
  visual:[['Problem','Disconnects since Monday','Known fact'],['Actions','Restarted twice','Completed checks'],['Reference','AB-482-71','Case identifier'],['Status','Visit requested','Not confirmed']],
  scenario:['A fictional home internet service has disconnected repeatedly since Monday.','You restarted the router twice and the problem continued.','The agent creates reference AB-482-71 and requests, but does not confirm, a Thursday visit.'],
  task:'Report the issue, describe completed checks, clarify one question and close with reference and pending status.',
  modelAnswer:'“Our internet has been disconnecting since Monday evening. I have restarted the router twice, but the problem continues. Do you mean the account number or the router serial number? Thank you. Could you repeat the reference slowly? I have AB-482-71. So the Thursday technician visit has been requested, but it is not confirmed yet. How will I receive the update?”',
  transfer:'Adapt the call to an electricity-billing query using only fictional account details.',
  correctLanguage:'I have restarted the router twice.',incorrectLanguage:'I restarted it twice, so the external line is definitely broken.',sources:[speaking,grammar,listening],
 },
 {
  code:'VE15',title:'Travel: airports, hotels and lost luggage',
  goal:'Give booking details, report a missing item, understand the recovery process and confirm what is known, estimated or still pending.',
  scope:'Original B1+ travel-English practice with fictional bookings. It does not make a booking, locate real luggage, promise compensation or provide immigration advice.',
  sections:[
   {title:'Present booking details in a clear order',paragraphs:['Give name, date and booking reference before describing the problem. Spell names and group letters and numbers when asked.','Use “I booked” for the finished reservation action and “I have not received” for a missing result relevant now.'],supportPt:'Apresente nome, data e referência antes do problema. Escolha o tempo verbal conforme a linha do tempo.',sourceIds:['bc-grammar','bc-speaking']},
   {title:'Describe the item without guessing',paragraphs:['For luggage, give colour, size, material and one distinctive feature. Avoid confidential contents unless the official process requires them.','“It did not arrive on the belt” is an observation. “It was sent to another country” is not confirmed until the carrier says so.'],supportPt:'Descreva características observáveis e não invente o destino ou a causa.',sourceIds:['bc-speaking']},
   {title:'Understand estimates and conditions',paragraphs:['Ask whether a time is confirmed or estimated: “Is delivery expected tonight, or is that only the current estimate?”','At a hotel, separate what is unavailable from the remedy offered: a room is not ready; luggage storage is available until check-in.'],supportPt:'Diferencie horário confirmado, previsão e alternativa oferecida.',sourceIds:['bc-listening']},
   {title:'Keep the recovery trail',paragraphs:['Record the report number, contact channel and next update time. Repeat the address only through the real secure process.','Close accurately: “The bag is registered as missing and the next update is due by six.” This does not say it has been found.'],supportPt:'Registre protocolo e próximo contato, sem transformar processo aberto em solução concluída.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'booking reference',meaning:'A code identifying a reservation.',pt:'código da reserva',example:'My booking reference is DK4L9.'},
   {term:'baggage claim',meaning:'The area or process for collecting checked luggage.',pt:'retirada de bagagem',example:'The bag did not arrive at baggage claim.'},
   {term:'distinctive feature',meaning:'A detail that makes an item easy to identify.',pt:'característica marcante',example:'A yellow strap is its distinctive feature.'},
   {term:'report number',meaning:'A code identifying a reported problem.',pt:'número do registro',example:'Please repeat the report number.'},
   {term:'estimated',meaning:'Calculated as likely, but not guaranteed.',pt:'estimado',example:'The estimated delivery time is tonight.'},
   {term:'store luggage',meaning:'Keep bags securely for a limited time.',pt:'guardar bagagem',example:'Can the hotel store my luggage before check-in?'},
  ],
  visual:[['Identity','Blue medium suitcase','Observed description'],['Distinctive mark','Yellow strap','Identification'],['Report','BG-5192','Tracking reference'],['Update','By 18:00','Next contact; not recovery']],
  scenario:['A fictional blue suitcase with a yellow strap did not arrive at baggage claim.','No one has confirmed where it is.','The airline opens report BG-5192 and promises an update, not delivery, by 18:00.'],
  task:'Report the bag, describe it, ask whether timing is estimated and read back the recovery process.',
  modelAnswer:'“My suitcase did not arrive at baggage claim. It is a medium blue case with a yellow strap. I do not know where it is. Could you confirm whether tonight is an estimated delivery time or only the next update? I have report number BG-5192, and the next update is due by six. The bag has not been found yet, correct?”',
  transfer:'Use the same known-versus-pending language when a hotel room is not ready.',
  correctLanguage:'The next update is due by six; the bag has not been found yet.',incorrectLanguage:'They will definitely deliver it tonight.',sources:[speaking,grammar,listening],
 },
 {
  code:'VE16',title:'Everyday admin: forms, deliveries and deadlines',
  goal:'Check what a form requires, correct a detail, arrange a delivery and follow up on a pending action without assuming approval.',
  scope:'Original B1+ everyday-English practice with fictional forms and deliveries. It does not submit data, determine eligibility, sign a contract or guarantee delivery.',
  sections:[
   {title:'Separate required, optional and not applicable',paragraphs:['Ask directly: “Is this field required, or can I leave it blank?” Optional and not applicable are different; the latter means the field does not fit your situation.','Do not guess an official answer. Ask which document or format the organisation accepts.'],supportPt:'Diferencie obrigatório, opcional e não aplicável. Não invente respostas em formulário oficial.',sourceIds:['bc-speaking']},
   {title:'Correct information transparently',paragraphs:['Use a short correction: “I entered the old address by mistake. The current address is…”','The passive is useful when the actor matters less than the correction: “The date needs to be updated.” Keep responsibility clear when it matters.'],supportPt:'Corrija o dado com clareza e indique exatamente qual informação substitui a anterior.',sourceIds:['bc-grammar']},
   {title:'Make a delivery instruction workable',paragraphs:['State a safe, authorised option and a backup: “If no one answers, please take it to the collection point.”','A delivery window is not an exact appointment. Ask whether tracking will update before arrival.'],supportPt:'Dê uma instrução principal e uma alternativa autorizada. Janela de entrega não é horário exato.',sourceIds:['bc-speaking','bc-listening']},
   {title:'Follow up using status language',paragraphs:['Use reference, submission date and missing outcome: “I submitted the form on Monday under reference F-208, but I have not received confirmation.”','Ask for current status and next action. Pending, approved and completed must not be used as synonyms.'],supportPt:'Use protocolo e data para acompanhar. Diferencie pendente, aprovado e concluído.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'required field',meaning:'Information that must be completed.',pt:'campo obrigatório',example:'Is the phone number a required field?'},
   {term:'optional',meaning:'Available but not compulsory.',pt:'opcional',example:'The second contact number is optional.'},
   {term:'not applicable',meaning:'Not relevant to the particular situation.',pt:'não aplicável',example:'This section is not applicable to me.'},
   {term:'by mistake',meaning:'Accidentally.',pt:'por engano',example:'I entered the old postcode by mistake.'},
   {term:'delivery window',meaning:'A range of possible delivery times.',pt:'janela de entrega',example:'The delivery window is 10:00 to 14:00.'},
   {term:'confirmation',meaning:'A message establishing that something was received or agreed.',pt:'confirmação',example:'I have not received confirmation yet.'},
  ],
  visual:[['Requirement','Photo ID','Required'],['Correction','Current postcode','Replaces old value'],['Delivery','10:00–14:00','Window, not exact time'],['Status','Submitted; pending','Not approved']],
  scenario:['A fictional online form shows an address that is no longer current.','Photo ID is required, while a second contact number is optional.','The form was submitted Monday under F-208, but no confirmation has arrived.'],
  task:'Clarify requirements, state the correction and request the current status using the reference.',
  modelAnswer:'“Could you confirm whether photo ID is required and whether the second contact number is optional? I entered my old address by mistake; the current postcode is D08 XXXX. I submitted the corrected form on Monday under reference F-208, but I have not received confirmation. Is it still pending, and is there anything else I need to do?”',
  transfer:'Adapt the language to a parcel delivery with a four-hour window and a collection-point backup.',
  correctLanguage:'I submitted it on Monday, but I have not received confirmation.',incorrectLanguage:'I submitted it, so it has been approved.',sources:[speaking,grammar,listening],
 },
 {
  code:'VP1',title:'Payroll interviews: explain your experience with evidence',
  goal:'Present Payroll and Departamento Pessoal experience in a concise interview answer, distinguishing personal responsibility, team contribution and transferable capability.',
  scope:'Original professional-English practice for a fictional role. It does not apply for a job, verify employment history, guarantee an outcome or turn unfamiliar Irish Payroll work into claimed experience.',
  sections:[
   {title:'Lead with a role-relevant headline',paragraphs:['Begin with years, core scope and service context: “I have around ten years of experience in payroll and personnel administration, including high-volume and shared-service environments.”','Choose details relevant to the question instead of listing every role. A concise headline gives the listener a map.'],supportPt:'Comece com tempo de experiência, escopo principal e contexto de trabalho.',sourceIds:['bc-speaking']},
   {title:'Separate ownership from contribution',paragraphs:['“I was responsible for monthly input validation” states ownership. “I supported the implementation” states contribution. Both are useful when accurate.','Use the past simple for a finished example and the present perfect for experience connected to now.'],supportPt:'Diferencie responsabilidade direta de contribuição e use o tempo verbal conforme a linha do tempo.',sourceIds:['bc-grammar']},
   {title:'Build one evidence sequence',paragraphs:['Use context, responsibility, action and observable result. If an exact metric is unavailable, describe the verified operational effect without inventing a number.','Protect confidential information by generalising employer, employee and volume details while keeping your own action clear.'],supportPt:'Mostre contexto, responsabilidade, ação e resultado observável sem expor dados confidenciais.',sourceIds:['bc-speaking']},
   {title:'Handle the Irish Payroll boundary honestly',paragraphs:['If you are still developing direct Irish experience, say so: “I have not yet run an Irish payroll, but I am studying the process and can transfer strong control and employee-service skills.”','Adjacent experience is evidence of learning capacity, not proof that two systems are identical.'],supportPt:'Reconheça com clareza o que ainda está aprendendo e explique a experiência transferível sem fingir equivalência.',sourceIds:['revenue-payroll','bc-speaking']},
  ],
  terms:[
   {term:'personnel administration',meaning:'Operational administration across the employee lifecycle.',pt:'Departamento Pessoal',example:'My background combines payroll and personnel administration.'},
   {term:'high-volume payroll',meaning:'Payroll serving a large number of employees or transactions.',pt:'folha de alto volume',example:'I worked in a high-volume payroll environment.'},
   {term:'I was responsible for',meaning:'Introduces work personally owned.',pt:'eu era responsável por',example:'I was responsible for validating monthly inputs.'},
   {term:'I contributed to',meaning:'Introduces work completed as part of a team.',pt:'eu contribuí para',example:'I contributed to the process review.'},
   {term:'transferable skill',meaning:'A capability useful in another system or context.',pt:'competência transferível',example:'Control discipline is a transferable skill.'},
   {term:'employee lifecycle',meaning:'Stages from joining through employment to leaving.',pt:'ciclo do colaborador',example:'I supported several employee-lifecycle processes.'},
  ],
  visual:[['Headline','10 years in Payroll/DP','Relevant scope'],['Ownership','Validated monthly inputs','Personal action'],['Outcome','Fewer repeated corrections','Observable, no invented metric'],['Boundary','Studying Irish process','No false experience']],
  scenario:['A fictional interviewer asks about relevant Payroll experience.','The candidate has extensive Brazilian Payroll/DP experience but has not yet run an Irish payroll.','No verified performance percentage is available.'],
  task:'Give a 60–90 second answer with a headline, one example, a result and an honest Irish Payroll boundary.',
  modelAnswer:'“I have around ten years of experience in payroll and personnel administration, including work in high-volume and shared-service environments. In one role, I was responsible for validating monthly inputs and coordinating corrections with HR before the cut-off. I introduced a clearer checklist and ownership follow-up, which reduced repeated corrections in the next cycles. I have not yet run an Irish payroll, but I am studying the local process and can transfer strong control, confidentiality and employee-service skills.”',
  transfer:'Answer a follow-up about a difficult employee query using the same evidence sequence.',
  correctLanguage:'I have worked in Payroll for around ten years.',incorrectLanguage:'I have run Irish payrolls when I have not.',sources:[speaking,grammar,revenue],
 },
 {
  code:'VP2',title:'Employee payroll queries: clarify, protect privacy and follow up',
  goal:'Respond to an employee payroll query with empathy, precise fact-finding, confidentiality and a realistic follow-up commitment.',
  scope:'Original professional-English practice with fictional payslip data. It does not access employee records, calculate a real deduction, give tax or employment-law advice, or disclose personal information.',
  sections:[
   {title:'Acknowledge the concern without confirming a cause',paragraphs:['Open with service language: “I understand why you want this checked.” Empathy does not require agreeing that an error occurred.','State the current limit: “I can see the amount you mentioned, but I need to compare the approved input and payroll record before I explain the cause.”'],supportPt:'Reconheça a preocupação sem confirmar um erro antes da análise.',sourceIds:['wrc-payslips','bc-speaking']},
   {title:'Clarify the exact line and period',paragraphs:['Ask for pay period, payslip line and expected versus shown value. Do not ask an employee to share a full payslip in an insecure channel.','Use indirect questions: “Could you confirm which deduction you mean?” and “Could you tell me when you first noticed it?”'],supportPt:'Confirme período e linha específica, protegendo os dados pessoais.',sourceIds:['bc-grammar','wrc-payslips']},
   {title:'Separate known facts from investigation',paragraphs:['Known: the payslip shows a supplied amount. Unknown: why it differs from expectation. Next check: approved input, payroll record and authorised source.','Avoid speculative explanations about tax, benefit or system error. Use “may” only when you label a hypothesis and say what evidence will confirm it.'],supportPt:'Separe fato conhecido, causa ainda não confirmada e evidência que será verificada.',sourceIds:['revenue-payroll','bc-speaking']},
   {title:'Commit to a channel and update time',paragraphs:['Promise the next update you control, not the final result you do not: “I will update you by 3 p.m., even if the review is still open.”','Close with privacy: confirm the approved contact channel and avoid repeating sensitive figures unnecessarily.'],supportPt:'Comprometa-se com o próximo contato, não com um resultado ainda desconhecido.',sourceIds:['wrc-payslips','bc-speaking']},
  ],
  terms:[
   {term:'pay period',meaning:'The span of time covered by a payment.',pt:'período da folha',example:'Which pay period does the query relate to?'},
   {term:'payslip line',meaning:'A specific item shown on a pay statement.',pt:'linha do holerite',example:'Which payslip line would you like me to check?'},
   {term:'deduction',meaning:'An amount subtracted from gross pay.',pt:'desconto',example:'The employee asked about one deduction.'},
   {term:'approved input',meaning:'Payroll information authorised through the agreed process.',pt:'input aprovado',example:'I will compare the payslip with the approved input.'},
   {term:'under review',meaning:'Being checked, with no final conclusion yet.',pt:'em análise',example:'The query remains under review.'},
   {term:'update you by',meaning:'Commit to provide news no later than a stated time.',pt:'atualizar você até',example:'I will update you by 3 p.m.'},
  ],
  visual:[['Concern','Unexpected deduction','Employee report'],['Known','Amount appears on supplied payslip','Verified in case'],['Unknown','Cause','Needs evidence'],['Commitment','Update by 15:00','Controlled next step']],
  scenario:['A fictional employee sees an unexpected deduction of 45 on a supplied payslip.','No cause has been confirmed and the full payslip must not be shared in chat.','Payroll can compare the approved input and record and provide an update by 15:00.'],
  task:'Open empathetically, ask two safe clarifying questions, separate facts from unknowns and commit to a specific update.',
  modelAnswer:'“I understand why you want this checked. Could you confirm which pay period and payslip line you mean, using the secure portal rather than sending the full payslip here? I can see the supplied 45 amount, but I cannot yet confirm why it appears. I will compare the approved input and payroll record and update you by 3 p.m., even if the review is still open.”',
  transfer:'Adapt the response to a missing overtime input without promising a correction before verification.',
  correctLanguage:'I can see the amount, but I cannot yet confirm the cause.',incorrectLanguage:'The system definitely made a tax error.',sources:[speaking,grammar,revenue,payslips],
 },
 {
  code:'VP3',title:'Employee movements: onboarding, benefits and payroll cut-off',
  goal:'Coordinate a starter or leaver across HR, Payroll and benefits using clear dates, document status, ownership and cut-off language.',
  scope:'Original professional-English practice with a fictional employee movement. It does not create or cease an employment, change benefits, access HR systems or give tax or employment-law advice.',
  sections:[
   {title:'Anchor the movement to effective dates',paragraphs:['Start date, first day worked and first pay date can be different. Name the date you mean instead of saying “next month”.','For a leaver, distinguish last working day, contractual end date and final pay timing. Use only the dates supplied by the scenario.'],supportPt:'Nomeie cada data com precisão; início, primeiro dia trabalhado e primeiro pagamento podem ser diferentes.',sourceIds:['revenue-movements']},
   {title:'Make document status visible',paragraphs:['Use received, validated, missing and pending consistently. A received form is not automatically complete or approved.','Present perfect highlights current status: “We have received the bank form, but we have not validated the account details yet.”'],supportPt:'Diferencie documento recebido, validado, faltante e pendente.',sourceIds:['bc-grammar']},
   {title:'Protect the cut-off without sounding abrupt',paragraphs:['Explain consequence and option: “The input needs approval by Tuesday’s cut-off to be included in this cycle; otherwise we will confirm the next available process.”','Do not invent an exception. Escalate the actual request to the person authorised to decide.'],supportPt:'Explique prazo, consequência e alternativa sem inventar uma exceção.',sourceIds:['revenue-payroll','bc-speaking']},
   {title:'Close with owner, action and evidence',paragraphs:['Use a compact tracker: item, status, owner, due date and evidence. This turns a vague handoff into an auditable conversation.','Read back only confirmed changes: “HR will validate the form today; Payroll will review the approved file tomorrow.”'],supportPt:'Finalize com item, status, responsável, prazo e evidência.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'effective date',meaning:'The date on which a change formally takes effect.',pt:'data de vigência',example:'What is the effective date of the transfer?'},
   {term:'starter',meaning:'An employee beginning employment.',pt:'admitido / novo colaborador',example:'The starter joins on 5 October.'},
   {term:'leaver',meaning:'An employee whose employment is ending.',pt:'desligado / colaborador saindo',example:'The leaver date must be confirmed.'},
   {term:'cut-off',meaning:'The deadline after which input may miss a cycle.',pt:'prazo de corte',example:'Approval is due before the payroll cut-off.'},
   {term:'validated',meaning:'Checked against the required rules or evidence.',pt:'validado',example:'The form has been received but not validated.'},
   {term:'owner',meaning:'The person or team responsible for the next action.',pt:'responsável',example:'HR is the owner of the validation step.'},
  ],
  visual:[['Start date','5 October','Confirmed'],['Bank form','Received','Not validated'],['Cut-off','Tuesday 12:00','Approval deadline'],['Next action','HR validates today','Named owner']],
  scenario:['A fictional starter begins on 5 October.','The bank form has been received but not validated; benefit selection is still missing.','Tuesday at 12:00 is the input cut-off, and only HR can approve the exception request.'],
  task:'Give a concise movement update with dates, status, cut-off consequence and clear owners.',
  modelAnswer:'“The starter’s effective date is 5 October. We have received the bank form, but HR has not validated it yet, and the benefit selection is still missing. The approved input needs to reach Payroll by Tuesday at noon to enter this cycle. HR owns the validation and the exception decision; Payroll will review the file once approval is available. I will update the tracker after both actions.”',
  transfer:'Adapt the update to a leaver with a confirmed last working day and a pending benefit closure.',
  correctLanguage:'We have received the form, but it has not been validated yet.',incorrectLanguage:'We received it, so the change is approved.',sources:[speaking,grammar,revenue,revenueMoves],
 },
 {
  code:'VP4',title:'Payroll status updates: controls, blockers and manager communication',
  goal:'Give a short manager update that distinguishes completed controls, open exceptions, business impact, ownership and the decision or support required.',
  scope:'Original professional-English practice using fictional operational status. It does not run payroll, approve a payment, certify a control, disclose employee data or provide tax or legal advice.',
  sections:[
   {title:'Lead with the operational headline',paragraphs:['Answer the manager’s first question immediately: “Validation is complete for the main file; two exceptions remain open.”','Do not say “Payroll is complete” when approval, submission or release is still pending. Name the stage that is complete.'],supportPt:'Comece pelo status principal e diga qual etapa está concluída.',sourceIds:['revenue-payroll','bc-speaking']},
   {title:'Report controls as action plus evidence',paragraphs:['“The totals were reconciled to the approved input and the reviewer signed the checklist” is stronger than “Controls are fine.”','A completed checklist shows the recorded review; it does not prove that no error can exist. Keep claims proportional to evidence.'],supportPt:'Descreva o controle executado e a evidência registrada, sem prometer ausência total de erro.',sourceIds:['bc-speaking']},
   {title:'Frame blockers with impact and owner',paragraphs:['Use a four-part sentence: blocker, current impact, owner and next checkpoint. “Two records lack approval, so they are excluded from the current file; HR owns approval by 14:00.”','Use calibrated language: may affect, is expected to affect and will affect show different evidence levels.'],supportPt:'Explique bloqueio, impacto, responsável e próximo ponto de controle.',sourceIds:['bc-grammar']},
   {title:'End with the decision or help required',paragraphs:['Ask for a bounded action: “Please confirm whether we should hold the file until 14:00 or proceed without the two records.”','Record the answer and repeat the agreed path. A status update should make the next decision easier, not hide uncertainty.'],supportPt:'Finalize com decisão solicitada e repita o caminho aprovado.',sourceIds:['bc-speaking']},
  ],
  terms:[
   {term:'status update',meaning:'A concise report of current progress and next actions.',pt:'atualização de status',example:'I will give a two-minute status update.'},
   {term:'reconciled',meaning:'Compared and explained against another record or total.',pt:'conciliado',example:'The totals were reconciled to the approved input.'},
   {term:'exception',meaning:'An item outside the expected process requiring review.',pt:'exceção / divergência',example:'Two exceptions remain open.'},
   {term:'blocker',meaning:'An issue preventing the next step.',pt:'impedimento',example:'Missing approval is the current blocker.'},
   {term:'proceed',meaning:'Continue with the planned action.',pt:'prosseguir',example:'Should we proceed without the two records?'},
   {term:'hold the file',meaning:'Pause processing until a condition is met.',pt:'segurar o arquivo',example:'The manager asked us to hold the file until 14:00.'},
  ],
  visual:[['Headline','Main file validated','Stage-specific status'],['Control','Totals reconciled; checklist signed','Recorded evidence'],['Blocker','Two approvals missing','Open items'],['Decision','Hold or proceed','Manager input required']],
  scenario:['A fictional payroll file has passed input reconciliation and review.','Two employee records still lack HR approval and are excluded from the current file.','A manager must decide whether to hold until 14:00 or proceed without those records.'],
  task:'Deliver a concise manager update with headline, evidence, blocker, impact, owner and decision request.',
  modelAnswer:'“The main file has completed validation. The totals were reconciled to the approved input, and the reviewer signed the checklist. Two employee records still lack HR approval, so they are excluded from the current file. HR owns the approvals and expects an update by 14:00. Please confirm whether we should hold the file until then or proceed without the two records. I will record the decision in the tracker.”',
  transfer:'Adapt the update to a benefits interface with one rejected record and no confirmed business impact.',
  correctLanguage:'Two exceptions remain open, so the current file excludes them.',incorrectLanguage:'Payroll is complete even though release is pending.',sources:[speaking,grammar,revenue],
 },
];

function buildModule(definition:Definition):LessonModule{
 const id=VIVIANE_ENGLISH_IDENTITIES[definition.code].id;
 const prefix=definition.code.toLowerCase();
 const sections=definition.sections.map((section,index)=>({id:`${prefix}-s${index+1}`,title:`${index+1}. ${section.title}`,paragraphs:section.paragraphs,supportPt:section.supportPt,sourceIds:section.sourceIds}));
 return {
  track:'english',lessonId:id,title:definition.title,goal:definition.goal,scope:definition.scope,sections,
  terms:definition.terms,
  visual:{title:`${definition.title} · evidence map`,note:'Keep confirmed information, interpretation and next action distinct.',headers:['Stage','Useful language','Boundary'],rows:definition.visual,question:'Which row contains the next action rather than a completed outcome?',answer:`Use the final row: ${definition.visual[3][1]}. Its boundary is ${definition.visual[3][2].toLowerCase()}.`},
  caseStudy:{title:`Practice case · ${definition.title}`,scenario:definition.scenario,task:definition.task,hints:['Use only facts supplied in the scenario.','Finish with a specific clarification, owner or next step.'],modelAnswer:definition.modelAnswer,reviewChecks:['The purpose is clear in the opening.','Known facts remain separate from assumptions.','The target grammar and six lesson terms can be used accurately.','The close names a realistic next step without inventing an outcome.'],transfer:definition.transfer},
  checkpoint:[
   {id:`${prefix}-q1`,prompt:'Which response best respects the lesson boundary?',options:[definition.incorrectLanguage,definition.correctLanguage,'I can guarantee the final outcome.','No clarification is necessary.'],correctIndex:1,explanation:'The selected wording states what is supported without inventing a cause, result or authority.',reviewSection:sections[0].id},
   {id:`${prefix}-q2`,prompt:'What should come before an unsupported conclusion?',options:['A faster guess.','A clear fact and the evidence still needed.','A promise of success.','A confidential detail.'],correctIndex:1,explanation:'The lesson separates what is known from what still needs confirmation.',reviewSection:sections[1].id},
   {id:`${prefix}-q3`,prompt:'Which close is most useful?',options:['Everything is solved.','I will say something later.','Here is the next action, owner and update point.','The listener can guess the plan.'],correctIndex:2,explanation:'A bounded close makes responsibility and timing visible.',reviewSection:sections[3].id},
   {id:`${prefix}-q4`,prompt:'Why is the Portuguese support included?',options:['To replace English production.','To clarify meaning before returning to English practice.','To certify a level.','To provide a legal conclusion.'],correctIndex:1,explanation:'Portuguese support scaffolds comprehension; the learner still practises and produces the target English.',reviewSection:sections[2].id},
   {id:`${prefix}-q5`,prompt:'What does completion of this written lesson prove?',options:['Measured pronunciation mastery.','A professional licence.','Only completion of this self-study attempt and its local checkpoint.','A guaranteed real-world outcome.'],correctIndex:2,explanation:'Written practice does not establish live listening, pronunciation, legal entitlement or workplace performance.',reviewSection:sections[3].id},
  ],
  practiceExercises:[
   {id:`${prefix}-p1`,question:`Repair this wording so it stays evidence-safe: “${definition.incorrectLanguage}”`,hints:['Separate the known fact from the conclusion.','Use the lesson boundary.'],answer:definition.correctLanguage,explanation:'The revised version is precise about evidence and uncertainty.'},
   {id:`${prefix}-p2`,question:'Write a three-line response: purpose, confirmed fact and clarification question.',hints:['Lead with the practical purpose.','Ask only one clear question.'],answer:`One possible response is modelled in the case: ${definition.modelAnswer}`,explanation:'A short structure helps the listener identify the request and respond.'},
   {id:`${prefix}-p3`,question:'Give a spoken read-back with the next action, owner and timing.',hints:['Do not add a result that was not supplied.','Use a confirmation question at the end.'],answer:'So the current status is confirmed, the named owner takes the next action, and the update is due at the stated time. Is that correct?',explanation:'The read-back checks shared understanding without changing the facts.'},
  ],
  sources:definition.sources,
 };
}

const sharedSources:Readonly<Record<Exclude<VivianeEnglishCode,NewCode>,LessonModule>>={
 VE1:ENGLISH_E1_MODEL_MODULE,VE2:ENGLISH_E2_MODEL_MODULE,VE3:ENGLISH_E3_MODEL_MODULE,VE4:ENGLISH_E4_MODEL_MODULE,
 VE5:ENGLISH_E5_MODEL_MODULE,VE6:ENGLISH_E6_MODEL_MODULE,VE7:ENGLISH_E7_MODEL_MODULE,VE8:ENGLISH_E8_MODEL_MODULE,
 VE9:ENGLISH_E9_MODEL_MODULE,VE10:ENGLISH_E10_MODEL_MODULE,
};
const titleByCode=new Map(LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>[localVivianeEnglishCodeFor('english',lesson)!,lesson.title]));
const sharedModules=Object.fromEntries(Object.entries(sharedSources).map(([code,module])=>[code,{...module,lessonId:VIVIANE_ENGLISH_IDENTITIES[code as VivianeEnglishCode].id,title:titleByCode.get(code as VivianeEnglishCode)??module.title}])) as Readonly<Record<Exclude<VivianeEnglishCode,NewCode>,LessonModule>>;
const newModules=Object.fromEntries(definitions.map(definition=>[definition.code,buildModule(definition)])) as Readonly<Record<NewCode,LessonModule>>;

export const VIVIANE_ENGLISH_MODULES:readonly LessonModule[]=LOCAL_VIVIANE_ENGLISH_LESSONS.map(lesson=>{
 const code=localVivianeEnglishCodeFor('english',lesson)!;
 return code in newModules?newModules[code as NewCode]:sharedModules[code as Exclude<VivianeEnglishCode,NewCode>];
});

export function localVivianeEnglishLessonFor(track:P1Track,lesson:{id:string;slug:string}):LessonModule|null{
 const code=localVivianeEnglishCodeFor(track,lesson);
 if(!code)return null;
 return code in newModules?newModules[code as NewCode]:sharedModules[code as Exclude<VivianeEnglishCode,NewCode>];
}

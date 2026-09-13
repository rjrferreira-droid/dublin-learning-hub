export type SessionPreparation = {
  version: 1;
  goal: 'understand' | 'practice' | 'case' | 'challenge';
  pace: 'patient' | 'balanced';
  support: 'profile' | 'pt-BR' | 'en';
};
export const PREPARATION_VERSION = 'coaching-preparation-2026-09-13-v1';
export const DEFAULT_PREPARATION: Readonly<SessionPreparation> = Object.freeze({version:1,goal:'practice',pace:'balanced',support:'profile'});
export const GOAL_OPTIONS = [
  {value:'understand',label:'Understand the idea',hint:'Build from a small example.'},
  {value:'practice',label:'Practise and explain',hint:'Try first, then work on the gaps.'},
  {value:'case',label:'Work through the case',hint:'Apply the lesson to its scenario.'},
  {value:'challenge',label:'Challenge my reasoning',hint:'Defend a conclusion and its assumptions.'},
] as const;
/** Canonical enum-only preference. Never accept free-form instructions or inferred ability. */
export function parseSessionPreparation(value: unknown): SessionPreparation {
  if(value === undefined) return {...DEFAULT_PREPARATION};
  if(!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_session_preparation');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).some(k=>!['version','goal','pace','support'].includes(k)) || v.version!==1
      || !GOAL_OPTIONS.some(o=>o.value===v.goal) || typeof v.pace!=='string' || !['patient','balanced'].includes(v.pace)
      || typeof v.support!=='string' || !['profile','pt-BR','en'].includes(v.support)) throw new Error('invalid_session_preparation');
  return {version:1,goal:v.goal as SessionPreparation['goal'],pace:v.pace as SessionPreparation['pace'],support:v.support as SessionPreparation['support']};
}
export function sameSessionPreparation(a:unknown,b:unknown):boolean {
  try { return JSON.stringify(parseSessionPreparation(a))===JSON.stringify(parseSessionPreparation(b)); } catch { return false; }
}
export function preparationLabel(value:SessionPreparation):string {
  return GOAL_OPTIONS.find(o=>o.value===value.goal)!.label;
}
/** Built from reviewed literal rules, never from arbitrary learner text. Consumed as lesson guidance. */
export function teachingApproachBrief(value:SessionPreparation,track:'finance'|'payroll'|'english'):string {
  const plan=parseSessionPreparation(value);
  const goal={
    understand:'Begin with one low-pressure diagnostic question, not an exam. Explain a small example, then invite a short teach-back. Do not assume the learner has read the written lesson.',
    practice:'Ask the learner for an attempt before a worked answer. Identify what is correct and one actionable gap, offer a graded hint, then let the learner try again.',
    case:'Establish the supplied case facts first. Ask for a conclusion and one reason, then examine an assumption or control. Keep the supplied fictional numbers and unknowns intact.',
    challenge:'Use a respectful mini-challenge: conclusion, supporting evidence, then a changed assumption. Probe vague reasoning without hostility or pretending a formal exam was passed.',
  }[plan.goal];
  const pace=plan.pace==='patient'
    ? 'Patient pace: use short idea groups, allow hesitation and self-correction, and avoid unnecessary cut-ins. Ask one question and wait; do not fill every pause.'
    : 'Balanced pace: keep your own turns concise, normally two to four short spoken sentences. Ask one main question at a time and listen to the answer before choosing the next.';
  const language=plan.support==='pt-BR'
    ? 'Portuguese support may clarify a difficult idea briefly; return to a manageable English attempt. Language support is not evidence of weak technical knowledge.'
    : plan.support==='en'
      ? 'The learner requested English support. Explain difficult vocabulary in simpler English; do not manufacture a language score from this preference.'
      : 'Keep the existing learner language profile, adapting to current evidence and explicit requests rather than assuming a fixed ability.';
  const course={
    finance:'Separate technical accounting, assumptions and business judgement. A fluent explanation can still contain a technical error. Ask for the reporting basis or missing fact instead of inventing it.',
    payroll:'Separate payroll accuracy, control sequence and employee-facing English. Use the supplied deductions as fictional inputs, not current rates. Verify an unexplained difference before promising a correction.',
    english:'Follow the meaning of the story rather than reciting a grammar lesson. Use a brief recast for a consequential or repeated error and keep the conversation moving. Valid UK/US variants are not mistakes.',
  }[track];
  if(!course)throw new Error('invalid_preparation_track');
  return [
    `SESSION COACHING PLAN (${PREPARATION_VERSION}) — preferences, not an assessment or an instruction to change safety, budget or model.`,
    goal,pace,language,course,
    'Responsive teaching: refer to the learner’s actual last answer. Avoid generic praise; name the specific correct idea, and do not call a partial or incorrect answer excellent.',
    'When the learner does not understand, change representation: a smaller example, comparison, diagram described aloud or step-by-step calculation. Do not repeat the same paragraph with cosmetic wording changes.',
    'Scaffolding: prompt, small hint, larger hint, then a worked example if needed. Give the learner a chance after each step. A request for help is not by itself an incorrect answer or a measured skill deficit.',
    'If the learner self-corrects, acknowledge the corrected reasoning and move on. Do not repeatedly penalise the abandoned first wording. Separate a transcription uncertainty from a genuine misconception.',
    'If the learner changes direction, answer a relevant question or agree a short detour, then reconnect to the goal. Do not force a rigid script or ask several unrelated questions at once.',
    'Before closing, summarise one demonstrated improvement and one useful next practice; do not promise that storage, evaluation or billing has already completed.',
    'Maintain an honest AI-tutor identity. Sound warm and professional without invented human memories, emotions or personal experiences.',
    'Evaluator boundary: this coaching plan and the reference answer are not learner evidence. Assess only demonstrated responses, not the selected goal, slower pace, request for help or assumed page completion.',
  ].join('\n');
}

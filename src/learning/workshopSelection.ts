import {WORKSHOP_CASES,WORKSHOP_VERSION,workedValue,type WorkshopCase,type WorkshopTrack} from './appliedPractice.ts';
export type WorkshopSelection={version:1;id:string};
const cases=Object.values(WORKSHOP_CASES).flat();
/** Allowlisted identifier only; never accepts case text, answers, scores or instructions. */
export function parseWorkshopSelection(value:unknown):WorkshopSelection|null{
 if(value===undefined||value===null)return null;
 if(typeof value!=='object'||Array.isArray(value))throw new Error('invalid_workshop_selection');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).length!==2||!Object.hasOwn(v,'version')||!Object.hasOwn(v,'id')||v.version!==1||typeof v.id!=='string'||!cases.some(c=>c.id===v.id))throw new Error('invalid_workshop_selection');
 return {version:1,id:v.id};
}
export function selectedWorkshop(track:WorkshopTrack,value:unknown):WorkshopCase|null{
 const selection=parseWorkshopSelection(value);if(!selection)return null;
 const found=WORKSHOP_CASES[track]?.find(c=>c.id===selection.id);
 if(!found)throw new Error('workshop_track_mismatch');
 return found;
}
export function sameWorkshopSelection(expected:unknown,actual:unknown):boolean{
 try{return JSON.stringify(parseWorkshopSelection(expected))===JSON.stringify(parseWorkshopSelection(actual));}catch{return false;}
}
/** Use only server-imported cases; this is not a free-form prompt template endpoint. */
export function workshopReference(c:WorkshopCase):string{
 return [
  `AUTHORED CASE REFERENCE — SELECTED WORKSHOP ${c.id} (${WORKSHOP_VERSION}).`,
  c.title,c.scope,...c.facts,
  'These facts define the selected exercise. Other numerical examples in the lesson are background only; do not mix their amounts with this scenario.',
  'The learner explicitly selected this reference, not submitted an answer. No attempt, answer, hint usage, local result or draft is supplied.',
  'Prompt one task at a time. Let the learner attempt it before using the answer key; assess only their actual response, never this authored reference.',
  ...c.fields.map(f=>`Task: ${f.label}\nAuthor key: ${workedValue(f)}\nReasoning: ${f.explanation}`),
  `Progressive hints (offer only when useful): ${c.hints.join(' | ')}`,
  `Open reasoning task: ${c.reasoningPrompt}`,
  `Authored worked explanation, NOT learner evidence: ${c.workedReasoning}`,
  `Transfer: ${c.transfer}`,
 ].join('\n');
}

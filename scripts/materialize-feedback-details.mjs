import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
function edit(path,before,after){const s=fs.readFileSync(path,'utf8');if(s.includes(after))return;if(s.split(before).length!==2)throw new Error('feedback_anchor_not_unique:'+path);fs.writeFileSync(path,s.replace(before,after));}
const model='src/professor/sessionOutcome.ts';
edit(model,"export type OutcomeKind=",`export type StoredCorrection={label:string;pattern:string;example:string;correction:string};
export type StoredFeedbackDetails={assessmentConfidence:number|null;corrections:StoredCorrection[]};
export function storedFeedbackDetails(value:unknown):StoredFeedbackDetails{
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const c=input.assessmentConfidence;
 const assessmentConfidence=typeof c==='number'&&Number.isFinite(c)&&c>=0&&c<=100?Math.round(c*10)/10:null;
 const labels:Record<string,string>={technical:'Technical reasoning',grammar:'Grammar',vocabulary:'Vocabulary',register:'Communication style'};
 const clean=(v:unknown,n:number)=>typeof v==='string'?v.trim().slice(0,n):'';
 const corrections:StoredCorrection[]=[];
 for(const value of Array.isArray(input.errors)?input.errors.slice(0,24):[]){
  if(!value||typeof value!=='object'||Array.isArray(value))continue;
  const row=value as Record<string,unknown>,domain=typeof row.domain==='string'?row.domain:'';
  if(!Object.prototype.hasOwnProperty.call(labels,domain))continue;
  const pattern=clean(row.pattern,300),example=clean(row.example,900),correction=clean(row.correction,900);
  if(!pattern||!example||!correction)continue;
  corrections.push({label:labels[domain],pattern,example,correction});if(corrections.length===6)break;
 }
 return {assessmentConfidence,corrections};
}
export type OutcomeKind=`);
edit(model,'nextFocus:string[]};','nextFocus:string[];details:StoredFeedbackDetails};');
edit(model,"summary:'',strengths:[],nextFocus:[]};","summary:'',strengths:[],nextFocus:[],details:storedFeedbackDetails(null)};");
edit(model,'completedAt:row.completed_at,summary,strengths,nextFocus};','completedAt:row.completed_at,summary,strengths,nextFocus,details:storedFeedbackDetails(feedback)};');
const ui='src/components/SessionOutcomePanel.tsx';
edit(ui,"import {useEffect,useState} from 'react';","import {useEffect,useState} from 'react';\nimport {FeedbackEvidencePanel} from './FeedbackEvidencePanel';");
edit(ui,'  <p className="outcome-scope">','  {outcome.kind===\'ready\'&&<FeedbackEvidencePanel details={outcome.details}/>}\n  <p className="outcome-scope">');
console.log('Stored feedback details are bounded plain text. No extra network read, transcript export, confidence-to-mastery conversion or historical rewrite.');

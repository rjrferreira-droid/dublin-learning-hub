import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
const path='professor-agent/src/evaluation.ts';let s=fs.readFileSync(path,'utf8');
if(!s.includes("from './evaluationEvidence.js'")){
 s="import {guardEvaluation,renderEvidenceTranscript,scoreEvidenceSchema,EVIDENCE_RUBRIC} from './evaluationEvidence.js';\n"+s;
 const start=s.indexOf('const DOMAINS = '),end=s.indexOf('function extractOutputText(',start);
 if(start<0||end<start)throw new Error('parser_boundary_missing');
 s=s.slice(0,start)+`function parseEvaluation(raw:unknown,model:string,estimatedCostUsd:number,turns:TranscriptTurn[]):ProfessorEvaluation|null {
 const result=guardEvaluation(raw,turns);
 return result?{...result,model,estimatedCostUsd}:null;
}
function compactTranscript(turns:TranscriptTurn[]):string { return renderEvidenceTranscript(turns); }

`+s.slice(end);
 function replace(before,after){if(s.split(before).length!==2)throw new Error('evaluator_anchor_not_unique:'+before.slice(0,50));s=s.replace(before,after);}
 replace('    technicalScore: nullableScoreSchema,','    scoreEvidence: scoreEvidenceSchema,\n    technicalScore: nullableScoreSchema,');
 replace("          domain: { type: 'string', enum:","          evidenceTurn: { type: 'integer', minimum:1, maximum:120 },\n          domain: { type: 'string', enum:");
 replace("required: ['domain', 'pattern', 'normalizedPattern', 'confidence', 'example', 'correction']","required: ['evidenceTurn', 'domain', 'pattern', 'normalizedPattern', 'confidence', 'example', 'correction']");
 replace("  required: [\n    'technicalScore',", "  required: [\n    'scoreEvidence',\n    'technicalScore',");
 replace("  const rubric = `", "  const rubric = EVIDENCE_RUBRIC + '\\n\\n' + `");
 replace('A technical uncertainty explicitly admitted by the learner may be recorded as technical.','An admitted uncertainty or request for help alone is not a demonstrated technical mistake; identify a substantive incorrect claim before recording an error.');
 replace('englishScore should reflect the learner\'s overall spoken-English evidence, not subject-matter knowledge.','englishScore should reflect demonstrated written-transcript language evidence, not unobserved acoustic fluency or subject-matter knowledge.');
 replace("console.error('Professor evaluation request failed', response.status, await response.text().catch(() => ''));","console.error('Professor evaluation request failed', response.status); // Never log provider bodies/transcripts.");
 replace('return parseEvaluation(parsed, model, Math.round(estimatedCostUsd * 1_000_000) / 1_000_000);','return parseEvaluation(parsed, model, Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,turns);');
 replace("console.error('Professor evaluation failed', cause instanceof Error ? cause.message : 'unknown_error');","console.error('Professor evaluation failed', cause instanceof Error && cause.name==='AbortError' ? 'timeout' : 'request_or_output_failure');");
 fs.writeFileSync(path,s);
}
const tests='tests/written-bridge.integration.mjs';let t=fs.readFileSync(tests,'utf8');
const old="assert.ok(text.endsWith('LEARNER: Fictional learner response, not the case answer.'));";
const replacement="assert.ok(text.endsWith('#1 LEARNER: \\\"Fictional learner response, not the case answer.\\\"'));";
if(t.includes(old)){t=t.replace(old,replacement);fs.writeFileSync(tests,t);}
console.log('Candidate evaluator now verifies indexed learner quotes. No worker deployment, model call, new schema migration or pricing change.');

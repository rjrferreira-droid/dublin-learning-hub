// Narrow, fail-on-drift staging patch. Runs only before tests on the repair branch.
import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='fix/core-consolidation-2026-09-13')throw new Error('wrong_branch');
const path='api/livekit-token.ts';let s=fs.readFileSync(path,'utf8');
if(!s.includes("from '../server/voice-validation.js'")){
 s="import { voiceValidationPlan } from '../server/voice-validation.js';\n"+s;
 const anchor='  const { budget,persistence,roomName } = startup;';
 if(s.split(anchor).length!==2)throw new Error('startup_anchor_drift');
 s=s.replace(anchor,anchor+'\n  const voicePlan = voiceValidationPlan(startup);');
 const start=s.indexOf('  const jobMetadata = JSON.stringify({');
 if(start<0)throw new Error('metadata_anchor_missing');
 let tail=s.slice(start);
 if((tail.match(/\bvalidationMode,/g)||[]).length!==2)throw new Error('validation_echo_anchors_drift');
 tail=tail.replaceAll('    validationMode,','    validationMode: voicePlan.validationMode,');
 if((tail.match(/maxSessionSeconds: budget\.maxSessionSeconds/g)||[]).length!==2)throw new Error('session_limit_anchors_drift');
 tail=tail.replaceAll('maxSessionSeconds: budget.maxSessionSeconds','maxSessionSeconds: voicePlan.maxSessionSeconds');
 s=s.slice(0,start)+tail;fs.writeFileSync(path,s);
}
console.log('API uses persisted validation state and a bounded validation-only session limit. No deployment or paid call.');

// One-time, allowlisted repair-branch materialization. Never run against v2/main.
import fs from 'node:fs';
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== 'fix/core-consolidation-2026-09-13') throw new Error('wrong_branch');
function edit(file,before,after){let s=fs.readFileSync(file,'utf8');if(s.includes(after))return;if(s.split(before).length!==2)throw new Error(`non_unique_anchor: ${file}`);fs.writeFileSync(file,s.replace(before,after));}
for (const name of ['ai-tutor-evaluate','webrtc-signal']) {
 const path=`supabase/functions/${name}/index.ts`;
 edit(path,'import "jsr:@supabase/functions-js/edge-runtime.d.ts";',`import { legacySessionBlockReason } from '../_shared/legacy-session-boundary.ts';\nimport "jsr:@supabase/functions-js/edge-runtime.d.ts";`);
 const missing=name==='ai-tutor-evaluate'?'session_not_found':'tutor_session_not_found';
 const anchor=`  if (!tutorSession) return json({ error: "${missing}" }, 404);`;
 edit(path,anchor,`${anchor}\n  const blocked = legacySessionBlockReason(tutorSession);\n  if (blocked) return json({ error: blocked }, 409);`);
 if(name==='webrtc-signal')edit(path,'.select("id,user_id,lesson_id,status")','.select("id,user_id,lesson_id,status,room_name,budget_reservation_id,callback_token_hash,startup_request_id")');
}
const memory='supabase/functions/professor-memory-context/index.ts';
edit(memory,'.select("id,user_id,lesson_id,callback_token_hash")','.select("id,user_id,lesson_id,callback_token_hash,status,started_at")');
const auth='  if (await sha256Hex(callbackToken) !== current.callback_token_hash) return json({ error: "invalid_callback_credentials" }, 401);';
edit(memory,auth,`${auth}\n  const started = Date.parse(current.started_at);\n  if (current.status !== 'active' || !Number.isFinite(started) || started > Date.now()+60_000 || Date.now()-started > 60*60*1000) return json({error:'memory_session_expired'},401);`);
edit(memory,'.select("domain,pattern,frequency,confidence,next_review_at")','.select("domain,pattern,frequency,confidence,diagnostic_confidence,mastery_confidence,next_review_at")');
edit(memory,'  const priorSessions = (sessions.data ?? []).map','  if ([sessions,errors,competencies,reviews].some(result => result.error)) return json({error:"memory_temporarily_unavailable"},503);\n\n  const priorSessions = (sessions.data ?? []).map');
edit(memory,'    confidence: Number(row.confidence) || 0,\n    nextReviewAt:',`    confidence: Number(row.diagnostic_confidence ?? row.confidence) || 0,\n    diagnosticConfidence: row.diagnostic_confidence == null ? null : Number(row.diagnostic_confidence),\n    masteryConfidence: row.mastery_confidence == null ? null : Number(row.mastery_confidence),\n    confidenceSemantics: 'diagnostic',\n    nextReviewAt:`);
edit(memory,'      status: clean(row.status, 20),',`      status: row.due_date && row.due_date <= new Date().toISOString().slice(0,10) ? 'due' : clean(row.status, 20),`);
const agent='professor-agent/src/index.ts';
edit(agent,"import { fileURLToPath } from 'node:url';","import { deliverProfessorFinalization, SHUTDOWN_GRACE_MS } from './callbackDelivery.js';\nimport { fileURLToPath } from 'node:url';");
let a=fs.readFileSync(agent,'utf8');
if(a.includes('async function postProfessorCallback(')){
 const begin=a.indexOf('async function postProfessorCallback('), end=a.indexOf('async function persistSessionCompletion(',begin);
 if(begin<0||end<begin)throw new Error('callback_helper_anchor_missing');
 a=a.slice(0,begin)+a.slice(end);fs.writeFileSync(agent,a);
}
a=fs.readFileSync(agent,'utf8');
if(a.includes('  await postProfessorCallback(')){
 const start=a.indexOf('  await postProfessorCallback('),end=a.indexOf('\n}\n\nexport default defineAgent',start);
 if(start<0||end<start)throw new Error('callback_call_anchor_missing');
 a=a.slice(0,start)+`  const delivery = await deliverProfessorFinalization({
    completionUrl: persistence.completionUrl,
    publishableKey: persistence.publishableKey,
    completion: callbackBody,
    settlement: {sessionId:persistence.sessionId,callbackToken:persistence.callbackToken,modelUsage,realtimeModel,evaluation},
  });
  if (delivery.completion.state !== 'delivered' || delivery.settlement.state !== 'delivered') {
    console.error('Professor finalization requires recovery', delivery);
  }
`+a.slice(end);fs.writeFileSync(agent,a);
}
edit(agent,'    agentName: PROFESSOR_AGENT_NAME,\n  }),','    agentName: PROFESSOR_AGENT_NAME,\n    shutdownProcessTimeout: SHUTDOWN_GRACE_MS,\n  }),');
edit(agent,'${Math.round(item.confidence ?? 0)}% confidence','${Math.round(item.confidence ?? 0)}% diagnostic confidence; not a mastery score');
console.log('Prepared bounded callback delivery, legacy-route isolation and memory read safeguards. No model or persona changes.');

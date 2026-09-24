/** Real HTTP wiring with fictional local accounts; all providers/network blocked. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {prepareBoundProfessorAdmission,ProfessorAdmissionUnconfirmed} from '../candidates/prepare-bound-professor-admission.ts';
import {assertProfessorAdmissionAcknowledgement} from '../candidates/professor-admission-contract.ts';
const status=JSON.parse(readFileSync(process.argv[2],'utf8'));
const fixture=JSON.parse(readFileSync(join(dirname(process.argv[2]),'local-browser-fixture.json'),'utf8'));
const api=new URL(status.API_URL),originalFetch=globalThis.fetch;
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
const local=u=>assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='54321'&&u.protocol==='http:','loopback only');local(api);
globalThis.fetch=(input,init)=>{local(new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url));return originalFetch(input,{...init,redirect:'error'});};
const make=key=>createClient(api.href,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const admin=make(status.SERVICE_ROLE_KEY),clients={};
const ok=r=>{if(r.error)throw Error(r.error.code+': '+r.error.message);return r.data;};
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
for(const name of ['finance','payroll']){clients[name]=make(status.ANON_KEY);ok(await clients[name].auth.signInWithPassword(fixture.accounts[name]));}
assert.equal(ok(await admin.from('learning_hub_budget_settings').select('ai_hard_cap_usd').eq('id',1).single()).ai_hard_cap_usd,0);
assert.deepEqual(ok(await admin.from('ai_tutor_sessions').select('id')),[]);
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
let denied=0;
for(const account of ['finance','payroll'])for(const track of [account,'english'])for(const sequence of [2,3,4,5,6,7,8]){
 const lesson=sequence===2?fixture.p1Lessons[track]:fixture.lessons[track][sequence];
 const prepared=await prepareBoundProfessorAdmission(clients[account],admin,{kind:sequence===2?'p1':'written',lessonId:lesson.id,requestedTrack:tracks[track],requestId:randomUUID(),mode:'chapter_conversation',draft:'PRIVATE_LOCAL_SENTINEL'},env);
 assert.equal(prepared.receipt.reference.identity.lessonId,lesson.id);
 assert.doesNotMatch(JSON.stringify(prepared.receipt),/PRIVATE_LOCAL_SENTINEL/);
 assert.deepEqual(await prepared.start(),{status:'denied',reason:'professor_monthly_budget_reached'});denied++;
}
assert.deepEqual(ok(await admin.from('professor_budget_reservations').select('id')),[]);
try{
 // Fictional loopback budget only; the Python caller removes never-dispatched
 // validation rows afterward, then verifies all holds/usage are absent.
 ok(await admin.from('professor_budget_settings').update({monthly_budget_usd:1}).eq('feature','professor_livekit'));
 ok(await admin.from('learning_hub_budget_settings').update({ai_hard_cap_usd:1,professor_cap_usd:1}).eq('id',1));
 const requestId=randomUUID();
 const prepared=await prepareBoundProfessorAdmission(clients.finance,admin,{kind:'p1',lessonId:fixture.p1Lessons.finance.id,requestedTrack:tracks.finance,requestId,mode:'chapter_conversation'},env);
 const expected=structuredClone(prepared.receipt),result=await prepared.start();assert.equal(result.status,'admitted');
 assertProfessorAdmissionAcknowledgement(result.acknowledgement,expected);
 const session=ok(await admin.from('ai_tutor_sessions').select('id,lesson_id,startup_request_id,callback_token_hash,dispatch_id').eq('id',result.acknowledgement.sessionId).single());
 assert.equal(session.startup_request_id,requestId);assert.equal(session.lesson_id,fixture.p1Lessons.finance.id);assert.equal(session.dispatch_id,null);
 assert.equal(session.callback_token_hash,createHash('sha256').update(result.getServerContext().callbackToken).digest('hex'));
 assert.ok(!JSON.stringify(result).includes(result.getServerContext().callbackToken));
 await assert.rejects(()=>prepared.start(),/already_used/);
 const other=structuredClone(expected);other.userId=ok(await clients.payroll.auth.getUser()).user.id;
 assert.throws(()=>assertProfessorAdmissionAcknowledgement(result.acknowledgement,other),/mismatch/);
 // Return a corrupted reference after the real RPC commits. The adapter must
 // expose neither a public success acknowledgement nor an automatic retry.
 let calls=0;
 const corruptedDb={auth:clients.payroll.auth,from:clients.payroll.from.bind(clients.payroll),rpc:async(name,args)=>{
  calls++;const response=await clients.payroll.rpc(name,args);
  assert.equal(response.data?.allowed,true);
  response.data.written_reference.source_sha256='0'.repeat(64);return response;
 }};
 const uncertainId=randomUUID();
 const uncertain=await prepareBoundProfessorAdmission(corruptedDb,admin,{kind:'written',lessonId:fixture.lessons.english[8].id,requestedTrack:tracks.english,requestId:uncertainId,mode:'general_conversation'},env);
 await assert.rejects(()=>uncertain.start(),ProfessorAdmissionUnconfirmed);
 await assert.rejects(()=>uncertain.start(),/already_used/);assert.equal(calls,1);
 const held=ok(await admin.from('ai_tutor_sessions').select('budget_reservation_id,dispatch_id').eq('startup_request_id',uncertainId).single());
 assert.equal(held.dispatch_id,null);
 assert.equal(ok(await admin.from('professor_budget_reservations').select('status').eq('id',held.budget_reservation_id).single()).status,'active');
 assert.equal(ok(await admin.from('ai_tutor_sessions').select('id')).length,2);
 assert.deepEqual(ok(await admin.from('ai_usage_log').select('id')),[]);
 console.log(JSON.stringify({status:'passed',realAuthPostgrest:true,preparedZeroBudgetDenials:denied,confirmedAdmissions:1,corruptedAcknowledgementWithPreservedHold:1,providerCalls:0,connectedWrites:0}));
}finally{
 ok(await admin.from('professor_budget_settings').update({monthly_budget_usd:0}).eq('feature','professor_livekit'));
 ok(await admin.from('learning_hub_budget_settings').update({ai_hard_cap_usd:0,professor_cap_usd:0}).eq('id',1));
 for(const c of Object.values(clients))ok(await c.auth.signOut());
}

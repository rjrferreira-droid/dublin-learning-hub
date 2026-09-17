/** Real HTTP wiring with fictional local accounts; all providers/network blocked. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {prepareBoundProfessorAdmission} from '../candidates/prepare-bound-professor-admission.ts';
import {prepareLocalProfessorWorkerJob} from '../candidates/professor-worker-job.ts';
import {createProfessorRecoveryController,ProfessorObservationDiscarded} from '../candidates/professor-recovery-controller.ts';
import {runProfessorDispatchCandidate,ProfessorDispatchUnconfirmed} from '../candidates/professor-dispatch-candidate.ts';
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
let fakeSubmissions=0;
try{
 ok(await admin.from('professor_budget_settings').update({monthly_budget_usd:1}).eq('feature','professor_livekit'));
 ok(await admin.from('learning_hub_budget_settings').update({ai_hard_cap_usd:1,professor_cap_usd:1}).eq('id',1));
 const prepared=await prepareBoundProfessorAdmission(clients.finance,admin,{kind:'p1',lessonId:fixture.p1Lessons.finance.id,requestedTrack:tracks.finance,requestId:randomUUID(),mode:'chapter_conversation'},env);
 let recoveryScope={receipt:structuredClone(prepared.receipt),epoch:1};
 const recovery=createProfessorRecoveryController(clients.finance,recoveryScope,()=>recoveryScope);
 assert.equal((await recovery.refresh()).state,'no_admission_observed');
 assert.deepEqual(ok(await clients.finance.rpc('list_professor_recovery_v1')), {attempts:[],truncated:false,providerAdmission:false,retryAllowed:false});
 assert.ok((await make(status.ANON_KEY).rpc('list_professor_recovery_v1')).error);
 assert.ok((await admin.rpc('list_professor_recovery_v1')).error);
 const admitted=await prepared.start();assert.equal(admitted.status,'admitted');
 assert.equal((await recovery.refresh()).state,'admitted_not_claimed');
 const found=ok(await clients.finance.rpc('list_professor_recovery_v1'));
 assert.deepEqual(found,{attempts:[{referenceId:prepared.receipt.reference.id,requestId:prepared.receipt.requestId,sessionId:admitted.acknowledgement.sessionId,state:'admitted_not_claimed'}],truncated:false,providerAdmission:false,retryAllowed:false});
 assert.deepEqual(ok(await clients.payroll.rpc('list_professor_recovery_v1')).attempts,[]);
 const observeArgs={p_reference_id:admitted.acknowledgement.reference.id,p_request_id:admitted.acknowledgement.requestId};
 assert.equal(ok(await clients.finance.rpc('observe_professor_dispatch_v1',observeArgs)).state,'admitted_not_claimed');
 assert.ok((await clients.payroll.rpc('observe_professor_dispatch_v1',observeArgs)).error);
 assert.ok((await clients.finance.rpc('observe_professor_dispatch_v1',{...observeArgs,p_request_id:randomUUID()})).error);
 assert.ok((await clients.finance.rpc('claim_professor_dispatch_v1',{p_ack:admitted.acknowledgement,p_callback_hash:'a'.repeat(64),p_payload_sha256:'b'.repeat(64),p_claim_id:randomUUID()})).error);
 const worker=prepareLocalProfessorWorkerJob(admitted,{supabaseOrigin:api.origin,publishableKey:status.ANON_KEY});
 const submit=async encoded=>{fakeSubmissions++;const privateEnvelope=JSON.parse(encoded);assert.equal(privateEnvelope.acknowledgement.sessionId,admitted.acknowledgement.sessionId);assert.equal(privateEnvelope.callbackToken,admitted.getServerContext().callbackToken);const job=privateEnvelope.workerJob;assert.equal(job.roomName,admitted.acknowledgement.roomName);const metadata=JSON.parse(job.metadata);assert.deepEqual(metadata.lessonContext,admitted.getServerContext().lessonContext);assert.equal(metadata.persistence.sessionId,admitted.acknowledgement.sessionId);assert.equal(metadata.persistence.completionUrl,api.origin+'/functions/v1/professor-session-complete');assert.equal(metadata.budgetReservationId,admitted.acknowledgement.reservationId);assert.equal(metadata.budgetReservationUsd,admitted.getServerContext().reservationUsd);return {id:'fixture_http_dispatch'};};
 const results=await Promise.all([runProfessorDispatchCandidate(admin,worker,env,submit),runProfessorDispatchCandidate(admin,{...worker},env,submit)]);
 assert.deepEqual(results.map(x=>x.state).sort(),['acknowledged','already_claimed']);assert.equal(fakeSubmissions,1);
 const observed=ok(await clients.finance.rpc('observe_professor_dispatch_v1',observeArgs));
 assert.deepEqual(observed,{state:'dispatch_acknowledged',sessionId:admitted.acknowledgement.sessionId,providerAdmission:false,retryAllowed:false});
 assert.doesNotMatch(JSON.stringify(observed),/callback|sha256|technicalBrief|fixture_http_dispatch/);
 assert.deepEqual(await recovery.refresh(),observed);
 // Actual owner-authenticated observation arrives after the UI changed scope.
 const delayed={auth:clients.finance.auth,rpc:async(name,args)=>{const result=await clients.finance.rpc(name,args);ok(result);recoveryScope={...recoveryScope,epoch:2};return result;}};
 const stale=createProfessorRecoveryController(delayed,recoveryScope,()=>recoveryScope);
 await assert.rejects(()=>stale.refresh(),ProfessorObservationDiscarded);stale.dispose();recovery.dispose();
 const other=createProfessorRecoveryController(clients.payroll,recoveryScope,()=>recoveryScope);
 await assert.rejects(()=>other.refresh(),ProfessorObservationDiscarded);other.dispose();
 assert.equal(ok(await admin.from('professor_budget_reservations').select('status').eq('id',admitted.acknowledgement.reservationId).single()).status,'unresolved');
 // Simulate a lost claim response AFTER actual PostgreSQL commit. No provider is
 // submitted; a fresh invocation still cannot reuse the durable claim.
 const uncertainPrepared=await prepareBoundProfessorAdmission(clients.payroll,admin,{kind:'written',lessonId:fixture.lessons.english[8].id,requestedTrack:tracks.english,requestId:randomUUID(),mode:'general_conversation'},env);
 const uncertainScope={receipt:structuredClone(uncertainPrepared.receipt),epoch:1};
 const uncertainRecovery=createProfessorRecoveryController(clients.payroll,uncertainScope,()=>uncertainScope);
 const uncertain=await uncertainPrepared.start();
 assert.equal(uncertain.status,'admitted');
 const lost={rpc:async(name,args)=>{const response=await admin.rpc(name,args);assert.equal(response.data?.claimed,true);throw Error('fictional lost claim response');}};
 await assert.rejects(()=>runProfessorDispatchCandidate(lost,uncertain,env,submit),ProfessorDispatchUnconfirmed);
 assert.deepEqual(await runProfessorDispatchCandidate(admin,{...uncertain},env,submit),{state:'already_claimed',retryAllowed:false});assert.equal(fakeSubmissions,1);
 assert.equal(ok(await clients.payroll.rpc('observe_professor_dispatch_v1',{p_reference_id:uncertain.acknowledgement.reference.id,p_request_id:uncertain.acknowledgement.requestId})).state,'dispatch_unconfirmed');
 assert.equal(ok(await admin.from('professor_budget_reservations').select('status').eq('id',uncertain.acknowledgement.reservationId).single()).status,'unresolved');
 assert.equal((await uncertainRecovery.refresh()).state,'dispatch_unconfirmed');uncertainRecovery.dispose();
 // A fresh authenticated client has no local receipt or sessionStorage pointer.
 const reopened=make(status.ANON_KEY);ok(await reopened.auth.signInWithPassword(fixture.accounts.payroll));
 const recovered=ok(await reopened.rpc('list_professor_recovery_v1'));ok(await reopened.auth.signOut());
 assert.deepEqual(recovered.attempts,[{referenceId:uncertain.acknowledgement.reference.id,requestId:uncertain.acknowledgement.requestId,sessionId:uncertain.acknowledgement.sessionId,state:'dispatch_unconfirmed'}]);
 assert.equal(recovered.retryAllowed,false);assert.equal(recovered.providerAdmission,false);
 assert.doesNotMatch(JSON.stringify(recovered),/callback|sha256|technicalBrief|roomName|token/);
 assert.deepEqual(ok(await admin.from('ai_usage_log').select('id')),[]);
 console.log(JSON.stringify({status:'passed',realAuthPostgrest:true,durableConcurrentClaim:true,lostCommittedClaimCannotRetry:true,isolatedOwnerObservation:true,validatedRecoveryStates:4,lateObservationDiscarded:true,immutableWorkerJobBound:true,fakeSubmissions,providerCalls:0,connectedWrites:0}));
}finally{
 ok(await admin.from('professor_budget_settings').update({monthly_budget_usd:0}).eq('feature','professor_livekit'));
 ok(await admin.from('learning_hub_budget_settings').update({ai_hard_cap_usd:0,professor_cap_usd:0}).eq('id',1));
 for(const c of Object.values(clients))ok(await c.auth.signOut());
}

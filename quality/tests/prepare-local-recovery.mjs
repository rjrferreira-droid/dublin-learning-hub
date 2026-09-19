/** Real HTTP wiring with fictional local accounts; all providers/network blocked. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {prepareBoundProfessorAdmission} from '../candidates/prepare-bound-professor-admission.ts';
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
const receipts={};
try{
 for(const account of ['finance','payroll']){
  const prepared=await prepareBoundProfessorAdmission(clients[account],admin,{kind:'p1',lessonId:fixture.p1Lessons[account].id,requestedTrack:account==='finance'?'rafael_finance':'viviane_payroll',requestId:randomUUID(),mode:'chapter_conversation'},env);
  receipts[account]=prepared.receipt;
 }
 // Public preflight receipts only. Never serialize prepared closures/private data.
 assert.doesNotMatch(JSON.stringify(receipts),/callbackToken|technicalBrief|password|SERVICE_ROLE/);
 writeFileSync(join(dirname(process.argv[2]),'local-recovery-receipts.json'),JSON.stringify(receipts),{mode:0o600});
 console.log(JSON.stringify({recoveryPreflights:2,sessionsStarted:0,providerCalls:0,connectedWrites:0}));
}finally{for(const c of Object.values(clients))ok(await c.auth.signOut());}

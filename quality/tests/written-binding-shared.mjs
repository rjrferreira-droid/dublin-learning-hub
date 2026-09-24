/** Actual process restart/concurrency, fresh fictional Auth and local SQL only. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {prepareBoundProfessorAdmission} from '../candidates/prepare-bound-professor-admission.ts';
import {createAdmissionVault,AdmissionVaultUnavailable} from '../candidates/professor-admission-vault.ts';
import {createSharedPreflights} from '../candidates/professor-shared-preflights.ts';
import {createSharedProfessorRoutes} from '../candidates/professor-shared-routes.ts';
const statusPath=process.argv[2],mode=process.argv[3],root=process.argv[4];
const status=JSON.parse(readFileSync(statusPath,'utf8')),fixture=JSON.parse(readFileSync(join(dirname(statusPath),'local-browser-fixture.json'),'utf8'));
const api=new URL(status.API_URL),originalFetch=globalThis.fetch;
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);assert.ok(api.protocol==='http:'&&['127.0.0.1','localhost'].includes(api.hostname)&&api.port==='54321');
globalThis.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);assert.equal(url.origin,api.origin);return originalFetch(input,{...init,redirect:'error'});};
const make=key=>createClient(api.origin,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const ok=r=>{if(r.error)throw Error('Fictional local operation failed');return r.data;};
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
if(mode){
 assert.ok(['issue','resume'].includes(mode));assert.equal(statSync(join(root,'key.bin')).mode&0o077,0);
 const vault=createAdmissionVault('fixture-v1',{'fixture-v1':readFileSync(join(root,'key.bin'))}),store=createSharedPreflights(make(status.SERVICE_ROLE_KEY),vault);
 const db=make(status.ANON_KEY);ok(await db.auth.signInWithPassword(fixture.accounts.finance));
 const token=(await db.auth.getSession()).data.session.access_token;
 const routes=createSharedProfessorRoutes({env,serviceDb:make(status.SERVICE_ROLE_KEY),store,makeClient:bearer=>createClient(api.origin,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+bearer}}})});
 try{
  if(mode==='issue'){
   const prepared=await routes('/professor/preflight','Bearer '+token,{kind:'p1',lessonId:fixture.p1Lessons.finance.id,requestedTrack:'rafael_finance',requestId:randomUUID(),mode:'chapter_conversation'});
   assert.equal(prepared.status,200);
   const receipt=prepared.body.receipt;
   const scope={referenceId:receipt.reference.id,userId:receipt.userId,requestId:receipt.requestId};
   writeFileSync(join(root,'scope.json'),JSON.stringify(scope),{mode:0o600});
   console.log(JSON.stringify({state:'issued'}));
  }else{
   const scope=JSON.parse(readFileSync(join(root,'scope.json'),'utf8'));
   const result=await routes('/professor/start','Bearer '+token,{referenceId:scope.referenceId,requestId:scope.requestId});
   if(result.status===200){assert.deepEqual(result.body,{status:'denied',reason:'professor_monthly_budget_reached',retryAllowed:false});console.log(JSON.stringify({state:'denied'}));}
   else {assert.equal(result.status,409);console.log(JSON.stringify({state:'consumed_or_unavailable'}));}

  }
 }finally{ok(await db.auth.signOut({scope:'local'}));}
}else{
 const admin=make(status.SERVICE_ROLE_KEY);assert.equal(ok(await admin.from('learning_hub_budget_settings').select('ai_hard_cap_usd').eq('id',1).single()).ai_hard_cap_usd,0);
 const temp=mkdtempSync(join(dirname(statusPath),'lh-persist-')),run=promisify(execFile);
 const child=async command=>{const r=await run(process.execPath,['--experimental-strip-types','quality/tests/written-binding-shared.mjs',statusPath,command,temp],{timeout:30000,maxBuffer:64000});return JSON.parse(r.stdout.trim()).state;};
 try{
  writeFileSync(join(temp,'key.bin'),randomBytes(32),{mode:0o600});assert.equal(await child('issue'),'issued');
  const publicClient=make(status.ANON_KEY);
  const scope=JSON.parse(readFileSync(join(temp,'scope.json'),'utf8'));
  const args={p_reference_id:scope.referenceId,p_user_id:scope.userId,p_request_id:scope.requestId};
  assert.ok((await publicClient.rpc('consume_professor_preflight_v1',args)).error);
  ok(await publicClient.auth.signInWithPassword(fixture.accounts.finance));
  assert.ok((await publicClient.rpc('consume_professor_preflight_v1',args)).error);
  ok(await publicClient.auth.signOut({scope:'local'}));
  assert.equal(ok(await admin.rpc('consume_professor_preflight_v1',{...args,p_user_id:randomUUID()})),null);
  assert.equal(ok(await admin.rpc('consume_professor_preflight_v1',{...args,p_request_id:randomUUID()})),null);
  const results=await Promise.all([child('resume'),child('resume')]);assert.deepEqual(results.sort(),['consumed_or_unavailable','denied']);
  assert.equal(await child('resume'),'consumed_or_unavailable');
  for(const table of ['ai_tutor_sessions','professor_budget_reservations','ai_usage_log'])assert.deepEqual(ok(await admin.from(table).select('id')),[]);
  console.log(JSON.stringify({status:'passed',separateIssuerAndResumers:true,freshAuth:true,concurrentResumers:2,atomicStarts:1,postRestartRetryBlocked:true,sharedPostgresStore:true,persistedBearerTokens:0,providerCalls:0,connectedWrites:0}));
 }finally{rmSync(temp,{recursive:true,force:true});}
}

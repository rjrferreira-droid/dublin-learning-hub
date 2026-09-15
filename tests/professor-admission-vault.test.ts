import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAdmissionVault,AdmissionVaultUnavailable} from '../quality/candidates/professor-admission-vault.ts';
import {createFilePreflights,resumePersistedProfessorAdmission} from '../quality/candidates/professor-file-preflights.ts';
function fixture(){const receipt:any={requestId:randomUUID(),userId:randomUUID(),mode:'chapter_conversation',reference:{id:randomUUID(),sha256:'a'.repeat(64),version:'p1-reference-candidate-v1',identity:{lessonId:randomUUID(),moduleId:randomUUID(),courseId:randomUUID(),lessonSlug:'fixture',contentVersion:1,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2}}};return {receipt,callbackToken:'b'.repeat(64),roomName:'validation:lh-'+randomUUID(),lessonContext:{title:'Fictional',technicalBrief:'PRIVATE_AUTHORED'}};}
const scope=(s:ReturnType<typeof fixture>)=>({referenceId:s.receipt.reference.id,userId:s.receipt.userId,requestId:s.receipt.requestId});
test('randomized authenticated encryption hides callback/context and survives key rotation',()=>{
 const snapshot=fixture(),old=randomBytes(32),next=randomBytes(32),vault=createAdmissionVault('old',{old}),a=vault.seal(snapshot),b=vault.seal(snapshot);
 assert.notEqual(a,b);assert.doesNotMatch(a,/PRIVATE_AUTHORED|callbackToken|bbbbbbbb/);assert.deepEqual(vault.open(a,scope(snapshot)),snapshot);
 assert.deepEqual(createAdmissionVault('next',{old,next}).open(a,scope(snapshot)),snapshot);
 assert.throws(()=>createAdmissionVault('next',{next}).open(a,scope(snapshot)),AdmissionVaultUnavailable);
});
test('owner/request/reference drift, tampering, extra fields, wrong key and expiry fail closed',()=>{
 const s=fixture(),key=randomBytes(32);let clock=1000;const vault=createAdmissionVault('v1',{v1:key},()=>clock),encoded=vault.seal(s);
 for(const field of ['userId','requestId','referenceId'])assert.throws(()=>vault.open(encoded,{...scope(s),[field]:randomUUID()}),AdmissionVaultUnavailable);
 for(const change of [(x:any)=>{x.header.expiresAt++;},(x:any)=>{x.header.version=2;},(x:any)=>{x.header.userId=randomUUID();},(x:any)=>{x.tag='A'.repeat(22);},(x:any)=>{x.ciphertext=x.ciphertext.slice(0,-2)+'AA';},(x:any)=>{x.extra='bad';}]){const x=JSON.parse(encoded);change(x);assert.throws(()=>vault.open(JSON.stringify(x),scope(s)),AdmissionVaultUnavailable);}
 assert.throws(()=>createAdmissionVault('v1',{v1:randomBytes(32)},()=>clock).open(encoded,scope(s)),AdmissionVaultUnavailable);
 clock=241000;assert.throws(()=>vault.open(encoded,scope(s)),AdmissionVaultUnavailable);
 assert.throws(()=>vault.seal({...s,access_token:'PRIVATE_JWT'} as any),AdmissionVaultUnavailable);
});
test('separate store instances share exclusive consumption and never overwrite an existing record',async()=>{
 const root=await mkdtemp(join(tmpdir(),'lh-vault-'));try{
  const s=fixture(),key=randomBytes(32),a=await createFilePreflights(root,createAdmissionVault('v1',{v1:key}));await a.put(s);
  const bytes=await readFile(join(root,s.receipt.reference.id+'.sealed'),'utf8');assert.doesNotMatch(bytes,/PRIVATE_AUTHORED|callbackToken/);
  await assert.rejects(()=>a.put(s),AdmissionVaultUnavailable);
  const b=await createFilePreflights(root,createAdmissionVault('v1',{v1:key}));
  const results=await Promise.allSettled([a.consume(scope(s)),b.consume(scope(s))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(()=>b.consume(scope(s)),AdmissionVaultUnavailable);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('fresh Auth is required before consuming, and the resumed request uses fresh Auth for start',async()=>{
 const root=await mkdtemp(join(tmpdir(),'lh-vault-'));try{
  const s=fixture(),store=await createFilePreflights(root,createAdmissionVault('v1',{v1:randomBytes(32)}));await store.put(s);let auth=0,rpc=0;
  const db={auth:{getUser:async()=>{auth++;return {data:{user:{id:s.receipt.userId}},error:null};}},rpc:async(name:string,args:any)=>{rpc++;assert.equal(name,'start_written_professor_session_v1');assert.equal(args.p_room_name,s.roomName);return {data:{allowed:false,reason:'professor_monthly_budget_reached'}};}};
  const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
  await assert.rejects(()=>resumePersistedProfessorAdmission(store,{auth:{getUser:async()=>({data:{user:{id:randomUUID()}}})}},scope(s),env),AdmissionVaultUnavailable);
  const resumed=await resumePersistedProfessorAdmission(store,db,scope(s),env);assert.doesNotMatch(JSON.stringify(resumed),/PRIVATE_AUTHORED|callbackToken/);
  assert.deepEqual(await resumed.start(),{status:'denied',reason:'professor_monthly_budget_reached'});assert.equal(auth,2);assert.equal(rpc,1);
  await assert.rejects(()=>resumePersistedProfessorAdmission(store,db,scope(s),env),AdmissionVaultUnavailable);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('partial consumption marker and permissive record permissions cannot revive a request',async()=>{
 const root=await mkdtemp(join(tmpdir(),'lh-vault-'));try{
  const s=fixture(),key=randomBytes(32),store=await createFilePreflights(root,createAdmissionVault('v1',{v1:key}));await store.put(s);
  await chmod(join(root,s.receipt.reference.id+'.sealed'),0o644);await assert.rejects(()=>store.consume(scope(s)),AdmissionVaultUnavailable);
  await chmod(join(root,s.receipt.reference.id+'.sealed'),0o600);
  await writeFile(join(root,s.receipt.reference.id+'.claimed'),'',{mode:0o600});await assert.rejects(()=>store.consume(scope(s)),AdmissionVaultUnavailable);
 }finally{await rm(root,{recursive:true,force:true});}
});

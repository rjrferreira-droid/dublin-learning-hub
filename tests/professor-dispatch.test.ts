import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {runProfessorDispatchCandidate,ProfessorDispatchUnconfirmed} from '../quality/candidates/professor-dispatch-candidate.ts';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
function fixture(){
 const acknowledgement:any={requestId:randomUUID(),userId:randomUUID(),mode:'chapter_conversation',reference:{id:randomUUID(),sha256:'a'.repeat(64),version:'p1-reference-candidate-v1',identity:{lessonId:randomUUID(),moduleId:randomUUID(),courseId:randomUUID(),lessonSlug:'fictional',contentVersion:1,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2}},sessionId:randomUUID(),reservationId:randomUUID(),roomName:'validation:lh-'+randomUUID(),validationMode:true,qualityTier:'premium',maxSessionSeconds:60,providerAdmission:false};
 const encoded=JSON.stringify({acknowledgement,lessonContext:{technicalBrief:'PRIVATE_AUTHORED'},callbackToken:'b'.repeat(64)});
 const admission={acknowledgement,getDispatchEnvelope:()=>encoded};
 const state={claimed:false,recorded:false,submits:0,calls:[] as string[]};
 const service={async rpc(name:string,args:any):Promise<any>{
  state.calls.push(name);
  if(name==='claim_professor_dispatch_v1'){
   assert.equal(args.p_callback_hash,createHash('sha256').update('b'.repeat(64)).digest('hex'));
   assert.equal(args.p_payload_sha256,createHash('sha256').update(encoded).digest('hex'));
   if(state.claimed)return {data:{claimed:false,reason:'dispatch_already_claimed'}};
   state.claimed=true;return {data:{claimed:true,claim_id:args.p_claim_id,payload_sha256:args.p_payload_sha256}};
  }
  assert.equal(name,'record_professor_dispatch_v1');assert.equal(args.p_dispatch_id,'fixture_dispatch');state.recorded=true;return {data:true};
 }};
 const submit=async(privateEnvelope:string)=>{assert.equal(privateEnvelope,encoded);state.submits++;return {id:'fixture_dispatch'};};
 return {admission,state,service,submit};
}
test('two independent callers share a durable one-shot claim; no private envelope in result',async()=>{
 const f=fixture(),results=await Promise.all([runProfessorDispatchCandidate(f.service,f.admission,env,f.submit),runProfessorDispatchCandidate(f.service,{...f.admission},env,f.submit)]);
 assert.deepEqual(results.map(x=>x.state).sort(),['acknowledged','already_claimed']);assert.equal(f.state.submits,1);assert.ok(f.state.recorded);
 assert.doesNotMatch(JSON.stringify(results),/PRIVATE_AUTHORED|callbackToken|bbbbbbbb/);
});
test('production, early cancellation and changed public acknowledgement never claim or submit',async()=>{
 const f=fixture();await assert.rejects(()=>runProfessorDispatchCandidate(f.service,f.admission,{VERCEL_ENV:'production'},f.submit),/unavailable/);
 await assert.rejects(()=>runProfessorDispatchCandidate(f.service,f.admission,env,f.submit,AbortSignal.abort()),{name:'AbortError'});
 f.admission.acknowledgement.reference.identity.contentVersion=2;
 await assert.rejects(()=>runProfessorDispatchCandidate(f.service,f.admission,env,f.submit),/mismatch/);assert.deepEqual(f.state.calls,[]);assert.equal(f.state.submits,0);
});
for(const failure of ['lost_claim','wrong_claim','wrong_hash','abort_after_claim','provider_throw','invalid_provider_id','lost_record','record_error'])test(`${failure}: uncertainty cannot authorize another submission`,async()=>{
 const f=fixture(),controller=new AbortController();
 const service={async rpc(name:string,args:any){const result=await f.service.rpc(name,args);
  if(name==='claim_professor_dispatch_v1'){
   if(failure==='lost_claim')throw Error('SECRET_RPC');
   if(failure==='wrong_claim')result.data.claim_id=randomUUID();
   if(failure==='wrong_hash')result.data.payload_sha256='0'.repeat(64);
   if(failure==='abort_after_claim')controller.abort();
  }else{if(failure==='lost_record')throw Error('SECRET_RPC');if(failure==='record_error')return {error:{message:'SECRET_RPC'}};}
  return result;
 }};
 const submit=async(encoded:string)=>{const result=await f.submit(encoded);if(failure==='provider_throw')throw Error('SECRET_PROVIDER');return failure==='invalid_provider_id'?{id:'invalid id'}:result;};
 await assert.rejects(()=>runProfessorDispatchCandidate(service,f.admission,env,submit,controller.signal),(e:any)=>e instanceof ProfessorDispatchUnconfirmed&&!e.retryAllowed&&!e.message.includes('SECRET'));
 assert.ok(f.state.claimed);const before=f.state.submits;
 assert.deepEqual(await runProfessorDispatchCandidate(f.service,{...f.admission},env,f.submit),{state:'already_claimed',retryAllowed:false});
 assert.equal(f.state.submits,before);assert.equal(before,['lost_claim','wrong_claim','wrong_hash','abort_after_claim'].includes(failure)?0:1);
});
test('cancellation after provider acknowledgement still records the observed ID',async()=>{
 const f=fixture(),controller=new AbortController();
 const result=await runProfessorDispatchCandidate(f.service,f.admission,env,async encoded=>{controller.abort();return f.submit(encoded);},controller.signal);
 assert.equal(result.state,'acknowledged');assert.ok(f.state.recorded);
});

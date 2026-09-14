import test from 'node:test';
import assert from 'node:assert/strict';
import {runPremiumAudioAttempt,type AudioAttemptInput} from '../quality/candidates/premium-audio-attempt-flow.ts';
const input:AudioAttemptInput={attemptId:'11111111-1111-4111-8111-111111111111',userId:'22222222-2222-4222-8222-222222222222',lessonId:'33333333-3333-4333-8333-333333333333',contentVersion:2,reservationUsd:0.10,estimatedCostUsd:0.04,characters:100};
function fixture(fault=''){
 const calls:string[]=[];let state='none';let generated=0;let receiptCount=0;
 const db={async rpc(name:string){calls.push(name);
  if(name==='begin_premium_audio_attempt_v2'){
   if(fault==='denied')return {data:{allowed:false,reason:'global_ai_budget_reached'},error:null};
   if(state!=='none')return {data:{allowed:false,reason:'audio_attempt_replayed'},error:null};
   state='reserved';
   if(fault==='admission-timeout')throw new Error('fictional admission timeout');
   return {data:{allowed:true,attemptId:fault==='wrong-id'?'wrong':input.attemptId,state:'reserved',reservationUsd:0.10},error:null};
  }
  if(name==='mark_premium_audio_submitted_v2'){
   if(fault==='submission-denied')return {data:false,error:null};
   state='submitted';if(fault==='submission-timeout')throw new Error('fictional submission timeout');
   return {data:true,error:null};
  }
  if(name==='settle_premium_audio_attempt_v2'){
   if(fault==='receipt-failure')return {data:null,error:{message:'fictional failure'}};
   receiptCount++;state='settled';if(fault==='settlement-timeout')throw new Error('fictional response timeout');
   return {data:true,error:null};
  }
  if(name==='close_premium_audio_attempt_v2'){
   state=state==='reserved'?'cancelled':state==='submitted'?'uncertain':state;
   return {data:state,error:null};
  }
  throw new Error('unexpected RPC');
 }};
 const dependencies={async generate(){calls.push('provider');generated++;if(fault==='provider-timeout')throw new Error('fictional provider timeout');return 'FICTIONAL AUDIO BYTES';},async store(_value:string,identity:{attemptId:string;storagePath:string}){calls.push('storage');if(fault==='storage-failure')throw new Error('fictional storage failure');return {...identity,attemptId:fault==='wrong-asset'?'wrong':identity.attemptId};}};
 return {db,dependencies,calls,get state(){return state;},get generated(){return generated;},get receipts(){return receiptCount;}};
}
test('atomic attempt orders admission, one-shot fence, provider, durable asset and receipt',async()=>{
 const f=fixture();const result=await runPremiumAudioAttempt(f.db,input,f.dependencies);assert.equal(result.storagePath,`lessons/${input.lessonId}/commentary-v2.mp3`);
 assert.deepEqual(f.calls,['begin_premium_audio_attempt_v2','mark_premium_audio_submitted_v2','provider','storage','settle_premium_audio_attempt_v2']);assert.equal(f.state,'settled');assert.equal(f.generated,1);assert.equal(f.receipts,1);
});
for(const fault of ['denied','wrong-id','admission-timeout','submission-denied','submission-timeout'])test(`${fault}: no provider call without two exact acknowledged gates`,async()=>{
 const f=fixture(fault);await assert.rejects(()=>runPremiumAudioAttempt(f.db,input,f.dependencies));assert.equal(f.generated,0);
 assert.equal(f.state,fault==='denied'?'none':fault==='submission-timeout'?'uncertain':'cancelled');
});
for(const fault of ['provider-timeout','storage-failure','wrong-asset','receipt-failure'])test(`${fault}: preserve uncertain hold and never retry paid generation`,async()=>{
 const f=fixture(fault);await assert.rejects(()=>runPremiumAudioAttempt(f.db,input,f.dependencies));assert.equal(f.generated,1);assert.equal(f.state,'uncertain');assert.equal(f.receipts,0);
 await assert.rejects(()=>runPremiumAudioAttempt(f.db,input,f.dependencies),/replayed/);assert.equal(f.generated,1);assert.equal(f.state,'uncertain');
});
test('lost settlement acknowledgement never erases a committed receipt or starts again',async()=>{
 const f=fixture('settlement-timeout');await assert.rejects(()=>runPremiumAudioAttempt(f.db,input,f.dependencies));assert.equal(f.state,'settled');assert.equal(f.receipts,1);
 await assert.rejects(()=>runPremiumAudioAttempt(f.db,input,f.dependencies),/replayed/);assert.equal(f.generated,1);assert.equal(f.receipts,1);
});
test('malformed identity and reservation fail before any RPC',async()=>{
 for(const override of [{contentVersion:0},{estimatedCostUsd:0.11},{reservationUsd:NaN},{userId:'child'},{characters:0}]){const f=fixture();await assert.rejects(()=>runPremiumAudioAttempt(f.db,{...input,...override},f.dependencies));assert.equal(f.calls.length,0);}
});

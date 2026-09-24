import test from 'node:test';
import assert from 'node:assert/strict';
import {runPremiumAudioAttemptV3,type AudioAttemptInputV3,type DurableAssetV3} from '../quality/candidates/premium-audio-attempt-flow.ts';
import {createPremiumAudioSourceContract} from '../quality/candidates/premium-audio-source-contract.ts';

const fingerprint='0123456789abcdef'.repeat(4);
const source=createPremiumAudioSourceContract({sourceFingerprint:fingerprint,identity:{
 lessonId:'33333333-3333-4333-8333-333333333333',
 moduleId:'44444444-4444-4444-8444-444444444444',
 courseId:'55555555-5555-4555-8555-555555555555',
 lessonSlug:'fictional-finance-p1',contentVersion:2,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2,
}});
const input:AudioAttemptInputV3={
 attemptId:'11111111-1111-4111-8111-111111111111',
 userId:'22222222-2222-4222-8222-222222222222',
 lessonId:source.identity.lessonId,
 contentVersion:2,reservationUsd:0.10,estimatedCostUsd:0.04,characters:100,
 lessonIdentity:source.identity,
 sourceFingerprint:source.sourceFingerprint,renderRevision:source.renderRevision,storagePath:source.storagePath,
};

function fixture(fault:'none'|'mark'|'settle'|'asset'
 |'begin-extra'|'mark-extra'|'settle-extra'|'asset-extra'
 |'begin-partial'|'mark-partial'|'settle-partial'|'asset-partial'='none',afterBegin?:()=>void){
 const calls:{name:string;args:Record<string,unknown>}[]=[];
 let state='none',providerCalls=0,storageCalls=0,receipts=0;
 const exactBinding=(args:Record<string,unknown>)=>{
  assert.equal(args.p_attempt_id,input.attemptId);
  assert.equal(args.p_source_fingerprint,input.sourceFingerprint);
  assert.equal(args.p_render_revision,input.renderRevision);
  assert.equal(args.p_storage_path,input.storagePath);
 };
 const db={async rpc(name:string,args:Record<string,unknown>){
  calls.push({name,args:{...args}});
  if(name==='begin_premium_audio_attempt_v3'){
   assert.deepEqual(args.p_lesson_identity,input.lessonIdentity);
   if(state!=='none')return {data:{allowed:false,reason:'audio_attempt_replayed',state},error:null};
   state='reserved';afterBegin?.();
   if(fault==='begin-partial')return {data:{allowed:true,attemptId:input.attemptId,state:'reserved'},error:null};
   return {data:{allowed:true,attemptId:input.attemptId,state:'reserved',reservationUsd:input.reservationUsd,
    ...(fault==='begin-extra'?{unexpected:'version-drift'}:{})},error:null};
  }
  exactBinding(args);
  if(name==='mark_premium_audio_submitted_v3'){
   state='submitted';
   if(fault==='mark')throw new Error('fictional lost mark acknowledgement');
   if(fault==='mark-partial')return {data:{allowed:true},error:null};
   return {data:{allowed:true,state:'submitted',...(fault==='mark-extra'?{unexpected:'version-drift'}:{})},error:null};
  }
  if(name==='settle_premium_audio_attempt_v3'){
   assert.equal(args.p_estimated_cost_usd,input.estimatedCostUsd);
   assert.equal(args.p_characters,input.characters);
   state='settled';receipts++;
   if(fault==='settle')throw new Error('fictional lost settlement acknowledgement');
   if(fault==='settle-partial')return {data:{settled:true,state:'settled'},error:null};
   return {data:{settled:true,state:'settled',receiptRequestId:`premium-audio-v3:${input.attemptId}`,
    ...(fault==='settle-extra'?{unexpected:'version-drift'}:{})},error:null};
  }
  if(name==='close_premium_audio_attempt_v3'){
   state=state==='reserved'?'cancelled':state==='submitted'?'uncertain':state;
   return {data:state,error:null};
  }
  throw new Error(`unexpected RPC ${name}`);
 }};
 const dependencies={
  async revalidateSource(){},
  async generate(){providerCalls++;return 'FICTIONAL AUDIO BYTES';},
  async store(_generated:string,identity:DurableAssetV3){
   storageCalls++;
   if(fault==='asset')return {...identity,sourceFingerprint:'f'.repeat(64)};
   if(fault==='asset-partial')return {attemptId:identity.attemptId,sourceFingerprint:identity.sourceFingerprint,
    renderRevision:identity.renderRevision} as any;
   if(fault==='asset-extra')return {...identity,unexpected:'version-drift'} as any;
   return identity;
  },
 };
 return {db,dependencies,calls,get state(){return state;},get providerCalls(){return providerCalls;},get storageCalls(){return storageCalls;},get receipts(){return receipts;}};
}

test('v3 orders immutable admission and mark before fictional provider, storage and settlement',async()=>{
 const f=fixture();
 const result=await runPremiumAudioAttemptV3(f.db,input,f.dependencies);
 assert.deepEqual(result,{attemptId:input.attemptId,sourceFingerprint:input.sourceFingerprint,
  renderRevision:1,storagePath:input.storagePath});
 assert.ok(Object.isFrozen(result));
 assert.deepEqual(f.calls.map(call=>call.name),['begin_premium_audio_attempt_v3','mark_premium_audio_submitted_v3',
  'settle_premium_audio_attempt_v3']);
 assert.equal(f.providerCalls,1);assert.equal(f.storageCalls,1);assert.equal(f.receipts,1);assert.equal(f.state,'settled');
});

test('v3 rejects malformed source binding before any RPC or provider call',async()=>{
 const invalid=[
  {...input,sourceFingerprint:'A'.repeat(64)},
  {...input,sourceFingerprint:'a'.repeat(63)},
  {...input,renderRevision:2},
  {...input,lessonIdentity:{...input.lessonIdentity,lessonId:'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'}},
  {...input,lessonIdentity:{...input.lessonIdentity,contentVersion:3}},
  {...input,lessonIdentity:{...input.lessonIdentity,studyTrack:'english'}},
  {...input,lessonIdentity:{...input.lessonIdentity,sequence:9}},
  {...input,lessonIdentity:{...input.lessonIdentity,extra:true} as any},
  {...input,reservationUsd:0.1000001},
  {...input,estimatedCostUsd:0.021651724137931035},
  {...input,storagePath:`lessons/${input.lessonId}/commentary-v2.mp3`},
  {...input,storagePath:`lessons/${input.lessonId}/commentary-v3-${fingerprint}-r1.mp3`},
 ];
 for(const candidate of invalid){
  const f=fixture();
  await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,candidate as AudioAttemptInputV3,f.dependencies),/invalid_audio_attempt_v3/);
  assert.equal(f.calls.length,0);assert.equal(f.providerCalls,0);assert.equal(f.storageCalls,0);
 }
});

test('v3 freezes source identity before admission and ignores later caller mutation',async()=>{
 const mutableLessonIdentity={...input.lessonIdentity};
 const mutable={...input,lessonIdentity:mutableLessonIdentity};
 let mutableDependencies:any;
 const f=fixture('none',()=>{
  Object.assign(mutable,{attemptId:'44444444-4444-4444-8444-444444444444',
   sourceFingerprint:'f'.repeat(64),renderRevision:2,
   storagePath:'lessons/other/commentary.mp3',estimatedCostUsd:9,characters:19000});
  Object.assign(mutableDependencies,{
   async revalidateSource(){throw new Error('mutated revalidation callback ran');},
   async generate(){throw new Error('mutated provider callback ran');},
   async store(){throw new Error('mutated storage callback ran');},
  });
 });
 const originalAfterBegin=f.db.rpc.bind(f.db);
 f.db.rpc=async(name,args)=>{
  const result=await originalAfterBegin(name,args);
  if(name==='begin_premium_audio_attempt_v3')Object.assign(mutableLessonIdentity,{lessonSlug:'mutated-after-begin',sequence:8});
  return result;
 };
 const revalidated:DurableAssetV3[]=[];const generatedWith:DurableAssetV3[]=[];const stored:DurableAssetV3[]=[];
 mutableDependencies={
  ...f.dependencies,
  async revalidateSource(identity:DurableAssetV3){revalidated.push(identity);},
  async generate(identity:DurableAssetV3){generatedWith.push(identity);return 'FICTIONAL AUDIO BYTES';},
  async store(generated:string,identity:DurableAssetV3){stored.push(identity);return f.dependencies.store(generated,identity);},
 };
 const result=await runPremiumAudioAttemptV3(f.db,mutable,mutableDependencies);
 assert.deepEqual(result,{attemptId:input.attemptId,sourceFingerprint:input.sourceFingerprint,
  renderRevision:1,storagePath:input.storagePath});
 assert.deepEqual(revalidated,[result]);assert.deepEqual(generatedWith,[result]);assert.deepEqual(stored,[result]);
 assert.ok(Object.isFrozen(revalidated[0]));assert.ok(Object.isFrozen(generatedWith[0]));assert.ok(Object.isFrozen(stored[0]));
 assert.deepEqual(f.calls.map(call=>call.args.p_attempt_id),[input.attemptId,input.attemptId,input.attemptId]);
 assert.deepEqual(f.calls[0].args.p_lesson_identity,input.lessonIdentity);
 assert.ok(Object.isFrozen(f.calls[0].args.p_lesson_identity));
 for(const call of f.calls.slice(1)){
  assert.equal(call.args.p_source_fingerprint,input.sourceFingerprint);
  assert.equal(call.args.p_render_revision,1);
  assert.equal(call.args.p_storage_path,input.storagePath);
 }
 assert.equal(f.calls[2].args.p_estimated_cost_usd,input.estimatedCostUsd);
 assert.equal(f.calls[2].args.p_characters,input.characters);
});

test('v3 source revalidation rejects post-admission drift before mark or provider',async()=>{
 const f=fixture();
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,{
  ...f.dependencies,
  async revalidateSource(identity){assert.ok(Object.isFrozen(identity));throw new Error('fictional authored source changed');},
 }),/fictional authored source changed/);
 assert.deepEqual(f.calls.map(call=>call.name),['begin_premium_audio_attempt_v3','close_premium_audio_attempt_v3']);
 assert.equal(f.state,'cancelled');assert.equal(f.providerCalls,0);assert.equal(f.storageCalls,0);assert.equal(f.receipts,0);
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/audio_attempt_replayed/);
 assert.equal(f.providerCalls,0);
});

test('v3 replay is denied without a second provider or storage call',async()=>{
 const f=fixture();await runPremiumAudioAttemptV3(f.db,input,f.dependencies);
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/audio_attempt_replayed/);
 assert.equal(f.providerCalls,1);assert.equal(f.storageCalls,1);assert.equal(f.receipts,1);assert.equal(f.state,'settled');
});

test('lost v3 mark acknowledgement never calls provider and remains held without retry',async()=>{
 const f=fixture('mark');
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/fictional lost mark acknowledgement/);
 assert.equal(f.state,'uncertain');assert.equal(f.providerCalls,0);assert.equal(f.storageCalls,0);
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/audio_attempt_replayed/);
 assert.equal(f.providerCalls,0);assert.equal(f.state,'uncertain');
});

test('lost v3 settlement acknowledgement preserves the receipt and never repeats paid work',async()=>{
 const f=fixture('settle');
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/fictional lost settlement acknowledgement/);
 assert.equal(f.state,'settled');assert.equal(f.providerCalls,1);assert.equal(f.storageCalls,1);assert.equal(f.receipts,1);
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/audio_attempt_replayed/);
 assert.equal(f.providerCalls,1);assert.equal(f.storageCalls,1);assert.equal(f.receipts,1);
});

test('v3 rejects a divergent durable asset and leaves submitted work uncertain',async()=>{
 const f=fixture('asset');
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/audio_asset_identity_mismatch/);
 assert.equal(f.state,'uncertain');assert.equal(f.providerCalls,1);assert.equal(f.storageCalls,1);assert.equal(f.receipts,0);
 await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/audio_attempt_replayed/);
 assert.equal(f.providerCalls,1);
});

test('v3 rejects extended or partial success acknowledgements and durable asset contracts without paid retry',async()=>{
 for(const [fault,pattern,providers,state] of [
  ['begin-extra',/audio_admission_invalid/,0,'cancelled'],
  ['begin-partial',/audio_admission_invalid/,0,'cancelled'],
  ['mark-extra',/audio_submission_unconfirmed/,0,'uncertain'],
  ['mark-partial',/audio_submission_unconfirmed/,0,'uncertain'],
  ['settle-extra',/audio_receipt_unconfirmed/,1,'settled'],
  ['settle-partial',/audio_receipt_unconfirmed/,1,'settled'],
  ['asset-extra',/audio_asset_identity_mismatch/,1,'uncertain'],
  ['asset-partial',/audio_asset_identity_mismatch/,1,'uncertain'],
 ] as const){
  const f=fixture(fault);
  await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),pattern);
  assert.equal(f.providerCalls,providers);assert.equal(f.state,state);
  await assert.rejects(()=>runPremiumAudioAttemptV3(f.db,input,f.dependencies),/audio_attempt_replayed/);
  assert.equal(f.providerCalls,providers);assert.equal(f.storageCalls,providers);assert.equal(f.state,state);
 }
});

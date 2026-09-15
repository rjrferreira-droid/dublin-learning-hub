import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createProfessorRecoveryController,ProfessorObservationDiscarded,ProfessorObservationUnavailable,professorRecoveryMessage,type RecoveryScope} from '../quality/candidates/professor-recovery-controller.ts';
function fixture(){
 const receipt:any={requestId:randomUUID(),userId:randomUUID(),mode:'chapter_conversation',reference:{id:randomUUID(),sha256:'a'.repeat(64),version:'p1-reference-candidate-v1',identity:{lessonId:randomUUID(),moduleId:randomUUID(),courseId:randomUUID(),lessonSlug:'fixture',contentVersion:1,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2}}};
 const initial:RecoveryScope={receipt,epoch:1};let current:RecoveryScope|null=structuredClone(initial),userId=receipt.userId;
 const calls:string[]=[],response:any={state:'dispatch_unconfirmed',sessionId:randomUUID(),providerAdmission:false,retryAllowed:false};
 const f={initial,calls,response,change:(fn:(scope:RecoveryScope)=>void)=>fn(current!),logout:()=>{current=null;},switchAuth:()=>{userId=randomUUID();},reply:async()=>({data:response,error:null} as any),
  db:{auth:{getUser:async()=>{calls.push('auth');return {data:{user:{id:userId}},error:null};}},rpc:async(name:string,args:Record<string,string>)=>{calls.push(name);assert.equal(name,'observe_professor_dispatch_v1');assert.deepEqual(args,{p_reference_id:receipt.reference.id,p_request_id:receipt.requestId});return f.reply();}},
  controller:undefined as any};
 f.controller=createProfessorRecoveryController(f.db,initial,()=>current);return f;
}
for(const state of ['no_admission_observed','admitted_not_claimed','dispatch_unconfirmed','dispatch_acknowledged'] as const)test(`${state}: observation never authorizes retry or asserts learning`,async()=>{
 const f=fixture();f.response.state=state;if(state==='no_admission_observed')f.response.sessionId=null;
 const result=await f.controller.refresh();assert.deepEqual(result,f.response);assert.equal(result.retryAllowed,false);assert.equal(result.providerAdmission,false);
 assert.ok(professorRecoveryMessage(result).length>30);assert.deepEqual(f.calls,['auth','observe_professor_dispatch_v1','auth']);
 assert.doesNotMatch(JSON.stringify(result),/callback|token|technicalBrief|mastery|pronunciation/);
});
for(const change of ['account','lesson','version','request','reference','hash','epoch','logout','auth','dispose','abort'])test(`${change} during RPC discards late observation`,async()=>{
 const f=fixture(),abort=new AbortController();f.reply=async()=>{
  if(change==='account')f.change(x=>{x.receipt.userId=randomUUID();});
  if(change==='lesson')f.change(x=>{x.receipt.reference.identity.lessonId=randomUUID();});
  if(change==='version')f.change(x=>{x.receipt.reference.identity.contentVersion++;});
  if(change==='request')f.change(x=>{x.receipt.requestId=randomUUID();});
  if(change==='reference')f.change(x=>{x.receipt.reference.id=randomUUID();});
  if(change==='hash')f.change(x=>{x.receipt.reference.sha256='b'.repeat(64);});
  if(change==='epoch')f.change(x=>{x.epoch++;});
  if(change==='logout')f.logout();if(change==='auth')f.switchAuth();if(change==='dispose')f.controller.dispose();if(change==='abort')abort.abort();
  return {data:f.response,error:null};
 };
 await assert.rejects(()=>f.controller.refresh(abort.signal),ProfessorObservationDiscarded);
 assert.equal(f.calls.filter(x=>x==='observe_professor_dispatch_v1').length,1);
});
test('overlapping manual refreshes discard older responses, including after a newer failure',async()=>{
 const f=fixture();let resolveFirst!:(v:any)=>void,entered!:(v?:unknown)=>void;
 const ready=new Promise(r=>{entered=r;});let count=0;
 f.reply=async()=>{if(++count===1){entered();return new Promise(r=>{resolveFirst=r;});}throw Error('PRIVATE_NETWORK');};
 const first=f.controller.refresh();await ready;
 await assert.rejects(()=>f.controller.refresh(),ProfessorObservationUnavailable);
 resolveFirst({data:f.response,error:null});await assert.rejects(()=>first,ProfessorObservationDiscarded);assert.equal(count,2);
});
test('early invalidation, cancellation and account switch stop before any read RPC',async()=>{
 for(const change of ['dispose','abort','auth']){const f=fixture(),abort=new AbortController();if(change==='dispose')f.controller.dispose();if(change==='abort')abort.abort();if(change==='auth')f.switchAuth();
  await assert.rejects(()=>f.controller.refresh(abort.signal),ProfessorObservationDiscarded);assert.ok(!f.calls.includes('observe_professor_dispatch_v1'));}
});
test('unknown, secret-bearing, capability-bearing and inconsistent observations fail closed without retry',async()=>{
 const mutations=[(x:any)=>{x.state='completed';},(x:any)=>{x.sessionId=null;},(x:any)=>{x.sessionId='bad';},(x:any)=>{x.state='no_admission_observed';},(x:any)=>{x.retryAllowed=true;},(x:any)=>{x.providerAdmission=true;},(x:any)=>{x.token='PRIVATE';},(x:any)=>{delete x.retryAllowed;}];
 for(const mutate of mutations){const f=fixture();mutate(f.response);await assert.rejects(()=>f.controller.refresh(),ProfessorObservationUnavailable);assert.equal(f.calls.filter(x=>x==='observe_professor_dispatch_v1').length,1);}
});
test('auth and RPC failures expose no raw secret and never trigger another operation',async()=>{
 for(const error of ['auth','rpc','rpc_result']){const f=fixture();if(error==='auth')f.db.auth.getUser=async()=>{throw Error('PRIVATE_AUTH');};else f.reply=async()=>{if(error==='rpc')throw Error('PRIVATE_RPC');return {data:f.response,error:{message:'PRIVATE_ERROR'}};};
  await assert.rejects(()=>f.controller.refresh(),(e:any)=>e instanceof ProfessorObservationUnavailable&&!e.message.includes('PRIVATE')&&!e.retryAllowed);
  assert.ok(f.calls.filter(x=>x==='observe_professor_dispatch_v1').length<=1);}
});
test('captured scope cannot be changed by mutating the original object',async()=>{
 const f=fixture();f.initial.receipt.reference.sha256='b'.repeat(64);assert.equal((await f.controller.refresh()).state,'dispatch_unconfirmed');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverRecovery} from '../src/professor/discoverRecovery.ts';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function fixture(){
 const calls:string[]=[];const data:any={attempts:[{referenceId:id,requestId:id,sessionId:id,state:'dispatch_unconfirmed'}],truncated:false,providerAdmission:false,retryAllowed:false};
 const f={calls,data,db:{auth:{async getUser(){calls.push('auth');return {data:{user:{id}},error:null};}},async rpc(name:string,...args:any[]){calls.push(name);assert.deepEqual(args,[]);return {data,error:null};}}};return f;
}
test('fresh Auth around owner-only discovery, no local pointer or payload',async()=>{
 const f=fixture();assert.deepEqual(await discoverRecovery(f.db,id,new AbortController().signal),f.data);
 assert.deepEqual(f.calls,['auth','list_professor_recovery_v1','auth']);
});
test('empty result never authorizes admission',async()=>{
 const f=fixture();f.data.attempts=[];assert.equal((await discoverRecovery(f.db,id,new AbortController().signal)).retryAllowed,false);
});
test('extra fields, capabilities, duplicate IDs and malformed results fail closed',async()=>{
 for(const mutate of [(x:any)=>{x.token='PRIVATE';},(x:any)=>{x.retryAllowed=true;},(x:any)=>{x.attempts.push(x.attempts[0]);},(x:any)=>{x.attempts[0].sessionId='bad';},(x:any)=>{x.attempts[0].state='completed';},(x:any)=>{x.attempts=Array(21).fill(x.attempts[0]);}]){
  const f=fixture();mutate(f.data);await assert.rejects(()=>discoverRecovery(f.db,id,new AbortController().signal),/^Error: recovery_unavailable$/);
 }
});
test('changed owner after query discards results',async()=>{
 const f=fixture();let n=0;f.db.auth.getUser=async()=>({data:{user:{id:++n===1?id:'different'}},error:null});
 await assert.rejects(()=>discoverRecovery(f.db,id,new AbortController().signal),/recovery_unavailable/);
});
test('stalled authentication times out and cannot later issue RPC',async()=>{
 const f=fixture();let resolve!:(x:any)=>void;f.db.auth.getUser=()=>new Promise(r=>{resolve=r;});
 await assert.rejects(()=>discoverRecovery(f.db,id,new AbortController().signal,20),/recovery_unavailable/);
 resolve({data:{user:{id}},error:null});await new Promise(r=>setImmediate(r));assert.deepEqual(f.calls,[]);
});
test('abort settles a stalled RPC',async()=>{
 const f=fixture(),controller=new AbortController();let entered!:()=>void;const ready=new Promise<void>(r=>{entered=r;});
 f.db.rpc=()=>{entered();return new Promise(()=>{});};const pending=discoverRecovery(f.db,id,controller.signal);await ready;controller.abort();
 await assert.rejects(()=>pending,/recovery_unavailable/);
});

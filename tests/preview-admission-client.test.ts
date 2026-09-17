import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewAdmission} from '../src/professor/previewAdmission.ts';
import {createSharedProfessorRoutes} from '../quality/candidates/professor-shared-routes.ts';
import {createAdmissionRecoveryJournal} from '../src/professor/admissionRecoveryJournal.ts';
const id=(n:number)=>`${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
function fixture(){
 const selection={userId:id(1),requestId:id(2),mode:'chapter_conversation' as const,identity:{lessonId:id(3),moduleId:id(4),courseId:id(5),lessonSlug:'fixture-p1',contentVersion:1,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2}};
 const receipt={requestId:selection.requestId,userId:selection.userId,mode:selection.mode,reference:{id:id(6),sha256:'a'.repeat(64),version:'p1-reference-candidate-v1',identity:{...selection.identity}}};
 const acknowledgement={...receipt,sessionId:id(7),reservationId:id(8),roomName:'validation:lh-'+id(9),validationMode:true,qualityTier:'premium',maxSessionSeconds:60,providerAdmission:false};
 const calls:any[]=[];let owner=selection.userId;
 const auth={async getSession(){return {data:{session:{user:{id:owner},access_token:'fixture-token'}},error:null};}};
 const f={selection,receipt,acknowledgement,calls,auth,changeOwner(){owner=id(9);},
  reply:async(body:any)=>body.action==='preflight'?{receipt}:{status:'admitted',acknowledgement,retryAllowed:false},
  request:async(url:any,init:any)=>{calls.push({url,...init,body:JSON.parse(init.body)});return new Response(JSON.stringify(await f.reply(JSON.parse(init.body))),{status:200});}};
 return f;
}
test('client connects exact preflight to one start and never sends local answers',async()=>{
 const f=fixture(),client=createPreviewAdmission(f.auth,{...f.selection,draft:'PRIVATE',answer:'PRIVATE'} as any,f.request as any);
 f.selection.identity.lessonId=id(9);
 const result=await client.start();assert.equal(result.status,'admitted');
 assert.deepEqual(f.calls.map(c=>c.body),[{action:'preflight',kind:'p1',lessonId:id(3),requestedTrack:'rafael_finance',requestId:id(2),mode:'chapter_conversation'},{action:'start',referenceId:id(6),requestId:id(2)}]);
 for(const c of f.calls){assert.equal(c.url,'/api/professor-admission');assert.equal(c.cache,'no-store');assert.equal(c.redirect,'error');}
 assert.doesNotMatch(JSON.stringify(f.calls),/PRIVATE|draft|answer/);
 assert.equal((await client.start()).status,'unconfirmed');assert.equal(f.calls.length,2);
});
test('wrong preflight identity prevents start',async()=>{
 const f=fixture();f.receipt.reference.identity.contentVersion=2;
 assert.equal((await createPreviewAdmission(f.auth,f.selection,f.request as any).start()).status,'unavailable');assert.equal(f.calls.length,1);
});
test('account switch after preflight prevents start',async()=>{
 const f=fixture();f.reply=async()=>{f.changeOwner();return {receipt:f.receipt} as any;};
 assert.equal((await createPreviewAdmission(f.auth,f.selection,f.request as any).start()).status,'unavailable');assert.equal(f.calls.length,1);
});
test('lost start reply is uncertain and never retried',async()=>{
 const f=fixture();f.reply=async b=>{if(b.action==='start')throw Error('lost');return {receipt:f.receipt} as any;};
 const c=createPreviewAdmission(f.auth,f.selection,f.request as any);
 assert.deepEqual(await c.start(),{status:'unconfirmed',retryAllowed:false,reservationMayExist:true});await c.start();assert.equal(f.calls.length,2);
});
test('mismatched acknowledgement cannot authorize a provider',async()=>{
 const f=fixture();f.acknowledgement.reservationId='invalid';
 assert.equal((await createPreviewAdmission(f.auth,f.selection,f.request as any).start()).status,'unconfirmed');
});
test('stalled preflight times out and late reply cannot start',async()=>{
 const f=fixture();let resolve!:(v:any)=>void;f.reply=()=>new Promise(r=>{resolve=r;});
 const c=createPreviewAdmission(f.auth,f.selection,f.request as any,20);
 assert.deepEqual(await c.start(),{status:'unavailable',retryAllowed:false,reservationMayExist:false});
 resolve({receipt:f.receipt});await new Promise(r=>setImmediate(r));assert.equal(f.calls.length,1);
});
test('dispose during start preserves uncertainty even when fetch ignores abort',async()=>{
 const f=fixture();let submitted!:()=>void;const ready=new Promise<void>(r=>{submitted=r;});
 f.reply=async b=>{if(b.action==='start'){submitted();return new Promise(()=>{});}return {receipt:f.receipt} as any;};
 const c=createPreviewAdmission(f.auth,f.selection,f.request as any);const pending=c.start();await ready;c.dispose();
 assert.deepEqual(await pending,{status:'unconfirmed',retryAllowed:false,reservationMayExist:true});assert.equal(f.calls.length,2);
});
test('closed endpoint never reaches start',async()=>{
 const f=fixture();let calls=0;
 const request=async()=>{calls++;return new Response(JSON.stringify({error:'admission_not_enabled',retryAllowed:false}),{status:503});};
 assert.equal((await createPreviewAdmission(f.auth,f.selection,request as any).start()).status,'unavailable');assert.equal(calls,1);
});
test('client interoperates with shared server route and bound admission contract',async()=>{
 const f=fixture();const events:string[]=[];let saved:any;
 const snapshot={receipt:f.receipt,callbackToken:'b'.repeat(64),roomName:f.acknowledgement.roomName,lessonContext:{technicalBrief:'SERVER_ONLY'}};
 const db={auth:{async getUser(){events.push('auth');return {data:{user:{id:f.selection.userId}},error:null};}},async rpc(name:string,args:any){
  events.push(name);assert.equal(args.p_reference_id,f.receipt.reference.id);
  return {error:null,data:{allowed:true,session_id:id(7),reservation_id:id(8),room_name:snapshot.roomName,validation_mode:true,quality_tier:'premium',max_session_seconds:60,reservation_usd:0.1,
   written_reference:{reference_id:f.receipt.reference.id,source_sha256:f.receipt.reference.sha256,descriptor_version:f.receipt.reference.version,identity:f.receipt.reference.identity}}};
 }};
 const route=createSharedProfessorRoutes({env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'},makeClient:()=>db,serviceDb:{},
  prepare:async()=>({receipt:f.receipt,getPrivateSnapshot:()=>snapshot}) as any,
  store:{async put(value:any){events.push('put');saved=structuredClone(value);},async consume(scope:any){events.push('consume');assert.equal(scope.userId,f.selection.userId);const value=saved;saved=null;return value;}} as any});
 const request=async(_url:any,init:any)=>{const {action,...body}=JSON.parse(init.body);const r=await route('/professor/'+action,init.headers.Authorization,body);return new Response(JSON.stringify(r.body),{status:r.status});};
 const result=await createPreviewAdmission(f.auth,f.selection,request as any).start();
 assert.equal(result.status,'admitted');assert.equal(saved,null);
 assert.deepEqual(events,['auth','put','auth','consume','auth','start_written_professor_session_v1']);
 assert.doesNotMatch(JSON.stringify(result),/SERVER_ONLY|callbackToken/);
});
test('recovery receipt survives reload before a lost start response without secrets',async()=>{
 const f=fixture(),values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const journal=createAdmissionRecoveryJournal(storage,f.selection.userId);
 f.reply=async b=>{if(b.action==='start'){assert.deepEqual(journal.read(),f.receipt);throw Error('lost response');}return {receipt:f.receipt} as any;};
 assert.equal((await createPreviewAdmission(f.auth,f.selection,f.request as any,15000,journal.save).start()).status,'unconfirmed');
 const reloaded=createAdmissionRecoveryJournal(storage,f.selection.userId);
 assert.deepEqual(reloaded.read(),f.receipt);
 assert.equal(createAdmissionRecoveryJournal(storage,id(9)).read(),null);
 assert.doesNotMatch(JSON.stringify([...values]),/fixture-token|draft|answer|callbackToken/);
 const other=structuredClone(f.receipt);other.requestId=id(9);
 assert.throws(()=>reloaded.save(other),/recovery_required/);
 assert.deepEqual(reloaded.read(),f.receipt);
});
test('only the exact definitely unreserved checkpoint can be cleared',()=>{
 const f=fixture(),values=new Map<string,string>();
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
 const journal=createAdmissionRecoveryJournal(storage,f.selection.userId);journal.save(f.receipt);
 const other=structuredClone(f.receipt);other.requestId=id(9);
 assert.throws(()=>journal.clear(other),/recovery_required/);assert.deepEqual(journal.read(),f.receipt);
 journal.clear(f.receipt);assert.equal(journal.read(),null);assert.throws(()=>journal.clear(f.receipt),/recovery_required/);
});
test('unavailable or nonpersisting recovery storage prevents start',async()=>{
 for(const silentlyIgnore of [false,true]){
  const f=fixture(),journal=createAdmissionRecoveryJournal({getItem:()=>null,setItem:()=>{if(!silentlyIgnore)throw Error('quota');}},f.selection.userId);
  assert.equal((await createPreviewAdmission(f.auth,f.selection,f.request as any,15000,journal.save).start()).status,'unavailable');
  assert.equal(f.calls.length,1);
 }
});
test('corrupted and overposted recovery records fail closed',()=>{
 const f=fixture();
 for(const receipt of [{...f.receipt,token:'SECRET'},{...f.receipt,userId:id(9)}]){
  const j=createAdmissionRecoveryJournal({getItem:()=>JSON.stringify({version:1,receipt}),setItem:()=>{}},f.selection.userId);
  assert.throws(()=>j.read());assert.throws(()=>j.save(receipt as any));
 }
});

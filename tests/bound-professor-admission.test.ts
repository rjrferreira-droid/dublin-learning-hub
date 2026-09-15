import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareBoundProfessorAdmission,ProfessorAdmissionUnconfirmed} from '../quality/candidates/prepare-bound-professor-admission.ts';
import {assertProfessorAdmissionAcknowledgement,assertProfessorReferenceReceipt} from '../quality/candidates/professor-admission-contract.ts';
import {p1SlugFor,type P1Track} from '../src/learning/p1RuntimeRegistry.ts';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';
const ids={user:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lesson:'11111111-1111-4111-8111-111111111111',module:'22222222-2222-4222-8222-222222222222',course:'33333333-3333-4333-8333-333333333333',request:'44444444-4444-4444-8444-444444444444',ticket:'55555555-5555-4555-8555-555555555555',session:'66666666-6666-4666-8666-666666666666',reservation:'77777777-7777-4777-8777-777777777777'};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'} as const;
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
function fixture(kind:'p1'|'written'='p1',track:P1Track='finance'){
 const events:string[]=[],rpcArgs:any[]=[];let currentUser:string=ids.user,mint:any;
 const rows:any={profiles:{id:ids.user,learner_track:track==='payroll'?tracks.payroll:tracks.finance},lessons:{id:ids.lesson,module_id:ids.module,slug:kind==='p1'?p1SlugFor(track):sequence3SlugFor(track),sequence:kind==='p1'?2:3,content_version:1,is_published:true},modules:{id:ids.module,course_id:ids.course,is_published:true},courses:{id:ids.course,learner_track:tracks[track],is_active:true}};
 const f={events,rpcArgs,rows,reply:(r:any)=>({data:r,error:null} as any),changeUser:()=>{currentUser=ids.course;},
  input:{kind,lessonId:ids.lesson,requestedTrack:tracks[track],requestId:ids.request,mode:'chapter_conversation' as const},
  db:{auth:{getUser:async()=>{events.push('auth');return {data:{user:{id:currentUser}},error:null};}},
   from(table:string){const q={select(){return q;},eq(){return q;},async maybeSingle(){events.push(table);return {data:rows[table],error:null};}};return q;},
   async rpc(name:string,args:any){events.push(name);rpcArgs.push(args);assert.equal(name,'start_written_professor_session_v1');return f.reply({allowed:true,session_id:ids.session,reservation_id:ids.reservation,room_name:args.p_room_name,validation_mode:true,quality_tier:'premium',max_session_seconds:60,reservation_usd:0.10,
    written_reference:{reference_id:ids.ticket,identity:mint.p_identity,source_sha256:mint.p_source_sha256,descriptor_version:mint.p_descriptor_version}});}},
  service:{rpc:async(name:string,args:any)=>{events.push(name);assert.equal(name,'create_written_professor_reference_v1');mint=args;return {data:{reference_id:ids.ticket,source_sha256:args.p_source_sha256,descriptor_version:args.p_descriptor_version,expires_at:new Date(Date.now()+300000).toISOString()}};}},
 };
 return f;
}
for(const kind of ['p1','written'] as const)for(const track of Object.keys(tracks) as P1Track[])test(`${kind} ${track}: server reference → mint → atomic start → exact public acknowledgement`,async()=>{
 const f=fixture(kind,track);
 const prepared=await prepareBoundProfessorAdmission(f.db,f.service,{...f.input,draft:'PRIVATE_DRAFT',answer:'PRIVATE_ANSWER',callbackToken:'FORGED',validationMode:false} as any,env);
 assert.equal(f.rpcArgs.length,0);const expected=structuredClone(prepared.receipt);
 const result=await prepared.start();assert.equal(result.status,'admitted');if(result.status!=='admitted')assert.fail('admission required');
 assertProfessorAdmissionAcknowledgement(result.acknowledgement,expected);
 assert.equal(result.acknowledgement.providerAdmission,false);assert.equal(result.acknowledgement.validationMode,true);
 assert.equal(createHash('sha256').update(result.getServerContext().callbackToken).digest('hex'),f.rpcArgs[0].p_callback_hash);
 assert.doesNotMatch(JSON.stringify(result),new RegExp(result.getServerContext().callbackToken));
 assert.doesNotMatch(JSON.stringify(result),/technicalBrief|callbackToken/);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_DRAFT|PRIVATE_ANSWER|FORGED/);
 assert.equal(f.rpcArgs[0].p_validation_mode,true);
 assert.deepEqual(f.events,['auth','profiles','lessons','modules','courses','create_written_professor_reference_v1','auth','start_written_professor_session_v1']);
 await assert.rejects(()=>prepared.start(),/already_used/);assert.equal(f.rpcArgs.length,1);
});
test('captured request and reference cannot be changed by mutating the returned preflight copy',async()=>{
 const f=fixture();const p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env);const expected=structuredClone(p.receipt);
 p.receipt.reference.identity.lessonId=ids.course;p.receipt.reference.sha256='b'.repeat(64);f.input.requestId=ids.course;
 const result=await p.start();assert.equal(result.status,'admitted');if(result.status==='admitted')assertProfessorAdmissionAcknowledgement(result.acknowledgement,expected);
 assert.equal(f.rpcArgs[0].p_request_id,ids.request);
});
test('preflight must match the current catalog selection and account before asking for admission',async()=>{
 const f=fixture(),p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env);
 const selected={requestId:ids.request,userId:ids.user,mode:f.input.mode,identity:{...p.receipt.reference.identity}};
 assertProfessorReferenceReceipt(p.receipt,selected);
 for(const mutate of [(x:any)=>{x.userId=ids.course;},(x:any)=>{x.requestId=ids.course;},(x:any)=>{x.identity.contentVersion=2;},(x:any)=>{x.identity.lessonId=ids.course;}]){
  const changed=structuredClone(selected);mutate(changed);assert.throws(()=>assertProfessorReferenceReceipt(p.receipt,changed),/receipt_mismatch/);
 }
 assert.equal(f.rpcArgs.length,0);
});
test('invalid request, production, account switch and early cancellation stop before admission',async()=>{
 const bad=fixture();await assert.rejects(()=>prepareBoundProfessorAdmission(bad.db,bad.service,{...bad.input,requestId:'bad'},env),/request_invalid/);assert.deepEqual(bad.events,[]);
 await assert.rejects(()=>prepareBoundProfessorAdmission(bad.db,bad.service,bad.input,{VERCEL_ENV:'production'}),/unavailable/);assert.deepEqual(bad.events,[]);
 const f=fixture(),p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env);f.changeUser();await assert.rejects(()=>p.start(),/account_changed/);assert.equal(f.rpcArgs.length,0);
 const g=fixture(),controller=new AbortController(),q=await prepareBoundProfessorAdmission(g.db,g.service,g.input,env,controller.signal);controller.abort();await assert.rejects(()=>q.start(),{name:'AbortError'});assert.equal(g.rpcArgs.length,0);
});
test('concurrent starts on one prepared request make exactly one admission call',async()=>{
 const f=fixture(),p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env);
 const results=await Promise.allSettled([p.start(),p.start()]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.rpcArgs.length,1);
});
test('known denials expose no callback, source content or session capability',async()=>{
 for(const reason of ['professor_monthly_budget_reached','professor_session_already_active','professor_start_rate_limited','request_already_started']){
  const f=fixture();f.reply=()=>({data:{allowed:false,reason,session_id:ids.session,token:'UNTRUSTED'}});
  const p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env);assert.deepEqual(await p.start(),{status:'denied',reason});
 }
});
test('lost acknowledgement, malformed success or post-submit cancellation never retries or releases a possible reservation',async()=>{
 const mutations=[(r:any)=>{r.allowed='true';},(r:any)=>{r.written_reference.identity={...r.written_reference.identity,contentVersion:2};},
  (r:any)=>{r.written_reference.source_sha256='b'.repeat(64);},(r:any)=>{r.written_reference.reference_id=ids.course;},
  (r:any)=>{r.written_reference.descriptor_version='wrong';},(r:any)=>{r.session_id=null;},(r:any)=>{r.reservation_id='bad';},
  (r:any)=>{r.room_name='validation:lh-'+ids.course;},(r:any)=>{r.validation_mode=false;},(r:any)=>{r.quality_tier='standard';},
  (r:any)=>{r.max_session_seconds=9999;},(r:any)=>{r.reservation_usd=NaN;},(r:any)=>{r.allowed=false;r.reason='unknown';}];
 for(const mutate of mutations){const f=fixture();f.reply=r=>{mutate(r);return {data:r};};const p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env);
  await assert.rejects(()=>p.start(),ProfessorAdmissionUnconfirmed);await assert.rejects(()=>p.start(),/already_used/);assert.equal(f.rpcArgs.length,1);}
 for(const lost of ['throw','error','abort']){const f=fixture(),controller=new AbortController();f.reply=()=>{if(lost==='throw')throw Error('SECRET_NETWORK_DETAIL');if(lost==='abort')controller.abort();return {error:{message:'SECRET_RPC_DETAIL'}};};
  const p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env,controller.signal);await assert.rejects(()=>p.start(),(e:any)=>e instanceof ProfessorAdmissionUnconfirmed&&e.reservationMayExist&&!e.message.includes('SECRET'));assert.equal(f.rpcArgs.length,1);}
});
test('browser-safe contract rejects swapped account/request/reference, every identity field, invalid session and secret-bearing responses',async()=>{
 const f=fixture(),p=await prepareBoundProfessorAdmission(f.db,f.service,f.input,env),result=await p.start();if(result.status!=='admitted')assert.fail('admission required');
 const changes=[(a:any)=>{a.userId=ids.course;},(a:any)=>{a.requestId=ids.course;},(a:any)=>{a.mode='oral_mock';},(a:any)=>{a.reference.id=ids.course;},(a:any)=>{a.reference.sha256='b'.repeat(64);},
  ...Object.keys(p.receipt.reference.identity).map(k=>(a:any)=>{a.reference.identity[k]=typeof a.reference.identity[k]==='number'?99:'different';}),
  (a:any)=>{a.sessionId='bad';},(a:any)=>{a.providerAdmission=true;},(a:any)=>{a.validationMode=false;},(a:any)=>{a.roomName='lh-'+ids.session;},
  (a:any)=>{a.token='SECRET';},(a:any)=>{a.serverOnly={callbackToken:'SECRET'};},(a:any)=>{a.reference.identity.draft='PRIVATE';}];
 for(const change of changes){const a=structuredClone(result.acknowledgement);change(a);assert.throws(()=>assertProfessorAdmissionAcknowledgement(a,p.receipt),/mismatch/);}
});

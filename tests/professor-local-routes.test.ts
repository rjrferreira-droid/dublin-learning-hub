import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createLocalProfessorRoutes} from '../quality/candidates/professor-local-routes.ts';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
function fixture(){
 const uid=randomUUID(),other=randomUUID();let clock=1;
 const f={auth:0,prepares:0,starts:0,input:{kind:'p1',lessonId:randomUUID(),requestedTrack:'rafael_finance',requestId:randomUUID(),mode:'chapter_conversation'},
  advance:()=>{clock+=240001;},finish:async()=>({status:'denied',reason:'professor_monthly_budget_reached'} as any),
  deps:{env,serviceDb:{},now:()=>clock,makeClient:(token:string)=>({auth:{getUser:async()=>{f.auth++;return {data:{user:token==='bad'?null:{id:token==='other'?other:uid}},error:null};}}}),
   prepare:async()=>{f.prepares++;return {receipt:{userId:uid,requestId:f.input.requestId,reference:{id:randomUUID()}},start:async()=>{f.starts++;return f.finish();}};}}};
 const route=createLocalProfessorRoutes(f.deps as any);
 return {...f,route,state:f};
}
async function preflight(f:ReturnType<typeof fixture>){const result:any=await f.route('/professor/preflight','Bearer own',f.input);assert.equal(result.status,200);return {referenceId:result.body.receipt.reference.id,requestId:f.input.requestId};}
test('authenticated preparation and zero-budget denial expose only public fields',async()=>{
 const f=fixture(),start=await preflight(f);const result=await f.route('/professor/start','Bearer own',start);
 assert.deepEqual(result,{status:200,body:{status:'denied',reason:'professor_monthly_budget_reached',retryAllowed:false}});assert.equal(f.state.starts,1);
});
test('missing/invalid authentication and overposted private fields stop before preparation',async()=>{
 const f=fixture();for(const header of [undefined,'Basic token','Bearer bad'])assert.equal((await f.route('/professor/preflight',header,f.input)).status,401);
 for(const extra of [{draft:'PRIVATE'},{callbackToken:'PRIVATE'},{userId:randomUUID()},{validationMode:false}])assert.equal((await f.route('/professor/preflight','Bearer own',{...f.input,...extra})).status,400);
 assert.equal(f.state.prepares,0);assert.equal(f.state.starts,0);
});
test('another owner and mismatched request cannot consume the preflight',async()=>{
 const f=fixture(),start=await preflight(f);
 assert.equal((await f.route('/professor/start','Bearer other',start)).status,403);
 assert.equal((await f.route('/professor/start','Bearer own',{...start,requestId:randomUUID()})).status,409);
 assert.equal(f.state.starts,0);assert.equal((await f.route('/professor/start','Bearer own',start)).status,200);
});
test('simultaneous starts invoke the captured admission at most once',async()=>{
 const f=fixture(),start=await preflight(f);const results=await Promise.all([f.route('/professor/start','Bearer own',start),f.route('/professor/start','Bearer own',start)]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);assert.equal(f.state.starts,1);
});
test('a failed admission remains consumed and raw errors remain private',async()=>{
 const f=fixture(),start=await preflight(f);f.state.finish=async()=>{throw Error('PRIVATE_CALLBACK_TOKEN');};
 assert.deepEqual(await f.route('/professor/start','Bearer own',start),{status:503,body:{error:'professor_admission_unconfirmed',retryAllowed:false}});
 assert.equal((await f.route('/professor/start','Bearer own',start)).status,409);assert.equal(f.state.starts,1);
});
test('expiry and process restart return unavailable without retry authorization',async()=>{
 const f=fixture(),start=await preflight(f);f.advance();
 assert.deepEqual(await f.route('/professor/start','Bearer own',start),{status:410,body:{error:'preflight_unavailable',retryAllowed:false}});
 const restarted=createLocalProfessorRoutes(f.state.deps as any);assert.equal((await restarted('/professor/start','Bearer own',start)).status,410);assert.equal(f.state.starts,0);
});
test('unexpected positive admission omits private server getters and extra result fields',async()=>{
 const f=fixture(),start=await preflight(f);f.state.finish=async()=>({status:'admitted',acknowledgement:{providerAdmission:false},getServerContext:()=>({callbackToken:'PRIVATE'}),getDispatchEnvelope:()=> 'PRIVATE',other:'PRIVATE'});
 const result=await f.route('/professor/start','Bearer own',start);assert.deepEqual(result.body,{status:'admitted',acknowledgement:{providerAdmission:false},retryAllowed:false});assert.doesNotMatch(JSON.stringify(result),/PRIVATE|getServerContext|other/);
});
test('bounded preflight storage and production guard fail closed',async()=>{
 assert.throws(()=>createLocalProfessorRoutes({...fixture().state.deps,env:{VERCEL_ENV:'production'}} as any),/unavailable/);
 const f=fixture();for(let i=0;i<128;i++)await preflight(f);
 assert.equal((await f.route('/professor/preflight','Bearer own',f.input)).status,429);assert.equal(f.state.prepares,128);
 f.advance();assert.equal((await f.route('/professor/preflight','Bearer own',f.input)).status,200);
});

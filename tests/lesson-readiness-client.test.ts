import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkLessonReadiness,LESSON_READINESS_TIMEOUT_MS} from '../src/professor/checkLessonReadiness.ts';
const selection={userId:'owner',lessonId:'lesson',lessonSlug:'slug',requestedTrack:'english_academy'};
function fixture(){
 let owner:string|null='owner';
 const auth={getSession:async()=>({data:{session:owner?{user:{id:owner},access_token:'fictional'}:null}})};
 const result:any={status:'reference_verified_activation_closed',providerAdmission:false,premiumAudioAdmission:false,validationOnly:true,identity:{lessonId:'lesson',lessonSlug:'slug',requestedTrack:'english_academy',contentVersion:1}};
 return {auth,result,setOwner:(x:string|null)=>{owner=x;},signal:new AbortController()};
}
test('sends only identity, never drafts or user id',async()=>{const f=fixture();const request:any=async(url:string,options:any)=>{assert.equal(url,'/api/professor-readiness');assert.deepEqual(JSON.parse(options.body),{lessonId:'lesson',requestedTrack:'english_academy'});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>f.result};};assert.equal(await checkLessonReadiness(f.auth,{...selection,draft:'private'} as any,f.signal.signal,request),true);});
for(const state of ['logout','other-account','abort','paid','wrong-id','wrong-slug','wrong-track','bad-version','http-error','network-error'])test(`reject ${state}`,async()=>{const f=fixture();const request:any=async()=>{
 if(state==='logout')f.setOwner(null);if(state==='other-account')f.setOwner('other');if(state==='abort')f.signal.abort();if(state==='paid')f.result.providerAdmission=true;
 if(state==='wrong-id')f.result.identity.lessonId='other';if(state==='wrong-slug')f.result.identity.lessonSlug='other';if(state==='wrong-track')f.result.identity.requestedTrack='other';if(state==='bad-version')f.result.identity.contentVersion=0;
 if(state==='network-error')throw Error('secret');return {ok:state!=='http-error',json:async()=>f.result};};assert.equal(await checkLessonReadiness(f.auth,selection,f.signal.signal,request),false);});
test('Auth failure never escapes or calls endpoint',async()=>{assert.equal(await checkLessonReadiness({getSession:async()=>{throw Error('secret');}},selection,new AbortController().signal,async()=>{throw Error('must not run');}),false);});
test('wrong initial owner never fetches',async()=>{const f=fixture();f.setOwner('other');let calls=0;assert.equal(await checkLessonReadiness(f.auth,selection,f.signal.signal,async()=>{calls++;throw Error();}),false);assert.equal(calls,0);});
for(const phase of ['initial-auth','fetch','body','final-auth'])test(`deadline bounds stalled ${phase} without retries`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const f=fixture();let authCalls=0,fetchCalls=0;let release!:(v:any)=>void;
 const stalled=new Promise<any>(resolve=>{release=resolve;});
 const session={data:{session:{user:{id:'owner'},access_token:'fictional'}}};
 const auth={getSession:async()=>{authCalls++;return (phase==='initial-auth'&&authCalls===1)||(phase==='final-auth'&&authCalls===2)?stalled:session;}};
 let requestSignal:AbortSignal|undefined;
 const response={ok:true,json:async()=>phase==='body'?stalled:f.result};
 const request:any=async(_url:string,options:any)=>{fetchCalls++;requestSignal=options.signal;return phase==='fetch'?stalled:response;};
 const pending=checkLessonReadiness(auth,selection,f.signal.signal,request);
 for(let i=0;i<12;i++)await Promise.resolve();
 t.mock.timers.tick(LESSON_READINESS_TIMEOUT_MS);
 assert.equal(await pending,false);if(requestSignal)assert.equal(requestSignal.aborted,true);
 const callsAtTimeout={authCalls,fetchCalls};
 release(phase.includes('auth')?session:phase==='fetch'?response:f.result);
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.deepEqual({authCalls,fetchCalls},callsAtTimeout);
});
test('external cancellation settles even if Auth never returns',async()=>{
 const controller=new AbortController();let fetchCalls=0;
 const pending=checkLessonReadiness({getSession:()=>new Promise(()=>{})},selection,controller.signal,async()=>{fetchCalls++;throw Error();});
 controller.abort();assert.equal(await pending,false);assert.equal(fetchCalls,0);
});
test('already cancelled check does not read Auth or fetch',async()=>{
 const controller=new AbortController();controller.abort();
 assert.equal(await checkLessonReadiness({getSession:()=>{throw Error('must not read');}},selection,controller.signal),false);
});

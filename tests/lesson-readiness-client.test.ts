import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkLessonReadiness,LESSON_READINESS_TIMEOUT_MS} from '../src/professor/checkLessonReadiness.ts';
const owner='11111111-1111-4111-8111-111111111111',lesson='22222222-2222-4222-8222-222222222222',moduleId='33333333-3333-4333-8333-333333333333',courseId='44444444-4444-4444-8444-444444444444';
const selection={userId:owner,lessonId:lesson,lessonSlug:'slug',requestedTrack:'english_academy' as const};
function fixture(){
 let currentOwner:string|null=owner;
 const auth={getSession:async()=>({data:{session:currentOwner?{user:{id:currentOwner},access_token:'fictional'}:null}})};
 const result:any={status:'reference_verified_activation_closed',providerAdmission:false,premiumAudioAdmission:false,validationOnly:true,identity:{lessonId:lesson,moduleId,courseId,lessonSlug:'slug',contentVersion:1,requestedTrack:'english_academy',studyTrack:'english',sequence:2}};
 return {auth,result,setOwner:(x:string|null)=>{currentOwner=x;},signal:new AbortController()};
}
test('returns complete exact identity and never sends drafts or user id',async()=>{const f=fixture();const request:any=async(url:string,options:any)=>{assert.equal(url,'/api/professor-readiness');assert.deepEqual(JSON.parse(options.body),{lessonId:lesson,requestedTrack:'english_academy'});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>f.result};};assert.deepEqual(await checkLessonReadiness(f.auth,{...selection,draft:'private'} as any,f.signal.signal,request),f.result.identity);});
for(const state of ['logout','other-account','abort','paid','wrong-id','wrong-slug','wrong-track','bad-version','bad-module','bad-course','wrong-study','wrong-sequence','extra-identity','extra-result','http-error','network-error'])test(`reject ${state}`,async()=>{const f=fixture();const request:any=async()=>{
 if(state==='logout')f.setOwner(null);if(state==='other-account')f.setOwner('other');if(state==='abort')f.signal.abort();if(state==='paid')f.result.providerAdmission=true;
 if(state==='wrong-id')f.result.identity.lessonId='other';if(state==='wrong-slug')f.result.identity.lessonSlug='other';if(state==='wrong-track')f.result.identity.requestedTrack='other';if(state==='bad-version')f.result.identity.contentVersion=0;
 if(state==='bad-module')f.result.identity.moduleId='bad';if(state==='bad-course')f.result.identity.courseId='bad';if(state==='wrong-study')f.result.identity.studyTrack='finance';if(state==='wrong-sequence')f.result.identity.sequence=3;
 if(state==='extra-identity')f.result.identity.token='private';if(state==='extra-result')f.result.token='private';
 if(state==='network-error')throw Error('secret');return {ok:state!=='http-error',json:async()=>f.result};};assert.equal(await checkLessonReadiness(f.auth,selection,f.signal.signal,request),null);});
test('Auth failure never escapes or calls endpoint',async()=>{assert.equal(await checkLessonReadiness({getSession:async()=>{throw Error('secret');}},selection,new AbortController().signal,async()=>{throw Error('must not run');}),null);});
test('wrong initial owner never fetches',async()=>{const f=fixture();f.setOwner('other');let calls=0;assert.equal(await checkLessonReadiness(f.auth,selection,f.signal.signal,async()=>{calls++;throw Error();}),null);assert.equal(calls,0);});
for(const phase of ['initial-auth','fetch','body','final-auth'])test(`deadline bounds stalled ${phase} without retries`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const f=fixture();let authCalls=0,fetchCalls=0;let release!:(v:any)=>void;
 const stalled=new Promise<any>(resolve=>{release=resolve;});
 const session={data:{session:{user:{id:owner},access_token:'fictional'}}};
 const auth={getSession:async()=>{authCalls++;return (phase==='initial-auth'&&authCalls===1)||(phase==='final-auth'&&authCalls===2)?stalled:session;}};
 let requestSignal:AbortSignal|undefined;
 const response={ok:true,json:async()=>phase==='body'?stalled:f.result};
 const request:any=async(_url:string,options:any)=>{fetchCalls++;requestSignal=options.signal;return phase==='fetch'?stalled:response;};
 const pending=checkLessonReadiness(auth,selection,f.signal.signal,request);
 for(let i=0;i<12;i++)await Promise.resolve();
 t.mock.timers.tick(LESSON_READINESS_TIMEOUT_MS);
 assert.equal(await pending,null);if(requestSignal)assert.equal(requestSignal.aborted,true);
 const callsAtTimeout={authCalls,fetchCalls};
 release(phase.includes('auth')?session:phase==='fetch'?response:f.result);
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.deepEqual({authCalls,fetchCalls},callsAtTimeout);
});
test('external cancellation settles even if Auth never returns',async()=>{
 const controller=new AbortController();let fetchCalls=0;
 const pending=checkLessonReadiness({getSession:()=>new Promise(()=>{})},selection,controller.signal,async()=>{fetchCalls++;throw Error();});
 controller.abort();assert.equal(await pending,null);assert.equal(fetchCalls,0);
});
test('already cancelled check does not read Auth or fetch',async()=>{
 const controller=new AbortController();controller.abort();
 assert.equal(await checkLessonReadiness({getSession:()=>{throw Error('must not read');}},selection,controller.signal),null);
});

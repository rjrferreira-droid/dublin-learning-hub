import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkLessonReadiness} from '../src/professor/checkLessonReadiness.ts';
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

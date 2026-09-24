import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPremiumAudioReadiness,PREMIUM_AUDIO_READINESS_TIMEOUT_MS} from '../src/audio/checkPremiumAudioReadiness.ts';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1);
const identity={lessonId:id(2),moduleId:id(3),courseId:id(4),lessonSlug:'fixture-p1',contentVersion:3,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2};
function fixture(){
 let currentOwner:string|null=owner;
 const auth={getSession:async()=>({data:{session:currentOwner?{user:{id:currentOwner},access_token:'fictional'}:null},error:null})};
 const response:any={status:'audio_reference_verified_activation_closed',identity:{...identity},source:{language:'pt-BR',purpose:'study-guide-overview',characters:900,
  scriptSha256:'a'.repeat(64),sourceFingerprint:'b'.repeat(64),referenceSha256:'c'.repeat(64),expectedStoragePath:`lessons/${identity.lessonId}/commentary-v3-${'b'.repeat(64)}-r1.mp3`},
  cacheLookupPerformed:false,runtimeSourceHandoff:false,generationAdmission:false,providerAdmission:false,validationOnly:true};
 return {auth,response,setOwner:(value:string|null)=>{currentOwner=value;}};
}

test('sends only exact identity and accepts a closed read-only binding',async()=>{
 const f=fixture(),calls:any[]=[];
 const request:any=async(url:string,options:any)=>{calls.push({url,...options,body:JSON.parse(options.body)});return new Response(JSON.stringify(f.response),{status:200});};
 const result=await checkPremiumAudioReadiness(f.auth,{userId:owner,identity,draft:'LOCAL_PRIVATE',answer:'LOCAL_PRIVATE'} as any,new AbortController().signal,request);
 assert.deepEqual(result,{identity,source:f.response.source});assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/premium-audio-readiness');
 assert.deepEqual(calls[0].body,{lessonId:identity.lessonId,requestedTrack:'rafael_finance'});assert.equal(calls[0].cache,'no-store');assert.equal(calls[0].redirect,'error');
 assert.doesNotMatch(JSON.stringify(calls),/LOCAL_PRIVATE|draft|answer/);
});

for(const state of ['extra-response','extra-source','wrong-identity','wrong-path','mismatched-fingerprint','wrong-language','cache-read','runtime-open','generation-open','provider-open','bad-hash','bad-fingerprint','bad-characters','http-error'])test(`reject ${state}`,async()=>{
 const f=fixture();
 if(state==='extra-response')f.response.token='secret';if(state==='extra-source')f.response.source.script='secret';
 if(state==='wrong-identity')f.response.identity.contentVersion=4;if(state==='wrong-path')f.response.source.expectedStoragePath=f.response.source.expectedStoragePath.replace('-r1.mp3','-r2.mp3');
 if(state==='mismatched-fingerprint')f.response.source.sourceFingerprint='d'.repeat(64);
 if(state==='wrong-language')f.response.source.language='en';if(state==='cache-read')f.response.cacheLookupPerformed=true;
 if(state==='runtime-open')f.response.runtimeSourceHandoff=true;
 if(state==='generation-open')f.response.generationAdmission=true;if(state==='provider-open')f.response.providerAdmission=true;
 if(state==='bad-hash')f.response.source.scriptSha256='bad';if(state==='bad-fingerprint')f.response.source.sourceFingerprint='B'.repeat(64);if(state==='bad-characters')f.response.source.characters=0;
 const request:any=async()=>new Response(JSON.stringify(f.response),{status:state==='http-error'?503:200});
 assert.equal(await checkPremiumAudioReadiness(f.auth,{userId:owner,identity},new AbortController().signal,request),null);
});

test('account change after the response fails closed',async()=>{
 const f=fixture();const request:any=async()=>{f.setOwner(id(9));return new Response(JSON.stringify(f.response),{status:200});};
 assert.equal(await checkPremiumAudioReadiness(f.auth,{userId:owner,identity},new AbortController().signal,request),null);
});

test('deadline bounds a stalled request without retrying it',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();let calls=0,requestSignal:AbortSignal|undefined;
 const request:any=async(_url:string,options:any)=>{calls++;requestSignal=options.signal;return new Promise(()=>{});};
 const pending=checkPremiumAudioReadiness(f.auth,{userId:owner,identity},new AbortController().signal,request);
 for(let index=0;index<8;index++)await Promise.resolve();t.mock.timers.tick(PREMIUM_AUDIO_READINESS_TIMEOUT_MS);
 assert.equal(await pending,null);assert.equal(calls,1);assert.equal(requestSignal?.aborted,true);
});

test('external cancellation before Auth resolves settles without a request',async()=>{
 const controller=new AbortController();let calls=0;
 const pending=checkPremiumAudioReadiness({getSession:()=>new Promise(()=>{})},{userId:owner,identity},controller.signal,async()=>{calls++;throw Error('must not run');});
 controller.abort();assert.equal(await pending,null);assert.equal(calls,0);
});

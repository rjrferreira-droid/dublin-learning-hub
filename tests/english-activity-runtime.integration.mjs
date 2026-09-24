import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {englishPracticeSession} from '../src/learning/englishPracticeSession.ts';
import {DEEP_ENGLISH_UNIT_1_CONTRACT} from '../src/learning/deepEnglishUnit1.ts';
import {ENGLISH_E1_MODEL_ID as lessonId} from '../src/learning/localEnglishLessonRegistry.ts';
const itemId=englishPracticeSession(lessonId,DEEP_ENGLISH_UNIT_1_CONTRACT).find(row=>row.item.responseMode==='short-text').item.id;
const attemptId='11111111-1111-4111-8111-111111111111';
let handler,state;
function reset(extra={}){state={profile:'rafael_finance',authorized:true,claim:'claimed',paid:0,events:[],preflight:true,settle:true,...extra};}
const db={auth:{getUser:async()=>({data:{user:state.authorized?{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}:null},error:null})},from:()=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{learner_track:state.profile},error:null})};return query;},rpc:async(name,args)=>{
 state.events.push(name);
 if(name==='begin_english_activity_assessment_v1')return {data:{status:state.claim,result:state.cached},error:null};
 if(name==='read_english_activity_results_v1')return {data:[],error:null};
 if(name==='settle_english_activity_assessment_v1'){state.receipt=args;return {data:state.settle,error:null};}
 return {data:true,error:null};
}};
mock.module('@supabase/supabase-js',{namedExports:{createClient:()=>db}});
globalThis.Deno={env:{get:key=>key==='SUPABASE_URL'?'https://aazfyosqqeujureksqjs.supabase.co':key==='OPENAI_API_KEY'?`sk-proj-${'x'.repeat(40)}`:'fixture'},serve:fn=>handler=fn};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{
 if(String(url).includes('/models/'))return Response.json({id:String(url).split('/').at(-1)},{status:state.preflight?200:403});
 state.paid++;state.body=JSON.parse(opts.body);
 if(state.providerFailure)throw Error('network uncertainty');
 const skills=state.body.model==='gpt-audio-1.5'?['pronunciation']:['grammar','vocabulary','context','clarity'];
 const feedback={skills:Object.fromEntries(skills.map(skill=>[skill,{score:80,feedback:'A specific improvement.'}])),strength:'Clear speech.',next_step:'Repeat the target.',model_response:'A clear response.'};
 return Response.json({choices:[{message:{content:state.malformed?'invalid':JSON.stringify(feedback)}}],usage:{prompt_tokens:100,completion_tokens:100,prompt_tokens_details:{audio_tokens:50}}});
};
await import('../.test-runtime/english-activity-handler.mjs');
function request(kind='practice',extra={}){const form=new FormData();for(const [key,value] of Object.entries({kind,lesson_id:lessonId,item_id:kind==='practice'?itemId:'0',attempt_id:attemptId,...extra}))form.set(key,value);if(kind==='practice')form.set('answer','I was waiting when my friend arrived.');else form.set('audio',new Blob([wav()],{type:'audio/wav'}),'answer.wav');return new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer fixture'},body:form});}
function wav(){const bytes=new Uint8Array(32044),v=new DataView(bytes.buffer);const text=(offset,value)=>{for(let n=0;n<value.length;n++)bytes[offset+n]=value.charCodeAt(n);};text(0,'RIFF');v.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,32000,true);for(let i=44;i<bytes.length;i+=2)v.setInt16(i,i%8===0?900:-900,true);return bytes;}
test('unauthenticated and different learner rejected before admission',async()=>{for(const extra of [{authorized:false},{profile:'viviane_payroll'}]){reset(extra);const result=await handler(request());assert.ok([401,403].includes(result.status));assert.equal(state.paid,0);assert.equal(state.events.length,0);}});
test('invalid item and extra client-provided reference are rejected',async()=>{for(const extra of [{item_id:'unknown'},{reference:'give me 100'}]){reset();const result=await handler(request('practice',extra));assert.ok([400,403].includes(result.status));assert.equal(state.paid,0);}});
test('budget and uncertain attempts never reach provider',async()=>{for(const claim of ['budget_reached','global_budget_reached','unresolved','in_progress','closed','identity_conflict']){reset({claim});const result=await handler(request());assert.ok(result.status>=400);assert.equal(state.paid,0);}});
test('same completed attempt returns cached result without provider',async()=>{reset({claim:'completed',cached:{cached:true}});assert.deepEqual(await (await handler(request())).json(),{cached:true});assert.equal(state.paid,0);});
test('preflight failure releases only unsubmitted reservation',async()=>{reset({preflight:false});assert.equal((await handler(request())).status,503);assert.equal(state.paid,0);assert.ok(state.events.includes('cancel_english_activity_assessment_reserved_v1'));});
test('written evaluation settles receipt and excludes learner answer storage',async()=>{reset();const result=await (await handler(request())).json();assert.equal(result.kind,'practice');assert.equal(state.paid,1);assert.equal(state.body.model,'gpt-4.1-mini');assert.equal(state.body.store,false);assert.ok(state.receipt.p_actual_cost_usd>0);assert.equal(state.receipt.p_result.answer,undefined);assert.ok(!JSON.stringify(state.receipt).includes('I was waiting'));assert.ok(state.events.indexOf('mark_english_activity_assessment_submitted_v1')<state.events.indexOf('settle_english_activity_assessment_v1'));});
test('pronunciation uses recording rather than transcription and returns only pronunciation',async()=>{reset();const result=await (await handler(request('speaking'))).json();assert.equal(result.kind,'speaking');assert.deepEqual(Object.keys(result.skills),['pronunciation']);assert.equal(state.body.messages[1].content[0].type,'input_audio');assert.equal(state.body.model,'gpt-audio-1.5');assert.equal(state.receipt.p_result.audio,undefined);});
test('ambiguous provider, malformed output and failed settlement retain hold',async()=>{for(const extra of [{providerFailure:true},{malformed:true},{settle:false}]){reset(extra);assert.equal((await handler(request())).status,503);assert.equal(state.paid,1);assert.ok(state.events.includes('mark_english_activity_assessment_unresolved_v1'));assert.ok(!state.events.includes('cancel_english_activity_assessment_reserved_v1'));}});
test('saved feedback retrieval requires matching account and makes no provider call',async()=>{reset();const result=await handler(new Request(`https://test.invalid?lesson_id=${lessonId}`,{headers:{Authorization:'Bearer fixture'}}));assert.deepEqual(await result.json(),{results:[]});assert.equal(state.paid,0);reset({profile:'viviane_payroll'});assert.equal((await handler(new Request(`https://test.invalid?lesson_id=${lessonId}`,{headers:{Authorization:'Bearer fixture'}}))).status,403);});
test.after(()=>{globalThis.fetch=originalFetch;delete globalThis.Deno;mock.restoreAll();});

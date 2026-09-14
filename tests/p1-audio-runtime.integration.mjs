import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
const id='11111111-1111-4111-8111-111111111111';
const slugs={finance:'revenue-judgement-contracts-performance-obligations-cutoff',payroll:'rpn-pay-date-employment-id-payroll-submission',english:'clarify-check-understanding-handle-meetings'};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
let state,handler;
function reset(track='finance',extra={}){
 const month=new Date().toISOString().slice(0,7)+'-01';
 state={track,enabled:true,events:[],tts:[],writes:[],cache:null,claim:'claimed',
 profile:track==='payroll'?'viviane_payroll':'rafael_finance',
 lesson:{id,module_id:'module',slug:slugs[track],is_published:true,title:'Fictional P1',content_version:2,manager_commentary_pt:'A fictional server authored narration. No private draft.'},
 module:{id:'module',course_id:'course',is_published:true},course:{id:'course',learner_track:tracks[track],is_active:true},
 budget:{ai_hard_cap_usd:130,premium_audio_cap_usd:20},usage:[],
 exposure:{contractVersion:1,periodMonth:month,protectedReservationUsd:4,rawReservationUsd:4,knownCostUpliftUsd:0,activeReservedUsd:4,unresolvedReservedUsd:0,carriedReservedUsd:0,currentPeriodReservedUsd:4,futurePeriodReservedUsd:0,activeCount:1,unresolvedCount:0,staleCount:0,needsReconciliationCount:0,oldestPendingAt:month+'T00:00:00Z'},...extra};
}
function query(table){
 let columns='',upsert;const filters=[];
 const q={select(v){columns=v;return q;},eq(k,v){filters.push([k,v]);return q;},gte(){return q;},like(){return q;},order(){return q;},limit(){return q;},upsert(v){upsert=v;return q;},single(){return Promise.resolve(result());},maybeSingle(){return Promise.resolve(result());},then(a,b){return Promise.resolve(result()).then(a,b);}};
 function result(){
  if(upsert){state.writes.push({table,upsert});return {data:null,error:null};}
  state.events.push(table==='lessons'&&columns.startsWith('id,slug')?'recheck':table);
  if(table==='profiles')return {data:{learner_track:state.profile},error:null};
  if(table==='lessons')return {data:columns.startsWith('id,slug')?{...state.lesson,...state.latest}:state.lesson,error:null};
  if(table==='modules')return {data:state.module,error:null};
  if(table==='courses')return {data:state.course,error:null};
  if(table==='audio_assets')return {data:state.cache,error:state.cacheError?{message:'fictional'}:null};
  if(table==='learning_hub_budget_settings')return {data:state.budget,error:null};
  if(table==='ai_usage_log')return {data:state.usage,error:null};
  throw new Error('Unexpected table '+table);
 }
 return q;
}
const db={auth:{getUser:async()=>({data:{user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}}})},from:query,rpc:async(name,args)=>{
 state.events.push(name);
 if(name==='professor_reservation_exposure_v2')return {data:state.exposure,error:state.exposureError?{message:'fictional'}:null};
 if(name==='begin_premium_audio_attempt_v2'){
  if(state.claimError)return {data:null,error:{message:'fictional'}};
  if(state.claim==='busy')return {data:{allowed:false,reason:'audio_generation_in_progress'},error:null};
  state.attemptState='reserved';return {data:{allowed:true,attemptId:args.p_attempt_id,state:'reserved',reservationUsd:args.p_reservation_usd},error:null};
 }
 if(name==='mark_premium_audio_submitted_v2'){state.attemptState='submitted';return {data:true,error:null};}
 if(name==='settle_premium_audio_attempt_v2'){if(state.receiptError)return {data:null,error:{message:'fictional'}};state.attemptState='settled';return {data:true,error:null};}
 if(name==='close_premium_audio_attempt_v2'){if(state.attemptState==='reserved')state.attemptState='cancelled';if(state.attemptState==='submitted')state.attemptState='uncertain';return {data:true,error:null};}
 if(name==='claim_premium_audio_generation_v1')return {data:state.claim,error:state.claimError?{message:'fictional'}:null};
 if(name==='release_premium_audio_generation_v1')return {data:null,error:null};
 throw new Error('Unexpected RPC');
},storage:{from:()=>({getPublicUrl:path=>({data:{publicUrl:'https://fictional.invalid/'+path}}),list:async()=>({data:state.orphan?[{name:'commentary-v2.mp3'}]:[],error:null}),upload:async(path)=>{state.events.push('upload');state.uploadPath=path;return {error:state.uploadError?{message:'fictional'}:null};}})}};
mock.module('@supabase/supabase-js',{namedExports:{createClient:()=>db}});
globalThis.Deno={env:{get:key=>key==='P1_AUDIO_RUNTIME_STAGE'?(state.enabled?'isolated-preview-atomic-v2':undefined):'fictional'},serve:fn=>handler=fn};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/audio/speech');state.events.push('tts');state.tts.push(JSON.parse(opts.body));if(state.providerError)throw new Error('fictional timeout');return new Response(new Uint8Array([1,2,3]));};
await import('../.test-runtime/p1-audio-handler.mjs');
async function invoke(extra={}){const response=await handler(new Request('https://fictional.invalid/audio',{method:'POST',headers:{Authorization:'Bearer fictional','Content-Type':'application/json'},body:JSON.stringify({lesson_id:id,drafts:'LOCAL_PRIVATE_DRAFT',...extra})}));return {status:response.status,body:await response.json()};}
for(const track of Object.keys(slugs))test(`${track}: actual undeployed Edge handler reaches fictional TTS only after exact identity, budget, claim and version recheck`,async()=>{
 reset(track);const r=await invoke();assert.equal(r.status,200);assert.equal(state.tts.length,1);assert.equal(state.uploadPath,`lessons/${id}/commentary-v2.mp3`);
 const at=name=>state.events.indexOf(name);assert.ok(at('courses')<at('professor_reservation_exposure_v2'));assert.ok(at('professor_reservation_exposure_v2')<at('begin_premium_audio_attempt_v2'));assert.ok(at('begin_premium_audio_attempt_v2')<at('recheck'));assert.ok(at('recheck')<at('tts'));assert.equal(state.events.at(-1),'settle_premium_audio_attempt_v2');assert.equal(state.attemptState,'settled');assert.ok(at('mark_premium_audio_submitted_v2')<at('tts'));
 assert.ok(!JSON.stringify(state.tts).includes('LOCAL_PRIVATE_DRAFT'));if(track==='english')assert.match(state.tts[0].instructions,/natural English/);
});
test('real backend default is closed for P1 even when the row exists',async()=>{reset('finance',{enabled:false});assert.equal((await invoke()).status,403);assert.equal(state.tts.length,0);assert.equal(state.writes.length,0);assert.ok(!state.events.includes('audio_assets'));});
test('malformed identity, publication, profile, course, or content version cannot reach cache, budget, claim or provider',async()=>{
 for(const mutate of [s=>s.lesson.id='wrong',s=>s.lesson.is_published=false,s=>s.lesson.content_version='2',s=>s.lesson.content_version=0,s=>s.lesson.slug=slugs.payroll,s=>s.lesson.slug='unknown',s=>s.profile='viviane_payroll',s=>s.profile='manuzinha',s=>s.module.is_published=false,s=>s.module.id='wrong',s=>s.course.id='wrong',s=>s.course.is_active=false]){
  reset();mutate(state);assert.ok((await invoke()).status>=400);assert.equal(state.tts.length,0);assert.equal(state.writes.length,0);assert.ok(!state.events.includes('audio_assets'));
 }
});
test('versioned cache hit uses no claim or new TTS; stale cached version fails closed',async()=>{
 reset('finance',{cache:{id:'asset',storage_path:`lessons/${id}/commentary-v2.mp3`}});assert.equal((await invoke()).status,200);assert.equal(state.tts.length,0);assert.ok(!state.events.includes('begin_premium_audio_attempt_v2'));
 reset('finance',{cache:{id:'asset',storage_path:`lessons/${id}/commentary-v1.mp3`}});assert.equal((await invoke()).status,409);assert.equal(state.tts.length,0);
});
test('global, premium and protected Professor exposure block before claim; unavailable budget fails closed',async()=>{
 for(const extra of [{budget:{ai_hard_cap_usd:4.01,premium_audio_cap_usd:20}},{budget:{ai_hard_cap_usd:130,premium_audio_cap_usd:0.01}},{exposureError:true}]){
  reset('finance',extra);assert.ok((await invoke()).status>=400);assert.equal(state.tts.length,0);assert.ok(!state.events.includes('begin_premium_audio_attempt_v2'));
 }
});
test('dedup contention, missing claim dependency, or source race never reaches TTS',async()=>{
 for(const extra of [{claim:'busy'},{claimError:true},{latest:{content_version:3}},{latest:{slug:slugs.payroll}},{latest:{is_published:false}}]){
  reset('finance',extra);assert.ok((await invoke()).status>=400);assert.equal(state.tts.length,0);
  if(extra.latest){assert.equal(state.events.at(-1),'close_premium_audio_attempt_v2');assert.equal(state.attemptState,'cancelled');}
 }
});
test('provider, storage and receipt failures preserve uncertain obligations',async()=>{
 for(const extra of [{providerError:true},{uploadError:true},{receiptError:true}]){
  reset('finance',extra);assert.ok((await invoke()).status>=400);assert.equal(state.tts.length,1);assert.equal(state.attemptState,'uncertain');assert.ok(!state.events.includes('release_premium_audio_generation_v1'));
 }
});
test('orphan object stops before submission without inventing a receipt',async()=>{
 reset('finance',{orphan:true});assert.equal((await invoke()).status,409);assert.equal(state.tts.length,0);assert.equal(state.attemptState,'cancelled');assert.equal(state.writes.length,0);
});
test.after(()=>{globalThis.fetch=originalFetch;delete globalThis.Deno;mock.restoreAll();});

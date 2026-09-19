import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
const id='11111111-1111-4111-8111-111111111111';
const moduleId='22222222-2222-4222-8222-222222222222';
const courseId='33333333-3333-4333-8333-333333333333';
const attemptId='44444444-4444-4444-8444-444444444444';
const slugs={finance:'revenue-judgement-contracts-performance-obligations-cutoff',payroll:'rpn-pay-date-employment-id-payroll-submission',english:'clarify-check-understanding-handle-meetings'};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
let state,handler;
function reset(track='finance',extra={}){
 const month=new Date().toISOString().slice(0,7)+'-01';
 state={track,enabled:true,events:[],tts:[],writes:[],cache:null,claim:'claimed',observe:'miss',
 profile:track==='payroll'?'viviane_payroll':'rafael_finance',
 lesson:{id,module_id:moduleId,slug:slugs[track],is_published:true,title:'Fictional P1',content_version:2,sequence:2,
  manager_commentary_pt:'PRIVATE_MANAGER_COMMENTARY_SENTINEL',technical_brief_pt:'PRIVATE_TECHNICAL_BRIEF_SENTINEL'},
 module:{id:moduleId,course_id:courseId,is_published:true},course:{id:courseId,learner_track:tracks[track],is_active:true},
 bucket:{id:'lesson-audio',name:'lesson-audio',public:false,file_size_limit:15728640,allowed_mime_types:['audio/mpeg']},
 budget:{ai_hard_cap_usd:130,premium_audio_cap_usd:20},usage:[],
 exposure:{contractVersion:1,periodMonth:month,protectedReservationUsd:4,rawReservationUsd:4,knownCostUpliftUsd:0,activeReservedUsd:4,unresolvedReservedUsd:0,carriedReservedUsd:0,currentPeriodReservedUsd:4,futurePeriodReservedUsd:0,activeCount:1,unresolvedCount:0,staleCount:0,needsReconciliationCount:0,oldestPendingAt:month+'T00:00:00Z'},...extra};
}
function query(table){
 let columns='',upsert,insert;const filters=[];
 const q={select(v){columns=v;return q;},eq(k,v){filters.push([k,v]);return q;},gte(){return q;},like(){return q;},order(){return q;},limit(){return q;},upsert(v){upsert=v;return q;},insert(v){insert=v;return q;},single(){return Promise.resolve(result());},maybeSingle(){return Promise.resolve(result());},then(a,b){return Promise.resolve(result()).then(a,b);}};
 function result(){
  if(upsert){state.writes.push({table,upsert});return {data:null,error:null};}
  if(insert){state.events.push('asset_insert');state.writes.push({table,insert});return {data:null,error:state.assetInsertError?{message:'fictional'}:null};}
  if(table==='lessons')(state.lessonSelections??=[]).push(columns);
  state.events.push(table==='lessons'&&columns.startsWith('id,slug')?'recheck':table==='lessons'&&columns.startsWith('id,module_id')&&!columns.includes('title')?'v3_recheck':table);
  if(table==='profiles')return {data:{learner_track:state.attemptState?state.latestProfile??state.profile:state.profile},error:null};
  if(table==='lessons')return {data:columns.includes('title')?state.lesson:{...state.lesson,...state.latest},error:null};
  if(table==='modules')return {data:state.attemptState?{...state.module,...state.latestModule}:state.module,error:null};
  if(table==='courses')return {data:state.attemptState?{...state.course,...state.latestCourse}:state.course,error:null};
  if(table==='audio_assets'){
   const pathLookup=filters.some(([key])=>key==='storage_path');
   if(pathLookup)state.pathLookup=filters.find(([key])=>key==='storage_path');
   return {data:columns.includes('generation_request_id')?(pathLookup?state.globalPathAsset??null:state.v3Asset??null):state.cache,
    error:state.cacheError?{message:'fictional'}:null};
  }
  if(table==='learning_hub_budget_settings')return {data:state.budget,error:null};
  if(table==='ai_usage_log')return {data:state.usage,error:null};
  throw new Error('Unexpected table '+table);
 }
 return q;
}
const db={auth:{getUser:async()=>({data:{user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}}})},from:query,rpc:async(name,args)=>{
 state.events.push(name);
 if(name==='observe_premium_audio_cache_v3'){
  state.observeCalls=(state.observeCalls??0)+1;
  state.v3Binding={sourceFingerprint:args.p_source_fingerprint,storagePath:args.p_storage_path,renderRevision:args.p_render_revision,
   lessonIdentity:args.p_lesson_identity};
  if(state.observeError||state.attemptState==='settled'&&state.postSettleObserveError)return {data:null,error:{message:'permission denied for fictional v3 observer'}};
  if(state.attemptState==='settled'){
   if(state.postProviderIdentityDrift)return {data:null,error:{message:'audio_source_changed'}};
   if(state.postSettleObserve==='hit-mismatch')return {data:{status:'hit',attemptId:state.v3AttemptId,storagePath:'lessons/divergent.mp3'},error:null};
   if(state.postSettleObserve==='hit-partial')return {data:{status:'hit',storagePath:args.p_storage_path},error:null};
   if(state.postSettleObserve==='attempt-mismatch')return {data:{status:'hit',attemptId,storagePath:args.p_storage_path},error:null};
   if(state.postSettleObserve)return {data:{status:state.postSettleObserve},error:null};
   return {data:{status:'hit',attemptId:state.v3AttemptId,storagePath:args.p_storage_path},error:null};
  }
  if(state.observe==='hit'||state.observe==='race-cache'&&state.observeCalls===2)return {data:{status:'hit',attemptId,storagePath:args.p_storage_path},error:null};
  if(state.observe==='hit-mismatch')return {data:{status:'hit',attemptId,storagePath:'lessons/divergent.mp3'},error:null};
  if(state.observe==='hit-partial')return {data:{status:'hit',storagePath:args.p_storage_path},error:null};
  if(state.observe==='partial-miss')return {data:{status:'miss',extra:'divergent'},error:null};
  return {data:{status:state.observe==='race-cache'?'miss':state.observe},error:null};
 }
 if(name==='professor_reservation_exposure_v2')return {data:state.exposure,error:state.exposureError?{message:'fictional'}:null};
 if(name==='begin_premium_audio_attempt_v3'){
  state.v3BeginIdentity=args.p_lesson_identity;
  if(state.v3BeginError)return {data:null,error:{message:'permission denied for fictional v3 admission'}};
  if(state.observe==='race-cache')return {data:{allowed:false,reason:'audio_cached'},error:null};
  if(state.v3Busy)return {data:{allowed:false,reason:'audio_generation_in_progress',state:'reserved'},error:null};
  if(state.v3BeginPartial)return {data:{allowed:true,attemptId:args.p_attempt_id,state:'reserved'},error:null};
  state.v3AttemptId=args.p_attempt_id;state.attemptState='reserved';
  return {data:{allowed:true,attemptId:args.p_attempt_id,state:'reserved',reservationUsd:args.p_reservation_usd},error:null};
 }
 if(name==='mark_premium_audio_submitted_v3'){
  state.attemptState='submitted';
  if(state.markError)return {data:null,error:{message:'fictional lost mark acknowledgement'}};
  return {data:{allowed:true,state:'submitted'},error:null};
 }
 if(name==='settle_premium_audio_attempt_v3'){
  if(state.receiptError)return {data:null,error:{message:'fictional settlement uncertainty'}};
  state.v3SettledCost=args.p_estimated_cost_usd;
  state.attemptState='settled';return {data:{settled:true,state:'settled',receiptRequestId:`premium-audio-v3:${args.p_attempt_id}`},error:null};
 }
 if(name==='close_premium_audio_attempt_v3'){
  if(state.attemptState==='reserved')state.attemptState='cancelled';
  if(state.attemptState==='submitted')state.attemptState='uncertain';
  return {data:state.attemptState,error:null};
 }
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
},storage:{getBucket:async bucketId=>{state.events.push('storage_bucket');assert.equal(bucketId,'lesson-audio');return {data:state.bucket,error:state.bucketError?{message:'fictional'}:null};},from:()=>({createSignedUrl:async(path,ttl)=>{state.events.push('sign');assert.equal(ttl,3600);return {data:state.signError?null:{signedUrl:'https://fictional.invalid/signed/'+path},error:state.signError?{message:'fictional'}:null};},getPublicUrl:path=>({data:{publicUrl:'https://fictional.invalid/'+path}}),list:async(_folder,options)=>({data:Object.hasOwn(state,'storageListData')?state.storageListData:state.orphan?[{name:options?.search??'commentary-v2.mp3'}]:[],error:state.storageListError?{message:'fictional'}:null}),upload:async(path,_bytes,options)=>{state.events.push('upload');state.uploadPath=path;state.uploadOptions=options;const exact={id:'77777777-7777-4777-8777-777777777777',path,fullPath:`lesson-audio/${path}`};return {data:state.uploadAckPartial?{path}:state.uploadAckMismatch?{...exact,fullPath:'lesson-audio/divergent.mp3'}:state.uploadAckExtra?{...exact,unexpected:true}:exact,error:state.uploadError?{message:'fictional'}:null};}})}};
mock.module('@supabase/supabase-js',{namedExports:{createClient:()=>db}});
globalThis.Deno={env:{get:key=>key==='P1_AUDIO_RUNTIME_STAGE'?(state.stage??(state.enabled?'isolated-preview-atomic-v2':undefined)):'fictional'},serve:fn=>handler=fn};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{
 assert.equal(url,'https://api.openai.com/v1/audio/speech');state.events.push('tts');state.tts.push(JSON.parse(opts.body));
 if(state.driftDuringProvider){state.postProviderIdentityDrift=true;state.latest={...state.latest,slug:slugs.payroll};}
 if(state.providerError)throw new Error('fictional timeout');
 if(state.providerWrongType)return new Response(JSON.stringify({error:'fictional non-audio'}),{headers:{'Content-Type':'application/json'}});
 if(state.providerEmpty)return new Response(new Uint8Array(),{headers:{'Content-Type':'audio/mpeg'}});
 if(state.providerCorrupt)return new Response(new Uint8Array([1,2,3,4]),{headers:{'Content-Type':'audio/mpeg'}});
 if(state.providerTruncatedId3)return new Response(new Uint8Array([0x49,0x44,0x33,0x04]),{headers:{'Content-Type':'audio/mpeg'}});
 if(state.providerSingleFrame){const truncated=new Uint8Array(4096);truncated.set([0xff,0xfb,0x90,0x64]);return new Response(truncated,{headers:{'Content-Type':'audio/mpeg'}});}
 if(state.providerOversizedHeader)return new Response(new Uint8Array([0x49,0x44,0x33,0x04]),{headers:{'Content-Type':'audio/mpeg','Content-Length':'15728641'}});
 const mp3=new Uint8Array(4096);mp3.set([0x49,0x44,0x33,0x04,0,0,0,0,0,0,0xff,0xfb,0x90,0x64]);mp3.set([0xff,0xfb,0x90,0x64],427);
 return new Response(mp3,{headers:{'Content-Type':'audio/mpeg'}});
};
await import('../.test-runtime/p1-audio-handler.mjs');
async function invoke(extra={}){const response=await handler(new Request('https://fictional.invalid/audio',{method:'POST',headers:{Authorization:'Bearer fictional','Content-Type':'application/json'},body:JSON.stringify({lesson_id:state.requestLessonId??id,drafts:'LOCAL_PRIVATE_DRAFT',...extra})}));return {status:response.status,body:await response.json()};}
const resetV3=(track='finance',extra={})=>reset(track,{stage:'isolated-preview-authored-v3',...extra});
for(const track of Object.keys(slugs))test(`${track}: actual undeployed Edge handler reaches fictional TTS only after exact identity, budget, claim and version recheck`,async()=>{
 reset(track);const r=await invoke();assert.equal(r.status,200);assert.equal(state.tts.length,1);assert.equal(state.uploadPath,`lessons/${id}/commentary-v2.mp3`);
 const at=name=>state.events.indexOf(name);assert.ok(at('courses')<at('professor_reservation_exposure_v2'));assert.ok(at('professor_reservation_exposure_v2')<at('begin_premium_audio_attempt_v2'));assert.ok(at('begin_premium_audio_attempt_v2')<at('recheck'));assert.ok(at('recheck')<at('tts'));assert.equal(state.events.at(-1),'sign');assert.ok(at('settle_premium_audio_attempt_v2')<at('sign'));assert.equal(state.attemptState,'settled');assert.ok(at('mark_premium_audio_submitted_v2')<at('tts'));
 assert.ok(!JSON.stringify(state.tts).includes('LOCAL_PRIVATE_DRAFT'));if(track==='english')assert.match(state.tts[0].instructions,/natural English/);
});
test('explicit closed deployment stops P1 and Golden before data, Storage, reservations and providers',async()=>{
 for(const requested of [id,'b3639582-3c32-4147-a4b3-84237d11a66e']){
  reset('finance',{stage:'closed',requestLessonId:requested});
  const result=await invoke();assert.equal(result.status,503);
  assert.equal(result.body.error,'audio_runtime_closed');
  assert.deepEqual(state.events,[]);assert.deepEqual(state.writes,[]);assert.deepEqual(state.tts,[]);
 }
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
 for(const extra of [{budget:{ai_hard_cap_usd:4.01,premium_audio_cap_usd:20}},{budget:{ai_hard_cap_usd:130,premium_audio_cap_usd:0.01}},{exposureError:true},{usage:null},{usage:{feature:'premium_audio',estimated_cost_usd:0}}]){
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
test('private URL failure does not regenerate or undo settled cost',async()=>{
 reset('finance',{signError:true});const r=await invoke();assert.equal(r.status,503);assert.equal(r.body.error,'audio_url_unavailable');assert.equal(state.tts.length,1);assert.equal(state.attemptState,'settled');
});
test('private cached narration signs only after identity and invokes no provider',async()=>{
 reset('finance',{cache:{id:'asset',storage_path:`lessons/${id}/commentary-v2.mp3`}});const r=await invoke();assert.match(r.body.audio_url,/signed/);assert.ok(r.body.expires_at>Date.now());assert.equal(state.tts.length,0);
});

for(const track of Object.keys(slugs))test(`${track}: authored v3 binds server-owned P1 source through settle before signing`,async()=>{
 resetV3(track);const r=await invoke({script:'PRIVATE_BROWSER_SCRIPT_SENTINEL',answers:['PRIVATE_BROWSER_ANSWER_SENTINEL']});
 assert.equal(r.status,200);assert.equal(r.body.cached,false);assert.match(r.body.source_fingerprint,/^[a-f0-9]{64}$/);
 assert.equal(r.body.render_revision,1);assert.equal(r.body.purpose,'study-guide-overview');assert.equal(state.tts.length,1);
 assert.deepEqual(state.v3Binding.lessonIdentity,{lessonId:id,moduleId,courseId,lessonSlug:slugs[track],contentVersion:2,
  requestedTrack:tracks[track],studyTrack:track,sequence:2});
 assert.deepEqual(state.v3BeginIdentity,state.v3Binding.lessonIdentity);
 assert.equal(state.uploadPath,`lessons/${id}/commentary-v2-${r.body.source_fingerprint}-r1.mp3`);
 assert.deepEqual(state.uploadOptions,{contentType:'audio/mpeg',upsert:false,cacheControl:'31536000'});
 const serialized=JSON.stringify(state.tts);
 assert.doesNotMatch(serialized,/PRIVATE_BROWSER_SCRIPT_SENTINEL|PRIVATE_BROWSER_ANSWER_SENTINEL|LOCAL_PRIVATE_DRAFT|PRIVATE_MANAGER_COMMENTARY_SENTINEL|PRIVATE_TECHNICAL_BRIEF_SENTINEL/);
 assert.ok(state.lessonSelections.every(columns=>!columns.includes('manager_commentary_pt')&&!columns.includes('technical_brief_pt')));
 assert.deepEqual(Object.keys(state.tts[0]).sort(),['input','instructions','model','response_format','speed','voice']);
 assert.equal(state.tts[0].model,'gpt-4o-mini-tts');assert.equal(state.tts[0].voice,'marin');assert.equal(state.tts[0].response_format,'mp3');assert.equal(state.tts[0].speed,0.98);
 assert.equal(state.tts[0].instructions,track==='english'
  ?'Speak in clear natural English as a patient teacher. This is a study-guide overview; do not claim that pronunciation or an Irish accent was assessed.'
  :'Speak in natural Brazilian Portuguese as a calm expert teacher. Keep technical English terms in English.');
 const at=name=>state.events.indexOf(name);
 assert.ok(at('observe_premium_audio_cache_v3')<at('learning_hub_budget_settings'));
  assert.ok(at('professor_reservation_exposure_v2')<at('begin_premium_audio_attempt_v3'));
 assert.ok(at('begin_premium_audio_attempt_v3')<at('v3_recheck'));assert.ok(at('v3_recheck')<at('mark_premium_audio_submitted_v3'));
 assert.ok(at('mark_premium_audio_submitted_v3')<at('tts'));
 assert.ok(at('tts')<at('upload'));assert.ok(at('upload')<at('asset_insert'));
 assert.ok(at('settle_premium_audio_attempt_v3')<state.events.lastIndexOf('observe_premium_audio_cache_v3'));
 assert.ok(state.events.lastIndexOf('observe_premium_audio_cache_v3')<at('sign'));assert.equal(state.attemptState,'settled');
 assert.equal(state.writes.length,1);assert.ok(state.writes[0].insert);assert.equal(state.writes[0].insert.generation_request_id,`premium-audio-v3:${state.v3AttemptId}`);
 const expectedCost={finance:0.021652,payroll:0.020845,english:0.0273}[track];
 assert.equal(r.body.estimated_cost_usd,expectedCost);assert.equal(state.writes[0].insert.estimated_cost_usd,expectedCost);
 assert.equal(state.v3SettledCost,expectedCost);assert.equal(expectedCost,Number(expectedCost.toFixed(6)));
 if(track==='english')assert.match(state.tts[0].instructions,/natural English/);
});

test('authored v3 requires the exact private MPEG-only bucket before cache, budget or provider work',async()=>{
 const exact={id:'lesson-audio',name:'lesson-audio',public:false,file_size_limit:15728640,allowed_mime_types:['audio/mpeg']};
 for(const extra of [
  {bucketError:true},
  {bucket:null},
  {bucket:{...exact,public:true}},
  {bucket:{...exact,id:'other'}},
  {bucket:{...exact,name:'other'}},
  {bucket:{...exact,file_size_limit:20000000}},
  {bucket:{...exact,allowed_mime_types:['audio/mpeg','audio/wav']}},
  {bucket:{...exact,allowed_mime_types:['audio/wav']}},
 ]){
  resetV3('finance',extra);const r=await invoke();assert.equal(r.status,503,JSON.stringify(extra));
  assert.equal(r.body.error,'audio_v3_storage_not_private');assert.deepEqual(state.events,['storage_bucket']);
  assert.equal(state.tts.length,0);assert.equal(state.writes.length,0);
 }
});

test('authored v3 accepts only an exact settled cache binding and never budgets or calls a provider for cache outcomes',async()=>{
 resetV3('finance',{observe:'hit'});let r=await invoke();assert.equal(r.status,200);assert.equal(r.body.cached,true);assert.equal(state.tts.length,0);
 assert.ok(!state.events.includes('learning_hub_budget_settings'));assert.ok(!state.events.includes('begin_premium_audio_attempt_v3'));assert.equal(state.events.at(-1),'sign');
 for(const observe of ['hit-mismatch','hit-partial','partial-miss','reconciliation_required']){
  resetV3('finance',{observe});r=await invoke();assert.equal(r.status,409);assert.equal(r.body.error,'audio_reconciliation_required');
  assert.equal(state.tts.length,0);assert.ok(!state.events.includes('learning_hub_budget_settings'));assert.ok(!state.events.includes('begin_premium_audio_attempt_v3'));
 }
 resetV3('finance',{observe:'in_progress'});r=await invoke();assert.equal(r.status,409);assert.equal(r.body.error,'audio_generation_in_progress');assert.equal(state.tts.length,0);
 resetV3('finance',{observe:'race-cache'});r=await invoke();assert.equal(r.status,200);assert.equal(r.body.cached,true);assert.equal(state.observeCalls,2);
 assert.equal(state.tts.length,0);assert.ok(state.events.includes('begin_premium_audio_attempt_v3'));assert.ok(!state.events.includes('mark_premium_audio_submitted_v3'));assert.equal(state.events.at(-1),'sign');
});

test('authored v3 RPC/grant absence fails closed without falling back to v2 or reaching a provider',async()=>{
 resetV3('finance',{observeError:true});let r=await invoke();assert.equal(r.status,503);assert.equal(r.body.error,'audio_v3_admission_closed');assert.equal(state.tts.length,0);
 assert.ok(!state.events.includes('professor_reservation_exposure_v2'));assert.ok(!state.events.includes('begin_premium_audio_attempt_v2'));
 resetV3('finance',{v3BeginError:true});r=await invoke();assert.equal(r.status,503);assert.equal(r.body.error,'audio_v3_admission_closed');assert.equal(state.tts.length,0);
 assert.ok(state.events.includes('begin_premium_audio_attempt_v3'));assert.ok(!state.events.includes('begin_premium_audio_attempt_v2'));
 resetV3('finance',{v3BeginPartial:true});r=await invoke();assert.equal(r.status,409);assert.equal(r.body.error,'audio_reconciliation_required');assert.equal(state.tts.length,0);
 resetV3('finance',{v3Busy:true});r=await invoke();assert.equal(r.status,409);assert.equal(r.body.error,'audio_generation_in_progress');assert.equal(state.tts.length,0);
 resetV3('finance',{markError:true});r=await invoke();assert.equal(r.status,503);assert.equal(r.body.error,'audio_submission_unconfirmed');assert.equal(state.tts.length,0);assert.equal(state.attemptState,'uncertain');
});

test('authored v3 serves an exact non-P1 Golden cache but keeps every new Golden admission closed',async()=>{
 const goldenId='b3639582-3c32-4147-a4b3-84237d11a66e';
 const golden={id:goldenId,module_id:moduleId,slug:'fictional-golden-finance',
  is_published:true,title:'Fictional Golden',content_version:2,sequence:1,manager_commentary_pt:'SAFE LEGACY GOLDEN SCRIPT',technical_brief_pt:'SAFE LEGACY BRIEF'};
 reset('finance',{stage:'isolated-preview-authored-v3',requestLessonId:goldenId,lesson:golden});
 let r=await invoke();assert.equal(r.status,503);assert.equal(r.body.error,'audio_v3_admission_closed');assert.equal(state.tts.length,0);
 assert.ok(!state.events.includes('learning_hub_budget_settings'));assert.ok(!state.events.includes('begin_premium_audio_attempt_v2'));
 assert.ok(!state.events.includes('begin_premium_audio_attempt_v3'));assert.ok(!state.events.includes('claim_premium_audio_generation_v1'));
 assert.ok(state.lessonSelections[0].includes('sequence')&&!state.lessonSelections[0].includes('manager_commentary_pt'));

 reset('finance',{stage:'isolated-preview-authored-v3',requestLessonId:goldenId,lesson:golden,
  cache:{id:'golden-asset',storage_path:`lessons/${goldenId}/commentary-v2.mp3`,transcript_pt:'SAFE LEGACY GOLDEN SCRIPT',voice:'marin'}});
 r=await invoke();assert.equal(r.status,200);assert.equal(r.body.cached,true);assert.match(r.body.audio_url,/signed/);assert.equal(state.tts.length,0);
 assert.ok(!state.events.includes('learning_hub_budget_settings'));assert.ok(!state.events.includes('begin_premium_audio_attempt_v2'));
 assert.ok(!state.events.includes('begin_premium_audio_attempt_v3'));assert.ok(!state.events.includes('claim_premium_audio_generation_v1'));
});

test('authored v3 source and full lesson identity mutation, stale asset or orphaned object closes before the paid provider',async()=>{
 const otherModule='55555555-5555-4555-8555-555555555555',otherCourse='66666666-6666-4666-8666-666666666666';
 for(const extra of [{latest:{content_version:3}},{latest:{slug:slugs.payroll}},{latest:{sequence:3}},{latest:{is_published:false}},
  {latestModule:{id:otherModule}},{latestCourse:{id:otherCourse}},{latestCourse:{learner_track:'viviane_payroll'}},{latestProfile:'viviane_payroll'},
  {latestModule:{is_published:false}},{latestCourse:{is_active:false}},{v3Asset:{id:'asset',storage_path:'lessons/divergent.mp3'}},{orphan:true},
  {storageListData:null},{storageListData:{name:'commentary-v3.mp3'}}]){
  resetV3('finance',extra);const r=await invoke();assert.ok(r.status>=400,JSON.stringify(extra));assert.equal(state.tts.length,0);assert.equal(state.attemptState,'cancelled');
  assert.ok(state.events.includes('begin_premium_audio_attempt_v3'));assert.ok(!state.events.includes('mark_premium_audio_submitted_v3'));
 }
});

test('authored v3 rejects a cross-lesson global storage-path claimant before the paid provider',async()=>{
 resetV3('finance',{globalPathAsset:{id:'cross-lesson-asset',lesson_id:'99999999-9999-4999-8999-999999999999',audio_type:'commentary'}});
 const r=await invoke();assert.equal(r.status,409);assert.equal(r.body.error,'audio_reconciliation_required');
 assert.deepEqual(state.pathLookup,['storage_path',state.v3Binding.storagePath]);
 assert.equal(state.tts.length,0);assert.equal(state.attemptState,'cancelled');
 assert.ok(state.events.includes('begin_premium_audio_attempt_v3'));assert.ok(!state.events.includes('mark_premium_audio_submitted_v3'));
});

test('authored v3 budget protection still runs only after cache miss and before admission',async()=>{
 for(const extra of [{budget:{ai_hard_cap_usd:4.01,premium_audio_cap_usd:20}},{budget:{ai_hard_cap_usd:130,premium_audio_cap_usd:0.01}},{exposureError:true},{usage:null},{usage:{feature:'premium_audio',estimated_cost_usd:0}}]){
  resetV3('finance',extra);const r=await invoke();assert.ok(r.status>=400);assert.equal(state.tts.length,0);assert.ok(state.events.includes('observe_premium_audio_cache_v3'));assert.ok(!state.events.includes('begin_premium_audio_attempt_v3'));
 }
});

test('authored v3 provider, payload, storage, asset and receipt uncertainty never retries or signs an unsettled asset',async()=>{
 for(const extra of [{providerError:true},{providerWrongType:true},{providerEmpty:true},{providerCorrupt:true},{providerTruncatedId3:true},{providerSingleFrame:true},
  {providerOversizedHeader:true},{uploadError:true},{uploadAckPartial:true},{uploadAckMismatch:true},{assetInsertError:true},{receiptError:true}]){
  resetV3('finance',extra);const r=await invoke();assert.ok(r.status>=400,`${JSON.stringify(extra)} -> ${r.status} ${JSON.stringify(r.body)}`);assert.equal(state.tts.length,1);assert.equal(state.attemptState,'uncertain');
  assert.ok(!state.events.includes('sign'));assert.equal(state.events.filter(event=>event==='tts').length,1);
  assert.equal(state.events.filter(event=>event==='begin_premium_audio_attempt_v3').length,1);
 }
});
test('authored v3 requires immutable upload receipt fields while tolerating additive SDK metadata',async()=>{
 resetV3('finance',{uploadAckExtra:true});const r=await invoke();assert.equal(r.status,200);assert.equal(state.attemptState,'settled');
 assert.equal(state.tts.length,1);assert.equal(state.writes.length,1);assert.ok(state.events.includes('sign'));
});
test('authored v3 settles paid work but withholds signing when identity drifts during the provider call',async()=>{
 resetV3('finance',{driftDuringProvider:true});const r=await invoke();
 assert.equal(r.status,409);assert.equal(r.body.error,'audio_reconciliation_required');assert.equal(state.attemptState,'settled');
 assert.equal(state.tts.length,1);assert.equal(state.events.filter(event=>event==='tts').length,1);assert.ok(!state.events.includes('sign'));
 assert.ok(state.events.indexOf('mark_premium_audio_submitted_v3')<state.events.indexOf('tts'));
 assert.ok(state.events.indexOf('tts')<state.events.indexOf('settle_premium_audio_attempt_v3'));
 assert.ok(state.events.indexOf('settle_premium_audio_attempt_v3')<state.events.lastIndexOf('observe_premium_audio_cache_v3'));
});
test('authored v3 requires an exact post-settlement binding before signing and never regenerates on observer uncertainty',async()=>{
 for(const extra of [{postSettleObserve:'hit-mismatch'},{postSettleObserve:'hit-partial'},{postSettleObserve:'attempt-mismatch'},
  {postSettleObserve:'reconciliation_required'},{postSettleObserveError:true}]){
  resetV3('finance',extra);const r=await invoke();assert.ok(r.status>=400,JSON.stringify(extra));assert.equal(state.attemptState,'settled');
  assert.equal(state.tts.length,1);assert.equal(state.events.filter(event=>event==='tts').length,1);assert.ok(!state.events.includes('sign'));
 }
});
test.after(()=>{globalThis.fetch=originalFetch;delete globalThis.Deno;mock.restoreAll();});

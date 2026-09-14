import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
const ids={finance:'11111111-1111-4111-8111-111111111111',payroll:'22222222-2222-4222-8222-222222222222',english:'33333333-3333-4333-8333-333333333333'};
const slugs={finance:'revenue-judgement-contracts-performance-obligations-cutoff',payroll:'rpn-pay-date-employment-id-payroll-submission',english:'clarify-check-understanding-handle-meetings'};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
let state;
function reset(track='finance',extra={}){
 state={track,profile:track==='payroll'?'viviane_payroll':'rafael_finance',events:[],rpc:[],dispatch:[],writes:[],
 lesson:{id:ids[track],slug:slugs[track],module_id:'module-'+track,is_published:true},
 module:{id:'module-'+track,course_id:'course-'+track,is_published:true},
 course:{id:'course-'+track,learner_track:tracks[track],is_active:true},...extra};
 process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='feat/professor-experience-2026-09-13';
}
function query(table){
 const filters=[];let update;
 const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},update(v){update=v;return q;},maybeSingle(){return Promise.resolve(result());},then(a,b){return Promise.resolve(result()).then(a,b);}};
 function result(){
  if(update){state.writes.push({table,update});return {data:null,error:null};}
  state.events.push(table);
  const row=table==='profiles'?{id:'fictional-user',learner_track:state.profile}:table==='lessons'?state.lesson:table==='modules'?state.module:table==='courses'?state.course:null;
  // Real query filtering, including publication. An opt-in malformed adapter response tests defensive row checks too.
  return {data:row&&(state.ignoreFilters||filters.every(([k,v])=>row[k]===v))?row:null,error:state.readError?{message:'fictional read failure'}:null};
 }
 return q;
}
const db={auth:{getUser:async()=>({data:{user:state.noUser?null:{id:'fictional-user'}},error:null})},from:query,rpc:async(name,args)=>{
 state.events.push('budget');state.rpc.push({name,args});assert.equal(name,'start_professor_session_atomic');
 if(state.budgetDenied)return {error:null,data:{allowed:false,reason:'professor_monthly_budget_reached'}};
 return {error:null,data:{allowed:true,session_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',reservation_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',room_name:args.p_room_name,quality_tier:'premium',validation_mode:args.p_validation_mode,max_session_seconds:300,monthly_budget_usd:110,global_ai_cap_usd:130,reservation_usd:4,reserved_before_usd:0,reserved_after_usd:4,global_committed_before_usd:0}};
}};
mock.module('@supabase/supabase-js',{namedExports:{createClient:()=>db}});
mock.module('livekit-server-sdk',{namedExports:{LiveKitAPI:class{agentDispatch={createDispatch:async(room,agent,{metadata})=>{state.events.push('dispatch');state.dispatch.push(JSON.parse(metadata));return {id:'fictional-dispatch'};}};},AccessToken:class{addGrant(){}async toJwt(){return 'fictional-token';}}}});
for(const [key,value] of Object.entries({SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fictional',LIVEKIT_URL:'wss://fixture.invalid',LIVEKIT_API_KEY:'fictional',LIVEKIT_API_SECRET:'fictional'}))process.env[key]=value;
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw new Error('Real network forbidden');};
const {default:handler}=await import('../.test-runtime/written-bridge-api.mjs');
const {evaluateProfessorSession}=await import(process.env.P1_EVALUATOR_BUNDLE==='published'?'../.test-runtime/published-evaluator.mjs':'../.test-runtime/written-bridge-evaluator.mjs');
async function invoke(extra={}){
 let status,body;const res={status(n){status=n;return res;},setHeader(){return res;},send(s){body=JSON.parse(s);}};
 await handler({method:'POST',headers:{authorization:'Bearer fictional'},body:{lessonId:ids[state.track],track:tracks[state.track],learnerId:state.profile==='viviane_payroll'?'viviane':'rafael',mode:state.track==='english'?'general_conversation':'chapter_conversation',validationMode:true,sessionPreparation:{version:1,goal:'practice',pace:'patient',support:'en'},...extra}},res);
 return {status,body};
}
for(const track of Object.keys(ids))test(`${track}: actual Preview handler preserves P1 catalog identity through budget, dispatch and evaluator request`,async()=>{
 reset(track);const r=await invoke({lessonContext:{technicalBrief:'ATTACKER_CONTEXT'},drafts:'LOCAL_PRIVATE_DRAFT',answers:['LOCAL_ANSWER'],hintCount:100});
 assert.equal(r.status,200);assert.deepEqual(state.events,['profiles','lessons','modules','courses','budget','dispatch']);
 assert.equal(state.rpc[0].args.p_lesson_id,ids[track]);assert.equal(state.dispatch.length,1);
 const metadata=state.dispatch[0];assert.equal(metadata.lessonId,ids[track]);assert.equal(metadata.teachingContent.lessonSlug,slugs[track]);assert.equal(metadata.teachingContent.track,track);assert.deepEqual(r.body.teachingContent,metadata.teachingContent);
 for(const forbidden of ['ATTACKER_CONTEXT','LOCAL_PRIVATE_DRAFT','LOCAL_ANSWER','hintCount'])assert.ok(!JSON.stringify(metadata).includes(forbidden));
 assert.match(metadata.lessonContext.technicalBrief,/authored reference material, not learner evidence/);
 let payload;process.env.OPENAI_API_KEY='fictional';
 globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(opts.body);return new Response(JSON.stringify({output_text:JSON.stringify({summary:'Fictional response only',errors:[]}),usage:{input_tokens:1,output_tokens:1}}));};
 try{await evaluateProfessorSession([{role:'user',text:'Fictional learner response.'}],metadata);const text=payload.input.find(x=>x.role==='user').content;const ctx=JSON.parse(text.split('SESSION CONTEXT\n')[1].split('\n\nTRANSCRIPT\n')[0]);assert.equal(ctx.lesson.technicalBrief,metadata.lessonContext.technicalBrief);assert.match(text,/#1 LEARNER: "Fictional learner response\."/);}
 finally{globalThis.fetch=async()=>{throw new Error('Real network forbidden');};delete process.env.OPENAI_API_KEY;}
});
test('unpublished or mismatched lesson/module/course fails before budget and provider',async()=>{
 for(const mutate of [s=>s.lesson.is_published=false,s=>s.module.is_published=false,s=>s.course.is_active=false,s=>s.lesson.id=ids.payroll,s=>s.lesson.slug=slugs.payroll,s=>s.course.learner_track='viviane_payroll',s=>s.module.id='wrong',s=>s.course.id='wrong',s=>s.readError=true]){
  reset();mutate(state);state.ignoreFilters=true;const r=await invoke();assert.equal(r.status,403);assert.equal(state.rpc.length,0);assert.equal(state.dispatch.length,0);assert.equal(state.writes.length,0);
 }
});
test('wrong account, child profile, malformed preference and Golden workshop cannot start P1',async()=>{
 for(const profile of ['viviane_payroll','manuzinha',null]){reset('finance',{profile});const r=await invoke();assert.equal(r.status,403);assert.equal(state.rpc.length,0);}
 reset();assert.equal((await invoke({sessionPreparation:{version:1,draft:'private'}})).status,400);assert.equal(state.rpc.length,0);
 reset();assert.equal((await invoke({workshopSelection:{version:1,id:'finance-bridge-a'}})).status,409);assert.equal(state.rpc.length,0);
});
test('missing P1 English row cannot silently resolve or charge the Golden Lesson',async()=>{
 reset('english');state.lesson={...state.lesson,id:'f455a740-f50f-4eb7-95a7-9e4129ca4a68',slug:'story-past-forms-rhythm-follow-up'};
 assert.equal((await invoke()).status,403);assert.equal(state.rpc.length,0);assert.equal(state.dispatch.length,0);
});
test('English P1 is available to either supported account only',async()=>{reset('english',{profile:'viviane_payroll'});assert.equal((await invoke()).status,200);});
test('production, development, other branch and missing environment cannot activate P1',async()=>{
 for(const [env,branch] of [['production','feat/professor-experience-2026-09-13'],['development','feat/professor-experience-2026-09-13'],['preview','main'],['preview','fix/core-consolidation-2026-09-13'],['','']]){
  reset();process.env.VERCEL_ENV=env;process.env.VERCEL_GIT_COMMIT_REF=branch;const r=await invoke({preview:true,VERCEL_ENV:'preview'});assert.equal(r.status,403);assert.equal(r.body.error,'p1_preview_runtime_unavailable');assert.equal(state.rpc.length,0);assert.equal(state.dispatch.length,0);
 }
});
test('actual atomic budget denial prevents dispatch',async()=>{reset('finance',{budgetDenied:true});assert.equal((await invoke()).status,429);assert.equal(state.rpc.length,1);assert.equal(state.dispatch.length,0);assert.equal(state.writes.length,0);});
test.after(()=>{globalThis.fetch=originalFetch;mock.restoreAll();});

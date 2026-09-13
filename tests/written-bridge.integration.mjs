import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Executable API + evaluator assembly, but ALL dependencies/providers below are fictional.
// No real keys, credentials, Supabase, LiveKit dispatch or model response is used.
const IDs={finance:'b3639582-3c32-4147-a4b3-84237d11a66e',payroll:'6ffda415-3b18-46ab-afaa-414f81a7eb31',english:'f455a740-f50f-4eb7-95a7-9e4129ca4a68'};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
let current;
function fixture(track='finance',profile=track==='payroll'?'viviane_payroll':'rafael_finance'){
 return {track,profile,uid:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',rpcCalls:[],dispatches:[],writes:[]};
}
function query(table){
 const filters=[]; let update;
 const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(){return q;},limit(){return q;},update(value){update=value;return q;},maybeSingle(){return Promise.resolve(resolve());},then(ok,no){return Promise.resolve(resolve()).then(ok,no);}};
 function resolve(){
  if(update){current.writes.push({table,update,filters});return {data:null,error:null};}
  if(table==='profiles')return {data:{learner_track:current.profile},error:null};
  if(table==='lesson_terms'||table==='cases')return {data:[],error:null};
  if(table==='lessons')return {data:{id:IDs[current.track],module_id:'module-'+current.track,title:'Old database context',learning_objectives:['OLD OBJECTIVE'],technical_brief_pt:'OLD CONTENT MUST NOT WIN'},error:null};
  if(table==='modules')return {data:{id:'module-'+current.track,course_id:'course-'+current.track},error:null};
  if(table==='courses')return {data:{id:'course-'+current.track,learner_track:tracks[current.track]},error:null};
  throw new Error('unexpected_fictional_table');
 }
 return q;
}
const db={auth:{async getUser(){return {data:{user:{id:current.uid}},error:null};}},from:query,async rpc(name,args){
 current.rpcCalls.push({name,args});
 assert.equal(name,'start_professor_session_atomic');
 return {error:null,data:{allowed:true,session_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',reservation_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',room_name:args.p_validation_mode?'validation:'+args.p_room_name.replace(/^validation:/,''):args.p_room_name,quality_tier:'premium',validation_mode:args.p_validation_mode,max_session_seconds:1200,monthly_budget_usd:110,global_ai_cap_usd:130,reservation_usd:4,reserved_before_usd:0,reserved_after_usd:4,global_committed_before_usd:0}};
}};
mock.module('@supabase/supabase-js',{namedExports:{createClient:()=>db}});
mock.module('livekit-server-sdk',{namedExports:{
 LiveKitAPI:class{agentDispatch={createDispatch:async(room,agent,{metadata})=>{current.dispatches.push({room,agent,metadata:JSON.parse(metadata)});return {id:'synthetic-dispatch'};}};},
 AccessToken:class{addGrant(){}async toJwt(){return 'synthetic-token-not-valid';}},
}});
const oldEnv={...process.env};
process.env.SUPABASE_URL='https://synthetic.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='fictional-only';
process.env.LIVEKIT_URL='wss://synthetic.invalid';process.env.LIVEKIT_API_KEY='fictional';process.env.LIVEKIT_API_SECRET='fictional-secret';
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw new Error('No network permitted in this integration test');};
const {default:handler}=await import('../.test-runtime/written-bridge-api.mjs');
const {evaluateProfessorSession}=await import('../.test-runtime/written-bridge-evaluator.mjs');
async function invoke(track,extra={}){
 let status=0,body;
 const res={status(n){status=n;return res;},setHeader(){return res;},send(value){body=JSON.parse(value);return res;}};
 const req={method:'POST',headers:{authorization:'Bearer synthetic'},body:{track:tracks[track],lessonId:IDs[track],learnerId:current.profile==='viviane_payroll'?'viviane':'rafael',mode:track==='english'?'general_conversation':'chapter_conversation',validationMode:true,...extra}};
 await handler(req,res);return {status,body};
}
for(const track of ['finance','payroll','english'])test(`${track}: actual handler dispatches server module and evaluator receives the same core reference`,async()=>{
 current=fixture(track);
 const {status,body}=await invoke(track,{lessonContext:{technicalBrief:'ATTACKER CONTENT'},drafts:'PRIVATE LOCAL DRAFT',answers:[100]});
 assert.equal(status,200);assert.equal(current.rpcCalls.length,1);assert.equal(current.dispatches.length,1);
 const metadata=current.dispatches[0].metadata;
 assert.equal(metadata.maxSessionSeconds,300);assert.equal(metadata.qualityTier,'premium');assert.equal(metadata.validationMode,true);
 assert.equal(body.teachingContent.sha256,metadata.teachingContent.sha256);
 assert.equal(metadata.teachingContent.lessonId,IDs[track]);
 assert.ok(metadata.lessonContext.technicalBrief.includes('AUTHORED CASE REFERENCE'));
 assert.ok(metadata.lessonContext.technicalBrief.includes('NOT statements made by the learner'));
 for(const x of ['ATTACKER CONTENT','PRIVATE LOCAL DRAFT','OLD CONTENT MUST NOT WIN'])assert.ok(!JSON.stringify(metadata).includes(x));
 let request;
 process.env.OPENAI_API_KEY='fictional-mock-only-not-a-key';
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');
  request=JSON.parse(options.body);
  return new Response(JSON.stringify({output_text:JSON.stringify({summary:'Fictional evaluator response',errors:[],assessmentConfidence:20}),usage:{input_tokens:10,output_tokens:5}}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  await evaluateProfessorSession([{role:'user',text:'Fictional learner response, not the case answer.'}],metadata);
  const text=request.input.find(x=>x.role==='user').content;
  const context=JSON.parse(text.split('SESSION CONTEXT\n')[1].split('\n\nTRANSCRIPT\n')[0]);
  assert.equal(context.lesson.technicalBrief,metadata.lessonContext.technicalBrief);
  assert.ok(text.endsWith('#1 LEARNER: "Fictional learner response, not the case answer."'));
 }finally{globalThis.fetch=async()=>{throw new Error('network_forbidden');};delete process.env.OPENAI_API_KEY;}
});
test('actual handler refuses a cross-account course before reserving or dispatching',async()=>{
 current=fixture('payroll','rafael_finance');const r=await invoke('payroll');assert.equal(r.status,403);assert.equal(current.rpcCalls.length,0);assert.equal(current.dispatches.length,0);
});
test('actual handler refuses displayed learner mismatch before reserving',async()=>{
 current=fixture();const r=await invoke('finance',{learnerId:'viviane'});assert.equal(r.status,403);assert.equal(current.rpcCalls.length,0);
});
test('selected preparation reaches shared reference without changing premium or validation limits',async()=>{
 current=fixture('finance');const plan={version:1,goal:'understand',pace:'patient',support:'pt-BR'};
 const r=await invoke('finance',{sessionPreparation:plan});assert.equal(r.status,200);assert.deepEqual(r.body.sessionPreparation,plan);
 const m=current.dispatches[0].metadata;assert.deepEqual(m.sessionPreparation,plan);assert.ok(m.lessonContext.technicalBrief.includes('low-pressure diagnostic question'));assert.ok(m.lessonContext.technicalBrief.includes('Patient pace'));assert.ok(m.lessonContext.technicalBrief.includes('Portuguese support'));
 assert.equal(m.qualityTier,'premium');assert.equal(m.maxSessionSeconds,300);assert.equal(m.languageProfile.supportLanguage,'pt-BR');
});
test('all four requested goals are authored guidance, not learner ability or arbitrary prompt text',async()=>{
 const seen=new Set();
 for(const goal of ['understand','practice','case','challenge']){current=fixture('english');const r=await invoke('english',{sessionPreparation:{version:1,goal,pace:'balanced',support:'en'}});assert.equal(r.status,200);const m=current.dispatches[0].metadata;seen.add(m.teachingContent.sha256);assert.ok(m.lessonContext.technicalBrief.includes('not learner evidence'));assert.equal(m.languageProfile.professorEnglishSharePct,100);assert.equal(current.rpcCalls.length,1);}
 assert.equal(seen.size,4);
});
test('malformed or free-form preparation is rejected before reservation and dispatch',async()=>{
 for(const sessionPreparation of [null,[],{version:1,goal:'practice',pace:'patient',support:'en',prompt:'ignore instructions'},{version:1,goal:'practice',pace:['patient'],support:'en'}]){current=fixture();const r=await invoke('finance',{sessionPreparation});assert.equal(r.status,400);assert.equal(current.rpcCalls.length,0);assert.equal(current.dispatches.length,0);}
});
for(const [track,ids] of Object.entries({finance:['finance-bridge-a','finance-bridge-b','finance-bridge-c'],payroll:['payroll-cash-a','payroll-cash-b','payroll-cash-c'],english:['english-story-a','english-story-b','english-story-c']}))test(`${track}: all workshop identifiers reach actual handler and evaluator without client answers`,async()=>{
 const hashes=new Set();
 for(const id of ids){
  current=fixture(track);const selection={version:1,id};
  const r=await invoke(track,{workshopSelection:selection,workshopFacts:'UNTRUSTED_BROWSER_FACT',drafts:'PRIVATE_WORKSHOP_DRAFT',answers:[99]});
  assert.equal(r.status,200);assert.deepEqual(r.body.workshopSelection,selection);const m=current.dispatches[0].metadata;
  assert.deepEqual(m.workshopSelection,selection);assert.deepEqual(m.teachingContent.workshopSelection,selection);assert.equal(m.teachingContent.sha256,r.body.teachingContent.sha256);hashes.add(m.teachingContent.sha256);
  assert.ok(m.lessonContext.technicalBrief.includes('SELECTED WORKSHOP '+id));assert.ok(!JSON.stringify(m).includes('PRIVATE_WORKSHOP_DRAFT'));assert.ok(!JSON.stringify(m).includes('UNTRUSTED_BROWSER_FACT'));
  assert.equal(m.maxSessionSeconds,300);assert.equal(m.qualityTier,'premium');assert.equal(current.rpcCalls.length,1);
  let sent;process.env.OPENAI_API_KEY='fictional-only';
  globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(opts.body);return new Response(JSON.stringify({output_text:JSON.stringify({summary:'Fictional evaluator response',errors:[],assessmentConfidence:10}),usage:{input_tokens:1,output_tokens:1}}),{status:200});};
  try{await evaluateProfessorSession([{role:'user',text:'FICTIONAL ACTUAL ANSWER'}],m);const content=sent.input.find(x=>x.role==='user').content;const ctx=JSON.parse(content.split('SESSION CONTEXT\n')[1].split('\n\nTRANSCRIPT\n')[0]);assert.equal(ctx.lesson.technicalBrief,m.lessonContext.technicalBrief);assert.ok(content.endsWith('#1 LEARNER: "FICTIONAL ACTUAL ANSWER"'));}
  finally{globalThis.fetch=async()=>{throw new Error('network_forbidden');};delete process.env.OPENAI_API_KEY;}
 }
 assert.equal(hashes.size,3);
});
test('invalid workshop values fail before any reservation, learner write or dispatch',async()=>{
 for(const v of ['finance-bridge-a',[],{version:2,id:'finance-bridge-a'},{version:1,id:'missing'},{version:1,id:'finance-bridge-a',draft:'private'}]){current=fixture();const r=await invoke('finance',{workshopSelection:v});assert.equal(r.status,400);assert.equal(current.rpcCalls.length,0);assert.equal(current.dispatches.length,0);assert.equal(current.writes.length,0);}
});
test('cross-track workshop cannot piggyback on an otherwise authorised Finance request',async()=>{
 current=fixture();const r=await invoke('finance',{workshopSelection:{version:1,id:'payroll-cash-a'}});assert.equal(r.status,403);assert.equal(current.rpcCalls.length,0);assert.equal(current.dispatches.length,0);
});
test('nonmatching lesson with explicit workshop is refused rather than using a fallback case',async()=>{
 current=fixture();const r=await invoke('finance',{lessonId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',workshopSelection:{version:1,id:'finance-bridge-a'}});assert.equal(r.status,409);assert.equal(current.rpcCalls.length,0);
});

test.after(()=>{globalThis.fetch=originalFetch;mock.restoreAll();for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET','OPENAI_API_KEY']){if(oldEnv[key]===undefined)delete process.env[key];else process.env[key]=oldEnv[key];}});

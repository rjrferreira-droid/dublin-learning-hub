import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// Execute the actual entry point, substituting only the network/SDK boundary.
// No room, microphone, model call, credentials or database is used.
const fixtureKey = '__professorResponsivenessFixture';
const sdk = `
const f=globalThis.${fixtureKey};
export const defineAgent=x=>x;
export class ServerOptions {constructor(x){Object.assign(this,x)}}
export const cli={runApp(){}};
export const voice={
 Agent:{create:x=>x},
 AgentSessionEventTypes:Object.fromEntries(['ConversationItemAdded','UserInputTranscribed','Close','AgentStateChanged','UserStateChanged','MetricsCollected'].map(x=>[x,x])),
 AgentSession:class {
  constructor(options){this.options=options;this.handlers={};f.sessions.push(this)}
  on(name,handler){this.handlers[name]=handler}
  async start(options){this.agent=options.agent;f.events.push('session_start')}
  async generateReply(options){this.opening=options.instructions;f.events.push('opening')}
 }
};`;
const result = await build({entryPoints:[process.env.LH_RESPONSIVENESS_ENTRY || 'professor-agent/src/index.ts'],bundle:true,
  platform:'node',format:'esm',write:false,plugins:[{name:'offline-sdk',setup(b){
    b.onResolve({filter:/^(@livekit\/agents|@livekit\/agents-plugin-openai|dotenv)$/},a=>({path:a.path,namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='@livekit/agents'?sdk:
      a.path==='dotenv'?'export default {config(){}}':
      'export const realtime={RealtimeModel:class {constructor(options){Object.assign(this,options)}}};',loader:'js'}));
  }}]});
const f:any={events:[],sessions:[]};
(globalThis as any)[fixtureKey]=f;
const temporary=mkdtempSync(join(tmpdir(),'professor-responsiveness-'));
const bundle=join(temporary,'worker.mjs');
writeFileSync(bundle,result.outputFiles[0].text);
const {default:worker}=await import(pathToFileURL(bundle).href);
const previousFetch=globalThis.fetch;
const previousInfo=console.info;
const logs:any[]=[];
console.info=(...args:any[])=>{if(args[0]==='professor_timing')logs.push(JSON.parse(args[1]));};
globalThis.fetch=async()=>{throw Error('unexpected_network_call');};
function ctx(metadata:any={},connect=async()=>{f.events.push('connected')}) {
  return {job:{metadata:JSON.stringify(metadata)},room:{},connect,addShutdownCallback(){},deleteRoom:async()=>{throw Error('unexpected_room_delete')}};
}
test('memory and connection overlap, but opening waits for both and retains learning memory',async()=>{
  f.events=[];
  let releaseMemory!:(value:Response)=>void;
  globalThis.fetch=async(url:any)=>{assert.match(url,/professor-memory-context$/);f.events.push('memory');return new Promise<Response>(r=>{releaseMemory=r;});};
  const metadata={professorProfile:'finance',persistence:{sessionId:'4089af7e-368f-4847-b645-5071138676eb',callbackToken:'PRIVATE_CALLBACK',completionUrl:'https://fixture.invalid/professor-session-complete'}};
  const pending=worker.entry(ctx(metadata));
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(f.events,['memory','connected']);
  releaseMemory(new Response(JSON.stringify({activeErrors:[{pattern:'PRIVATE_LEARNING_MEMORY'}]})));
  await pending;
  assert.deepEqual(f.events,['memory','connected','session_start','opening']);
  assert.match(f.sessions.at(-1).agent.instructions,/PRIVATE_LEARNING_MEMORY/);
  assert.doesNotMatch(JSON.stringify(logs),/PRIVATE_/);
  globalThis.fetch=async()=>{throw Error('unexpected_network_call');};
});
test('Finance opens with context and one question; all active modes use semantic balanced detection',async()=>{
  for(const mode of ['chapter_conversation','oral_mock','general_conversation']) {
    await worker.entry(ctx({professorProfile:'finance',mode,lessonContext:{title:'Reporting scope'}}));
    const s=f.sessions.at(-1);
    assert.deepEqual(s.options.llm.turnDetection,{type:'semantic_vad',eagerness:'medium',create_response:true,interrupt_response:true});
    assert.match(s.opening,/First explain a concrete situation/);
    assert.match(s.opening,/exactly one specific question/);
    assert.match(s.opening,/Reporting scope/);
    assert.doesNotMatch(s.opening,/before giving any teaching/);
  }
});
test('connection failure never starts a model session or retries the connection',async()=>{
  const before=f.sessions.length;let attempts=0;
  await assert.rejects(()=>worker.entry(ctx({},async()=>{attempts++;throw Error('connection_failed')})),/connection_failed/);
  assert.equal(attempts,1);assert.equal(f.sessions.length,before);
});
test('speech/first-token timing uses allowlisted numeric fields, ignores private event bodies and resets on resumed speech',async()=>{
  await worker.entry(ctx());const s=f.sessions.at(-1);logs.length=0;
  s.handlers.AgentStateChanged({newState:'speaking',private:'PRIVATE_EVENT'});
  s.handlers.UserStateChanged({oldState:'speaking',newState:'listening'});
  s.handlers.AgentStateChanged({newState:'speaking'});
  s.handlers.UserStateChanged({oldState:'speaking',newState:'listening'});
  s.handlers.UserStateChanged({oldState:'listening',newState:'speaking'});
  s.handlers.AgentStateChanged({newState:'speaking'});
  s.handlers.MetricsCollected({metrics:{type:'realtime_model_metrics',ttftMs:152.5,requestId:'PRIVATE_REQUEST'}});
  assert.equal(logs[0].stage,'first_speech');
  assert.ok(logs.find((x:any)=>x.stage==='response_speech').durationMs>=0);
  assert.equal(logs.filter((x:any)=>x.stage==='response_speech').at(-1).durationMs,undefined);
  assert.equal(logs.at(-1).durationMs,153);
  assert.doesNotMatch(JSON.stringify(logs),/PRIVATE_/);
});
test.after(()=>{globalThis.fetch=previousFetch;console.info=previousInfo;delete (globalThis as any)[fixtureKey];rmSync(temporary,{recursive:true,force:true});});

import test,{mock} from 'node:test';import assert from 'node:assert/strict';
const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
globalThis.__workspaceSyntheticAuth={auth:{getSession:async()=>({data:{session:{user:{id:userId},access_token:'synthetic-not-a-key'}},error:null})}};
let latestRoom;let blockToken=false;let resolveToken;const originalFetch=globalThis.fetch;
const request={lessonId:'b3639582-3c32-4147-a4b3-84237d11a66e',learnerId:'rafael',track:'rafael_finance',mode:'chapter_conversation',validationMode:true};
function token(){return new Response(JSON.stringify({serverUrl:'wss://synthetic.invalid',token:'fake',roomName:'validation:fictional',participantIdentity:'fictional',sessionId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',maxSessionSeconds:300,validationMode:true,professorProfile:'finance',lessonId:request.lessonId,mode:request.mode}),{status:200});}
globalThis.fetch=async url=>{assert.equal(url,'/api/livekit-token');return blockToken?await new Promise(r=>{resolveToken=()=>r(token());}):token();};
class FakeRoom{
 remoteParticipants=new Map();canPlaybackAudio=true;events=new Map();disconnects=0;connects=0;audioUnlocks=0;microphones=[];holdNext=false;releaseMic=null;
 constructor(){latestRoom=this;}
 localParticipant={setMicrophoneEnabled:async value=>{this.microphones.push(value);if(this.holdNext){this.holdNext=false;await new Promise(r=>this.releaseMic=r);}}};
 on(event,callback){this.events.set(event,callback);return this;}async startAudio(){this.audioUnlocks++;}async connect(){this.connects++;}async disconnect(){this.disconnects++;}
}
mock.module('livekit-client',{namedExports:{Room:FakeRoom,RoomEvent:{TrackSubscribed:'track',AudioPlaybackStatusChanged:'playback',ParticipantAttributesChanged:'attributes',ParticipantConnected:'participant',ParticipantDisconnected:'left',Reconnecting:'reconnecting',Reconnected:'reconnected',Disconnected:'disconnected'},Track:{Kind:{Audio:'audio'}}}});
const {connectProfessor}=await import('../.test-runtime/workspace-client.mjs');
test('real connection wrapper tears down once across abort, explicit End and repeated cleanup',async()=>{
 const controller=new AbortController();const c=await connectProfessor(request,{signal:controller.signal,expectedUserId:userId});const room=latestRoom;
 assert.equal(room.connects,1);assert.equal(room.audioUnlocks,1);assert.deepEqual(room.microphones,[true]);
 controller.abort();await Promise.all([c.disconnect(),c.disconnect()]);assert.equal(room.disconnects,1);assert.deepEqual(room.microphones,[true,false]);await assert.rejects(()=>c.setMicrophoneEnabled(true));
});
test('aborting pending credentials never connects the remote room or enables a microphone',async()=>{
 blockToken=true;resolveToken=null;const controller=new AbortController();const pending=connectProfessor(request,{signal:controller.signal,expectedUserId:userId});const rejected=assert.rejects(pending,/cancelled/);
 for(let i=0;i<20&&!resolveToken;i++)await new Promise(r=>setImmediate(r));assert.ok(resolveToken,'synthetic token request reached');controller.abort();resolveToken();await rejected;blockToken=false;
 assert.equal(latestRoom.connects,0);assert.ok(!latestRoom.microphones.includes(true));assert.equal(latestRoom.disconnects,1);
});
test('late microphone command after cancellation is disabled and rejected instead of restoring capture',async()=>{
 const controller=new AbortController();const c=await connectProfessor(request,{signal:controller.signal,expectedUserId:userId});const room=latestRoom;room.holdNext=true;
 const change=c.setMicrophoneEnabled(true);const rejection=assert.rejects(change,/changed/);controller.abort();room.releaseMic();await rejection;await c.disconnect();assert.equal(room.microphones.at(-1),false);assert.equal(room.disconnects,1);
});
test('wrong lesson, mode, course or reference acknowledgement never connects or enables microphone',async()=>{
 const saved=globalThis.fetch;
 try{
  for(const change of [{lessonId:'33333333-3333-4333-8333-333333333333'},{mode:'general_conversation'},{professorProfile:'payroll'},{teachingContent:{lessonId:request.lessonId,track:'payroll'}},{teachingContent:{lessonId:'wrong',track:'finance'}}]){
   globalThis.fetch=async()=>new Response(JSON.stringify({...await token().json(),...change}));
   await assert.rejects(()=>connectProfessor(request,{expectedUserId:userId}),/could not be confirmed/);
   assert.equal(latestRoom.connects,0);assert.ok(!latestRoom.microphones.includes(true));
  }
 }finally{globalThis.fetch=saved;}
});
test('P1 identity needs its reviewed slug and server reference before microphone access',async()=>{
 const saved=globalThis.fetch,p1={...request,lessonId:'11111111-1111-4111-8111-111111111111'};
 const descriptor={lessonId:p1.lessonId,track:'finance',source:'server-authored-reviewed-p1',lessonSlug:'revenue-judgement-contracts-performance-obligations-cutoff',sha256:'a'.repeat(64)};
 try{
  for(const teachingContent of [null,{...descriptor,lessonSlug:'story-past-forms-rhythm-follow-up'},{...descriptor,source:'browser-draft'},{...descriptor,sha256:null}]){
   globalThis.fetch=async()=>new Response(JSON.stringify({...await token().json(),lessonId:p1.lessonId,teachingContent}));
   await assert.rejects(()=>connectProfessor(p1,{expectedUserId:userId}),/P1 lesson reference could not be confirmed/);
   assert.equal(latestRoom.connects,0);assert.ok(!latestRoom.microphones.includes(true));
  }
  globalThis.fetch=async()=>new Response(JSON.stringify({...await token().json(),lessonId:p1.lessonId,teachingContent:descriptor}));
  const connection=await connectProfessor(p1,{expectedUserId:userId});assert.equal(latestRoom.connects,1);await connection.disconnect();
 }finally{globalThis.fetch=saved;}
});
test.after(()=>{globalThis.fetch=originalFetch;delete globalThis.__workspaceSyntheticAuth;mock.restoreAll();});

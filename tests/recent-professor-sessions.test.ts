import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecentProfessorSessions,readRecentProfessorSessions} from '../src/professor/recentSessions.ts';
const scope={userId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lessonId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
const row=()=>({id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',user_id:scope.userId,lesson_id:scope.lessonId,room_name:'validation:fictional',status:'completed',started_at:'2026-09-20T10:00:00Z',completed_at:'2026-09-20T10:03:00Z'});
function fixture(){
 const calls:any[]=[];let authCalls=0;
 const state={rows:[row()] as unknown,error:null as unknown,owner:scope.userId,afterOwner:scope.userId,holdAuth:null as Promise<any>|null};
 const query:any={};
 for(const method of ['select','eq','order','limit','abortSignal'])query[method]=(...args:any[])=>{calls.push([method,...args]);return query;};
 query.then=(ok:any,no:any)=>Promise.resolve({data:state.rows,error:state.error}).then(ok,no);
 const db={auth:{getUser:async()=>{authCalls++;return state.holdAuth??{data:{user:{id:authCalls===1?state.owner:state.afterOwner}},error:null};}},from:(name:string)=>{calls.push(['from',name]);return query;}};
 return {db,state,calls,authCount:()=>authCalls};
}
test('history exposes only bounded public references and distinguishes validation from learning',()=>{
 const r=parseRecentProfessorSessions([{...row(),callback_token_hash:'private',transcript:['private'],final_feedback:{summary:'private'}}],scope);
 assert.deepEqual(r,[{id:row().id,startedAt:row().started_at,status:'completed',validation:true}]);
 assert.equal(parseRecentProfessorSessions([{...row(),room_name:'lh-fictional'}],scope)[0].validation,false);
 assert.deepEqual(parseRecentProfessorSessions([],scope),[]);
});
test('cross-account, cross-lesson, duplicates, overflow and malformed history fail closed',()=>{
 for(const change of [{id:'wrong'},{user_id:'other'},{lesson_id:'other'},{status:'unknown'},{started_at:'wrong'},{completed_at:null},{room_name:null}])assert.throws(()=>parseRecentProfessorSessions([{...row(),...change}],scope));
 for(const value of [null,{},[row(),row()],Array(6).fill(row())])assert.throws(()=>parseRecentProfessorSessions(value,scope));
});
test('reader verifies Auth twice and restricts the actual query to five records for the owner and lesson',async()=>{
 const f=fixture();const r=await readRecentProfessorSessions(f.db,scope,new AbortController().signal);
 assert.equal(r.length,1);assert.equal(f.authCount(),2);
 assert.deepEqual(f.calls.filter(c=>c[0]!=='abortSignal'),[
  ['from','ai_tutor_sessions'],['select','id,user_id,lesson_id,room_name,status,started_at,completed_at'],
  ['eq','user_id',scope.userId],['eq','lesson_id',scope.lessonId],['order','started_at',{ascending:false}],['order','id',{ascending:false}],['limit',5],
 ]);
});
test('mismatched Auth blocks reading or discards the result after a switch',async()=>{
 for(const when of ['before','after']){
  const f=fixture();if(when==='before')f.state.owner='other';else f.state.afterOwner='other';
  await assert.rejects(()=>readRecentProfessorSessions(f.db,scope,new AbortController().signal),/recent_sessions_unavailable/);
  if(when==='before')assert.equal(f.calls.length,0);
 }
});
test('stalled Auth is bounded and late completion cannot send a query',async()=>{
 const f=fixture();let finish!:(v:any)=>void;
 f.state.holdAuth=new Promise(resolve=>finish=resolve);
 await assert.rejects(()=>readRecentProfessorSessions(f.db,scope,new AbortController().signal,10),/recent_sessions_unavailable/);
 finish({data:{user:{id:scope.userId}},error:null});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.calls.length,0);
});
test('pre-cancelled reads never access Auth or data; database failures reveal no raw error',async()=>{
 const f=fixture();const controller=new AbortController();controller.abort();
 await assert.rejects(()=>readRecentProfessorSessions(f.db,scope,controller.signal));assert.equal(f.authCount(),0);assert.equal(f.calls.length,0);
 f.state.error={message:'private diagnostic'};
 await assert.rejects(()=>readRecentProfessorSessions(f.db,scope,new AbortController().signal),e=>(e as Error).message==='recent_sessions_unavailable');
});
test('captured identity cannot be changed while authentication is pending',async()=>{
 const f=fixture();let finish!:(v:any)=>void;f.state.holdAuth=new Promise(resolve=>finish=resolve);
 const mutable={...scope};const pending=readRecentProfessorSessions(f.db,mutable,new AbortController().signal);
 mutable.userId='other';mutable.lessonId='other';
 finish({data:{user:{id:scope.userId}},error:null});await pending;
 assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='lesson_id'&&c[2]===scope.lessonId));
});

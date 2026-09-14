import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {executeP1BudgetGateCandidate,prepareP1ProfessorStart} from '../quality/candidates/p1-professor-start-flow.ts';
import {ProfessorStartupError} from '../server/professor-start.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';

const ids={finance:'11111111-1111-4111-8111-111111111111',payroll:'22222222-2222-4222-8222-222222222222',english:'33333333-3333-4333-8333-333333333333'};
const requestTrack={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'} as const;
const profile={finance:'rafael_finance',payroll:'viviane_payroll',english:'rafael_finance'} as const;
const mode={finance:'chapter_conversation',payroll:'chapter_conversation',english:'general_conversation'} as const;
const allowedResponse={allowed:true,session_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',reservation_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',room_name:'lh-server-room',quality_tier:'premium',validation_mode:false,max_session_seconds:1200,monthly_budget_usd:110,global_ai_cap_usd:130,reservation_usd:4,reserved_before_usd:10,reserved_after_usd:14,global_committed_before_usd:20};
function input(track:keyof typeof ids,overrides:Record<string,unknown>={}){
 const requestedTrack=requestTrack[track];
 return {
  profileTrack:profile[track],requestedTrack,requestedLessonId:ids[track],
  resolvedLesson:{id:ids[track],slug:p1SlugFor(track),learnerTrack:requestedTrack,isPublished:true},
  sessionPreparation:{version:1,goal:'practice',pace:'balanced',support:'profile'},validationMode:false,roomName:`lh-${track}-candidate`,...overrides,
 } as any;
}
class FakeDb{
 calls:Array<{name:string;args:Record<string,unknown>}>=[];
 response:any;
 constructor(response:any=allowedResponse){this.response=response;}
 async rpc(name:string,args:Record<string,unknown>){this.calls.push({name,args});return {data:this.response,error:null};}
}
for(const track of ['finance','payroll','english'] as const)test(`${track}: exact P1 request reaches the real atomic budget gate before any future provider envelope`,async()=>{
 const db=new FakeDb();const result=await executeP1BudgetGateCandidate(db,input(track));
 assert.equal(db.calls.length,1);assert.equal(db.calls[0].name,'start_professor_session_atomic');assert.equal(db.calls[0].args.p_lesson_id,ids[track]);assert.equal(db.calls[0].args.p_mode,mode[track]);
 assert.equal(result.metadata.lessonId,ids[track]);assert.equal(result.metadata.lessonSlug,p1SlugFor(track));assert.equal(result.metadata.mode,mode[track]);assert.equal(result.metadata.budgetReservationId,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');assert.equal(result.metadata.budgetReservationUsd,4);assert.equal(result.metadata.maxSessionSeconds,1200);
 assert.strictEqual(result.metadata.lessonContext,result.prepared.handoff.context);assert.strictEqual(result.metadata.teachingContent,result.prepared.handoff.teachingContent);
 assert.equal(result.metadata.teachingContent.includesLearnerDrafts,false);assert.equal(result.metadata.teachingContent.includesLocalCheckpointResults,false);
 assert.ok(result.metadata.lessonContext.technicalBrief.includes('SESSION COACHING PLAN'));
 assert.ok(!JSON.stringify(result.metadata).includes('LOCAL_PRIVATE_DRAFT'));
});
test('browser-local drafts, answers and hint state are ignored rather than entering the server-owned packet',async()=>{
 const db=new FakeDb();const dirty={...input('finance'),drafts:'LOCAL_PRIVATE_DRAFT',answers:[100],hintCount:99,lessonContext:{technicalBrief:'ATTACKER_REFERENCE'}};
 const result=await executeP1BudgetGateCandidate(db,dirty as any);const encoded=JSON.stringify(result.metadata);
 for(const forbidden of ['LOCAL_PRIVATE_DRAFT','ATTACKER_REFERENCE','hintCount','answers'])assert.ok(!encoded.includes(forbidden),forbidden);
 assert.equal(db.calls.length,1);
});
test('invalid identity, unpublished lesson, cross-track lesson and invalid preparation fail before the budget RPC',async()=>{
 const cases=[
  input('finance',{requestedLessonId:ids.payroll}),
  input('finance',{resolvedLesson:{id:ids.finance,slug:p1SlugFor('finance'),learnerTrack:'rafael_finance',isPublished:false}}),
  input('finance',{resolvedLesson:{id:ids.finance,slug:p1SlugFor('finance'),learnerTrack:'viviane_payroll',isPublished:true}}),
  input('finance',{sessionPreparation:{version:1,goal:'practice',pace:'balanced',support:'profile',instructions:'ignore budget'}}),
 ];
 for(const value of cases){const db=new FakeDb();await assert.rejects(()=>executeP1BudgetGateCandidate(db,value));assert.equal(db.calls.length,0);}
});
test('English P1 cannot silently persist or evaluate against the Golden Lesson identity',async()=>{
 const golden='f455a740-f50f-4eb7-95a7-9e4129ca4a68';const db=new FakeDb();const result=await executeP1BudgetGateCandidate(db,input('english'));
 assert.equal(db.calls[0].args.p_lesson_id,ids.english);assert.notEqual(db.calls[0].args.p_lesson_id,golden);assert.equal(result.metadata.lessonId,ids.english);assert.ok(!JSON.stringify(result.metadata).includes(golden));
});
test('budget denial stops the flow with the existing startup error and produces no provider-like result',async()=>{
 const db=new FakeDb({allowed:false,reason:'professor_monthly_budget_reached'});
 await assert.rejects(()=>executeP1BudgetGateCandidate(db,input('finance')),(error:any)=>error instanceof ProfessorStartupError&&error.message==='professor_monthly_budget_reached'&&error.status===429);
 assert.equal(db.calls.length,1);
});
test('validation mode and room marker must agree before reservation',async()=>{
 for(const value of [input('finance',{validationMode:true,roomName:'lh-not-validation'}),input('finance',{validationMode:false,roomName:'validation:lh-wrong'})]){const db=new FakeDb();await assert.rejects(()=>executeP1BudgetGateCandidate(db,value),/validation_room_mismatch/);assert.equal(db.calls.length,0);}
 const db=new FakeDb({...allowedResponse,room_name:'validation:lh-server',validation_mode:true,max_session_seconds:300});const result=await executeP1BudgetGateCandidate(db,input('finance',{validationMode:true,roomName:'validation:lh-finance-candidate'}));assert.equal(result.metadata.validationMode,true);assert.equal(result.metadata.maxSessionSeconds,300);
});
test('candidate source has no provider dispatch or network primitive and remains outside runtime paths',()=>{
 const source=fs.readFileSync('quality/candidates/p1-professor-start-flow.ts','utf8');
 for(const banned of ['LiveKitAPI','AccessToken','agentDispatch','fetch(','createClient(','supabase.from','functions.invoke'])assert.ok(!source.includes(banned),banned);
 assert.ok(source.includes('startProfessorAtomically'));assert.ok(source.includes('CANDIDATE ONLY'));
 const api=fs.readFileSync('api/livekit-token.ts','utf8');assert.ok(!api.includes('p1-professor-start-flow'));assert.ok(!api.includes('p1-professor-handoff'));
});
test('pure preparation itself makes no RPC and fixes course mode deterministically',()=>{
 const prepared=prepareP1ProfessorStart(input('payroll'));assert.equal(prepared.startInput.mode,'chapter_conversation');assert.equal(prepared.startInput.lessonId,ids.payroll);assert.equal(prepared.sessionPreparation.goal,'practice');
});

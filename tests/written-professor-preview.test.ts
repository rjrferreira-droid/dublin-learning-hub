import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWrittenProfessorPreview} from '../quality/candidates/resolve-written-professor-preview.ts';
import {prepareWrittenAudioPreview} from '../quality/candidates/written-audio-preview.ts';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';
import {sequence4SlugFor} from '../src/learning/sequence4Registry.ts';
import {remainingSlugFor} from '../src/learning/remainingWrittenRegistry.ts';
import type {P1Track} from '../src/learning/p1RuntimeRegistry.ts';
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id='11111111-1111-4111-8111-111111111111',mid='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'} as const;
function fixture(track:P1Track='finance',sequence:3|4|5|6|7|8=3){
 const rows:any={profiles:{id:user,learner_track:track==='payroll'?tracks.payroll:tracks.finance},lessons:{id,module_id:mid,slug:sequence===3?sequence3SlugFor(track):sequence===4?sequence4SlugFor(track):remainingSlugFor(track,sequence),sequence,content_version:1,is_published:true},modules:{id:mid,course_id:cid,is_published:true},courses:{id:cid,learner_track:tracks[track],is_active:true}};
 const events:string[]=[];let errorTable='',authError=false,authUser:any={id:user,user_metadata:{learner_track:tracks.payroll}};
 const db={auth:{getUser:async()=>{events.push('auth');return {data:{user:authUser},error:authError?{}:null};}},from(table:string){
  const q={select(){return q;},eq(_k:string,_v:unknown){return q;},async maybeSingle(){events.push(table);return {data:rows[table],error:table===errorTable?{}:null};}};
  // Return even malformed rows to exercise defensive checks beyond the adapter's RLS.
  return q;
 },rpc(){throw Error('No budget or provider may be called');}};
 return {rows,db,events,input:{requestedTrack:tracks[track],lessonId:id},failRead:(s:string)=>{errorTable=s;},failAuth:()=>{authError=true;},noUser:()=>{authUser=null;}};
}
for(const track of Object.keys(tracks) as P1Track[])for(const sequence of [3,4,5,6,7,8] as const)test(`${track} ${sequence}: authenticated candidate resolves authored lesson and evaluator context`,async()=>{
 const f=fixture(track,sequence);const r=await resolveWrittenProfessorPreview(f.db,{...f.input,profileTrack:'manuzinha',resolved:{},draft:'PRIVATE_DRAFT',answers:['PRIVATE_ANSWER']} as any,env);
 assert.deepEqual(f.events,['auth','profiles','lessons','modules','courses']);
 assert.equal(r.identity.lessonId,id);assert.equal(r.identity.lessonSlug,f.rows.lessons.slug);assert.equal(r.identity.sequence,sequence);
 assert.equal(r.descriptor.providerAdmission,false);assert.equal(r.lessonContext.title,r.context.title);
 assert.match(r.lessonContext.technicalBrief,/Not learner evidence/);assert.ok(r.lessonContext.technicalBrief.length<=14000);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE_DRAFT|PRIVATE_ANSWER|manuzinha/);
 for(const key of ['whenCorrect','whenUncertain','whenMisconception','whenSelfCorrected','whenAskedForAnswer'] as const)assert.ok(r.context.teachingGuide[key].length>20);
 f.rows.lessons.content_version=2;assert.notEqual((await resolveWrittenProfessorPreview(f.db,f.input,env)).descriptor.sha256,r.descriptor.sha256);
});
test('environment, request, Auth, profile and each ancestry error stop without later reads',async()=>{
 for(const e of [{VERCEL_ENV:'production'}, {...env,VERCEL_GIT_COMMIT_REF:'main'},{}]){const f=fixture();await assert.rejects(()=>resolveWrittenProfessorPreview(f.db,f.input,e),/unavailable/);assert.deepEqual(f.events,[]);}
 const bad=fixture();await assert.rejects(()=>resolveWrittenProfessorPreview(bad.db,{...bad.input,lessonId:'invalid'},env),/invalid_request/);assert.deepEqual(bad.events,[]);
 for(const fail of ['auth','noUser','profiles','lessons','modules','courses']){
  const f=fixture();if(fail==='auth')f.failAuth();else if(fail==='noUser')f.noUser();else f.failRead(fail);
  await assert.rejects(()=>resolveWrittenProfessorPreview(f.db,f.input,env),/unauthenticated|forbidden/);
  assert.equal(f.events.at(-1),fail==='noUser'?'auth':fail);
 }
 for(const [table,key,value] of [['profiles','id',cid],['profiles','learner_track','manuzinha'],['profiles','learner_track','viviane_payroll'],['lessons','id',cid],['lessons','is_published',false],['modules','id',cid],['modules','is_published',false],['courses','id',mid],['courses','learner_track','viviane_payroll'],['courses','is_active',false]] as const){
  const f=fixture();f.rows[table][key]=value;await assert.rejects(()=>resolveWrittenProfessorPreview(f.db,f.input,env),/forbidden/);assert.equal(f.events.at(-1),table);
 }
});
test('shared English accepts either assigned profile but no manufactured reference version or sequence',async()=>{
 const f=fixture('english',8);f.rows.profiles.learner_track='viviane_payroll';const r=await resolveWrittenProfessorPreview(f.db,f.input,env);
 assert.match(r.lessonContext.technicalBrief,/No embedded or validated Irish-accent audio/);
 for(const [key,value] of [['content_version',0],['sequence',7],['slug','unknown']] as const){const x=fixture();x.rows.lessons[key]=value;await assert.rejects(()=>resolveWrittenProfessorPreview(x.db,x.input,env),/future_reference_/);}
});
for(const track of Object.keys(tracks) as P1Track[])for(const sequence of [3,4,5,6,7,8] as const)test(`${track} ${sequence}: Audio overview is authored, versioned and provider-free`,async()=>{
 const f=fixture(track,sequence);
 const audio=await prepareWrittenAudioPreview(f.db,{...f.input,script:'PRIVATE_TTS_SCRIPT',answers:['PRIVATE_ANSWER']} as any,env);
 assert.equal(audio.identity.lessonId,id);assert.equal(audio.language,track==='english'?'en':'pt-BR');
 assert.ok(audio.characters>100&&audio.characters<=4000);assert.equal(audio.characters,audio.script.length);
 assert.equal(audio.providerAdmission,false);assert.equal(audio.includesWorkedAnswer,false);
 assert.doesNotMatch(JSON.stringify(audio),/PRIVATE_TTS_SCRIPT|PRIVATE_ANSWER/);
 const reference=await resolveWrittenProfessorPreview(f.db,f.input,env);
 for(const s of reference.context.teachingSteps)assert.ok(audio.script.includes(track==='english'?s.paragraphs[0]:s.supportPt));
 assert.ok(!audio.script.includes(reference.context.authoredCase.referenceAnswer));
 f.rows.lessons.content_version=2;const changed=await prepareWrittenAudioPreview(f.db,f.input,env);
 assert.equal(changed.scriptSha256,audio.scriptSha256);assert.notEqual(changed.sourceFingerprint,audio.sourceFingerprint);
 if(track==='english'&&sequence===8)assert.match(audio.script,/not verified Irish-accent audio/);
 f.rows.lessons.is_published=false;await assert.rejects(()=>prepareWrittenAudioPreview(f.db,f.input,env),/forbidden/);
});

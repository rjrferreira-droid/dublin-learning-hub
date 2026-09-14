/** Actual local Supabase Auth/PostgREST/Storage, fictional data only; no provider. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {p1SlugFor} from '../../src/learning/p1RuntimeRegistry.ts';
import {resolvePreviewP1Lesson,P1_PREVIEW_BRANCH} from '../../server/p1-preview-runtime.ts';
import {resolveWrittenProfessorPreview} from '../candidates/resolve-written-professor-preview.ts';
import {sequence3SlugFor} from '../../src/learning/sequence3Registry.ts';
import {sequence4SlugFor} from '../../src/learning/sequence4Registry.ts';
import {remainingSlugFor} from '../../src/learning/remainingWrittenRegistry.ts';
const status=JSON.parse(readFileSync(process.argv[2],'utf8'));
const api=new URL(status.API_URL);
assert.ok(['127.0.0.1','localhost'].includes(api.hostname)&&api.port==='54321'&&api.protocol==='http:','local API only');
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined,'No connected access token');
const originalFetch=globalThis.fetch;
let requests=0;
globalThis.fetch=(input,init)=>{
 const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='54321'&&u.protocol==='http:','External network request forbidden');
 requests++;return originalFetch(input,{...init,redirect:'error'});
};
const make=key=>createClient(api.href,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const admin=make(status.SERVICE_ROLE_KEY),anon=make(status.ANON_KEY);
const ok=result=>{if(result.error)throw Error(result.error.code+': '+result.error.message);return result.data;};
// NOTIFY is asynchronous. Only retry the read-only schema-cache readiness probe.
for(let attempt=0;;attempt++){
 const result=await admin.from('profiles').select('id').limit(1);
 if(!result.error)break;
 if(result.error.code!=='PGRST205'||attempt>=24)ok(result);
 await new Promise(resolve=>setTimeout(resolve,200));
}
const clients={},users={},lessons={};
for(const name of ['finance','payroll','unassigned']){
 const password=randomBytes(24).toString('hex');
 const user=ok(await admin.auth.admin.createUser({email:`${name}@learning-hub.example.invalid`,password,email_confirm:true,user_metadata:{learner_track:'viviane_payroll'}})).user;
 users[name]=user.id;clients[name]=make(status.ANON_KEY);
 ok(await clients[name].auth.signInWithPassword({email:user.email,password}));
 assert.equal(ok(await clients[name].auth.getUser()).user.id,user.id);
}
ok(await admin.from('profiles').insert([{id:users.finance,display_name:'Fictional Finance',learner_track:'rafael_finance'},{id:users.payroll,display_name:'Fictional Payroll',learner_track:'viviane_payroll'}]));
for(const track of ['finance','payroll','english']){
 const learner_track={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'}[track];
 const course=ok(await admin.from('courses').insert({slug:track,title:'Fictional '+track,learner_track,is_active:true}).select().single());
 const mod=ok(await admin.from('modules').insert({course_id:course.id,slug:'fictional',title:'Fictional module',sequence:1,is_published:true}).select().single());
 lessons[track]=ok(await admin.from('lessons').insert({module_id:mod.id,slug:p1SlugFor(track),title:'Fictional P1',sequence:2,is_published:true,content_version:1}).select().single());
}
for(const track of ['finance','payroll']){
 const client=clients[track],profile=ok(await client.from('profiles').select()).at(0);
 assert.equal(profile.id,users[track]);assert.equal(profile.learner_track,track==='finance'?'rafael_finance':'viviane_payroll');
 const visible=ok(await client.from('lessons').select('id'));
 assert.deepEqual(new Set(visible.map(x=>x.id)),new Set([lessons[track].id,lessons.english.id]));
 const forbidden=track==='finance'?'payroll':'finance';
 assert.deepEqual(ok(await client.from('lessons').select('id').eq('id',lessons[forbidden].id)),[]);
 assert.ok((await client.from('profiles').update({learner_track:forbidden==='finance'?'rafael_finance':'viviane_payroll'}).eq('id',users[track])).error);
 for(const requested of [track,'english']){
  const requestedTrack=requested==='english'?'english_academy':profile.learner_track;
  const ref=await resolvePreviewP1Lesson(client,{profileTrack:profile.learner_track,requestedTrack,requestedLessonId:lessons[requested].id,approachBrief:''},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:P1_PREVIEW_BRANCH});
  assert.equal(ref.lessonId,lessons[requested].id);assert.equal(ref.lessonSlug,p1SlugFor(requested));
  const requestId=randomUUID();
  const result=ok(await client.rpc('start_professor_session_atomic',{p_request_id:requestId,p_lesson_id:ref.lessonId,p_mode:requested==='english'?'general_conversation':'chapter_conversation',p_room_name:'lh-'+requestId,p_callback_hash:'a'.repeat(64),p_validation_mode:false}));
  assert.equal(result.allowed,false);assert.equal(result.reason,'professor_monthly_budget_reached');
 }
 await assert.rejects(()=>resolvePreviewP1Lesson(client,{profileTrack:profile.learner_track,requestedTrack:forbidden==='finance'?'rafael_finance':'viviane_payroll',requestedLessonId:lessons[forbidden].id,approachBrief:''},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:P1_PREVIEW_BRANCH}),/forbidden/);
}
assert.deepEqual(ok(await clients.unassigned.from('courses').select('id')),[]);
assert.ok((await clients.unassigned.from('profiles').insert({id:users.unassigned,display_name:'Not assigned',learner_track:'rafael_finance'})).error);
assert.ok((await anon.from('lessons').select('id')).error);
assert.deepEqual(ok(await admin.from('professor_budget_reservations').select('id')),[]);
assert.deepEqual(ok(await admin.from('ai_tutor_sessions').select('id')),[]);
// Expand only this disposable fixture. Connected curriculum and provider registries stay closed.
const future={};
const previewEnv={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:P1_PREVIEW_BRANCH};
for(const track of ['finance','payroll','english']){
 future[track]={};
 for(const sequence of [3,4,5,6,7,8]){
  const slug=sequence===3?sequence3SlugFor(track):sequence===4?sequence4SlugFor(track):remainingSlugFor(track,sequence);
  future[track][sequence]=ok(await admin.from('lessons').insert({module_id:lessons[track].module_id,slug,title:'Fictional written reference',sequence,is_published:true,content_version:1}).select().single());
 }
}
let futureReferences=0;
for(const account of ['finance','payroll'])for(const requested of [account,'english'])for(const sequence of [3,4,5,6,7,8]){
 const lesson=future[requested][sequence],requestedTrack={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'}[requested];
 const ref=await resolveWrittenProfessorPreview(clients[account],{lessonId:lesson.id,requestedTrack,profileTrack:'manuzinha',draft:'LOCAL_PRIVATE_SENTINEL',contentVersion:999},previewEnv);
 assert.equal(ref.identity.lessonId,lesson.id);assert.equal(ref.identity.contentVersion,1);assert.equal(ref.identity.sequence,sequence);
 assert.equal(ref.descriptor.providerAdmission,false);assert.doesNotMatch(JSON.stringify(ref),/LOCAL_PRIVATE_SENTINEL|manuzinha/);
 futureReferences++;
}
for(const account of ['finance','payroll']){
 const other=account==='finance'?'payroll':'finance';
 for(const sequence of [3,4,5,6,7,8])await assert.rejects(()=>resolveWrittenProfessorPreview(clients[account],{lessonId:future[other][sequence].id,requestedTrack:other==='finance'?'rafael_finance':'viviane_payroll'},previewEnv),/forbidden/);
}
const probe=future.finance[3],request={lessonId:probe.id,requestedTrack:'rafael_finance'};
const before=await resolveWrittenProfessorPreview(clients.finance,request,previewEnv);
ok(await admin.from('lessons').update({content_version:2}).eq('id',probe.id));
const after=await resolveWrittenProfessorPreview(clients.finance,request,previewEnv);
assert.equal(after.identity.contentVersion,2);assert.notEqual(after.descriptor.sha256,before.descriptor.sha256);
for(const [table,rowId,field] of [['lessons',probe.id,'is_published'],['modules',probe.module_id,'is_published']]){
 ok(await admin.from(table).update({[field]:false}).eq('id',rowId));
 await assert.rejects(()=>resolveWrittenProfessorPreview(clients.finance,request,previewEnv),/forbidden/);
 ok(await admin.from(table).update({[field]:true}).eq('id',rowId));
}
const probeModule=ok(await admin.from('modules').select('course_id').eq('id',probe.module_id).single());
ok(await admin.from('courses').update({is_active:false}).eq('id',probeModule.course_id));
await assert.rejects(()=>resolveWrittenProfessorPreview(clients.finance,request,previewEnv),/forbidden/);
ok(await admin.from('courses').update({is_active:true}).eq('id',probeModule.course_id));
await assert.rejects(()=>resolveWrittenProfessorPreview(clients.unassigned,request,previewEnv),/forbidden/);
await assert.rejects(()=>resolveWrittenProfessorPreview(anon,request,previewEnv),/unauthenticated/);
assert.deepEqual(ok(await admin.from('professor_budget_reservations').select('id')),[]);
assert.deepEqual(ok(await admin.from('ai_tutor_sessions').select('id')),[]);
const path='fictional/local-contract.mp3',bytes=Buffer.from('ID3-fictional-storage-contract-not-playable-audio');
ok(await admin.storage.from('lesson-audio').upload(path,bytes,{contentType:'audio/mpeg',upsert:false}));
assert.equal(ok(await admin.storage.getBucket('lesson-audio')).public,false);
for(const client of [anon,clients.finance,clients.payroll]){
 assert.ok((await client.storage.from('lesson-audio').download(path)).error);
 assert.ok((await client.storage.from('lesson-audio').createSignedUrl(path,60)).error);
 assert.ok((await client.storage.from('lesson-audio').upload('forbidden.mp3',bytes,{contentType:'audio/mpeg'})).error);
}
const signed=ok(await admin.storage.from('lesson-audio').createSignedUrl(path,60));
const response=await fetch(signed.signedUrl);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
const invalid=new URL(signed.signedUrl);invalid.searchParams.set('token','invalid');assert.equal((await fetch(invalid)).ok,false);
const publicUrl=admin.storage.from('lesson-audio').getPublicUrl(path).data.publicUrl;assert.equal((await fetch(publicUrl)).ok,false);
for(const client of Object.values(clients))ok(await client.auth.signOut());
console.log(JSON.stringify({status:'passed',realLocalAuth:true,realLocalPostgrest:true,realLocalStorage:true,assignedAccounts:2,unassignedAccounts:1,p1References:4,futureReferences,zeroBudgetStartsDenied:4,paidProviderCalls:0,connectedProjectWrites:0,networkScope:'loopback:54321',requests}));

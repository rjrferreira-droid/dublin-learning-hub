/** Real disposable Auth/PostgREST only. No provider or connected project. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {mintWrittenProfessorPreview} from '../candidates/mint-written-professor-preview.ts';
import {mintP1ProfessorPreview} from '../candidates/p1-professor-binding.ts';
const status=JSON.parse(readFileSync(process.argv[2],'utf8'));
const fixture=JSON.parse(readFileSync(join(dirname(process.argv[2]),'local-browser-fixture.json'),'utf8'));
const api=new URL(status.API_URL),originalFetch=globalThis.fetch;
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
const local=u=>assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='54321'&&u.protocol==='http:','loopback only');local(api);
globalThis.fetch=(input,init)=>{local(new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url));return originalFetch(input,{...init,redirect:'error'});};
const make=key=>createClient(api.href,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const admin=make(status.SERVICE_ROLE_KEY),anon=make(status.ANON_KEY),clients={};
const ok=r=>{if(r.error)throw Error(r.error.code+': '+r.error.message);return r.data;};
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
for(const [name,credentials] of Object.entries(fixture.accounts)){clients[name]=make(status.ANON_KEY);ok(await clients[name].auth.signInWithPassword(credentials));}
const params=ticket=>({p_reference_id:ticket.reference_id,p_request_id:randomUUID(),p_mode:'chapter_conversation',p_room_name:'lh-'+randomUUID(),p_callback_hash:'a'.repeat(64),p_validation_mode:true});
// Wait only for asynchronous local PostgREST schema notification, without mutations.
for(let i=0;;i++){
 const r=await anon.rpc('create_written_professor_reference_v1',{p_user_id:null,p_identity:{},p_source_sha256:null,p_descriptor_version:null});
 if(r.error?.code!=='PGRST202'){assert.ok(r.error);break;}
 if(i>=24)ok(r);await new Promise(resolve=>setTimeout(resolve,200));
}
let minted=0;let probe;
let p1Minted=0;
for(const account of ['finance','payroll'])for(const track of [account,'english']){
 const lesson=fixture.p1Lessons[track],requestedTrack={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'}[track];
 const result=await mintP1ProfessorPreview(clients[account],admin,{lessonId:lesson.id,requestedTrack,draft:'PRIVATE_P1_SENTINEL',contentVersion:999},env);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_P1_SENTINEL/);assert.equal(result.reference.identity.contentVersion,1);
 assert.equal(result.reference.identity.lessonSlug,lesson.slug);
 const admission=ok(await clients[account].rpc('start_written_professor_session_v1',params(result.ticket)));
 assert.equal(admission.allowed,false);assert.equal(admission.reason,'professor_monthly_budget_reached');
 const other=account==='finance'?'payroll':'finance';
 assert.match((await clients[other].rpc('start_written_professor_session_v1',params(result.ticket))).error?.message??'',/written_reference_forbidden/);
 ok(await admin.from('lessons').update({content_version:2}).eq('id',lesson.id));
 try{assert.match((await clients[account].rpc('start_written_professor_session_v1',params(result.ticket))).error?.message??'',/written_reference_stale_or_forbidden/);}
 finally{ok(await admin.from('lessons').update({content_version:1}).eq('id',lesson.id));}
 p1Minted++;
}
for(const account of ['finance','payroll'])for(const track of [account,'english'])for(const sequence of [3,4,5,6,7,8]){
 const lesson=fixture.lessons[track][sequence],requestedTrack={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'}[track];
 const result=await mintWrittenProfessorPreview(clients[account],admin,{lessonId:lesson.id,requestedTrack,draft:'PRIVATE_SENTINEL',source_sha256:'b'.repeat(64),userId:'forged'},env);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_SENTINEL|forged/);
 const admission=ok(await clients[account].rpc('start_written_professor_session_v1',params(result.ticket)));
 assert.equal(admission.allowed,false);assert.equal(admission.reason,'professor_monthly_budget_reached');
 if(account==='finance'&&track==='finance'&&sequence===3)probe=result;
 minted++;
}
const user=ok(await clients.finance.auth.getUser()).user.id;
const mintArgs={p_user_id:user,p_identity:probe.reference.identity,p_source_sha256:probe.reference.descriptor.sha256,p_descriptor_version:probe.reference.descriptor.version};
for(const c of [anon,clients.finance,clients.payroll,clients.unassigned])assert.ok((await c.rpc('create_written_professor_reference_v1',mintArgs)).error,'only service may attest source');
for(const c of [anon,clients.payroll,clients.unassigned,admin])assert.ok((await c.rpc('start_written_professor_session_v1',params(probe.ticket))).error,'ticket requires owning authenticated learner');
const identity=probe.reference.identity;
const mutations=[
 ['lessons',identity.lessonId,{content_version:identity.contentVersion+1},{content_version:identity.contentVersion}],
 ['lessons',identity.lessonId,{is_published:false},{is_published:true}],
 ['lessons',identity.lessonId,{slug:'fictional-changed-slug'},{slug:identity.lessonSlug}],
 ['modules',identity.moduleId,{is_published:false},{is_published:true}],
 ['courses',identity.courseId,{is_active:false},{is_active:true}],
 ['profiles',user,{learner_track:'viviane_payroll'},{learner_track:'rafael_finance'}],
];
for(const [table,id,changed,restore] of mutations){
 ok(await admin.from(table).update(changed).eq('id',id));
 try{assert.match((await clients.finance.rpc('start_written_professor_session_v1',params(probe.ticket))).error?.message??'',/written_reference_/);}
 finally{ok(await admin.from(table).update(restore).eq('id',id));}
}
assert.deepEqual(ok(await admin.from('professor_budget_reservations').select('id')),[]);
assert.deepEqual(ok(await admin.from('ai_tutor_sessions').select('id')),[]);
for(const c of Object.values(clients))ok(await c.auth.signOut());
console.log(JSON.stringify({status:'passed',realLocalAuth:true,serverMintedReferences:minted,p1MintedReferences:p1Minted,zeroBudgetDenials:minted+p1Minted,staleStateDenials:mutations.length+p1Minted,providerCalls:0,connectedWrites:0}));

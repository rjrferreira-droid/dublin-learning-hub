import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import {prepareLocalProfessorWorkerJob} from '../quality/candidates/professor-worker-job.ts';
import {prepareWrittenProfessorReference} from '../quality/candidates/written-professor-reference.ts';
import {resolveP1ProfessorHandoff} from '../server/p1-professor-handoff.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';
import {sequence4SlugFor} from '../src/learning/sequence4Registry.ts';
import {remainingSlugFor} from '../src/learning/remainingWrittenRegistry.ts';
const published='07d770b53a4f3d6b77c8316541ea8dff6dcf7faf';
// Extract exact pure functions, never import the worker entry point/SDK or start
// an agent. Missing/changed declarations fail this compatibility test explicitly.
const source=execFileSync('git',['show',published+':professor-agent/src/index.ts'],{encoding:'utf8'});
const parsed=ts.createSourceFile('published.ts',source,ts.ScriptTarget.Latest,true);
const names=['sessionMetadata','sessionProfile','sessionQualityTier','lessonGuidance','languageGuidance'];
const functions=names.map(name=>{const node=parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node,name);return node.getText(parsed);});
const js=ts.transpileModule(functions.join('\n')+'\n({'+names.join(',')+'})',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const worker=vm.runInNewContext(js,{defaultProfile:()=>{throw Error('Unexpected profile fallback');}},{timeout:1000});
const config={supabaseOrigin:'http://127.0.0.1:54321',publishableKey:'fixture.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.fixture'};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'} as const;
async function fixture(track:keyof typeof tracks='finance',sequence=2){
 const lessonId=randomUUID(),moduleId=randomUUID(),courseId=randomUUID();
 const slug=sequence===2?p1SlugFor(track):sequence===3?sequence3SlugFor(track):sequence===4?sequence4SlugFor(track):remainingSlugFor(track,sequence as 5|6|7|8);
 let context:any;
 if(sequence===2)context=resolveP1ProfessorHandoff({profileTrack:track==='payroll'?tracks.payroll:tracks.finance,requestedTrack:tracks[track],requestedLessonId:lessonId,resolvedLesson:{id:lessonId,slug,learnerTrack:tracks[track],isPublished:true}}).context;
 else context=(await prepareWrittenProfessorReference({profileTrack:track==='payroll'?tracks.payroll:tracks.finance,requestedTrack:tracks[track],requestedLessonId:lessonId,resolved:{lesson:{id:lessonId,moduleId,slug,sequence,contentVersion:1,isPublished:true},module:{id:moduleId,courseId,isPublished:true},course:{id:courseId,learnerTrack:tracks[track],isActive:true}}})).lessonContext;
 const acknowledgement:any={requestId:randomUUID(),userId:randomUUID(),mode:'chapter_conversation',reference:{id:randomUUID(),sha256:'a'.repeat(64),version:sequence===2?'p1-reference-candidate-v1':'written-reference-candidate-v3',identity:{lessonId,moduleId,courseId,lessonSlug:slug,contentVersion:1,requestedTrack:tracks[track],studyTrack:track,sequence}},sessionId:randomUUID(),reservationId:randomUUID(),roomName:'validation:lh-'+randomUUID(),validationMode:true,qualityTier:'premium',maxSessionSeconds:60,providerAdmission:false};
 const envelope={acknowledgement,lessonContext:context,callbackToken:'b'.repeat(64),reservationUsd:0.1};
 return {envelope,admission:{acknowledgement,getDispatchEnvelope:()=>JSON.stringify(envelope)}};
}
for(const track of Object.keys(tracks) as (keyof typeof tracks)[])for(const sequence of [2,3,4,5,6,7,8])test(`${track} ${sequence}: published worker reads exact authored context without fallback`,async()=>{
 const f=await fixture(track,sequence),job=prepareLocalProfessorWorkerJob(f.admission,config),metadata=worker.sessionMetadata({job:{metadata:job.getWorkerJob().metadata}});
 assert.equal(worker.sessionProfile(metadata),track);assert.equal(worker.sessionQualityTier(metadata),'premium');
 assert.deepEqual(JSON.parse(JSON.stringify(metadata.lessonContext)),f.envelope.lessonContext);
 const guidance=worker.lessonGuidance(metadata);assert.ok(guidance.includes(f.envelope.lessonContext.technicalBrief));assert.ok(guidance.includes(f.envelope.lessonContext.title));
 assert.equal(metadata.lessonId,f.admission.acknowledgement.reference.identity.lessonId);assert.equal(metadata.persistence.callbackToken,f.envelope.callbackToken);
 assert.equal(metadata.maxSessionSeconds,60);assert.equal(metadata.validationMode,true);
 assert.doesNotMatch(JSON.stringify(job),/callbackToken|technicalBrief|publishableKey/);
 const bytes=job.getDispatchEnvelope();job.getWorkerJob().metadata='MUTATED';f.envelope.lessonContext.title='MUTATED';assert.equal(job.getDispatchEnvelope(),bytes);
});
test('connected, credential-bearing and ambiguous callback destinations are rejected',async()=>{
 const f=await fixture();for(const supabaseOrigin of ['https://qwvsrcgsfoguxdbcdrxq.supabase.co','https://aazfyosqqeujureksqjs.supabase.co','http://127.0.0.1:54321/other','http://127.0.0.1:54321?target=other','http://user:secret@127.0.0.1:54321','https://localhost:54321','http://localhost:54322'])assert.throws(()=>prepareLocalProfessorWorkerJob(f.admission,{...config,supabaseOrigin}),/destination_forbidden/);
 for(const publishableKey of ['sb_secret_fictional','bad','fixture.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.fixture'])assert.throws(()=>prepareLocalProfessorWorkerJob(f.admission,{...config,publishableKey}),/key_forbidden/);
});
test('invalid budget, callback, extra context and oversized metadata are rejected before claim',async()=>{
 for(const mutate of [(e:any)=>{e.reservationUsd=0;},(e:any)=>{e.callbackToken='bad';},(e:any)=>{e.lessonContext.draft='PRIVATE_LOCAL';},(e:any)=>{e.lessonContext.technicalBrief='x'.repeat(40000);}]){const f=await fixture();mutate(f.envelope);assert.throws(()=>prepareLocalProfessorWorkerJob(f.admission,config),/professor_worker_/);}
});

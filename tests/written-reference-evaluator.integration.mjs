import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prepareLocalProfessorWorkerJob} from '../quality/candidates/professor-worker-job.ts';
import {prepareWrittenProfessorReference} from '../quality/candidates/written-professor-reference.ts';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';
import {sequence4SlugFor} from '../src/learning/sequence4Registry.ts';
import {remainingSlugFor} from '../src/learning/remainingWrittenRegistry.ts';
const {evaluateProfessorSession}=await import(process.env.P1_EVALUATOR_BUNDLE==='published'?'../.test-runtime/published-evaluator.mjs':'../.test-runtime/written-bridge-evaluator.mjs');
const originalFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY='fictional-no-provider-key';
let payload,referenceAnswer;
globalThis.fetch=async(url,options)=>{
 assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(options.body);
 // Deliberately malicious fictional output tries to treat the authored answer as learner evidence.
 return new Response(JSON.stringify({output_text:JSON.stringify({summary:'Fictional evaluator output',technicalScore:99,pronunciationScore:99,fluencyScore:99,errors:[{domain:'technical',pattern:'invented',normalizedPattern:'invented',confidence:99,evidenceTurn:1,example:referenceAnswer,correction:'Invented correction'}]}),usage:{input_tokens:1,output_tokens:1}}));
};
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
for(const track of Object.keys(tracks))for(const sequence of [3,4,5,6,7,8])test(`${track} ${sequence}: exact evaluator request preserves authored context and rejects invented reference evidence`,async()=>{
 const id='11111111-1111-4111-8111-111111111111',mid='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333';
 const slug=sequence===3?sequence3SlugFor(track):sequence===4?sequence4SlugFor(track):remainingSlugFor(track,sequence);
 const ref=await prepareWrittenProfessorReference({profileTrack:track==='payroll'?tracks.payroll:tracks.finance,requestedTrack:tracks[track],requestedLessonId:id,resolved:{lesson:{id,moduleId:mid,slug,sequence,contentVersion:1,isPublished:true},module:{id:mid,courseId:cid,isPublished:true},course:{id:cid,learnerTrack:tracks[track],isActive:true}},draft:'PRIVATE_LOCAL_DRAFT',answers:['PRIVATE_LOCAL_ANSWER']});
 referenceAnswer=ref.context.authoredCase.referenceAnswer;payload=null;
 const acknowledgement={requestId:randomUUID(),userId:randomUUID(),mode:track==='english'?'general_conversation':'chapter_conversation',reference:{id:randomUUID(),sha256:ref.descriptor.sha256,version:ref.descriptor.version,identity:ref.identity},sessionId:randomUUID(),reservationId:randomUUID(),roomName:'validation:lh-'+randomUUID(),validationMode:true,qualityTier:'premium',maxSessionSeconds:60,providerAdmission:false};
 const envelope=JSON.stringify({acknowledgement,lessonContext:ref.lessonContext,callbackToken:'b'.repeat(64),reservationUsd:0.1});
 const job=prepareLocalProfessorWorkerJob({acknowledgement,getDispatchEnvelope:()=>envelope},{supabaseOrigin:'http://127.0.0.1:54321',publishableKey:'fixture.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.fixture'});
 const metadata=JSON.parse(job.getWorkerJob().metadata);
 const result=await evaluateProfessorSession([{role:'user',text:'Could you explain the first step?'}],metadata);
 assert.ok(payload);assert.equal(payload.store,false);
 const text=payload.input.find(x=>x.role==='user').content;
 const [context,transcript]=text.split('\n\nTRANSCRIPT\n');
 const sent=JSON.parse(context.split('SESSION CONTEXT\n')[1]);
 assert.deepEqual(sent.lesson.technicalBrief,ref.lessonContext.technicalBrief);assert.equal(sent.lesson.title,ref.context.title);
 assert.match(transcript,/#1 LEARNER: "Could you explain the first step\?"/);
 assert.ok(!transcript.includes(referenceAnswer));assert.doesNotMatch(text,/PRIVATE_LOCAL_DRAFT|PRIVATE_LOCAL_ANSWER/);
 assert.ok(result);assert.deepEqual(result.errors,[]);assert.equal(result.technicalScore,null);assert.equal(result.pronunciationScore,null);assert.equal(result.fluencyScore,null);
});
test('no learner turns means no evaluator request even with a complete teacher reference',async()=>{
 payload=null;assert.equal(await evaluateProfessorSession([{role:'assistant',text:'The worked answer is 972.'}],{lessonContext:{technicalBrief:'Authored reference'}}),null);assert.equal(payload,null);
});
test.after(()=>{globalThis.fetch=originalFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;});

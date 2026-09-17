import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPremiumAudioReadinessHandler} from '../server/premium-audio-readiness.ts';
import {prepareWrittenAudioPreview} from '../quality/candidates/written-audio-preview.ts';
import {p1PremiumAudioGate} from '../quality/candidates/p1-premium-audio-gate.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
function fixture(requestedTrack:'rafael_finance'|'viviane_payroll'|'english_academy'='rafael_finance'){
 const studyTrack=requestedTrack==='rafael_finance'?'finance':requestedTrack==='viviane_payroll'?'payroll':'english';
 const rows:any={profiles:{id:id(1),learner_track:requestedTrack==='viviane_payroll'?'viviane_payroll':'rafael_finance'},
  lessons:{id:id(2),module_id:id(3),slug:p1SlugFor(studyTrack),sequence:2,content_version:3,is_published:true},
  modules:{id:id(3),course_id:id(4),is_published:true},courses:{id:id(4),learner_track:requestedTrack,is_active:true}};
 const reads:string[]=[];
 const db={auth:{getUser:async()=>({data:{user:{id:id(1)}}})},from:(table:string)=>{reads.push(table);const filters:any[]=[];const q:any={select:()=>q,eq:(key:string,value:any)=>{filters.push([key,value]);return q;},maybeSingle:async()=>({data:filters.every(([key,value])=>rows[table]?.[key]===value)?rows[table]:null})};return q;}};
 const req:any={method:'POST',headers:{authorization:'Bearer fictional','content-type':'application/json'},body:{lessonId:id(2),requestedTrack}};
 const res:any={headers:{},setHeader(key:string,value:string){this.headers[key]=value;return this;},status(value:number){this.code=value;return this;},json(value:any){this.body=value;return this;}};
 return {rows,reads,db,req,res,studyTrack};
}

for(const track of ['rafael_finance','viviane_payroll','english_academy'] as const)test(`${track}: returns only exact P1 Audio binding and no generation capability`,async()=>{
 const f=fixture(track);await createPremiumAudioReadinessHandler(()=>f.db,env)(f.req,f.res);
 assert.equal(f.res.code,200);assert.deepEqual(f.reads,['profiles','lessons','modules','courses']);
 assert.deepEqual(Object.keys(f.res.body).sort(),['cacheLookupPerformed','generationAdmission','identity','providerAdmission','runtimeSourceHandoff','source','status','validationOnly']);
 assert.equal(f.res.body.status,'audio_reference_verified_activation_closed');assert.equal(f.res.body.cacheLookupPerformed,false);assert.equal(f.res.body.runtimeSourceHandoff,false);
 assert.equal(f.res.body.generationAdmission,false);assert.equal(f.res.body.providerAdmission,false);assert.equal(f.res.body.validationOnly,true);
 assert.deepEqual(f.res.body.identity,{lessonId:id(2),moduleId:id(3),courseId:id(4),lessonSlug:f.rows.lessons.slug,contentVersion:3,requestedTrack:track,studyTrack:f.studyTrack,sequence:2});
 assert.deepEqual(Object.keys(f.res.body.source).sort(),['characters','expectedStoragePath','language','purpose','referenceSha256','scriptSha256','sourceFingerprint']);
 assert.equal(f.res.body.source.language,track==='english_academy'?'en':'pt-BR');assert.equal(f.res.body.source.purpose,'study-guide-overview');
 assert.equal(f.res.body.source.expectedStoragePath,`lessons/${id(2)}/commentary-v3.mp3`);assert.ok(f.res.body.source.characters>0&&f.res.body.source.characters<=4000);
 for(const key of ['referenceSha256','scriptSha256','sourceFingerprint'])assert.match(f.res.body.source[key],/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(f.res.body),/script\s*[:=]|manager_commentary|workedAnswer|LOCAL_PRIVATE/i);
 assert.equal(f.res.headers['Cache-Control'],'private, no-store');
});

for(const change of ['unpublished','wrong-profile','wrong-course','wrong-slug','wrong-sequence','bad-version','missing'])test(`unavailable ${change} never returns a source descriptor`,async()=>{
 const f=fixture();
 if(change==='unpublished')f.rows.lessons.is_published=false;
 if(change==='wrong-profile')f.rows.profiles.learner_track='viviane_payroll';
 if(change==='wrong-course')f.rows.courses.learner_track='viviane_payroll';
 if(change==='wrong-slug')f.rows.lessons.slug=p1SlugFor('payroll');
 if(change==='wrong-sequence')f.rows.lessons.sequence=3;
 if(change==='bad-version')f.rows.lessons.content_version=0;
 if(change==='missing')f.rows.lessons=null;
 await createPremiumAudioReadinessHandler(()=>f.db,env)(f.req,f.res);
 assert.equal(f.res.code,403);assert.deepEqual(f.res.body,{error:'audio_reference_unavailable'});
});

for(const change of ['production','branch','method','auth','draft','content-type'])test(`reject ${change} before a database client is created`,async()=>{
 const f=fixture(),runtime={...env};
 if(change==='production')runtime.VERCEL_ENV='production';if(change==='branch')runtime.VERCEL_GIT_COMMIT_REF='main';
 if(change==='method')f.req.method='GET';if(change==='auth')delete f.req.headers.authorization;if(change==='draft')f.req.body.draft='LOCAL_PRIVATE';if(change==='content-type')f.req.headers['content-type']='text/plain';
 await createPremiumAudioReadinessHandler(()=>{throw Error('must not create client');},runtime)(f.req,f.res);
 assert.ok(f.res.code>=400);assert.notEqual(f.res.code,403);
});

test('captures request identity before the first authenticated await',async()=>{
 const f=fixture();f.db.auth.getUser=async()=>{f.req.body.lessonId=id(9);f.req.body.requestedTrack='viviane_payroll';return {data:{user:{id:id(1)}}};};
 await createPremiumAudioReadinessHandler(()=>f.db,env)(f.req,f.res);
 assert.equal(f.res.code,200);assert.equal(f.res.body.identity.lessonId,id(2));assert.equal(f.res.body.identity.requestedTrack,'rafael_finance');
});

test('diagnostic is the script-free candidate subset while cache and current runtime handoff stay explicitly closed',async()=>{
 const endpoint=fixture();await createPremiumAudioReadinessHandler(()=>endpoint.db,env)(endpoint.req,endpoint.res);
 const candidate=fixture();const prepared=await prepareWrittenAudioPreview(candidate.db,candidate.req.body,env);
 assert.deepEqual(endpoint.res.body.identity,prepared.identity);
 assert.deepEqual(endpoint.res.body.source,{language:prepared.language,purpose:prepared.purpose,characters:prepared.characters,scriptSha256:prepared.scriptSha256,
  sourceFingerprint:prepared.sourceFingerprint,referenceSha256:prepared.referenceSha256,expectedStoragePath:`lessons/${prepared.identity.lessonId}/commentary-v${prepared.identity.contentVersion}.mp3`});
 const fingerprint=createHash('sha256').update(JSON.stringify({identity:prepared.identity,language:prepared.language,scriptSha256:prepared.scriptSha256,policy:'written-study-guide-v1'})).digest('hex');
 assert.equal(endpoint.res.body.source.sourceFingerprint,fingerprint);assert.equal(Object.hasOwn(endpoint.res.body.source,'script'),false);
 assert.equal(endpoint.res.body.cacheLookupPerformed,false);assert.equal(endpoint.res.body.runtimeSourceHandoff,false);assert.equal(endpoint.res.body.generationAdmission,false);
 const month=new Date().toISOString().slice(0,7)+'-01';
 const gate=p1PremiumAudioGate({profileTrack:'rafael_finance',requestedTrack:'rafael_finance',requestedLessonId:id(2),
  resolvedLesson:{id:id(2),slug:p1SlugFor('finance'),learnerTrack:'rafael_finance',isPublished:true,contentVersion:3},cachedStoragePath:null,
  scriptWords:prepared.script.split(/\s+/).filter(Boolean).length,usageRows:[],aiHardCapUsd:100,premiumAudioCapUsd:100,
  exposure:{contractVersion:1,periodMonth:month,protectedReservationUsd:0,rawReservationUsd:0,knownCostUpliftUsd:0,activeReservedUsd:0,unresolvedReservedUsd:0,carriedReservedUsd:0,currentPeriodReservedUsd:0,futurePeriodReservedUsd:0,activeCount:0,unresolvedCount:0,staleCount:0,needsReconciliationCount:0,oldestPendingAt:null}});
 assert.equal(gate.action,'claim-before-provider');assert.equal(gate.expectedPath,endpoint.res.body.source.expectedStoragePath);
});

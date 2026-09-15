import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRemainingProfessorReference} from '../quality/candidates/remaining-professor-reference.ts';
import {remainingSlugFor} from '../src/learning/remainingWrittenRegistry.ts';
const id='11111111-1111-4111-8111-111111111111',moduleId='22222222-2222-4222-8222-222222222222',courseId='33333333-3333-4333-8333-333333333333';
function input(track:'finance'|'payroll'|'english',sequence:5|6|7|8){
 const requestedTrack=({finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'} as const)[track];
 return {profileTrack:track==='payroll'?'viviane_payroll':'rafael_finance',requestedTrack,requestedLessonId:id,resolved:{lesson:{id,moduleId,slug:remainingSlugFor(track,sequence),sequence,contentVersion:1,isPublished:true},module:{id:moduleId,courseId,isPublished:true},course:{id:courseId,learnerTrack:requestedTrack,isActive:true}}};
}
for(const track of ['finance','payroll','english'] as const)for(const n of [5,6,7,8] as const)test(`${track} ${n}: offline Professor reference has exact chain/version and no browser evidence`,async()=>{
 const i={...input(track,n),draft:'PRIVATE LOCAL ANSWER',checkpointAnswers:['PRIVATE LOCAL ANSWER'],sessionHistory:'PRIVATE LOCAL ANSWER'};
 const r=await prepareRemainingProfessorReference(i);
 assert.equal(r.identity.lessonId,id);assert.equal(r.identity.lessonSlug,i.resolved.lesson.slug);assert.equal(r.identity.contentVersion,1);
 assert.equal(r.descriptor.providerAdmission,false);assert.ok(r.descriptor.contextBytes<=24000);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE LOCAL ANSWER/);
 assert.equal((await prepareRemainingProfessorReference(i)).descriptor.sha256,r.descriptor.sha256);
 const changed=structuredClone(i);changed.resolved.lesson.contentVersion=2;
 assert.notEqual((await prepareRemainingProfessorReference(changed)).descriptor.sha256,r.descriptor.sha256);
 assert.ok(r.context.teachingGuide.whenMisconception.length>0);
});
test('future reference fails closed for cross-profile, unpublished ancestry and broken joins',async()=>{
 const base=input('finance',5);
 const mutations=[
 (i:typeof base)=>{i.profileTrack='viviane_payroll';},
 (i:typeof base)=>{i.profileTrack='manuzinha';},
 (i:typeof base)=>{i.resolved.lesson.isPublished=false;},
 (i:typeof base)=>{i.resolved.module.isPublished=false;},
 (i:typeof base)=>{i.resolved.course.isActive=false;},
 (i:typeof base)=>{i.resolved.lesson.moduleId=courseId;},
 (i:typeof base)=>{i.resolved.module.courseId=moduleId;},
 (i:typeof base)=>{i.requestedLessonId=courseId;},
 (i:typeof base)=>{i.resolved.course.learnerTrack='viviane_payroll';},
 (i:typeof base)=>{i.resolved.lesson.contentVersion=0;},
 (i:typeof base)=>{i.resolved.lesson.sequence=6;},
 (i:typeof base)=>{i.resolved.lesson.slug='unknown';},
 ];
 for(const mutate of mutations){const i=structuredClone(base);mutate(i);await assert.rejects(()=>prepareRemainingProfessorReference(i),/future_reference_/);}
});
test('shared English permits both assigned adult profiles and preserves written-only listening boundary',async()=>{
 const i=input('english',8);i.profileTrack='viviane_payroll';const r=await prepareRemainingProfessorReference(i);
 assert.match(r.context.scope,/not listening ability/);assert.match(r.context.scope,/No embedded or validated Irish-accent audio/);
 i.profileTrack='unassigned';await assert.rejects(()=>prepareRemainingProfessorReference(i),/profile_forbidden/);
});

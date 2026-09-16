import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProfessorReadinessHandler} from '../server/professor-readiness.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13'};
function fixture(track='rafael_finance'){
 const rows:any={profiles:{id:id(1),learner_track:track==='viviane_payroll'?'viviane_payroll':'rafael_finance'},lessons:{id:id(2),module_id:id(3),slug:p1SlugFor(track==='english_academy'?'english':track==='viviane_payroll'?'payroll':'finance'),sequence:2,content_version:1,is_published:true},modules:{id:id(3),course_id:id(4),is_published:true},courses:{id:id(4),learner_track:track,is_active:true}};
 const reads:string[]=[];
 const db={auth:{getUser:async()=>({data:{user:{id:id(1)}}})},from:(table:string)=>{reads.push(table);const filters:any[]=[];const q:any={select:()=>q,eq:(k:string,v:any)=>{filters.push([k,v]);return q;},maybeSingle:async()=>({data:filters.every(([k,v])=>rows[table]?.[k]===v)?rows[table]:null})};return q;}};
 const req:any={method:'POST',headers:{authorization:'Bearer fictional','content-type':'application/json'},body:{lessonId:id(2),requestedTrack:track}};
 const res:any={headers:{},setHeader(k:string,v:string){this.headers[k]=v;return this;},status(n:number){this.code=n;return this;},json(b:any){this.body=b;return this;}};
 return {rows,reads,db,req,res};
}
for(const track of ['rafael_finance','viviane_payroll','english_academy'])test(`${track}: read-only reference, no admission or context disclosure`,async()=>{
 const f=fixture(track);await createProfessorReadinessHandler(()=>f.db,env)(f.req,f.res);
 assert.equal(f.res.code,200);assert.equal(f.res.body.providerAdmission,false);assert.equal(f.res.body.premiumAudioAdmission,false);
 assert.deepEqual(f.reads,['profiles','lessons','modules','courses']);assert.equal(f.res.headers['Cache-Control'],'private, no-store');
 assert.deepEqual(Object.keys(f.res.body).sort(),['identity','premiumAudioAdmission','providerAdmission','status','validationOnly']);
});
for(const change of ['unpublished','missing','other-course','manuzinha','slug','version','golden'])test(`deny ${change}`,async()=>{
 const f=fixture();if(change==='unpublished')f.rows.lessons.is_published=false;if(change==='missing')f.rows.lessons=null;
 if(change==='other-course')f.rows.courses.learner_track='viviane_payroll';if(change==='manuzinha')f.rows.profiles.learner_track='manuzinha';
 if(change==='slug')f.rows.lessons.slug='another-lesson';if(change==='version')f.rows.lessons.content_version=0;if(change==='golden')f.rows.lessons.sequence=1;
 await createProfessorReadinessHandler(()=>f.db,env)(f.req,f.res);assert.equal(f.res.code,403);assert.deepEqual(f.res.body,{error:'reference_unavailable'});
});
for(const change of ['production','branch','method','auth','draft','content-type'])test(`reject ${change} before client creation`,async()=>{
 const f=fixture(),e={...env};if(change==='production')e.VERCEL_ENV='production';if(change==='branch')e.VERCEL_GIT_COMMIT_REF='main';
 if(change==='method')f.req.method='GET';if(change==='auth')delete f.req.headers.authorization;if(change==='draft')f.req.body.draft='private';if(change==='content-type')f.req.headers['content-type']='text/plain';
 await createProfessorReadinessHandler(()=>{throw Error('must not create client');},e)(f.req,f.res);assert.ok(f.res.code>=400);assert.notEqual(f.res.code,403);
});
test('capture body before Auth await',async()=>{const f=fixture();f.db.auth.getUser=async()=>{f.req.body.lessonId=id(9);return {data:{user:{id:id(1)}}};};await createProfessorReadinessHandler(()=>f.db,env)(f.req,f.res);assert.equal(f.res.code,200);assert.equal(f.res.body.identity.lessonId,id(2));});

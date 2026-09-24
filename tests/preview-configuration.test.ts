import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewConfigurationHandler} from '../server/preview-configuration.ts';

function fixture(){
 const id='00000000-0000-4000-8000-000000000001';
 const env:Record<string,string>={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/professor-experience-2026-09-13',SUPABASE_URL:'https://aazfyosqqeujureksqjs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'fake.'+Buffer.from(JSON.stringify({role:'service_role',ref:'aazfyosqqeujureksqjs'})).toString('base64url')+'.signature',PROFESSOR_PREFLIGHT_KEY:'ab'.repeat(32)};
 const calls:string[]=[];const f={track:'rafael_finance',authError:false,serviceError:false};
 const makeClient=(_url:string,key:string,token?:string)=>{
  calls.push(token?'learner':'service');
  return {auth:{getUser:async()=>({data:{user:{id}},error:f.authError?{}:null})},from:(table:string)=>{
   assert.equal(table,'profiles');const q:any={select:()=>q,eq:(column:string,value:string)=>{assert.equal(column,'id');assert.equal(value,id);return q;},maybeSingle:async()=>({data:{id,learner_track:f.track},error:key===env.SUPABASE_SERVICE_ROLE_KEY&&f.serviceError?{}:null})};return q;
  }};
 };
 const req:any={method:'POST',headers:{authorization:'Bearer learner-token','content-type':'application/json'},body:{}};
 const res:any={headers:{},setHeader(k:string,v:string){this.headers[k]=v;},status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};
 return {env,calls,f,req,res,run:()=>createPreviewConfigurationHandler(env,makeClient)(req,res)};
}
test('validates real crypto roundtrip and own-profile reads without exposing keys',async()=>{
 const f=fixture();await f.run();assert.equal(f.res.code,200);assert.deepEqual(f.calls,['learner','service']);assert.equal(f.res.body.preflightCryptoVerified,true);assert.equal(f.res.body.admissionClosed,true);assert.equal(f.res.headers['Cache-Control'],'private, no-store');assert.ok(!JSON.stringify(f.res.body).includes(f.env.PROFESSOR_PREFLIGHT_KEY));
});
for(const kind of ['production','branch','no-auth','draft','content-type'])test(`reject ${kind} before clients`,async()=>{
 const f=fixture();if(kind==='production')f.env.VERCEL_ENV='production';if(kind==='branch')f.env.VERCEL_GIT_COMMIT_REF='main';if(kind==='no-auth')delete f.req.headers.authorization;if(kind==='draft')f.req.body={draft:'private'};if(kind==='content-type')f.req.headers['content-type']='text/plain';await f.run();assert.ok(f.res.code>=400);assert.deepEqual(f.calls,[]);
});
for(const kind of ['invalid-user','manuzinha','bad-encryption-key','missing-service','wrong-project','enabled-stage'])test(`reject ${kind} before privileged read`,async()=>{
 const f=fixture();if(kind==='invalid-user')f.f.authError=true;if(kind==='manuzinha')f.f.track='manuzinha';if(kind==='bad-encryption-key')f.env.PROFESSOR_PREFLIGHT_KEY='invalid';if(kind==='missing-service')delete f.env.SUPABASE_SERVICE_ROLE_KEY;if(kind==='wrong-project')f.env.SUPABASE_SERVICE_ROLE_KEY='fake.'+Buffer.from(JSON.stringify({role:'service_role',ref:'production'})).toString('base64url')+'.signature';if(kind==='enabled-stage')f.env.PROFESSOR_ADMISSION_STAGE='shared-preview-validation-v1';await f.run();assert.ok(f.res.code>=400);assert.deepEqual(f.calls,['learner']);
});
test('invalid server credential cannot return success',async()=>{const f=fixture();f.f.serviceError=true;await f.run();assert.equal(f.res.code,503);assert.deepEqual(f.res.body,{error:'configuration_unavailable'});});

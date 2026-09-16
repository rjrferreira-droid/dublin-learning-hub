import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/professor-admission.ts';
test('hosted admission remains closed without exact feature and explicit stage',async()=>{
 const keys=['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','PROFESSOR_ADMISSION_STAGE'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const res:any={setHeader(){return this;},status(n:number){this.code=n;return this;},json(v:any){this.body=v;return this;}};
 try{
  process.env.VERCEL_ENV='production';await handler({method:'POST'},res);assert.equal(res.code,404);
  process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='feat/professor-experience-2026-09-13';delete process.env.PROFESSOR_ADMISSION_STAGE;
  await handler({method:'POST'},res);assert.equal(res.code,503);assert.deepEqual(res.body,{error:'admission_not_enabled',retryAllowed:false});
  await handler({method:'GET'},res);assert.equal(res.code,405);
 }finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});

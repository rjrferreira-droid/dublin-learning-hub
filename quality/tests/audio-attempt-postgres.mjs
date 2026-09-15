import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {runPremiumAudioAttempt} from '../candidates/premium-audio-attempt-flow.ts';
const exec=promisify(execFile);
assert.equal(process.env.PGHOST,'127.0.0.1');assert.equal(process.env.PGDATABASE,'learning_hub_test');assert.equal(process.env.PGUSER,'postgres');
async function sql(query){const {stdout}=await exec('psql',['-XAtq','-v','ON_ERROR_STOP=1','-c',query]);return stdout.trim().split('\n').at(-1);}
assert.equal(await sql('select label from lh_internal.audio_fixture_guard'),'fictional-audio-concurrency');
const userId=await sql("select id from profiles where learner_track='rafael_finance'");
const lessonId=await sql("select l.id from lessons l join modules m on m.id=l.module_id join courses c on c.id=m.course_id where c.learner_track='rafael_finance' order by l.id limit 1");
// No shell interpolation. This allowlisted RPC adapter exists only in the disposable test database.
const signatures={begin_premium_audio_attempt_v2:['p_attempt_id','p_user_id','p_lesson_id','p_content_version','p_reservation_usd'],mark_premium_audio_submitted_v2:['p_attempt_id'],close_premium_audio_attempt_v2:['p_attempt_id'],settle_premium_audio_attempt_v2:['p_attempt_id','p_estimated_cost_usd','p_characters']};
function literal(value){if(typeof value==='number'){assert.ok(Number.isFinite(value));return String(value);}assert.match(value,/^[0-9a-f-]{36}$/);return "'"+value+"'";}
function client(fault=''){
 return {async rpc(name,args){assert.ok(Object.hasOwn(signatures,name));const result=await sql(`set role service_role;select ${name}(${signatures[name].map(key=>literal(args[key])).join(',')});`);
 if(fault===name)throw new Error('Fictional lost database acknowledgement');
 return {data:result==='t'?true:result==='f'?false:result?.startsWith('{')?JSON.parse(result):result,error:null};}};
}
async function reset(){await sql("truncate lh_internal.premium_audio_attempts,ai_usage_log,ai_tutor_sessions,professor_budget_reservations cascade;update lessons set is_published=true,content_version=1;update learning_hub_budget_settings set ai_hard_cap_usd=10,premium_audio_cap_usd=10;");}
for(const failure of ['none','provider','storage','mark_premium_audio_submitted_v2','settle_premium_audio_attempt_v2']){
 await reset();const input={attemptId:randomUUID(),userId,lessonId,contentVersion:1,reservationUsd:0.10,estimatedCostUsd:0.04,characters:100};let providerCalls=0;
 const dependencies={async generate(){providerCalls++;if(failure==='provider')throw new Error('Fictional provider timeout');return 'FICTIONAL AUDIO';},async store(_audio,identity){if(failure==='storage')throw new Error('Fictional storage failure');return identity;}};
 if(failure==='none')await runPremiumAudioAttempt(client(),input,dependencies);
 else await assert.rejects(()=>runPremiumAudioAttempt(client(failure),input,dependencies));
 const state=await sql(`select state from lh_internal.premium_audio_attempts where id='${input.attemptId}'`);
 assert.equal(state,['none','settle_premium_audio_attempt_v2'].includes(failure)?'settled':'uncertain');
 assert.equal(providerCalls,failure==='mark_premium_audio_submitted_v2'?0:1);
 await assert.rejects(()=>runPremiumAudioAttempt(client(),input,dependencies),/replayed/);
 assert.equal(providerCalls,failure==='mark_premium_audio_submitted_v2'?0:1);
 const count=await sql('select count(*) from ai_usage_log');assert.equal(count,state==='settled'?'1':'0');
 console.log(`PASS: real SQL + candidate orchestration: ${failure}, preserved ${state}, no paid retry`);
}

// Mutate the caller's request after real admission/submission. Ledger operations
// must remain bound to the original attempt, including uncertain-failure cleanup.
for(const failProvider of [false,true]){
 await reset();
 const original={attemptId:randomUUID(),userId,lessonId,contentVersion:1,reservationUsd:0.10,estimatedCostUsd:0.04,characters:100};
 const mutable={...original},wrongAttempt=randomUUID();let providerCalls=0;
 const dependencies={
  async generate(){
   providerCalls++;
   Object.assign(mutable,{attemptId:wrongAttempt,lessonId:randomUUID(),contentVersion:99,estimatedCostUsd:9,characters:19000});
   if(failProvider)throw new Error('Fictional provider timeout after caller mutation');
   return 'FICTIONAL AUDIO';
  },
  async store(_audio,identity){
   assert.deepEqual(identity,{attemptId:original.attemptId,storagePath:`lessons/${lessonId}/commentary-v1.mp3`});
   return identity;
  },
 };
 if(failProvider)await assert.rejects(()=>runPremiumAudioAttempt(client(),mutable,dependencies));
 else await runPremiumAudioAttempt(client(),mutable,dependencies);
 assert.equal(await sql(`select state from lh_internal.premium_audio_attempts where id='${original.attemptId}'`),failProvider?'uncertain':'settled');
 assert.equal(await sql(`select count(*) from lh_internal.premium_audio_attempts where id='${wrongAttempt}'`),'0');
 if(!failProvider){
  assert.equal(await sql(`select estimated_cost_usd=0.04 and characters=100 from ai_usage_log where request_id='premium-audio-v2:${original.attemptId}'`),'t');
 }else{
  assert.equal(await sql('select lh_internal.premium_audio_pending_usd()=0.10'),'t');
  assert.equal(await sql('select count(*) from ai_usage_log'),'0');
 }
 await assert.rejects(()=>runPremiumAudioAttempt(client(),original,dependencies),/replayed/);
 assert.equal(providerCalls,1);
 console.log(`PASS: real SQL ignores mutated caller, ${failProvider?'uncertain original hold':'exact original receipt'}, no paid retry`);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const candidate=fs.readFileSync('quality/candidates/professor-validation-abandon.sql','utf8');
const dispatch=fs.readFileSync('quality/candidates/professor-dispatch-fence.sql','utf8');
const settlement=fs.readFileSync('supabase/migrations/20260913155850_lh_usage_settlement_integrity.sql','utf8');
const migrations=fs.readdirSync('supabase/migrations').filter(name=>name.endsWith('.sql'))
 .map(name=>fs.readFileSync(`supabase/migrations/${name}`,'utf8')).join('\n');

test('validation abandon remains an unmounted candidate with exact prerequisites',()=>{
 assert.match(candidate,/UNMOUNTED CANDIDATE[\s\S]*Disposable Preview validation only/i);
 assert.equal((candidate.match(/^begin;$/gmi)??[]).length,1);
 assert.equal((candidate.match(/^commit;$/gmi)??[]).length,1);
 for(const prerequisite of [
  'lh_internal.written_professor_references','lh_internal.professor_preflights',
  'lh_internal.professor_completion_receipts','lh_internal.professor_settlement_receipts',
  'public.observe_professor_dispatch_v1(uuid,uuid)',
  'public.start_written_professor_session_v1(uuid,uuid,text,text,text,boolean)',
  'public.claim_professor_dispatch_v1(jsonb,text,text,uuid)',
  'public.record_professor_dispatch_v1(uuid,uuid,uuid,text,text)',
 ])assert.ok(candidate.includes(prerequisite),prerequisite);
 assert.match(candidate,/validation_abandon_dispatch_fence_missing/);
 assert.match(candidate,/validation_abandon_dispatch_acl_invalid/);
 for(const signature of [
  'public.claim_professor_dispatch_v1(jsonb,text,text,uuid)',
  'public.record_professor_dispatch_v1(uuid,uuid,uuid,text,text)',
 ]){
  const escaped=signature.replace(/[().]/g,'\\$&');
  assert.match(candidate,new RegExp(`not has_function_privilege\\('service_role','${escaped}','execute'\\)`));
  assert.match(candidate,new RegExp(`has_function_privilege\\('anon','${escaped}','execute'\\)`));
  assert.match(candidate,new RegExp(`has_function_privilege\\('authenticated','${escaped}','execute'\\)`));
 }
 assert.match(candidate,/aclexplode[\s\S]*privilege\.grantee=0[\s\S]*privilege\.privilege_type='EXECUTE'/i);
 assert.ok(!migrations.includes('abandon_professor_validation_v1'));
});

test('abandon and dispatch claim serialize with the same lock prefix',()=>{
 const body=candidate.slice(candidate.indexOf('create function public.abandon_professor_validation_v1'),candidate.indexOf('revoke all on function public.abandon_professor_validation_v1'));
 const positions=[
  body.indexOf("public.professor_budget_settings\n  where feature='professor_livekit' for update"),
  body.indexOf('public.learning_hub_budget_settings where id=1 for update'),
  body.indexOf('lh_internal.written_professor_references\n  where id=p_reference_id and user_id=uid for update'),
  body.indexOf('public.ai_tutor_sessions\n  where id=ticket.bound_session_id for update'),
  body.indexOf('public.professor_budget_reservations\n  where id=session_row.budget_reservation_id for update'),
 ];
 assert.ok(positions.every(position=>position>=0));
 assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
 const claim=dispatch.slice(dispatch.indexOf('create function public.claim_professor_dispatch_v1'),dispatch.indexOf('revoke all on function public.claim_professor_dispatch_v1'));
 for(const fragment of ['public.professor_budget_settings','public.learning_hub_budget_settings','lh_internal.written_professor_references','public.ai_tutor_sessions','public.professor_budget_reservations'])assert.ok(claim.includes(fragment));
});

test('only a clean active unclaimed validation binding can release its own hold',()=>{
 for(const check of [
  "ticket.bound_request_id is distinct from p_request_id",
  "session_row.user_id is distinct from uid",
  "reservation.user_id is distinct from uid",
  "session_row.room_name like 'validation:lh-%'",
  "session_row.status is distinct from 'active'",
  "reservation.status is distinct from 'active'",
  'ticket.dispatch_claim_id is not null',
  'ticket.observed_dispatch_id is not null',
  'session_row.dispatch_id is null',
  "session_row.transcript='[]'::jsonb",
  "session_row.model_usage='[]'::jsonb",
  'lh_internal.professor_completion_receipts',
  'lh_internal.professor_settlement_receipts',
  'public.ai_tutor_turns',
  'public.ai_usage_log',
 ])assert.ok(candidate.includes(check),check);
 assert.match(candidate,/update public\.ai_tutor_sessions set status='abandoned',completed_at=closed_at,[\s\S]*close_reason='validation_admission_never_dispatched',callback_token_hash=null/i);
 assert.match(candidate,/update public\.professor_budget_reservations set status='abandoned'/i);
 assert.match(candidate,/delete from lh_internal\.professor_preflights[\s\S]*reference_id=ticket\.id and user_id=uid and request_id=ticket\.bound_request_id/i);
 assert.doesNotMatch(candidate,/insert\s+into\s+(public\.)?(ai_usage_log|ai_tutor_turns|user_error_bank|user_competency_scores|spaced_reviews)/i);
 assert.doesNotMatch(candidate,/complete_professor_session_v2|settle_professor_usage_v2/i);
});

test('terminal replay is exact and observer distinguishes released from ambiguous state',()=>{
 const observer=candidate.slice(candidate.indexOf('create or replace function public.observe_professor_dispatch_v1'),candidate.indexOf('revoke all on function public.observe_professor_dispatch_v1'));
 assert.match(candidate,/if terminal then[\s\S]*validation_abandon_terminal_drift[\s\S]*'duplicate',true/i);
 assert.match(candidate,/'state','validation_abandoned'[\s\S]*'learningEvidenceRecorded',false[\s\S]*'reservationReleased',true/i);
 for(const check of [
  'ticket.bound_session_id=session_row.id','ticket.bound_request_id=p_request_id',
  'session_row.user_id=ticket.user_id','reservation.user_id=ticket.user_id',
  'session_row.lesson_id=ticket.lesson_id','session_row.startup_request_id=ticket.bound_request_id',
  'session_row.budget_reservation_id=reservation.id',"reservation.feature='professor_livekit'",
  "session_row.status='active'",'session_row.completed_at is null','session_row.close_reason is null',
  'session_row.callback_token_hash is not null',"session_row.callback_token_hash ~ '^[a-f0-9]{64}$'",
  'session_row.dispatch_id is null',"session_row.room_name ~ '^validation:lh-[a-f0-9-]{36}$'",
  "session_row.quality_tier='premium'",'session_row.duration_seconds=0',
  "session_row.transcript='[]'::jsonb","session_row.model_usage='[]'::jsonb",
  'session_row.technical_score is null','session_row.english_score is null',
  'session_row.grammar_score is null','session_row.vocabulary_score is null',
  'session_row.fluency_score is null','session_row.pronunciation_score is null',
  'session_row.professional_communication_score is null','session_row.final_feedback is null',
  'session_row.evaluation_model is null','session_row.evaluation_cost_usd=0',
  "reservation.status='active'",'reservation.actual_cost_usd=0','reservation.settled_at is null',
  'ticket.dispatch_claim_id is null','ticket.dispatch_payload_sha256 is null',
  'ticket.dispatch_claimed_at is null','ticket.observed_dispatch_id is null',
  'ticket.dispatch_acknowledged_at is null','public.ai_tutor_turns','public.ai_usage_log',
  'lh_internal.professor_completion_receipts','lh_internal.professor_settlement_receipts',
 ])assert.ok(observer.includes(check),check);
 assert.match(observer,/state:=case when clean_terminal then 'validation_abandoned'[\s\S]*when clean_active then 'admitted_not_claimed'[\s\S]*else 'reconciliation_required' end/i);
 assert.doesNotMatch(observer,/when ticket\.dispatch_claim_id is null[^\n]*session_row\.status='active'[^\n]*reservation\.status='active'/i);
 assert.match(candidate,/revoke all on function public\.abandon_professor_validation_v1\(uuid,uuid\)[\s\S]*from public,anon,authenticated,service_role;[\s\S]*grant execute on function public\.abandon_professor_validation_v1\(uuid,uuid\) to authenticated;/i);
 assert.match(candidate,/revoke all on function public\.observe_professor_dispatch_v1\(uuid,uuid\)[\s\S]*grant execute on function public\.observe_professor_dispatch_v1\(uuid,uuid\) to authenticated;/i);
});

test('zero or missing provider usage remains unresolved in the existing settlement path',()=>{
 assert.match(settlement,/zero_usage_requires_verification/);
 assert.match(settlement,/update public\.professor_budget_reservations set status='unresolved'/i);
 assert.match(settlement,/Missing\/invalid usage or unknown pricing retains the reserve/i);
 assert.doesNotMatch(candidate,/status='settled'/i);
});

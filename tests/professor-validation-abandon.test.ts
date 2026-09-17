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
 ])assert.ok(candidate.includes(prerequisite),prerequisite);
 assert.match(candidate,/validation_abandon_dispatch_fence_missing/);
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
 assert.match(candidate,/if terminal then[\s\S]*validation_abandon_terminal_drift[\s\S]*'duplicate',true/i);
 assert.match(candidate,/'state','validation_abandoned'[\s\S]*'learningEvidenceRecorded',false[\s\S]*'reservationReleased',true/i);
 assert.match(candidate,/when clean_terminal then 'validation_abandoned'/i);
 assert.match(candidate,/else 'reconciliation_required' end/i);
 assert.match(candidate,/revoke all on function public\.abandon_professor_validation_v1\(uuid,uuid\)[\s\S]*from public,anon,authenticated,service_role;[\s\S]*grant execute on function public\.abandon_professor_validation_v1\(uuid,uuid\) to authenticated;/i);
 assert.match(candidate,/revoke all on function public\.observe_professor_dispatch_v1\(uuid,uuid\)[\s\S]*grant execute on function public\.observe_professor_dispatch_v1\(uuid,uuid\) to authenticated;/i);
});

test('zero or missing provider usage remains unresolved in the existing settlement path',()=>{
 assert.match(settlement,/zero_usage_requires_verification/);
 assert.match(settlement,/update public\.professor_budget_reservations set status='unresolved'/i);
 assert.match(settlement,/Missing\/invalid usage or unknown pricing retains the reserve/i);
 assert.doesNotMatch(candidate,/status='settled'/i);
});

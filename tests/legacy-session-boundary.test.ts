import test from 'node:test';import assert from 'node:assert/strict';
import {legacySessionBlockReason} from '../supabase/functions/_shared/legacy-session-boundary.ts';
test('unmanaged active legacy session retains its legacy route',()=>assert.equal(legacySessionBlockReason({status:'active'}),null));
for(const field of ['room_name','callback_token_hash','budget_reservation_id','startup_request_id'])test(`managed session marker ${field} blocks old routes`,()=>assert.equal(legacySessionBlockReason({status:'active',[field]:'synthetic'}),'managed_professor_session'));
test('validation rooms remain managed, not writable by old evaluator',()=>assert.equal(legacySessionBlockReason({status:'active',room_name:'validation:lh-test'}),'managed_professor_session'));
for(const status of ['completed','abandoned',null])test(`non-active legacy session is not re-evaluated: ${status}`,()=>assert.equal(legacySessionBlockReason({status}),'session_already_finalized'));
test('malformed record is denied',()=>{for(const value of [null,[],false,'text'])assert.equal(legacySessionBlockReason(value),'session_unavailable');});

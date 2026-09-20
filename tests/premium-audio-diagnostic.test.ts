import test from 'node:test';
import assert from 'node:assert/strict';
import {premiumAudioFailureDiagnostic} from '../supabase/functions/_shared/premium-audio-diagnostic.ts';

test('provider failure retains bounded correlation metadata without response bodies',()=>{
 const d=premiumAudioFailureDiagnostic('11111111-1111-4111-8111-111111111111','http',401,'req_example123');
 assert.deepEqual(d,{event:'premium_audio_provider_failure',attemptId:'11111111-1111-4111-8111-111111111111',phase:'http',httpStatus:401,providerRequestId:'req_example123'});
});
test('untrusted metadata cannot inject secrets, newlines or arbitrary provider payloads into logs',()=>{
 for(const value of ['Bearer SECRET','req_x\nSECRET','req_'+ 'x'.repeat(121),{secret:'SECRET'},null]){
  const d=premiumAudioFailureDiagnostic('SECRET','transport',value,value);
  assert.equal(d.attemptId,null);assert.equal(d.httpStatus,null);assert.equal(d.providerRequestId,null);
  assert.ok(!JSON.stringify(d).includes('SECRET'));
 }
});

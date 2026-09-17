import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const candidate=fs.readFileSync('quality/candidates/professor-preflight-retention.sql','utf8');
const proof=fs.readFileSync('quality/tests/professor-preflight-retention.sql','utf8');
const races=fs.readFileSync('quality/tests/professor-preflight-retention-concurrency.py','utf8');
const workflow=fs.readFileSync('.github/workflows/preview-local-platform.yml','utf8');
const migrations=fs.readdirSync('supabase/migrations').filter(name=>name.endsWith('.sql'))
 .map(name=>fs.readFileSync(`supabase/migrations/${name}`,'utf8')).join('\n');

test('retention remains private, bounded and absent from connected migrations',()=>{
 assert.match(candidate,/UNMOUNTED PHASE-1 CANDIDATE[\s\S]*Disposable PostgreSQL only/i);
 assert.match(candidate,/p_batch_limit not between 1 and 500/i);
 assert.match(candidate,/pg_try_advisory_xact_lock\(hashtextextended\('lh_internal\.prune_professor_ephemera_v1',0\)\)/i);
 assert.match(candidate,/security invoker/i);
 assert.match(candidate,/revoke all on function lh_internal\.prune_professor_ephemera_v1\(integer\)[\s\S]*from public,anon,authenticated,service_role/i);
 assert.ok(!migrations.includes('prune_professor_ephemera_v1'));
});

test('cleanup locks each parent before its child and never age-deletes a bound reference',()=>{
 const parent=candidate.indexOf('for update of t skip locked');
 const child=candidate.indexOf('for update of p skip locked');
 const childDelete=candidate.indexOf('delete from lh_internal.professor_preflights');
 const referenceDelete=candidate.indexOf('delete from lh_internal.written_professor_references');
 assert.ok(parent>=0&&child>parent&&childDelete>child&&referenceDelete>childDelete);
 assert.doesNotMatch(candidate,/for update of\s+t\s*,\s*p/i);
 assert.match(candidate,/t\.bound_session_id is null[\s\S]*t\.expires_at<=v_preflight_cutoff/i);
 assert.match(candidate,/delete from lh_internal\.written_professor_references[\s\S]*t\.bound_session_id is null/i);
 assert.doesNotMatch(candidate,/(insert|update|delete)\s+(into\s+|from\s+)?public\.(ai_tutor_sessions|professor_budget_reservations|ai_usage_log)/i);
});

test('proofs preserve the live consumed fence and exercise real lock contention',()=>{
 assert.match(proof,/valid-parent-fence[\s\S]*consumption fence[\s\S]*parent is still valid/i);
 assert.match(proof,/v_recovery_before is distinct from v_recovery_after/i);
 assert.match(proof,/v_exposure_before is distinct from v_exposure_after/i);
 for(const marker of ['retention_put_parent','retention_consume_child','retention_start_replay','retention_cleanup_owner'])assert.ok(races.includes(marker),marker);
 assert.match(races,/providerCalls[^\n]*0/);
});

test('disposable workflow installs candidates before running both transactional harnesses',()=>{
 const validation=workflow.indexOf('quality/candidates/professor-validation-abandon.sql');
 const retention=workflow.indexOf('quality/candidates/professor-preflight-retention.sql',validation+1);
 const validationProof=workflow.indexOf('quality/tests/professor-validation-abandon.py',retention);
 const retentionProof=workflow.indexOf('quality/tests/professor-preflight-retention-concurrency.py',retention);
 assert.ok(validation>=0&&retention>validation&&validationProof>retention&&retentionProof>retention);
});

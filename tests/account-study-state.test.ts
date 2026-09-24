import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration=fs.readFileSync('supabase/migrations/20260923003415_user_study_state.sql','utf8');
const service=fs.readFileSync('src/services/accountStudyState.ts','utf8');

test('account study state migration is owner-bound, bounded and unavailable to anon',()=>{
 assert.match(migration,/references auth\.users\(id\) on delete cascade/);
 assert.match(migration,/octet_length\(payload::text\) <= 262144/);
 assert.match(migration,/enable row level security/);
 assert.match(migration,/revoke all on table public\.user_study_state from public, anon, authenticated/);
 assert.match(migration,/grant select, insert, update on table public\.user_study_state to authenticated/);
 assert.equal((migration.match(/create policy/g)??[]).length,3);
 assert.equal((migration.match(/\(select auth\.uid\(\)\) = user_id/g)??[]).length,4);
 assert.doesNotMatch(migration,/grant[^;]+\bdelete\b/i);
 assert.doesNotMatch(migration,/grant[^;]+\banon\b/i);
});

test('browser study state uses only the publishable authenticated client and rechecks account identity',()=>{
 assert.match(service,/supabase\.auth\.getUser\(\)/);
 assert.equal((service.match(/requireCurrentUser\(userId\)/g)??[]).length>=2,true);
 assert.match(service,/\.upsert\(/);
 assert.match(service,/onConflict:'user_id,namespace'/);
 for(const forbidden of ['service_role','SUPABASE_SERVICE_ROLE_KEY','sb_secret_','LiveKit','OPENAI_API_KEY'])assert.equal(service.includes(forbidden),false,forbidden);
});

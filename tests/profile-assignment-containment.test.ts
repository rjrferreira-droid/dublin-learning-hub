import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const candidatePath='quality/candidates/profile-assignment-containment.sql';
const fixturePath='quality/tests/profile-assignment-containment-fixture.sql';
const behaviorPath='quality/tests/profile-assignment-containment.sql';
const authGatePath='src/components/AuthGate.tsx';
const authCssPath='src/auth.css';
const audioWorkflowPath='.github/workflows/premium-audio-atomic-candidate.yml';
const professorWorkflowPath='.github/workflows/professor-experience.yml';

const candidate=readFileSync(candidatePath,'utf8');
const fixture=readFileSync(fixturePath,'utf8');
const behavior=readFileSync(behaviorPath,'utf8');
const authGate=readFileSync(authGatePath,'utf8');
const authCss=readFileSync(authCssPath,'utf8');
const audioWorkflow=readFileSync(audioWorkflowPath,'utf8');
const professorWorkflow=readFileSync(professorWorkflowPath,'utf8');

function taggedBody(source:string,tag:string):string{
  const first=source.indexOf(tag);
  assert.notEqual(first,-1,`missing ${tag}`);
  const start=first+tag.length;
  const end=source.indexOf(tag,start);
  assert.notEqual(end,-1,`unterminated ${tag}`);
  return source.slice(start,end);
}

function sha256(value:string):string{
  return createHash('sha256').update(value).digest('hex');
}

test('profile containment is transactional, aggregate-bound and data-preserving',()=>{
  assert.match(candidate,/^-- CANDIDATE ONLY[\s\S]*\nbegin;/);
  assert.match(candidate,/lock table auth\.users in share row exclusive mode;[\s\S]*lock table public\.profiles in share row exclusive mode;/);
  assert.match(candidate,/count\(\*\) from auth\.users\) <> 1/);
  assert.match(candidate,/count\(\*\) from public\.profiles\) <> 1/);
  assert.match(candidate,/p\.learner_track='rafael_finance'[\s\S]*p\.updated_at=p\.created_at/);
  assert.doesNotMatch(candidate,/\binsert\s+into\s+public\.profiles\b/i);
  assert.doesNotMatch(candidate,/\bdelete\s+from\s+public\.profiles\b/i);
  assert.match(candidate,/\ncommit;\s*$/);
});

test('browser profile privileges retain only owner reads and safe preference updates',()=>{
  assert.match(candidate,/revoke all privileges on table public\.profiles from anon;/);
  assert.match(candidate,/revoke all privileges on table public\.profiles from authenticated;/);
  assert.match(candidate,/grant select on table public\.profiles to authenticated;/);
  assert.match(candidate,/grant update \(display_name,preferred_language,timezone\)[\s\S]*to authenticated;/);
  assert.match(candidate,/drop policy profiles_insert_own on public\.profiles;/);
  assert.match(candidate,/profiles_update_own[\s\S]*p\.polcmd='w'[\s\S]*auth\.uid\(\) = id/);
  for(const column of ['id','learner_track','created_at','updated_at']){
    assert.match(candidate,new RegExp(`\\('${column}'\\)`));
  }
});

test('final-row trigger is invoker-only and cryptographically attested',()=>{
  const body=taggedBody(candidate,'$profile_assignment_guard$');
  const digest=sha256(body);
  assert.equal(digest,'3a79818cfc6f2e819e8bf2c4414d5a6a02f6c390203bde01033ad34a7148cd72');
  assert.match(candidate,new RegExp(digest));
  assert.match(candidate,/create function lh_internal\.enforce_profile_server_assignment_v1\(\)[\s\S]*security invoker[\s\S]*set search_path=pg_catalog/);
  assert.match(body,/request\.jwt\.claim\.role/);
  assert.match(body,/request\.jwt\.claims/);
  assert.match(body,/current_user in \('postgres','service_role'\)/);
  assert.match(body,/request_role is null[\s\S]*request_claims is null/);
  assert.match(body,/request_role='service_role'[\s\S]*claims_role='service_role'/);
  assert.match(body,/tg_op='INSERT'[\s\S]*profile_provisioning_server_only/);
  assert.match(body,/new\.id is distinct from old\.id[\s\S]*new\.learner_track is distinct from old\.learner_track[\s\S]*profile_assignment_server_only/);
  assert.match(candidate,/create trigger profiles_server_assignment_guard_v1[\s\S]*after insert or update on public\.profiles[\s\S]*for each row/);
  assert.match(candidate,/t\.tgtype=21/);
  assert.match(candidate,/revoke all on function lh_internal\.enforce_profile_server_assignment_v1\(\)[\s\S]*PUBLIC,anon,authenticated,service_role/);
  assert.match(candidate,/aclexplode\(p\.proacl\)[\s\S]*grantee\.rolname<>'postgres'[\s\S]*acl\.privilege_type<>'EXECUTE'/);
});

test('metadata-driven Auth provisioning is exact-attested then disabled',()=>{
  assert.match(candidate,/on_auth_user_created[\s\S]*t\.tgtype=5/);
  assert.match(candidate,/5cf21e46fa593a184225c19283c8b04da164f3537be6f0c407d36fb4fa99aecb/);
  assert.match(candidate,/drop trigger on_auth_user_created on auth\.users;/);
  assert.match(candidate,/revoke all on function public\.handle_new_user\(\)[\s\S]*PUBLIC,anon,authenticated,service_role/);
  assert.match(candidate,/where t\.tgrelid=to_regclass\('auth\.users'\)[\s\S]*not t\.tgisinternal/);
  assert.match(candidate,/t\.tgfoid=to_regprocedure\('public\.handle_new_user\(\)'\)/);
  assert.match(behavior,/raw_user_meta_data[\s\S]*auth_metadata_created_profile/);
  assert.match(behavior,/set local role service_role;[\s\S]*insert into public\.profiles[\s\S]*set learner_track='viviane_payroll'/);
});

test('disposable fixture reproduces both reviewed live function hashes',()=>{
  assert.equal(
    sha256(taggedBody(fixture,'$updated_at$')),
    '3c6d6c41d6262a20e7c102dbd49bb3383bd86a4138c8a3ab6b9b04a1ec2420a5',
  );
  assert.equal(
    sha256(taggedBody(fixture,'$handle_new_user$')),
    '5cf21e46fa593a184225c19283c8b04da164f3537be6f0c407d36fb4fa99aecb',
  );
  assert.match(fixture,/before update on public\.profiles/);
  assert.doesNotMatch(fixture,/before insert or update on public\.profiles/);
});

test('AuthGate reads server assignment and never chooses or creates a track',()=>{
  assert.match(authGate,/readAssignedProfile/);
  assert.doesNotMatch(authGate,/readOrCreateProfile|createMissingProfile|user_metadata|signUp|\.from\('profiles'\)[\s\S]{0,180}\.insert\(/);
  assert.doesNotMatch(authGate,/Choose learner profile|Who is using this account\?|PROFILE SETUP/);
  assert.match(authGate,/data-testid="registration-closed"/);
  assert.match(authGate,/registration is temporarily unavailable/);
  assert.match(authGate,/data-testid="profile-assignment-pending"/);
  assert.match(authGate,/Your learning access is not assigned yet/);
  assert.match(authGate,/Check access again/);
});

test('PostgreSQL behavior proof covers both privilege and trigger defenses',()=>{
  assert.match(behavior,/safe_profile_update_failed/);
  assert.match(behavior,/learner_track_update_unexpectedly_succeeded/);
  assert.match(behavior,/profile_id_update_unexpectedly_succeeded/);
  assert.match(behavior,/self_enrolment_unexpectedly_succeeded/);
  assert.match(behavior,/profile_provisioning_server_only/);
  assert.match(behavior,/profile_assignment_server_only/);
  assert.match(behavior,/service_definer_track_update_unexpectedly_succeeded/);
  assert.match(behavior,/service_definer_self_enrolment_unexpectedly_succeeded/);
  assert.match(behavior,/cross_account_update_succeeded/);
  assert.match(behavior,/^-- Run only[\s\S]*\nrollback;\s*$/);
});

test('CI runs the disposable profile proof and exactly pins the AuthGate exception',()=>{
  for(const path of [candidatePath,fixturePath,behaviorPath,'tests/profile-assignment-containment.test.ts']){
    assert.ok(audioWorkflow.includes(`- '${path}'`),`${path} must trigger the PostgreSQL workflow`);
  }
  assert.match(audioWorkflow,/createdb learning_hub_profile_guard[\s\S]*profile-assignment-containment-fixture\.sql[\s\S]*profile-assignment-containment\.sql/);
  assert.equal(sha256(authGate),'61fc88056aef215bd87587f6b41343104cad78318383dbe1ee8ef4beaa16a55b');
  assert.match(professorWorkflow,/sha256sum src\/components\/AuthGate\.tsx[\s\S]*61fc88056aef215bd87587f6b41343104cad78318383dbe1ee8ef4beaa16a55b/);
  assert.equal(sha256(authCss),'ef62e5051af7e261c0cc8fcb8597fcbf2884e49f448441ef29fb8caad9e8bf3a');
  assert.match(professorWorkflow,/sha256sum src\/auth\.css[\s\S]*ef62e5051af7e261c0cc8fcb8597fcbf2884e49f448441ef29fb8caad9e8bf3a/);
  assert.ok(audioWorkflow.includes("- 'src/auth.css'"));
});

# Audio v3 service-only access installed — 19 September 2026

Target: aazfyosqqeujureksqjs / v2-development Preview only.
Migration: 20260919154615 / lh_v2_audio_v3_service_only_access.
Source commit: 94279260855e2c8fcd096c9d9932ea438b19e9b5.
Source: quality/candidates/premium-audio-service-access-v3.sql.
SHA256: b893f5e262505b43b1f2dffc8b2caf5e6feab5548887bc7fe7b3e4eda6d1fd4a.

The transactional installer checks exact nine installed body hashes, signatures,
return types, postgres ownership, fixed search_path, closed ACLs, roles and private
binding-table posture. It grants EXECUTE without grant option on exactly five
public v3 functions to service_role, and independently checks the resulting ACLs.
Four internal helpers and the binding table receive no new privileges.
No v1/v2 Audio or Professor grants were changed.

The initial disposable run caught an ambiguous PL/pgSQL catalog alias; corrected
before connected writes. Run 35452785253 passed at the exact installed source:
https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35452785253
This includes successful grants/postconditions, seven negative mutation cases,
rollback preservation and all previous atomic/concurrency/receipt/closed-v3 tests.
Read-only connected preflight passed. apply_migration returned success=true.

Post-install independent inspection: exactly five public functions executable by
service_role; all nine deny anon/authenticated and four private helpers also deny
service_role. Read-only role-switched calls verified actual permission denial for
anon/authenticated and invalid_audio_cache_identity for service_role on malformed
observer input. These tests do not simulate a signed-in learner HTTP session.

All 12 protected collection row counts and full-row SHA256 digests are unchanged.
USD4 Professor obligation preserved. Existing service SELECT permissions and asset
INSERT plus Professor exposure EXECUTE were verified, not expanded.
No provider calls, stage activation, lesson publication or object generation.

Dashboard still shows the SHA256 for P1_AUDIO_RUNTIME_STAGE=closed:
c3eefb58d7c42440a9d4abec51d629544d635a6d936ff3c4d3fca96d611b3cf3.
Edge remains the previously deployed version5 from source10029d4; no redeployment.

Security advisor finding set unchanged: 12 INFO RLS-without-policy, 4 existing
Professor authenticated SECURITY DEFINER warnings and leaked-password warning.
References:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Next: verify the closed response from the owner's authenticated Learning Hub
session. Available cloud tabs contain the Supabase Dashboard and an unrelated
shopping page, not a signed-in Learning Hub session. Do not extract credentials
or impersonate a learner to bypass this missing browser session.
Generation and P1 publication remain closed pending controlled acceptance.

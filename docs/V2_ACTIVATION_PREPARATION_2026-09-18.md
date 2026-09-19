# V2 activation preparation — 18 September 2026

## Scope and completed prerequisite

PR #3 remains a draft feature candidate. Owner-assisted hosted configuration verification passed, as recorded in PREVIEW_CONFIGURATION_CHECK_2026-09-17.md. Do not repeat the owner login/configuration request.

This review prepares the next connected change; it does not execute or authorize database/Storage mutations, grants, Edge/worker deployment, lesson publication, provider calls or production promotion.

## Live read-only evidence

Target: approved V2 `aazfyosqqeujureksqjs`.

- 1 profile, 3 lessons (all published), 6 Professor sessions, 7 reservations.
- Premium Audio attempts: 0. Audio objects: 0.
- Profile assignment guard and Audio v3 binding table: absent.
- Reservation summary: 6 settled reservations with USD 24 originally reserved and USD 0.9970616 actual recorded cost in aggregate; 1 unresolved reservation of USD 4 with actual_cost_usd 0. That zero is not proof of zero provider cost and does not authorize releasing the hold. Do not confuse the settled reservation total with actual cost.
- Storage: exactly one bucket, lesson-audio; public=true; 15,728,640-byte limit; MIME audio/mpeg and audio/wav; zero Storage policies. Both Storage tables have RLS, no FORCE RLS, owner supabase_storage_admin.
- Deployed premium-lesson-audio reports deployment version 3 and artifact digest a063a016300dd2787362a66f0f064ae590344ba4a3c4d58d9a3a4a6db9492af0. This numeric deployment version is not the authored Audio v3 protocol. No Edge update occurred.

## First executable change: profile assignment containment

Source: quality/candidates/profile-assignment-containment.sql.
SHA-256: d340c3dfa8e752ee6a92d64b78795a723eed02a22adbc970e1cce672c80df479.
Git blob: 7c7019e82471fdc6c68e566115a4af52097add64 (matches the remote feature branch).

The exact `profile_assignment_prerequisites` block from that source passed on V2 inside BEGIN TRANSACTION READ ONLY with a 20-second statement timeout. The SQL tool returned profile_containment_preflight_passed=true. No installer table locks, DDL, row mutation, grants or revocations were executed. This point-in-time evidence must not replace the installer's own transactional prerequisites.

The prepared transaction:
1. Takes bounded locks in Auth/profile order and repeats exact prerequisites.
2. Removes browser profile insertion and identity/track updates, while retaining own-profile reads and updates to display_name, preferred_language and timezone.
3. Removes the legacy Auth trigger that copies user-editable metadata into profile assignment; retains its dormant function with API EXECUTE revoked.
4. Adds an invoker-only final-row assignment guard and verifies exact postconditions before commit.

It changes no profile rows. Existing login/profile reads remain available; new automatic account provisioning remains closed. Unexpected state aborts the transaction. Do not improvise a repair, relax the guard or automatically re-enable the legacy trigger on failure.

After scoped installation approval: recheck the source hash and target, retain before-state aggregate/digest evidence, apply this transaction as one named migration, recheck the exact guard/ACL/trigger postconditions, compare preserved records/reservations and run security advisors. No activation grant belongs in this step. If acknowledgement is lost, reconcile migration/post-state through reads before considering any retry.

## Validation evidence

- Fresh local focused suite: 25/25 PASS (profile-assignment-containment.test.ts and private-premium-audio-storage.test.ts).
- Existing PostgreSQL CI run 35318335285 rechecked: SUCCESS, including profile-assignment behavioral proof, closed v3 lifecycle, concurrency and nondestructive stop.
- No application source changed in this review, so no new full-build/full-regression claim is made.

## Subsequent activation order and unresolved work

| Step | Prepared state | Remaining requirement |
| --- | --- | --- |
| Profile assignment protection | Exact live preflight and existing behavior proof passed | Scoped connected-installation decision and postchecks |
| Private Storage | Fresh DB topology matches candidate prerequisites | Supported Storage Admin API route, fresh API plus DB attestations, scoped mutation decision |
| Audio v3 SQL | Existing candidate and isolated SQL proof | Recheck against V2 after profile containment; install with every API role closed |
| Audio v3 service access | Five exact RPC signatures exist in source | Review the minimal service_role-only grant separately; keep anon/authenticated denied |
| Edge artifact | Source candidate exists | Pin SDK and transitive dependencies; verify reproducible deployment artifact and preserved Golden Lesson behavior |
| Runtime stage | Closed | Reviewed Edge/stage activation only after preceding gates |
| Paid acceptance | Not performed | Explicit bounded budget, selected lesson/account, one-shot execution and cost/receipt reconciliation |
| Professor expansion | Separate route/stage | Complete provider dispatch and lifecycle acceptance; do not infer from Audio or configuration success |

Additional source hashes:
- quality/candidates/private-premium-audio-storage.ts: 6261092ac8ed8ce51a77594c43230eaad27f0aaeff767bf4a3e81a3da8185248.
- quality/candidates/premium-audio-source-binding.sql: 538bf0459bfc7cd1e466063ec41064495482565fc3d44e0e871da652c0e19232.

The current Edge source imports jsr:@supabase/supabase-js@2 and an unversioned functions-js type declaration; there is no function-specific Deno lockfile in this checkout. The root Node lock resolves supabase-js 2.116.0, but that does not pin the independently resolved Edge dependency graph. Exact Edge pinning remains unfinished, not an accomplished deployment. Supabase recommends per-function dependency configuration: https://supabase.com/docs/guides/functions/dependencies.

The installed connector has no dedicated Storage bucket mutation action. Do not use direct storage-schema writes as a substitute or export a server credential into chat. Resolve the supported API execution path before requesting/attempting that stage.

Only the first profile-containment installation is ready for a concrete scoped decision. P1 remains unpublished, the unresolved USD 4 remains preserved, and main/Production/LiveKit remain unchanged.

## Installation completed — 19 September 2026

This section supersedes the pending profile-installation status above. The owner explicitly approved profile-assignment containment only on the approved V2 test backend.

- Target branch rechecked: v2-development, aazfyosqqeujureksqjs, ACTIVE_HEALTHY, not the default branch.
- Applied migration: 20260919085643 / lh_v2_profile_assignment_containment.
- Applied source SHA-256: d340c3dfa8e752ee6a92d64b78795a723eed02a22adbc970e1cce672c80df479; Git blob 7c7019e82471fdc6c68e566115a4af52097add64, fetched at 6b5d77853e2967399cd5ebd4c0d8bc3e4f80c152.
- apply_migration returned success=true. The installer ran transactional prerequisites and postconditions. An independent rerun of the exact profile_assignment_postcondition block in a read-only transaction returned profile_containment_postcheck_passed=true.
- Before/after preservation comparison: all 15 snapshot fields match exactly. Counts: 1 profile, 3 lessons, 6 sessions, 7 reservations, 8 usage rows, 0 audio attempts, 0 audio objects. Content digests match for profiles, lessons, sessions, reservations, usage and both budget-settings collections.
- The unresolved USD 4 reservation remains unchanged. No reservation was released and no paid provider call was made.
- Browser profile insertion and identity/track reassignment are closed. Own-profile reads and the three permitted preference updates remain allowed. The legacy automatic Auth profile trigger was removed; its dormant function was retained with API execution revoked. No account or learning data was deleted.
- No Storage mutation, Audio v3 migration/grant, Edge/worker deployment, admission-stage activation, lesson publication, main merge or Production promotion was performed.

### Post-DDL security advisor findings

The advisor returned no ERROR-level findings, but it is not an end-to-end security certification:

- 11 INFO findings for RLS-enabled tables without policies. No policies were added in this scoped change.
- 4 WARN findings for authenticated-callable SECURITY DEFINER Professor RPCs: flag_professor_dispatch_uncertain, list_professor_recovery_v1, observe_professor_dispatch_v1 and start_professor_session_atomic. These require contextual review of their existing authorization checks; the profile migration does not authorize altering their grants. [Supabase remediation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- 1 WARN finding: leaked-password protection disabled. No Auth setting was changed. [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Next unresolved activation prerequisite remains the supported Storage Admin API path and a separately scoped private-bucket change. Audio and Professor voice activation remain closed; the completed profile protection is not evidence of live audio/voice success.

## Private Storage completed — 19 September 2026

After owner-assisted sign-in, the authenticated Supabase Dashboard identified Dublin Learning Hub / v2-development Preview, project aazfyosqqeujureksqjs. This resolved the supported execution-path blocker above.

Fresh read-only SQL confirmed exactly one bucket, lesson-audio, public=true, no objects, no Storage policies, 15,728,640-byte limit and MPEG/WAV MIME list. Both Storage tables retained RLS=true, FORCE RLS=false and supabase_storage_admin ownership. Dashboard independently showed the same settings and empty bucket contents.

Used the official Dashboard's Edit bucket > Bucket settings form; submitted Save once with Public bucket disabled, allowed MIME types audio/mpeg, and the existing 15 MB limit. No direct SQL Storage writes, credential extraction, custom admin endpoint or retry was used. This is a Dashboard execution of the reviewed target settings, not execution of the candidate TypeScript operator.

Post-save Dashboard removed the Public badge. Independent SQL confirmed public=false, allowed_mime_types=[audio/mpeg], file_size_limit=15728640, objects=0 and policies=0. Storage RLS and owners were independently rechecked and unchanged. No file was uploaded or generated.

No Audio v3 SQL/grants, Edge deployment, provider call, voice admission, lesson publication or production promotion was performed. Next prerequisite: review/install authored Audio v3 binding with API access closed, then separately review minimal service access and pinned Edge artifact before paid acceptance. The legacy deployed audio function must not be treated as compatible or activated merely because Storage is private.

# Isolated backend installation review — 14 September 2026

Status: **BLOCKED — no separately approved isolated backend exists**.
This is a review package, not authorization or a production migration. PR #3 remains draft on frozen base 3d292fe7f913135fd4b461487cc5dffde74bc7e1. Worker version nb67ioJmoKBN stays untouched.

## Connected read-only findings

Supabase branch metadata showed only:
- main: qwvsrcgsfoguxdbcdrxq
- v2-development: aazfyosqqeujureksqjs

Both are explicitly excluded as installation targets. A feature Vercel URL alone does not create a separate database.

Narrow pg_proc metadata on main returned no matching budget/Audio/startup routines. The same query on v2-development found:
- start_professor_session_atomic(uuid,uuid,text,text,text,boolean), SECURITY DEFINER, callable by authenticated, not anon;
- professor_reservation_exposure_v2(), SECURITY INVOKER, not callable by anon/authenticated;
- reserve_professor_budget(text), SECURITY DEFINER, callable by authenticated, not anon.

The legacy routine is an actual present dependency, not a hypothetical concern. The atomic candidate deliberately rejects its existence. No function body was fetched, no grant was changed and no historical SQL export was attempted. These limited metadata queries are not a complete backend compatibility audit.

Column metadata on V2 confirms lessons.content_version, usage request IDs and budget/reservation tables, but audio_assets lacks generation_request_id and estimated_cost_usd. No v2 Audio attempt RPC was found. Private-table absence is not inferred from information_schema visibility alone.

## Offline package

Run `python quality/preview-backend/build-package.py NEW_OUTPUT_DIRECTORY` locally to produce:
- metadata-only inventory.sql;
- asset prerequisites: canonical lesson/type uniqueness, feature/request uniqueness, receipt metadata;
- the exact existing atomic candidate, unchanged;
- transaction-wrapped install.sql with ON_ERROR_STOP;
- stop-admissions.sql;
- SHA-256 manifest with no selected target and both existing refs denied.

The builder never connects to a database, reads credentials, deploys or publishes lessons. The manifest is an advisory review boundary, not a security control enforced by psql. Do not execute its SQL against a connected project without separately checking the actual target and approval.

The package intentionally does not install legacy v1 claim RPCs. Existing asset duplicates, existing prerequisite columns/indexes, missing baseline dependencies or legacy startup routines fail installation; there is no automatic data cleanup, drop, force or IF NOT EXISTS that silently accepts drift. Use a single connection/transaction for the complete install.sql. Do not apply its components piecemeal.

## Exact installation sequence requiring a later decision

1. Select and authorize a NEW isolated project/branch and its infrastructure cost. Confirm its project ref differs from both refs above. No data copy, personal accounts or model credentials. Do not assume cloning main supplies V2's reviewed schema: the inventories differ.
2. Establish an approved schema baseline separately. The repository's disposable fixture proves contracts; it is not a Supabase restore or production-equivalent seed. Missing historical baseline coverage remains a blocker; do not bypass export restrictions.
3. Review all spend-admission paths, especially the legacy reserve_professor_budget(text) routine. Preserve the candidate's rejection until its disposition is explicitly reviewed and represented in an isolated baseline. No silent revoke/drop of V2 functionality.
4. Run the metadata inventory on the new target. Review unique-key compatibility, private schema/role grants, service-only attempt RPCs, storage bucket/policies and receipt columns. Record target, source hashes and approved baseline. Keep P1_AUDIO_RUNTIME_STAGE unset, provider credentials absent and P1 interactive UI blocked.
5. Only after these checks and installation approval, apply the complete generated install.sql transaction on that target. Verify resulting role permissions, uniqueness and startup accounting. Use fictional users/content only; no real P1 publication.
6. Independently approve and deploy the Edge candidate with its exact dependencies to the isolated target. Its stage is isolated-preview-atomic-v2; the stage alone does not enforce project isolation. Verify the target first. Do not copy the existing worker's credentials or repoint the live worker. Professor/evaluator's isolated service dependencies still need explicit design/approval before a hosted session.
7. Scope client and server Supabase configuration to the exact feature Preview branch only, using the isolated instance's own credentials; never expose service secrets in VITE variables. Vercel auth-protected acceptance remains separate. No production aliases or defaults change.
8. Run provider-free authenticated boundary checks first. Paid voice/TTS/model acceptance, lessons becoming published and real user sessions each remain outside this package's authorization.

## Reversal / containment

Stop new admissions first using the reviewed stop-admissions.sql on the isolated target. It acquires budget locks in the existing order, replaces only Audio admission and submission fences, and keeps their service-only grants.

Do not revert to the older generation path: turning off the stage alone permits Golden Audio's legacy path in the current undeployed source. Contain the isolated endpoint/provider access as well; leave the stage consistent until admissions have stopped. An already-submitted provider request can finish; containment does not prove cancellation or no charge.

Keep the Professor startup accounting patch, pending attempt table, asset metadata and receipt RPCs. They are necessary while obligations remain. Submitted/uncertain work is not cancelled by age. Settle only using evidence from the exact attempt; cached metadata may support the existing idempotent estimated receipt. Provider invoice reconciliation remains distinct.

The stop script is deliberately non-destructive: no drops, deletes, truncations or blanket cancellation. Full schema rollback and resumption require a later review after all obligations are reconciled. Do not erase the isolated database merely to make pending liabilities disappear.

## Validation and sources

The disposable PostgreSQL workflow now tests:
- package reproducibility, hashes and overwrite refusal;
- transaction rollback of asset additions when the legacy guard rejects installation;
- normal installation into the fictional reviewed baseline;
- previous 17 concurrency/orchestration scenarios;
- stop while reserved/submitted attempts exist, preserved Professor definition/holds, idempotent receipt settlement and safe cancellation of never-submitted work.

Authoritative results and downloadable review package are attached to the atomic workflow on this commit. No claim of connected installation is made.

Official sources checked:
- https://supabase.com/docs/guides/deployment/branching — separate instances/credentials, data-less default and deployment behavior.
- https://supabase.com/changelog — scanned current changes; relevant safeguards remain intact. No logs API, Realtime schema or extension-version changes are proposed.

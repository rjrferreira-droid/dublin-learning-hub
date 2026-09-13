# Core consolidation — batch 2, 13 September 2026

## Release boundary

Repair branch: `fix/core-consolidation-2026-09-13`, draft PR #2 against `v2`.
Verified code commit: `288dcdfd1cba7fed803d81de3723ca219d2dea3b`.
The regular V2 branch remains at `5c98fecdc77728a93a563aa949ef8a57bc080613`. No main/production promotion. No Manuzinha, curriculum, Professor-personality or model-quality change.

## Applied to the existing V2 development database

- `20260913155850_lh_usage_settlement_integrity`: service-only atomic settlement, explicit price cards, strict usage-counter validation, private pending/settled receipts, duplicate/conflicting replay handling.
- `20260913161005_lh_atomic_professor_start`: an additive transactional startup RPC that inserts its budget reservation and session together, enforces authenticated profile/course access, preserves premium-only policy, limits overlapping starts and protects its server-owned session fields.
- Runtime `professor-usage-settle` upgraded from v1 to **v2**, deployment confirmed ACTIVE and source read back after deployment. Artifact SHA256: `4b8c6562a05185c20200f2f9f52da98c56a931a2ad79af3a9cdeaa04b611ab88`.
- Existing `professor-session-complete` remains the batch-1 v4 callback.

## In the repair branch, not yet in the regular V2 website API

- `server/professor-start.ts` and `api/livekit-token.ts` now use the single atomic-start RPC. The callback secret is generated server-side; only its SHA-256 hash is passed to the startup database call.
- An uncertain LiveKit dispatch retains its reservation and keeps the session eligible for a legitimate late callback; a timeout is not evidence of zero provider consumption.
- Legacy startup RPCs were not revoked yet, because the regular V2 API still depends on them. Retirement must accompany the API cutover and authenticated acceptance.

## Accounting behavior

Missing, zero-only, malformed, internally inconsistent or unsupported consumption counters do not become a confirmed zero cost. Unknown pricing or missing evaluation-cost evidence also retains the reservation as unresolved. A later valid settlement can reconcile a pending receipt. Once settled, identical callbacks are idempotent and changed payloads are rejected.

Realtime and evaluator log entries, reservation settlement and settlement receipt are committed together. Historical settled charges are not repriced by this path.

The realtime estimate is calculated from explicit counters and a versioned price card. The current evaluator worker still supplies a reported cost estimate without detailed token counters; the settlement explicitly labels that basis. Neither estimate is a reconciled provider invoice.

Both premium and mini price cards are supported, but the startup policy remains premium. This is not an authorization to downgrade the teacher or increase any spending limit.

## Verification actually completed

### Run 34767840607 — Budget integrity verification: SUCCESS

- **19 Node tests passed, 0 failed, 0 skipped**: 8 startup contract tests plus 11 existing completion contract tests.
- Disposable local PostgreSQL 17 with fictional records and no live Supabase credentials: premium/mini arithmetic, missing/invalid usage, evaluator failure, later reconciliation, duplicate/conflicting settlement, callback permissions and ownership.
- Startup tests: unauthenticated/cross-course denial, premium policy, repeated and overlapping-start rejection, protected callback/session fields, and uncertain-dispatch behavior.
- Fault injection: force the session INSERT to fail after the reservation INSERT; verify the entire transaction rolls back and leaves no orphan reservation.
- Professor and global AI caps tested using fictional local settings.
- `npm ci` and application/API typecheck/build passed.

### Run 34767840742 — Budget concurrency and Edge checks: SUCCESS

- Two overlapping startup transactions created exactly one session/reservation in the disposable test database.
- Two overlapping settlement transactions created exactly one realtime usage entry and one evaluator usage entry; no duplicate charge or receipt.
- Deno typechecked the settlement and completion callback candidates without executing external service calls.
- An earlier Edge-check attempt failed because its Deno dependency setup was incomplete. The setup was corrected and the check was rerun successfully; it was not disabled.

## Live verification limits and historical preservation

The connector blocked an attempted transactional test against the V2 database; it did not execute. All batch-2 write tests were subsequently performed only in a disposable localhost CI database containing fictional users and conversations, with no route or credentials to the live database.

Successful read-only V2 checks before activating the new Edge wrapper confirmed: 6 sessions, 56 turns, 8 usage entries and 7 reservations; original usage rows were compared to the private recovery snapshot and unchanged. Configured caps remained total USD 200, infrastructure USD 70, AI USD 130, Professor USD 110 and evaluation/audio USD 20.

An additional combined final read-only verification after deployment was blocked by the connector and is NOT marked passed. The deployment itself was separately confirmed ACTIVE using get_edge_function. No end-to-end live voice/session was executed.

## Still open

- Integrate the API changes into V2 only after the remaining release gates; retire the old reserve/start routes together with that cutover.
- Complete runtime-to-Git recovery for the remaining legacy functions and migration history. This batch versions its own changes and preserves the old settlement source for rollback review; it does not claim the whole drift issue is solved.
- Reconcile evaluator costs with actual token/provider evidence; review cross-month reservations, stale reservations, worker retry/recovery and provider/infrastructure spend. Budget checks are not a guarantee of the complete provider invoice.
- Complete the authorization audit, authenticated browser journey, real voice acceptance, evaluator consolidation, course-specific evidence calibration and the three Golden Lessons.
- Branch protection and leaked-password protection remain open. Intentional bounded SECURITY DEFINER endpoints must be reviewed, not automatically replaced with permissive direct writes merely to silence advisors.

No new subscription, paid OpenAI/LiveKit test, raw learner audio recording or production merge was performed in this batch.

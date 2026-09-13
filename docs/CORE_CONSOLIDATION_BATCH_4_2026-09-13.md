# Core consolidation — batch 4, 13 September 2026

## Release boundary

This batch fixes reservation exposure across billing periods and makes unresolved obligations visible. It does **not** complete the historical database reconstruction or constitute live authenticated/voice acceptance.

Work remains on `fix/core-consolidation-2026-09-13`, draft PR #2 into `v2`. No merge or main/production promotion. The ordinary V2 frontend/API is still the earlier baseline; the new frontend and atomic-start API remain staged. Professor personality, premium model policy, LiveKit worker deployment and the Manuzinha portal were not changed.

## Implemented and applied to V2 development

Migration **20260913165704_lh_reservation_lifecycle.sql** adds a service-only reservation exposure aggregate and replaces the reservation subtotal in both the current legacy reservation RPC and the new atomic-start RPC.

- Active and unresolved Professor reservations from **all periods** remain protected. A month boundary or passage of time does not turn an unknown liability into zero cost.
- The aggregate distinguishes current-period, carried and future-period amounts without double-counting them.
- A pending settlement's known cost greater than its original hold increases the protected amount to the known estimate. Missing evidence never reduces the original reservation.
- A reservation older than its session allowance plus a short grace is classified as needing reconciliation. Classification is derived: no historical reservation status, learner result, cost record or timestamp is rewritten or automatically released.
- Both admission paths retain their existing authentication, premium policy and caps. Only their protected-reservation subtotal is replaced, using exact fail-on-drift SQL anchors.
- The aggregate is SECURITY INVOKER, with execution denied to anon/authenticated and granted to service_role. No private learner details are returned by the aggregate.

A successful post-migration read confirmed both RPC definitions use the shared exposure, the service role has execute permission, and the learner role does not.

## Cost Center backend and staged frontend

`learning-hub-cost-center` was deployed to V2 development as **version 6**, ACTIVE. Provider artifact SHA256:

`5e810832933039ecdba7c5672f0088c289b8181531b232c2a7ece24c62f8b18d`

The endpoint now uses the same aggregate as the reservation gates. Its strict parser rejects missing, malformed, inconsistent or wrong-period exposure instead of silently assuming zero. Responses are not cached and explicitly identify the cost basis as an application estimate, not a reconciled provider invoice. A reconciliation backlog changes an otherwise safe status to watch.

The frontend in the repair branch labels usage as **estimated**, distinguishes all-period reserves and displays reconciliation/prior-period information. Those UI changes are tested but **not yet merged into the habitual V2 website**. Compatibility response fields are retained for that older UI.

## Verification completed

**Run 34770035854 — Reservation lifecycle verification: SUCCESS.**

**Run 34770207436 — final rerun after recording the deployed migration under its canonical filename: SUCCESS.** The final verified materialization commit is **0ed1fa61f382b5e872fe6b0b04d95b7b46e0a1c4**.

The workflow includes:

- **65 Node tests**: 11 new strict reservation/exposure cases and 54 previously established callback, boundary, inventory and startup/completion cases.
- **14 Edge handler tests**: six Cost Center cases plus eight previous memory/legacy-boundary cases. Actual handlers execute with mocked authentication/REST responses and runtime network access denied.
- Disposable PostgreSQL tests of UTC month carry, passage of time, stale classification without data mutation, known-cost uplift and service-only permissions.
- The actual atomic-start gate with a fictional prior-period hold large enough to block the current cap, followed by an in-budget case that must remain usable.
- Previous transactional budget tests and genuinely overlapping startup/settlement transactions to detect duplicate reservations or usage entries.
- Typechecking all nine Edge entrypoints; application/API build and voice-worker typecheck.

**The PostgreSQL test database is the existing fictional budget fixture plus the relevant repair migrations. It is not a reconstruction from the complete original historical migration chain.** The fixture does not contain the old legacy reserve function; that path's integration was confirmed by inspecting the patched live function definition, not by claiming a full authenticated legacy end-to-end test.

The first workflow attempt failed during Docker initialization because of healthcheck quoting, before executing tests. The quoting was corrected and both later runs passed. No test or safety check was disabled to obtain a green result.

## Live data and budget check

Post-deployment read-only checks confirmed unchanged counts: **6 sessions, 56 turns, 3 errors, 4 competency-score records, 4 reviews, 8 usage entries and 7 reservations**. No sessions were active before deployment. The configured total envelope remains **USD 200/month**.

The live aggregate identified **one old unresolved reservation of USD 4**, with no active reservations and no carried prior-period amount yet. That USD 4 remains protected; it is **not evidence of an actual USD 4 charge**, and this batch did not release or settle it without supporting evidence.

Security advisors still show the previously known private/budget-table informational notices, the existing bounded SECURITY DEFINER warnings and disabled leaked-password protection. This batch does not label the entire authorization/security audit complete.

No new subscription, paid Professor/LiveKit test, actual learner session, learner-data export or production promotion occurred.

## Historical migration restoration: explicitly incomplete

Read-only inspection of the original history identified two reconstruction dependencies:

1. The original competency seed references generated lesson identifiers whose records are not created in that migration. A fresh replay needs correctly ordered course/lesson seeds and portable natural-key linkage, not invented replacement learner data.
2. The current USD 200 settings are not fully reproduced by the initially inspected budget migrations. The settings need their own reviewed configuration snapshot; replaying an older policy must not silently change the current budget.

An attempt to archive the first six historical SQL files through the connector was blocked by the security layer. It was not retried through another encoding, route or workaround. **Those historical files were not committed, and no full historical replay was performed.** Only the independently developed reservation lifecycle migration described above was added and applied.

The previous 23-version inventory remains a dated inventory, not evidence of reconstruction. There are now 24 applied versions after this new repair. A reproducible full schema, original migration reconciliation, content seeds, provider configuration and a genuinely restorable external backup remain open.

## Remaining gates

- Resolve historical source archival/reconstruction through an approved path, preserving original evidence and accounting for the identified seed/configuration dependencies.
- Reconcile the actual stale hold only with evidence; complete crash-durable callback recovery and provider/evaluator cost reconciliation. Keeping a hold protected is not the same as resolving it.
- Complete remaining authorization, legacy case/audio budget paths, branch protections, authenticated browser acceptance and approved worker deployment/live voice acceptance.
- Integrate the tested API/frontend only after its release gates; then finish Professor UX/naturalness and the three Golden Lessons. Infrastructure tests do not establish teaching quality.

# Core consolidation — batch 3, 13 September 2026

## Scope completed

All **nine active V2 Edge Function slugs** are now represented in the repair branch with source and an inert historical archive. Five previously missing canonical directories were recovered; the Cost Center and Premium Audio source copies were aligned to the inspected live versions. The two batch-1/2 managed callbacks were already versioned and were archived with their shared dependency.

`supabase/runtime-baseline/edge-manifest.json` records original runtime versions, JWT/custom-auth choices, provider artifact fingerprints, archive paths and captured Git source fingerprints. The tests verify inventory coverage and archive integrity. A provider bundle hash and a Git blob hash are different objects; the project does not compare them as though they were interchangeable.

**This completes Edge Function source inventory, not full infrastructure reproducibility.** The 23 applied database migration versions were inventoried and their history inspected, but the original migration recovery/replay and provider configuration restoration are not declared complete. Historical archives must not be blindly deployed or replayed.

## Repairs implemented

### Legacy evaluator and signaling cannot target managed Professor sessions

A pure shared guard rejects any legacy request against a session carrying the managed Professor room, callback, reservation or startup markers. Completed/abandoned legacy sessions are also rejected instead of being run again. The guard runs after user/session ownership lookup and before provider calls or result writes.

This isolates the managed LiveKit pipeline from the old `ai-tutor-evaluate` and `webrtc-signal` routes. It is a targeted protection, NOT a claim that every old case/evaluator/audio route has been consolidated or had all its budget behavior repaired.

### Memory endpoint is explicit about missing evidence and failures

Memory lookup now requires an active session, correct callback credential and a recent session start. It rejects completed/expired callbacks before reading prior learner history. Every history query remains scoped to the current session's user.

A failed history subquery returns `memory_temporarily_unavailable`; it is not silently converted into an empty history. Error diagnosis confidence and nullable mastery are exposed separately. Review status delivered to the Professor is derived from the due date so an overdue scheduled review is not presented as merely upcoming.

### Worker callback recovery is bounded and does not re-evaluate the learner

`professor-agent/src/callbackDelivery.ts` freezes completion and settlement payloads before the first network await. It retries only delivery of those same bytes, never calling an LLM, recreating a lesson, or starting a new paid session.

The helper recognizes retryable transport/HTTP failures, stops after a bounded number of attempts under one shared time budget, honors a bounded Retry-After, verifies acknowledgements, and sends settlement only after a valid completion receipt. A successful HTTP response with `state: pending` remains pending; it is not labeled settled. Callback destinations are allowlisted, redirects are rejected, and recovery logs contain status codes/reasons rather than transcripts or secrets.

The worker shutdown grace is set to 60 seconds to accommodate the existing single 20-second evaluation timeout and the bounded 25-second finalization budget. No persona, voice, premium model policy or evaluator rubric was changed.

**Limit:** this is graceful-shutdown/transient-network recovery, NOT a durable outbox that survives process death, a prolonged provider outage, or a machine crash. Durable recovery and long-lived reconciliation remain a separate gate.

## Tests actually completed

GitHub Actions **34768971028 — Runtime recovery and callback integrity: SUCCESS**.

- **54 Node tests passed, 0 failed, 0 skipped:** 20 delivery tests, 10 legacy boundary tests, 5 runtime-inventory tests and 19 prior completion/startup tests.
- **8 Edge handler tests passed** with a simulated authenticated user/REST transport and runtime network permission denied. These exercised the actual handler code, not only the pure guard helper.
- All nine recovered canonical Edge entrypoints passed Deno typechecking.
- Application/API build from locked dependencies passed.
- Professor worker typechecking passed, including the shutdown setting.
- The verified generated source changes were committed as **5f32f1c8d6735b8e4dcb9b7f76d942515485f925**.

The first handler-test attempt failed because dynamic local source imports lacked read permission. The harness was corrected to permit reading only the local function/dependency directories while continuing to deny runtime network access. No test was removed or disabled. The full suite then passed.

The existing public/unit browser regression workflow **34768918001** also passed this round. It is not a substitute for real authenticated browser or voice acceptance.

## Deployed versus staged

The following changes were deployed ONLY to the existing V2 development environment and subsequently confirmed ACTIVE in the provider function listing:

| Function | New version | Provider artifact SHA256 |
|---|---:|---|
| professor-memory-context | 2 | acfbf0ea91307511950b2f143d06b9c33a2bde4ad668e86cafef1091f439224c |
| ai-tutor-evaluate | 3 | 640324274f37b6c20f435d333148ff82015a5dfa538988f5472c7eb121e6f36e |
| webrtc-signal | 4 | f449be19fdc4293b67deed650a05b4362eaf4199681095684cbbf986273327cd |

The worker retry/shutdown changes are **branch-only**: the LiveKit worker was not redeployed. Likewise the frontend and atomic API-start changes from earlier batches are not yet merged into the habitual `v2` branch.

PR #2 remains draft; no v2/main merge, no production promotion, no Manuzinha change and no new subscription.

## Post-deployment data check

A successful read-only query after the three deployments confirmed unchanged counts: **6 sessions, 0 active sessions, 56 turns, 3 errors, 4 competency scores, 4 reviews, 8 usage entries and 7 reservations**. The configured total budget remains **USD 200**. No learner records were edited in this batch, no actual voice session was started and no LLM/LiveKit usage was generated by the synthetic tests.

## Remaining release gates

1. Finish original database migration recovery and reproduce the schema/configuration in an isolated environment. Edge source recovery alone is not a full backup.
2. Finish stale/cross-month reservation and durable callback reconciliation, provider/evaluator cost evidence, and the remaining authorization/legacy-path retirement checks.
3. Configure and pass real authenticated browser acceptance, deploy the tested worker to an approved test environment, and validate a real voice session before merging the corrected V2.
4. Continue Professor UX/naturalness improvements and the three complete Golden Lessons. A green infrastructure test does not prove pedagogical quality.

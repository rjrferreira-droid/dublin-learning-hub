# Core consolidation — batch 5, 13 September 2026

## Scope and release boundary

This batch advances the actual browser experience: account/profile synchronization, private-state reset across logins, recoverable profile errors and cancellable Professor connection attempts. It is not a claim that the entire project, backend authorization or teaching quality is finished.

Verified code head: `c7b215967e55ab16e14d6e11adbd52b795dfcccf`. The earlier successful materialization commit was `36b84138902cb511c95448a1e6c4616473484cd8`.

Everything in batch 5 is committed to the repair branch/draft PR #2 only. No V2/main merge, Supabase change, database migration, LiveKit worker deployment, live learner session or paid voice/LLM call was performed. The previously blocked historical SQL archival was not retried or repackaged. No budget/subscription, Professor persona/voice/model or Manuzinha-source change.

## Implemented

AuthGate now owns a profile bound to its actual authenticated user ID. App receives that identity through context rather than racing a second lookup. Private UI remounts when the authenticated user changes. A delayed profile cannot immediately expose the default Rafael workspace. Stale initial auth reads and stale profile/memory responses cannot overwrite a newer account state.

A failed profile query presents retry/logout instead of a missing-profile setup form. The existing genuinely missing-profile onboarding path remains separate. All four learning-memory reads explicitly filter user_id in addition to RLS and verify the account before and after loading. This is defense in depth, not a replacement for server-side authorization.

The old timer that clicked hidden profile controls has been removed. **The selector was already hidden by auth.css and remains hidden.** Normal users were not demonstrated to have a visible account-switch bypass, and no real data leak was demonstrated. Two defensive tests deliberately trigger its legacy hidden event handler programmatically and verify that mismatched display state hides private evidence and disables personalized audio/Professor actions. Ordinary account changes still use signout/signin.

The candidate token API checks an explicitly requested learner against its server-read profile before reserving budget or dispatching the agent. Older clients that omit the optional field remain compatible; all existing server account/course checks remain necessary.

Professor connection attempts carry an AbortSignal and expected auth-user ID, check cancellation around asynchronous stages, and close the room on error/cancellation. The panel includes Cancel connection and aborts pending attempts on unmount/signout. The iOS audio-unlock gesture is retained. **Browser cancellation does not prove that an already-dispatched server agent incurred no cost; it never releases a reservation.** Successful live media cleanup after an actual voice handshake still requires real voice acceptance.

## Verification actually completed

- **34771276023, Account identity and browser integrity: SUCCESS.** The materialized source was committed only after tests passed.
- **34771445821, final read-only Account identity and browser integrity: SUCCESS.** It ran the committed source without editing it and verified an unchanged working tree.
- **34771448334, Learning Hub V2 CI on the PR targeting v2: SUCCESS for build-and-test and professor-agent-typecheck.** This independently exercised GitHub's synthetic merge of the repair head into the unchanged V2 base.

The final PR job log records **76 Node contract tests passed, zero failed/skipped**, plus **36 Playwright tests passed**. The 36 comprise **24 existing unit/regression cases and 12 browser cases** (10 new account/connection scenarios and 2 existing public entry/Manuzinha cases). Do not report all 36 as real-browser interactions or add the repeated dedicated-run counts as new unique tests.

The browser cases use actual Chromium/application components but fictional Auth/REST responses. External HTTP/WebSocket providers are blocked, and getUserMedia is replaced by a test counter/failure. They check delayed Viviane profile, 503 profile/history failure handling, programmatic hidden-selector defenses, signout/signin cache isolation, three-course navigation, pending-connection cancellation, signout while connecting, and Manuzinha isolation. No real Supabase user or learner record is used.

The initial attempt had 8 browser passes and 4 harness failures. Two tried an ordinary click on the already-hidden selector; those were correctly relabeled and exercised as programmatic defensive cases without unhiding it. Two expected an error within 5 seconds while the installed SDK performed documented bounded transient-503 retries. The tests retain the same 503 conditions and allow the retry window; final logs show about 7.7–7.8 seconds to the recoverable error state. No failing product assertion or SDK retry was disabled to obtain green results.

## CI accuracy improvements

The ordinary CI now triggers on PRs targeting `v2` as well as `main`, uses locked dependencies, runs pure Node contracts separately from Playwright *.spec.ts files, and explicitly identifies its simulated scope.

A separate manually requested live login/navigation job requires a dedicated Finance test account. It accepts either E2E_EMAIL/E2E_PASSWORD or LH_TEST_EMAIL/LH_TEST_PASSWORD and rejects contradictory configuration. When E2E_REQUIRE_AUTH=1 is set, missing credentials cause failure instead of a silent skip. Paid generation paths are blocked and tracing is disabled in that gate.

**That live job was NOT requested or executed in this batch; GitHub records it as skipped by its manual-dispatch condition.** It has not been made a required branch-protection check. Its green siblings do not prove real credentials, RLS, real voice or production readiness. Previously stale smoke expectations about visible profile switching and a nonexistent English lesson were aligned with the inspected UI, but their real-backend execution remains pending.

The account-specific workflow is now read-only; its old one-time patch script is retained only as a no-write boundary assertion entrypoint. It no longer pushes generated repairs during ordinary verification.

## Still open

Full historical database reconstruction through an approved path; remaining backend authorization/legacy paid paths; evidence-based resolution of the old unknown hold; crash-durable callback recovery/provider reconciliation; real authenticated acceptance and approved worker/voice acceptance; branch protection and integration of the corrected frontend/API into V2. The three complete Golden Lessons and Professor naturalness/interface work remain priorities, not validated outcomes of these infrastructure tests.

No new live-database count check was made in this UI-only batch. Earlier recorded historical counts must remain identified with their prior verification, not re-presented as newly queried.

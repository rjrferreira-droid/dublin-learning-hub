# Durable dispatch candidate — 15 September 2026

Continues green `ddc84a34a28f3396e48029d22752de09ac64d831`: full CI 35020832479 and disposable platform CI 35020832485. No live handler, worker, connected database or published lesson changes here.

The admission adapter captures immutable private envelope bytes. Public JSON excludes authored context and callback credentials. The separate unmounted dispatch adapter binds the exact acknowledgement, callback hash and envelope hash to a service-only SQL claim. Only the first committed claim can return a positive acknowledgement; overlapping callers and repeated claim IDs cannot obtain another one.

The transaction locks Professor settings, global settings, reference, session and reservation in that order, then revalidates assigned profile and published course/module/lesson identity. It moves the reservation to unresolved before potential submission. Failure rolls back both mutations. Expiry and month boundaries never reset the claim or release its obligation.

This is at-most-once submission by a cooperating caller, not exactly-once provider delivery. Losing a claim response can produce zero submissions and a retained reservation. Provider failure or a lost receipt also stays uncertain: no automatic retry, reclaim or invented zero-cost settlement. All current submission callbacks are fictional; there is no installed LiveKit SDK dispatch implementation.

A service-only receipt records an observed provider ID, idempotently for the same ID and rejecting conflicts. This private receipt is authoritative for observation; the public session dispatch ID alone cannot establish it. The new foundation denies direct learner session writes. An observed ID is not completion, model usage, invoice or learning evidence. Late observation after reference expiry does not settle the reservation.

Authenticated read-only observation requires the reference owner and bound request. It exposes only state, session ID, providerAdmission:false and retryAllowed:false. Even no_admission_observed is a point-in-time observation, never retry authorization. Active browser/API paths do not use this candidate yet.

Validation: 477 Node contracts passed locally, including 11 new dispatch cases; strict candidate TypeScript and Python/JavaScript syntax checks passed. Matching feature-head full CI and disposable Supabase CI provide authoritative remote results. The platform gate exercises real lock contention, rollback, stale identity, role restrictions, cross-month holds, conflicting receipts, account isolation and a lost response after actual claim commit. Fake IDs use fixture_; cleanup is restricted to fictional validation rows, restores budgets to zero and requires no remaining sessions, holds, usage or Audio attempts before browser tests.

Boundaries: PR #3 DRAFT, frozen base, P1 unpublished in connected Supabase, no main/V2 promotion, no paid calls, LiveKit nb67ioJmoKBN unchanged. Hosted authenticated Preview acceptance, mounting reviewed candidates against a separately approved isolated backend, and real voice/listening evidence remain outstanding.

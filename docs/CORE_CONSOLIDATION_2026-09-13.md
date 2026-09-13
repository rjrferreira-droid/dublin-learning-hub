# Core consolidation — 13 September 2026

Base: v2 commit 5c98fecdc77728a93a563aa949ef8a57bc080613. Work is isolated in fix/core-consolidation-2026-09-13. No production promotion.

## Implemented first batch
- Private recovery snapshot in the existing V2 database: 90 rows across 11 tables, existing SQL function definitions, 18 migration records and public RLS policies. This is an internal recovery snapshot, not an offsite database backup. Never export learner snapshots to this public repository.
- Explicit diagnostic_confidence versus nullable mastery_confidence. Historical values are preserved; no invented mastery percentages.
- Atomic service-only session completion, session-scoped callback authentication, bounded callback lifetime, idempotent replay receipts and conflicting replay rejection.
- Turn persistence without delete/reinsert; preserve dispatch identifiers.
- Validation sessions cannot write learner errors, competencies or spaced reviews.
- No pronunciation scores or diagnoses from transcript-only evaluation.
- Scheduled reviews are not immediately marked due; avoid another open review of the same lesson/stage.
- Private trace receipt for completion.
- Frontend changes explicitly carry diagnostic/mastery fields and stop automatic request loops on panel failures.
- Local retrieval helper no longer increases mastery after a failed answer; mastered items return on their scheduled maintenance date.

## Evidence
11 callback-contract tests pass locally without an API call. Database transaction tests check validation isolation, idempotency, confidence semantics, preservation of dispatch id, invalid callback denial, conflicting replay denial, and RPC access restrictions. All synthetic learner writes are rolled back.

## Explicitly not complete
Live authenticated browser acceptance, live voice end-to-end, full runtime-to-Git migration/function recovery, atomic reservation plus session creation, usage-price reconciliation, callback recovery queue, full evaluator consolidation, branch-protection enforcement, course-specific evidence calibration, and the three complete Golden Lessons remain tracked work. Do not label the whole project fixed because this first batch passes.

No new subscription, paid LLM test, raw voice recording, Spanish/ACCA expansion or Manuzinha change is included.

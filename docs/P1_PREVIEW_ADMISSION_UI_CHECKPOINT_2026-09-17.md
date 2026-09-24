# P1 Preview protected-admission UI checkpoint — 17 September 2026

## Prepared path

The feature Preview now has an explicit diagnostic path from a reviewed P1 catalog selection to the protected Professor admission adapter:

1. The signed-in learner requests a read-only readiness check.
2. The server returns the exact lesson, module, course, slug, content version, requested track, study track and sequence.
3. The client rejects missing, extra or mismatched identity fields.
4. Only `?previewCheck=1` on the Professor tab reveals the diagnostic start control.
5. One explicit click sends one reference preflight and, only after saving its recovery receipt, one protected start request.

The diagnostic does not mount or call LiveKit, Premium Audio, dispatch, the evaluator, a model, voice or TTS. Local drafts and answers are absent from readiness, preflight, start and recovery payloads. Account, lesson or identity changes dispose the active attempt. There is no automatic retry.

Receipts are kept per account and per tab. A receipt is removed only after an exact server response confirms that no reservation can exist. Admitted or uncertain attempts remain available for read-only recovery.

## Connected Preview remains closed

This checkpoint does not activate admission. `PROFESSOR_ADMISSION_STAGE` remains unset, the new reference-bound start remains denied to API roles, P1 lessons remain unpublished, and provider admission remains absent. The query parameter is only a presentation switch; the server branch check, stage, Auth and database ACL remain authoritative.

Before any real activation, a positive validation admission needs an explicit completion/release lifecycle because it can create a real session and budget reservation without a provider callback. Persisted preflights also need an operational retention/cleanup decision. These are deliberate blockers, not claims of live readiness.

## Verification

- 627/627 Node contract tests passed.
- Focused readiness, admission and recovery tests passed.
- Application build, TypeScript checks and `git diff --check` passed.
- A synthetic Playwright journey covers the exact readiness identity, one preflight/start pair, deterministic budget denial, terminal button state, absent drafts, absent LiveKit/Audio UI and zero unexpected client traffic. It is left for CI because the local runner does not include Chromium.
- No paid call, worker deployment, Supabase write, lesson publication or production promotion was performed.

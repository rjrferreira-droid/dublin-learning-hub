# Learning Hub continuation checkpoint — 14 September 2026

## Current state

Work remains on draft PR #3 (`feat/professor-experience-2026-09-13` → frozen `fix/core-consolidation-2026-09-13`). Normal V2/main, Manuzinha standalone and the frozen voice-validation baseline are not promoted by this branch.

The reviewed evaluator-only LiveKit update previously authorized by Rafael remains the live worker version `nb67ioJmoKBN`. Later worker refinements in this branch are candidate-only unless separately reviewed and published.

## Curriculum expansion

The feature candidate now has a read-only dynamic catalog with Golden-Lesson fallback and an allowlist for reviewed runtime content. Three complete P1 sequence-2 drafts and three sequence-3 drafts exist for Finance, Payroll and English. The P1 sequence-2 drafts have lazy runtime written modules keyed by stable slug; future database UUIDs are preserved rather than hardcoded.

Read-only Supabase inspection on 14 September confirmed the current target modules and free sequence-2/slug slots. No P1 row has been inserted or published.

## P1 interactive gates verified offline

Run `34855724352` completed successfully before the subsequent documentation-only checkpoint updates. The following have executable fictional-data coverage without provider calls:

- exact published P1 lesson identity + reviewed slug + authenticated track before accepting a teacher/evaluator reference;
- English P1 cannot silently resolve to the current English Golden Lesson identity;
- local drafts, checkpoint answers and hint state are excluded from the server-owned reference envelope;
- the existing `start_professor_session_atomic` contract is exercised only after the exact reference gate; budget denial stops before any provider-like envelope;
- Premium Audio P1 uses exact lesson ID/slug/track/content version, versioned cache identity, global/premium budget including protected Professor exposure, and `claim-before-provider` ordering.

These components remain under `quality/candidates/` or other explicitly undeployed candidate source. They are not imported by the live token API. P1 Audio/Professor remain blocked in the feature UI.

## Publication boundary

Offline success is not publication authorization. Before any P1 becomes `is_published=true`, the production server resolver/provider gate still needs to be integrated and tested; relevant Supabase budget/dedup/reconciliation dependencies need reviewed deployment; the exact generated lesson ID must be rechecked after an initial unpublished insert; and browser acceptance must confirm that the same identity is opened end to end.

Any Supabase write/deploy, another LiveKit publication, meaningful paid acceptance, production/V2 cutover or credential-requiring action remains a separate explicit decision. Historical SQL-export security blocks are not to be bypassed.

## Working preference

Continue reversible, in-scope development and fictional/read-only testing without routine micro-approval. Keep user-facing summaries short. Do not claim real voice quality, semantic evaluator fairness, provider invoice accuracy or deployed P1 interactivity until those are directly evidenced.

## Subsequent Work continuation: P1 Preview runtime

The earlier statement that P1 handoff/context is not imported by the token API is now superseded by `docs/P1_PREVIEW_RUNTIME_2026-09-14.md`. Exact authenticated P1 resolution is integrated in the feature Preview handler, behind Preview + exact-branch checks. The same authored context was exercised through the handler and both the candidate and exact published evaluator sources, using fictional providers only. Client identity acknowledgement now gates remote-room/microphone access.

Premium Audio's shared P1 gate is integrated into its **undeployed** Edge source with a default-closed isolated stage. The UI still blocks P1 interactive providers; the catalog/browser tests do not insert any real lessons. Before paid activation, resolve atomic cross-lesson Audio budget admission and uncertain-generation recovery as well as the existing publication/deployment gates. Do not treat per-lesson dedup as an atomic global spend cap.

Use the current feature commit's CI run for final browser/build evidence; the linked runtime document distinguishes local results from remote CI. The LiveKit worker remains `nb67ioJmoKBN`, with no new publication.

## Subsequent continuation: atomic Audio and uncertain attempts

The prior cross-lesson budget gap now has a tested SQL candidate, shared Edge orchestration and disposable PostgreSQL CI; see docs/PREMIUM_AUDIO_ATOMIC_CANDIDATE_2026-09-14.md. This supersedes the old isolated-stage value: the undeployed atomic stage is isolated-preview-atomic-v2. Do not set it against an unreviewed backend. Submitted/uncertain attempts retain their obligations across expiry and month boundaries; no automatic paid retry or invented receipt is allowed. Connected deployment/inventory review, reconciliation evidence and authenticated Preview acceptance remain outstanding.

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

## Subsequent continuation: connected inventory and installation review

Read-only metadata confirmed only main and v2-development exist; neither is an approved target. V2 has the exact legacy reserve_professor_budget(text) entry point that blocks the atomic candidate, and lacks Audio receipt metadata columns. See docs/PREVIEW_BACKEND_INSTALL_REVIEW_2026-09-14.md. The offline package adds transaction-wrapped prerequisites, hashes and nondestructive admission stop, tested exclusively in disposable PostgreSQL. A new isolated target, reviewed baseline/legacy disposition and installation approval remain required; do not treat the package as executable authorization.

## Subsequent continuation: new Preview foundation and private Audio

The earlier missing-bootstrap gap now has a deliberately new minimal foundation under quality/preview-backend/foundation.sql and a source-hashed package builder. It is not a historical restore. The initial foundation PostgreSQL CI passed at a3d1c12b86bd8963a24a34e960b2b7d4d259df86; the initial full workflow correctly rejected modifying frozen AuthGate. That file is restored, and its proposed improvement is retained only as quality/candidates/auth-server-assignment.patch. Do not weaken the identity freeze.

The new database requires server-assigned profiles and zero budgets, with publication gates/RLS and no user/content seeds. Follow-up adds private Storage configuration and atomic-stage signed URLs with client expiry handling. See docs/PREVIEW_FOUNDATION_2026-09-14.md and the current head's foundation/full workflows for authoritative evidence. No connected installation, P1 publication or paid call is authorized by these candidates.

## Subsequent continuation: third lessons as written runtime candidates

Reused the existing full sequence 3 drafts for leases, payroll pay bases and English variances, with lazy renderer adapters and exact per-track slug validation. The catalog supports these authored lessons when matching published rows exist; no rows were written. Professor/Audio/evaluator gates were not expanded. See docs/SEQUENCE3_WRITTEN_RUNTIME_2026-09-14.md. Use the final feature head's CI for the expanded desktop/mobile matrix.

## Subsequent continuation: fourth written foundations

Authored sequence 4 for all three tracks with original cases, practice, fixed checkpoints, Portuguese support and offline Professor guides. Exact identity mapping is lazy and written-only; no interactive provider registry was expanded. See docs/SEQUENCE4_WRITTEN_RUNTIME_2026-09-14.md and the final matching PR CI for evidence. Finance separates movement from balance and collection hypothesis from evidence; Payroll separates non-cash value from bank pay without invented rates; English preserves response deadlines and unconfirmed approval. Sequences 5–8 remain safe curriculum work and do not require paid infrastructure approval.

## Subsequent continuation: remaining core written roadmap and Professor references

Completed written foundations for sequences 5–8 across Finance, Payroll and English, reusing sequences 1–4. English 8 is written listening preparation with audio pending, explicitly not an acoustic/listening assessment. All 24 roadmap positions now have scoped written material/preparation in source; this is not full course acceptance or publication.

The dynamic reader adds exact lazy identities for twelve new modules. Offline-only Professor references now validate assigned profile, complete published ancestry, exact slug/sequence/UUID/version, content-size limits and source hashes, and exclude extra browser/local-evidence fields. No live handler imports the new candidate and no provider admission was expanded. See docs/CORE_WRITTEN_FOUNDATIONS_2026-09-14.md and the matching PR CI for results. No Supabase/worker change or paid call occurred. Remaining interactive acceptance and real listening/Irish audio are separate gaps, not proof that written learning is complete end to end.

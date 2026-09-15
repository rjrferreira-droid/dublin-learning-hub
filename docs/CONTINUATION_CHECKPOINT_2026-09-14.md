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

## Subsequent continuation: actual local platform acceptance

Full CI 34881628278 passed at 4fef519e38ef75dad9695431d6231d16931e41d6: 409 Node contracts, 45 handler integrations, nine exact published-evaluator-source tests, 147 browser cases and three production-loading checks, plus builds and frozen-source boundaries.

Added a disposable real Supabase CLI platform gate for Auth, PostgREST/RLS, the exact P1 server resolver, zero-budget atomic denial and private signed Storage. This removes the need for hosted infrastructure merely to test platform behavior. It uses only fictional local accounts/content and dummy bytes, never historical SQL, connected projects or paid providers. See docs/LOCAL_PLATFORM_ACCEPTANCE_2026-09-14.md and the corresponding workflow for the actual verdict; local platform success does not establish hosted Preview or natural voice acceptance.

## Subsequent continuation: authenticated written Professor references

At 96f4a1e72684e58ffb670a26fe9ad008afbcb554, real disposable platform CI 34882744140 and full CI 34882744038 both passed. The feature-only Vercel deployment dpl_BDZATzv8xfphNMWWAGcfPCBTdrW6 was READY at that exact commit.

New work completes server reference preparation for lessons 3–8 using authenticated profile/ancestry reads, bounded versioned context and the existing evaluator input shape. Six earlier teaching guides gained explicit coaching branches. Adversarial fictional evaluator outputs cannot use the worked reference answer as learner evidence. Disposable platform coverage expands to all 24 authorized adult-account/future-lesson combinations, publication/active-state changes and version changes. See docs/WRITTEN_PROFESSOR_PREVIEW_2026-09-14.md and the matching full/platform CI runs. This resolver remains unmounted: no live admission, connected curriculum, Auth freeze, worker or paid provider changed. A resolved snapshot is not permission to start a future session; atomic version binding still needs a separate implementation before activation.

Follow-up prepares authenticated Audio overviews for those 18 lessons, retaining full Portuguese-support or English teaching paragraphs, explicit overview/listening boundaries, script hashes and versioned source fingerprints. The existing shared attempt orchestrator is exercised for all 24 authorized account/lesson combinations against the real disposable zero-budget DB; direct learner calls to its service-only RPC must fail. Provider callbacks deliberately fail if reached. This source preparation neither admits generation nor proves rendered-cache compatibility or voice quality. Consult the final matching CI, not an earlier head, for these added checks.

Further acceptance connects the production-built UI to that same local stack. Desktop/mobile browser scenarios perform real login/logout, verify catalog isolation, open the authored sequence-3–8 lessons and switch adult accounts to check that local English drafts do not cross accounts. All data responses are real, while nonlocal/provider routes and client data writes are blocked. See docs/LOCAL_PLATFORM_ACCEPTANCE_2026-09-14.md and the latest local-platform workflow. No frozen AuthGate change or connected backend configuration is required for this assigned-account test.

## Subsequent continuation: admission-time written reference binding

Added an unmounted service-minted, expiring reference ticket for lessons 3–8. Descriptor v3 includes full course/module ancestry. The authenticated candidate start revalidates that exact published identity under row locks and binds the ticket to the existing atomic session/reservation in one transaction. The candidate is installed separately only in disposable CI, not added to the connected installation package. Existing live/P1 startup and provider registries remain unchanged. See docs/WRITTEN_REFERENCE_BINDING_2026-09-14.md and the matching feature-head workflows for evidence and the remaining client-acknowledgement/dispatch boundary. Local 449 Node contracts passed; real platform/concurrency results must come from CI. No user action is required to complete those tests.

Initial binding passed at 6f06c9163a26a8334dc6ac112885ff3f8ad604ca: full CI 34890135319 and actual local-platform CI 34890135394, including nine integrity/concurrency scenarios and both real browser widths. The follow-up extends the same ticket/admission candidate to P1 by preserving the exact existing server-authored teacher/evaluator context under a separate versioned descriptor. Four P1 account/reference combinations add zero-budget, other-account and changed-version checks; SQL tests bind P1 through the same atomic path and reject descriptor-family substitution. Local contracts rise to 453. This is still unmounted and not connected publication; use the follow-up head's CI for the final verdict.

## 15 September continuation: admission acknowledgement

P1 binding finished green at f61a93c07caf3b3c36182631883dae296683a5b9: full CI 34890870937 and platform CI 34890871249. The next unmounted adapter connects Auth/reference/mint/bound-start, captures an immutable server request, produces an exact public acknowledgement and keeps callback/context out of ordinary JSON serialization. Browser-safe preflight and post-admission checks reject account/request/identity/reference drift. Lost or invalid acknowledgement preserves the possibility of an existing reservation; no automatic retry, release or provider follows. See docs/PROFESSOR_ADMISSION_CONFIRMATION_2026-09-15.md and the matching CI for real HTTP plus existing concurrency/browser results. Durable dispatch and active endpoint mounting remain separate work; all connected deployment/publication boundaries remain unchanged.


## Subsequent continuation: durable dispatch fence and read-only observation

Previous green head ddc84a34a28f3396e48029d22752de09ac64d831 passed full CI 35020832479 and disposable platform CI 35020832485. Added an unmounted, service-only durable one-shot dispatch candidate with immutable private envelopes, transactional unresolved holds, exact identity revalidation and owner-scoped observation. Lost acknowledgements cannot trigger another provider submission or release budget. Provider IDs are observations, never completion/cost/evidence. See docs/PROFESSOR_DISPATCH_FENCE_2026-09-15.md and matching feature-head CI. No active endpoint, connected installation, published lesson or worker was changed.


## Subsequent continuation: scoped read-only Professor recovery

The durable dispatch checkpoint f21db30212aec259c0fb47129d552dffb0a932a1 passed full CI 35028006986 and disposable platform CI 35028006918. Added an unmounted browser-safe recovery controller with exact captured receipt/epoch, Auth verification before/after observation, cancellation/disposal and stale-response suppression. Four strictly validated observation states never authorize another session or infer learning/cost completion. See docs/PROFESSOR_RECOVERY_2026-09-15.md and the matching feature-head CI for Node and actual Auth/PostgREST evidence. No SQL, active route, connected backend or worker change.


## Subsequent continuation: immutable worker metadata through dispatch

Recovery checkpoint 39672a9981f6cf869fe0e49eca979a127c430279 passed full CI 35028919463 and platform CI 35028919460. Added a strictly loopback-only worker-job assembler, binding complete authored context, actual reservation amount, session and callback destination into the exact durable dispatch payload. Tests use pure functions extracted from the published worker and feed the assembled metadata to the published evaluator; actual Auth/PostgREST admission/claim/observation still uses a fake submission. See docs/PROFESSOR_WORKER_WIRING_2026-09-15.md and matching CI. No worker deployment, connected write or active endpoint mounting.


Extended the same local-platform gate with actual desktop/mobile browser recovery against disposable Auth/PostgREST. A CI-only browser bundle and server-minted public preflight fixtures verify owner reads, cross-account denial, late-response discard and logout, with all provider/data-write routes blocked. Normal application/Vercel builds do not include this harness. Use the final matching full/platform CI for the verdict.


## Subsequent continuation: browser-to-HTTP-to-atomic-start rehearsal

Worker/browser checkpoint 4fb7b5f230957b42f7eb5da5bdb163ed8227675a passed full CI 35031765113 and platform CI 35031765098. Added a loopback-only HTTP rehearsal with actual bearer Auth, strict preflight/start bodies, server-owned reference minting, owner-bound single-use preparation and bounded ephemeral retention. Desktop/mobile tests traverse all 28 authorized course/sequence combinations per width to real zero-budget denial, plus ownership/replay/transport failures. A post-browser audit requires no sessions, holds or usage and budgets still zero. See docs/PROFESSOR_LOCAL_ROUTES_2026-09-15.md and matching CI. The rehearsal map is explicitly not a hosted durable store; no active API, connected write or provider call.

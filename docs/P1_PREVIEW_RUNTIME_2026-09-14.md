# P1 Preview runtime integration — 14 September 2026

## Scope and baseline

Continuation from PR #3 head `52e6a708058382f7393430a7aeaaa09ed933a288`, without redoing the completed offline curriculum work. The frozen base remains `3d292fe7f913135fd4b461487cc5dffde74bc7e1`. Rafael explicitly requested reversible integration/testing in the feature Preview, without Supabase writes, worker deployment, paid provider testing or production promotion.

## Implemented

- The existing token handler now routes non-Golden lesson IDs through an exact authenticated server lookup of lesson, published module and active course. Only `VERCEL_ENV=preview` plus the exact feature branch can resolve P1. Unknown IDs cannot fall through to the English Golden-Lesson persistence resolver. Browser environment fields are not trusted.
- The previously verified pure P1 context/handoff gates now live under `server/`, with compatibility exports for existing offline tests. Matching ID, reviewed slug, publication, track and profile are checked before the existing atomic Professor startup RPC. Local drafts, answers and hints do not enter the metadata. Existing Golden workshop contexts and budget/dispatch logic remain covered by executable regressions.
- The browser verifies the returned lesson, course/profile, mode and reference identity before connecting a remote room or enabling the microphone. P1 additionally requires a reviewed server reference with the correct slug and hash shape. This does not undo a server dispatch or prove that it had no cost.
- The **undeployed** Premium Audio Edge handler now consumes the same pure P1 gate as its offline tests. It validates exact identity/publication through the course/module chain, versioned cache, global/premium budgets and protected Professor exposure before claim and TTS. It rechecks source identity/version after the claim. English P1 accepts either supported adult profile and uses English narration instructions. Unknown non-Golden/non-P1 lessons fail closed.
- P1 Audio defaults closed unless a separately deployed isolated backend explicitly enables its stage. No environment variable has been changed here. The UI continues to block P1 Audio and Professor mounting; fake published rows in browser tests cannot start a provider. Existing written self-study still uses the dynamic catalog and stable authored slug.

## Verification boundary

Local production build/typecheck, 352 Node contracts, handler/evaluator/Edge/client mocked integrations, and the P1 suite against the exact published evaluator source passed during development. The latter source is pinned to `07d770b53a4f3d6b77c8316541ea8dff6dcf7faf`, the source recorded for LiveKit version `nb67ioJmoKBN`.

The updated existing CI also runs six new desktop/mobile P1 catalog journeys, the complete previous browser regressions, production loading checks and source-protection checks. Its run on the resulting commit is authoritative for remote browser acceptance. Local Chromium download failed with a truncated archive; no local browser pass is claimed. Browser fixtures, auth, data, media, dispatch and provider results are all fictional. These tests do not establish real teaching quality, semantic evaluation fairness, pronunciation, acoustic fluency or provider billing accuracy.

The CI exception is limited to the changed token handler, three new P1 server modules and the new shared Audio gate. Other server files, authentication, Manuzinha, SQL migrations and worker deployment workflow boundaries remain protected. No worker source was modified in this tranche.

## Remaining activation gates

1. A separately reviewed isolated Supabase deployment/publication plan; no P1 curriculum row or function has been written or deployed by this work.
2. Atomic Premium Audio budget admission across **different** lessons, coordinated with Professor reservations. Existing per-lesson generation claims only deduplicate a lesson; read-then-check budget snapshots plus a claim do not prove a concurrency-safe global cap. Also review provider-uncertain failures and claim lease expiry before activating paid generation. Do not represent these issues as solved by the passing fictional ordered-call tests.
3. Revalidate generated lesson UUIDs and publication states, then explicitly enable the UI/provider path only after backend dependencies and recovery are ready. Keep all P1 rows unpublished until that separate decision.
4. Real learner acceptance for voice, timing and evaluator quality under an explicitly agreed paid-test boundary.

PR #3 stays DRAFT. V2/main, the frozen branch, Manuzinha and LiveKit `nb67ioJmoKBN` remain unchanged. No personal credentials, historical SQL export, paid voice/model/TTS invocation or Supabase write/deploy was used.

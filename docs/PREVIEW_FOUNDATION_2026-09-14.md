# New minimal Preview foundation

Candidate only, authored from the current application's required data contracts. This is not a restoration or assertion of equivalence with the historical database. No connected target, account or curriculum was changed.

The new quality/preview-backend/foundation.sql replaces the previous missing bootstrap dependency for the core Preview slice. It requires an existing Supabase Auth platform, creates no fake auth.uid implementation or users, and refuses a target that already has profiles. All curriculum starts inactive/unpublished; all AI caps start at zero. No legacy reserve_professor_budget entry point is installed.

Profiles reference Auth user IDs and are assigned only by service operations. All application tables have RLS; client writes are denied. Publication checks follow course → module → lesson. Technical courses are profile-specific and English is shared only with assigned adult profiles. Learners can read their own stored evidence but cannot create it. Scores remain null until assessed; no learner/evidence rows are seeded. Session reads expose only the existing UI's required columns; callback tokens and raw provider accounting are server-only.

The package builder explicitly selects completion, serialization, usage settlement, atomic start and reservation lifecycle source, then the reviewed Audio additions. It excludes private recovery snapshots and legacy budget-entry migrations. The entire fresh install uses one transaction and source hashes. Neither package generation nor passing tests authorizes installation.

The frozen AuthGate still contains legacy client profile-creation behavior. The new baseline rejects those writes and requires service-assigned profiles; unassigned accounts fail closed. An improvement that removes metadata-driven creation and adds pending-access UX is retained in quality/candidates/auth-server-assignment.patch for a separately reviewed identity-boundary change. It is not active: the initial CI correctly rejected changing the frozen AuthGate, which was restored without weakening the guard.

The foundation CI uses real PostgreSQL 17 with clearly labelled fictional Auth stand-ins, excluded from the package. It tests fresh installation, zero default budgets, profile/course/publication isolation, denied client writes and callback-secret reads, unassigned users, and no false evidence. It does not run the real Supabase Auth/Storage services or constitute hosted acceptance.

The full baseline package now includes a private lesson-audio bucket. It adds no direct learner object-write/read policies. The atomic Edge stage signs one-hour playback URLs only after exact authorization, and the client refreshes links before expiry instead of retaining them indefinitely. Signing failure after generation preserves the settled receipt and never triggers a second provider call. These are mocked Edge/Storage-contract tests, not hosted Storage acceptance.

Remaining work includes broader end-to-end fixture coverage, exact hosted configuration, target/cost approval and deployment acceptance. All paid providers and P1 interactive publication stay blocked. LiveKit remains nb67ioJmoKBN.

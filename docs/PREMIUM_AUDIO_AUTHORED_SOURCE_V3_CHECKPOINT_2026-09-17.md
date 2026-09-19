# Premium Audio authored-source v3 checkpoint — 2026-09-17

Scope: reviewable feature-branch candidate only. This checkpoint does not set
`P1_AUDIO_RUNTIME_STAGE`, grant a v3 RPC, install SQL in a connected Supabase
project, deploy an Edge Function or worker, publish a lesson, invoke a provider,
or promote anything to V2/Production.

## Immutable server-owned source

- The exact eight-field P1 lesson identity is canonicalized before narration.
- Finance and Payroll narration use the authored Portuguese support; English
  uses the authored English paragraph. Browser scripts, learner drafts, local
  answers, legacy manager commentary and technical briefs are not source inputs.
- The source fingerprint binds canonical identity, language, the exact script
  digest and the complete language-resolved render recipe. The recipe is
  `written-study-guide-v1`, revision `1`, provider `openai`, endpoint
  `https://api.openai.com/v1/audio/speech`, model `gpt-4o-mini-tts`, voice
  `marin`, MP3 response, speed `0.98` and the exact reviewed instructions for
  `en` or `pt-BR`. Only lowercase SHA-256 values are accepted.
- The immutable object address is
  `lessons/<lessonId>/commentary-v<contentVersion>-<sourceFingerprint>-r1.mp3`.
  Uploads use `upsert: false`; divergent objects or rows require reconciliation.

The authenticated Feature Preview readiness route derives and validates this
same v3 address, but remains diagnostic and default-closed: it returns no
script or media URL, performs no cache lookup, exposes no runtime source
handoff and grants neither generation nor provider admission.

## Closed v3 runtime path

The additive stage `isolated-preview-authored-v3` preserves the reviewed v2
path and stays disabled unless `P1_AUDIO_RUNTIME_STAGE` is set to that exact
value. Its candidate order is:

1. authenticated exact P1 identity and server-authored source;
2. exact settled-cache observation;
3. global, Premium Audio and protected Professor budget preflight;
4. atomic v3 reservation bound to fingerprint, revision and path;
5. provider-free re-read and exact source/orphan comparison;
6. committed one-shot submission mark;
7. provider response validation, immutable storage and strict asset insert;
8. atomic receipt/cache settlement;
9. exact post-settlement cache re-observation; only then private URL signing.

The v3 provider response is read as a bounded stream (maximum 15 MiB, matching
the reviewed `lesson-audio` bucket limit), requires
an MP3 content type, at least 4,096 bytes, a complete optional ID3 header and
two plausible MPEG frame headers. The Storage acknowledgement must include a
lowercase UUID `id`, the exact immutable `path` and the exact bucket-qualified
`fullPath`; additive SDK metadata is tolerated. Invalid or incomplete
acknowledgements cannot create the asset row, settle the attempt or sign a URL.
P1 cost estimates and reservations are canonicalized to six decimal places
before admission; both the shared runner and PostgreSQL candidate reject
non-canonical monetary inputs before any provider work.

A lost mark or settlement acknowledgement preserves an unresolved obligation
and never authorizes automatic paid retry. A cache race is re-observed and can
reuse only the complete exact settled binding. After paid work settles, any
source drift, observer uncertainty or attempt/path mismatch withholds signing
and requires reconciliation without regeneration. Expired work that never
crossed the submission fence is cancelled under the shared budget locks and
retained for audit; submitted or uncertain work is never expired automatically.

The global v3 stage may still serve an exact existing non-P1 Golden Lesson
cache privately, but a Golden cache miss is admission-closed. It does not
reopen the revoked v2 RPCs or fall through to the legacy v1 claim/provider
path. The browser service retains neither resolved URLs nor process-global
in-flight promises keyed only by `lessonId`; every call is authenticated and
revalidated by the backend. Durable server admission still deduplicates paid
generation atomically without allowing a URL promise to cross an account
change.

## Unmounted PostgreSQL candidate

`quality/candidates/premium-audio-source-binding.sql` is additive over the
installed v2 ledger and installation is transactional. Its prerequisite guard
checks the required roles and owners, the complete required-column topology,
insertability and exact PostgreSQL types/defaults, all constraints and valid
unique-index shapes, the exact v2 Audio and Professor function bodies by
`prosrc` SHA-256 plus callable metadata/ACLs, and the expected RLS, policy,
trigger and rule posture. It binds attempt, owner, exact eight-field lesson
identity, version, fingerprint, render revision, object path, asset and usage
receipt. Audio and Professor admission both account for the other's unresolved
obligations and serialize through the same Professor/global lock order.

Every v3 function and the private binding table are revoked from `PUBLIC`,
`anon`, `authenticated` and `service_role`. The disposable PostgreSQL workflow
also covers missing prerequisites, incompatible ACL posture and exact column
type drift before candidate installation. A later activation decision would
need an explicit, narrowly scoped server-role grant.

## Evidence awaiting the final exact-head round

- Production build and API typecheck: local PASS.
- Full Node regression: 722/722 local PASS, including authored source, v3
  attempts, readiness/browser-cache, profile containment and private-Storage
  contracts.
- Bundled fictional Edge runtime: 26/26 local PASS for Finance, Payroll and
  English, including the 15 MiB bound, additive-tolerant Storage
  acknowledgement, Golden/v2 preservation and post-settlement observation.
- Focused Premium Audio Playwright: 4/4 local PASS. Auth/profile Chromium
  journeys could not launch locally because this workspace lacks the matching
  browser binary; the required CI installs Chromium before running them.
- Disposable PostgreSQL proof, including profile behavior and negative
  prerequisite/type/ACL/constraint/index cases: prepared, exact-head CI pending.
- Python syntax and repository diff checks: local PASS.
- Connected Supabase writes, migrations or grants in this work: zero.
- Real provider calls, Edge/worker deploys and stage activation in this work:
zero.

## Identity and Storage containment candidates

The browser no longer chooses or creates a learner track, and browser account
registration is closed until the containment is installed. An account without
a reviewed server assignment stays on an explicit access-pending screen, and
only the assigned profile is read. The separate transactional profile candidate removes legacy Auth-trigger
self-enrolment, removes browser insert/track-update privileges, preserves only
own-profile reads and reviewed preference-column updates, and installs a
claim-aware guard against alternate security-definer writes. Its exact legacy
preflight accepts the single existing Finance profile only if Auth/profile IDs
match and the profile has never been updated; divergence aborts and no row is
repaired or deleted.

The connected `lesson-audio` bucket is currently public, empty, limited to
15 MiB, allows MPEG/WAV and has zero Storage policies. That is an activation
blocker, not an accepted runtime state. The unmounted Storage candidate uses
the supported Storage Admin API (never direct `storage` schema mutation),
validates both the requested endpoint and the effective endpoint exposed by
the constructed client before any attestation or API call, requires fresh
exact pre/post database attestations, changes only the bucket to private plus
`audio/mpeg`, and treats any lost acknowledgement as uncertain without retry
or automatic rollback.

## Remaining activation boundary

The authored v3 path remains intentionally unusable in connected Preview until
exact-head CI is green and a separate decision authorizes installation, the
activation order is strict: profile containment, private-bucket activation,
Audio SQL, reviewed v3 service-role grants, an exactly pinned Supabase SDK and
lockfile, Edge deployment/stage configuration, then real authenticated
acceptance. Browser registration may be reconsidered only afterwards, without
learner metadata or self-assignment. That boundary also preserves the existing
Professor hold and leaves all P1 lessons unpublished.

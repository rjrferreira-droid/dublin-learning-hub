# P1 Preview Audio and lifecycle checkpoint — 2026-09-17

Scope: feature Preview only. No P1 lesson publication, connected Supabase
installation, worker deployment, provider call or Production/V2 promotion is
authorized by this checkpoint.

## Mounted read-only Audio diagnostic

- `?previewCheck=1` can explicitly verify the authenticated P1 lesson identity,
  server-authored candidate source digests and expected
  `lessons/<lessonId>/commentary-v<contentVersion>.mp3` path.
- The response contains no script, media URL, cache result, budget decision,
  provider capability, learner draft or local answer.
- It explicitly reports `runtimeSourceHandoff: false`,
  `cacheLookupPerformed: false`, `generationAdmission: false` and
  `providerAdmission: false`. The existing Edge source handoff remains closed.
- The client accepts only the exact eight-field readiness identity, rechecks the
  signed-in account after the response, has a 15-second deadline and never
  retries automatically.

## Unmounted PostgreSQL candidates

`professor-validation-abandon.sql` defines an owner-only explicit close for a
validation admission that is still active, evidence-free and durably proven
unclaimed. It serializes with dispatch, invalidates the callback, abandons only
the matching reservation, deletes only its sealed preflight and has an exact
idempotent terminal receipt. A claimed or ambiguous reservation remains
unresolved. Its installer also requires the dispatch claim/receipt functions
to retain their service-only ACL. Observation labels an admission as safely
unclaimed only when the complete binding, callback, evidence, cost and dispatch
fence remain clean; any drift is reported as requiring reconciliation. The
read-only recovery controller accepts both exact terminal states without
authorizing a retry or claiming a learning result.

`professor-preflight-retention.sql` defines private, bounded maintenance for
encrypted admission ephemera. It locks references before preflights, skips
concurrent work, retains consumed fences while their unbound reference is still
valid, never age-deletes bound references and never mutates sessions,
reservations, usage or receipts. A bound preflight is eligible only when its
reservation belongs to `professor_livekit`; feature or ownership drift stops
the batch before mutation.

Both SQL files remain candidates. CI installs them only into an unlinked local
Supabase stack and exercises both lock orders. They are not migrations and were
not applied to project `aazfyosqqeujureksqjs`.

## Local evidence

- Production build and API typecheck: passed.
- Node contract/regression suite: 675/675 passed.
- Focused Audio, validation-close and retention contracts: passed.
- Python concurrency harnesses compile; transactional execution is delegated to
  the disposable Supabase workflow because Docker is unavailable locally.
- Chromium execution is delegated to CI because the local browser binary is not
  installed.

## Remaining activation boundary

The P1 Professor and Premium Audio runtime stay closed. Activation still needs
the candidates to pass exact-head disposable CI, an explicit connected
installation/deployment decision, publication of the reviewed P1 rows and a
real authenticated acceptance session. No paid call is needed for this
checkpoint.

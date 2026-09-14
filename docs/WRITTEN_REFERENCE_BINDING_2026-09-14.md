# Written reference binding candidate

This extends the unmounted lessons 3–8 reference preparation with admission-time identity binding. It changes no live handler, provider registry, connected Supabase object, worker or curriculum row. The SQL is installed **separately** after the authored foundation only in the disposable local-platform workflow; it is not included in the reviewed foundation installation package.

The reference v3 hash now includes module and course UUIDs as well as lesson UUID, slug, sequence, track, content version and authored context. A request-scoped authenticated resolver returns its verified user separately from the teacher reference. The server mint adapter passes only that identity and the authored descriptor to a service-only RPC. Browser-supplied user IDs, content, hashes, drafts or answers cannot attest a reference. The service client must not inherit a learner Authorization header.

The private ticket stores the verified identity, source hash and descriptor version for five minutes. No transcripts, local answers or callback plaintext are stored. Anonymous and authenticated roles cannot mint; application roles cannot mutate ticket contents directly. Service SELECT exists for future review, not browser access. The database verifies published identity and assigned profile; it does not independently recreate the compiled authored text or prove its pedagogical quality.

The new authenticated start RPC requires the owning user and an unexpired ticket. It preserves the existing Professor → global-budget row lock order shared with Audio. It then locks the ticket and profile/course/module/lesson rows, rechecks publication, ancestry and exact version, and invokes the existing atomic startup implementation. A successful session, reservation and ticket binding commit together. A failed binding rolls them all back. No budget calculation is copied. Expiry is checked again after identity lock waits. Repeated requests are denied, including a new ticket attempting to attach to an already-started request. A successful admission response is not a provider dispatch instruction.

`FOR SHARE` is deliberate: unlike `FOR KEY SHARE`, it conflicts with ordinary publication/content-version updates. Under Read Committed, a row-locking statement waiting for a writer sees its committed updated row. The tests exercise actual lock waits, not timed launch guesses. See [PostgreSQL row locks](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS) and [Read Committed](https://www.postgresql.org/docs/17/transaction-iso.html#XACT-READ-COMMITTED). Locks last until the transaction ends. Revalidation prevents admission against an obsolete snapshot; it does **not** cancel an already committed session when a later publication change occurs.

## Verification scope

- Node contracts: request authorization precedes service mint; complete ancestry affects the hash; forged browser attestations and invalid service acknowledgements fail.
- Real disposable Auth/PostgREST: 24 authorized account/reference combinations minted by the server adapter, 24 zero-budget denials, service-only mint and owning-user start permissions, changed version/slug/publication/course/profile rejection without any reservation.
- Real disposable SQL: binding/replay, conflicting request/callback/replacement ticket, immutable/expired ticket, ancestry move, binding-write rollback, writer-before-start stale rejection, admission-before-publication locking, duplicate concurrent requests, and Professor/Audio competition under the shared cap in both launch orders.

Positive admission tests use temporary **fictional local** budget numbers and never invoke providers. Only their never-dispatched validation sessions/reservations are removed; all budgets return to zero before the existing real browser acceptance. No usage receipts or learning evidence are invented. The workflow discards its entire stack afterward and never uploads its local credentials.

Consult the matching feature-head full and local-platform CI runs for actual results; the scenario list describes the tests, not an automatic passing claim. Local Node contracts passed at implementation time (449).

## Remaining activation boundary

The old startup RPC and existing P1/live routes are unchanged and do not acquire this new binding automatically. This ticket is currently for the written lessons 3–8 candidate, not a migration of Golden/P1 sessions. Before mounting any future provider path, integrate exact client acknowledgement, a one-shot dispatch/uncertain-start protocol, receipt recovery and compatible worker metadata. Preserve the existing Audio submission fence. Hosted authenticated Preview acceptance and an approved isolated backend remain separate gates. No new paid environment or worker publication is needed to finish these disposable tests.

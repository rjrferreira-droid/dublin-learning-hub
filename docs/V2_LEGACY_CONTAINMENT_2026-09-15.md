# Existing V2: reversible legacy admission containment

## Applied scope

The owner's authorization to reuse V2 covers this compatible, reversible access
restriction. The change was explained before execution and applied only to
**aazfyosqqeujureksqjs** using migration
`lh_v2_contain_legacy_direct_admission`. The connected tool returned success.
Source: `quality/candidates/v2-legacy-admission-containment.sql` at
`9c447234fb589d9152ce46559b84b2b839edd0b5`.

This is the first connected change in the V2 adoption work. Earlier documents
stating that no connected write has happened describe earlier checkpoints.

The atomic statement removes direct EXECUTE grants on
`public.reserve_professor_budget(text)` from `authenticated` and `service_role`.
The observed pre-change ACL contained only those two roles and owner `postgres`,
with no grant options. Owner/ACL drift aborts before any permission change;
post-checks reject inherited remaining execution privileges. No CASCADE is used.

The routine remains in place with its original body and owner. No table row,
budget, curriculum, session, receipt, grant on atomic startup, or worker changed.
No historical SQL body/export was requested. Only the migration audit record and
these two direct execution grants changed in the connected database.

## Evidence

[Disposable PostgreSQL CI 35037095052](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35037095052)
passed at the source commit above. The populated fictional database includes an
unresolved 4 USD hold, an abandoned session and recorded usage. Tests prove:

- Real calls by anon, authenticated and service_role fail with permission denied.
- Existing row values, budgets, original legacy body and atomic routine remain
  identical, and the reservation exposure still protects the unresolved hold.
- Transaction rollback and the exact inverse grants restore prior access.
- Reapplication is harmless; unexpected inherited grants or grant options reject
  the operation without a partial ACL change.

Connected post-checks confirmed all three API roles now lack legacy EXECUTE,
authenticated retains atomic-start EXECUTE, and the legacy routine still exists.
The repeated aggregate inventory matches the earlier values: one account/profile,
three courses/modules/lessons, six sessions, eight usage records and seven
reservations; zero Audio assets/Storage objects. Six settled reservations retain
the same 0.9970616 USD recorded total. One unresolved reservation remains protected
at 4 USD. All previously inventoried RLS flags and budget settings are unchanged.
These are read-only connected checks, not paid session tests.

## Recovery scope

This narrow access-only change has a tested inverse and does not require restoring
learner data. For a separately justified rollback, the original grants were:

```sql
grant execute on function public.reserve_professor_budget(text)
 to authenticated,service_role;
```

Do not run that inverse automatically: it reopens the old direct admission path.
No full-database backup or target-specific restore point has been verified. This
access-only recovery evidence does not establish safe recovery for later schema
replacement, removal or data migration.

## Remaining boundary

This contains direct RPC use; it does not claim that owner/superuser execution or
an unknown SECURITY DEFINER wrapper cannot reach the old routine. Current source
uses atomic startup, but historic/deployed external callers are not proven absent.
Older clients calling the legacy RPC directly will now receive permission denied.

The Audio installer's `legacy_budget_entrypoint_requires_review` guard remains
unchanged and will still reject this database. The old routine was neither renamed
nor dropped to evade it. A reviewed incremental admission/Audio adaptation and
target-specific recovery evidence remain necessary for broader activation.
P1 remains unpublished. No paid provider, LiveKit deployment, new project, main
change, production promotion or data deletion occurred.


The [full application CI 35037094898](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35037094898) also passed at 9c447234fb589d9152ce46559b84b2b839edd0b5, including the existing contracts, evaluator integrations, UI regressions, builds and frozen-source checks. The follow-up commit changes checkpoint documentation only.

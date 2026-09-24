# Incremental V2 shared-budget adaptation

The existing V2 contains both legacy reservation and atomic session startup.
Revoking direct legacy grants did not cover an owner-invoked wrapper. This package
retains both routines and adds pending Audio exposure to BOTH global-cap checks.
It also makes legacy admission reject a disabled hard-stop guard. No function is
dropped or renamed, no historic definition exported, and no learner row rewritten.

`build-v2-package.py` reuses the tested Audio attempt engine and asset prerequisites,
but selects an explicit paired V2 patch instead of the isolated installer's patch.
The isolated installer retains its original legacy-presence rejection unchanged.
The V2 alternative requires contained legacy grants, expected ownership, all-period
Professor exposure, unique update anchors and Professor-before-global lock order.
Missing/drifted dependencies roll back the entire installation transaction.
The original routine bodies are preserved except for those narrow expressions.

The package adds Audio receipt columns/indexes and the private attempt ledger.
It never installs the empty baseline, seeds curriculum, changes budgets or enables
generation: begin/submission EXECUTE is revoked from all three API roles at the end
of installation. A later reviewed activation must mount the exact server flow.
Settlement/closure remain service-only for reconciliation, and attempts are private.

The owner-confirmed V2 physical backup is 16 September 2026 01:00 UTC; see the
recovery-evidence checkpoint. It was not restored. Before installation, recheck the
exact target, existing aggregates and contained grants. Preserve the unresolved
4 USD hold. After installation, verify both routine expressions, zero Audio rows,
closed begin/submission permissions and unchanged existing aggregates.

Do not roll back to a Professor routine that omits Audio holds after any attempt
exists. Contain admissions and preserve accounting instead. The existing
stop-admissions.sql can stop provider submission while retaining obligations.

The disposable V2 workflow tests a populated baseline, transactional rollback
after legacy/atomic drift, row preservation, closed default permissions and both
Professor paths under pending Audio exposure. It then enables Audio ONLY in the
fictional fixture to rerun existing concurrency and injected-provider cases.
Use matching CI and the PR's connected verification checkpoint for actual status;
this source document alone does not claim connected installation or activation.


## Connected installation verified

Applied on 16 September 2026 to aazfyosqqeujureksqjs as migration
`lh_v2_shared_audio_budget_closed`, from source 426152ee5823dc619b4c0b5bdb2350d49613cf3d.
Migration SQL SHA-256: 08a72f42db94e7fab357fee76807ac99335b7c41efba81a48fc136d11ef1014d.
The tool returned success. Do not repeat the installer: it is deliberately not an
idempotent schema reset.

Post-install connected metadata confirms both retained Professor routines count
pending Audio, atomic startup remains callable by authenticated users, and legacy
plus Audio begin/submission are denied to anon, authenticated and service_role.
Audio attempts and pending Audio exposure are zero; Professor protected exposure
is still USD 4. Both new Audio receipt columns exist. The before/after aggregate
inventories agree on all existing counts, budgets, RLS flags, session states and
reservation totals: 1 account/profile, 3 courses/modules/lessons, 6 sessions, 8
usage records, 7 reservations, 0 assets/storage objects. Existing recorded settled
cost remains 0.9970616 USD; no pending hold was settled or released.

[Paired V2 PostgreSQL CI 35122422374](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35122422374) passed both jobs, including rollback, unchanged populated data, retained old routine under owner invocation, closed API admission and all previous shared-cap concurrency plus injected-provider scenarios. No paid provider executes in these tests.

Security advisor review reports deliberate deny-by-default RLS without policies
on internal/accounting tables, plus warnings on the two existing authenticated
SECURITY DEFINER Professor endpoints. New Audio admission has no API execute grant.
Auth also reports disabled leaked-password protection, an existing configuration
item not changed by this SQL: [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Intentional API endpoint review: [SECURITY DEFINER guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Private deny-by-default tables: [RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

This closes the backend shared-budget compatibility step, not hosted Preview
activation. Edge source is still undeployed, P1 rows remain absent/unpublished,
new reference/dispatch/persistence candidates are still unmounted, and no hosted
service test identity or full provider-free HTTP/browser acceptance is claimed.
Main, LiveKit and lesson publication remain untouched.


All five source-head workflows are green: [full app regression](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35122422423), [disposable Supabase](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35122422353), [isolated atomic Audio](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35122422350), [isolated foundation](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35122422315) and the paired V2 workflow above. The following checkpoint commit changes documentation only.

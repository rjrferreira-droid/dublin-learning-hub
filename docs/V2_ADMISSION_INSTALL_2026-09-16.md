# Closed V2 admission prerequisites

Build with `python quality/preview-backend/build-v2-admission-package.py NEW_OUTPUT_DIRECTORY`. Target is approved V2 aazfyosqqeujureksqjs only. No empty foundation or historical SQL is used. Package refuses missing atomic-start/Audio prerequisites and existing/partial new tables. It creates the reviewed reference binding plus encrypted shared preflight store, then revokes new bound-start EXECUTE from PUBLIC, anon, authenticated and service_role in the SAME transaction. It verifies effective denial before commit, including inherited role grants. Existing atomic start, budget accounting, learner data and reservations are not modified.

Generated migration SHA256: d7d05d54da757c341bf576eeffb18a29b82dd1b48bd032920295d88c5a432023.

The actual disposable platform workflow now installs this exact package, verifies effective denial and actual authenticated permission failure, then explicitly grants bound-start only in the local fixture for existing admission/dispatch/concurrency/browser acceptance. This fixture grant is NOT part of the connected package. No new provider admission is possible through the closed route after connected installation.

Pre-install read-only V2 metadata confirms required lesson/session columns. Last counts: lessons3, sessions6, reservations7; new reference/preflight tables absent. Installation and post-checks must be recorded below after matching CI succeeds. Keep PROFESSOR_ADMISSION_STAGE unset. Private Vercel configuration remains an external capability gap; the connector has no env mutation action and get_project omits env metadata. Do not infer private key configuration or request secrets in chat.

## Installed and verified

Applied `lh_v2_reference_preflights_closed` to approved V2 on 16 September from source `531d7298f683663931f6e52afffe782b8a538d42`, after all four workflows succeeded:

- [Actual platform 35150474048](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35150474048).
- [Full regression 35150473805](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35150473805).
- [Foundation 35150473810](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35150473810).
- [Atomic Audio 35150473811](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35150473811).

Post-check: new bound-start EXECUTE false for anon/authenticated/service_role; put/consume true only for service_role. Both new tables have RLS enabled and zero rows. Existing authenticated atomic-start grant unchanged. Counts before/after: profiles1/courses3/modules3/lessons3/sessions6/reservations7/usage8. Exact aggregate digests unchanged: reservations f77371a78c8ea04fe76cbbec6539267f, Professor settings c60a1de9d0a34c7b6cd8e22d09934563, global settings 308a76a2339541a547ea1131e2746920. No pending reservation was modified, including the existing USD 4 hold. No new lesson/session/reservation/provider call or worker/main promotion.

Security advisors: 11 informational RLS-without-policy tables, including the two new intentionally deny-by-default private tables; two pre-existing authenticated SECURITY DEFINER warnings and the existing disabled leaked-password protection warning remain. No permission was widened to silence advisors. References: [private RLS lint](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [authenticated definer lint](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Do not reapply the package or copy the CI-only grant into V2. Activation still requires a separate reviewed grant and runtime configuration. Keep PROFESSOR_ADMISSION_STAGE unset. Vercel environment mutation is unavailable through the current connector; the next owner-assisted check is variable NAMES/target branch only (not values), particularly SUPABASE_SERVICE_ROLE_KEY and PROFESSOR_PREFLIGHT_KEY in the feature Preview. Existing configuration is unknown, not presumed missing. No personal credentials should be provided or reused.

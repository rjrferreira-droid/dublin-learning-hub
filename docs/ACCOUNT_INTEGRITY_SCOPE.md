# Account integrity — scope of the fifth repair batch

Chromium exercises the real AuthGate, application and Professor panel with FICTIONAL Auth/REST responses. External services and microphone capture are blocked. This does not establish live Supabase credential validity, RLS or voice acceptance.

A resolved profile is bound to its auth user; account changes remount private UI. The previous timed DOM-click synchronization is removed. Profile load errors offer retry/logout rather than acting like a missing profile. App identity comes from AuthGate instead of a second independent lookup. Learning reads explicitly scope user_id as well as relying on backend RLS and verify account identity before and after retrieval.

**The legacy profile selector was already hidden by auth.css. This batch does not unhide it or claim that normal users could click it.** Two defensive browser cases deliberately activate its hidden legacy event handler through JavaScript, then verify that mismatched presentation cannot reveal current private history under that other label or enable personalized audio/Professor actions. Normal account changes still require signout/signin.

The candidate token API checks the supplied learner against its server-read account profile before reserving funds or dispatching the Professor. Old clients that omit this optional field remain compatible. UI helpers are not server authorization.

Pending voice connections are cancellable and cleaned up on unmount/account change or failed connection. Browser cancellation is NOT proof that a server dispatch consumed nothing; no reserve is automatically released. Durable backend recovery remains open.

The dedicated authenticated fixture supports E2E_EMAIL/E2E_PASSWORD and LH_TEST_EMAIL/LH_TEST_PASSWORD. E2E_REQUIRE_AUTH=1 makes absent credentials fail instead of silently skip. No personal passwords are in source. The normal PR suite remains explicitly simulated; a separate manual live login/navigation job requires the dedicated fixture and blocks paid generation endpoints. Adding that job does not mean it ran or was made a required branch-protection check.

The initial test attempt found two harness mistakes: it tried to click an already-hidden selector as though it were visible, and waited only five seconds despite the SDK's documented automatic 503 GET retries. The hidden-selector cases were labeled and executed as programmatic defensive tests; outage assertions retain the same 503 failures and permit the bounded retry interval. Neither the existing CSS restriction nor the SDK retries were disabled.

References reviewed: React preserving/resetting state (https://react.dev/learn/preserving-and-resetting-state), Playwright mocked APIs (https://playwright.dev/docs/mock), Supabase Auth state subscription (https://supabase.com/docs/reference/javascript/auth-onauthstatechange), automatic retries (https://supabase.com/changelog/45071-automatic-postgrest-retries-for-transient-errors).

No historical SQL archival retry, DB migration, runtime deployment, paid voice/LLM session, persona/model change, new subscription, production merge or Manuzinha-source change is included. See the batch status document for actual CI results.

# Account integrity — scope of the fifth repair batch

The new browser suite exercises the real AuthGate, application and Professor panel in Chromium while returning fictional Auth/REST responses. External services and microphone capture are blocked. It is NOT a substitute for a real authenticated Supabase journey or voice acceptance.

Source changes bind a resolved profile to its auth user, remount private UI across accounts, remove synthetic DOM-click profile synchronization, and distinguish profile failure from a genuinely missing profile. The App receives identity from AuthGate rather than a second asynchronous query; memory reads explicitly scope user_id in addition to backend RLS. Visual profile preview remains available but cannot start personalised audio or Professor actions under a different displayed learner.

The token request carries the displayed learner; the candidate API compares it with the server-read account profile before reserving budget or dispatching a worker. Older clients that omit the optional learner field remain compatible. A display helper or mocked test is not a backend authorization mechanism.

Pending voice connections support cancellation, account-change/unmount cleanup and failed-connect room cleanup. Cancelling a browser request does NOT prove that a server dispatch consumed nothing and does not automatically release any reservation. Durable server recovery remains separate.

The authenticated smoke fixture supports the two previously documented variable naming conventions. E2E_REQUIRE_AUTH=1 makes a missing dedicated test-account fixture an error rather than a skipped authenticated success. No real account credentials are embedded in tests or requested by this batch.

No historical migration archival retry, database migration, runtime deployment, model/persona change, new subscription, production merge, or Manuzinha-source change is included.

Primary implementation references reviewed: React preserving/resetting state (https://react.dev/learn/preserving-and-resetting-state); Playwright mocked APIs (https://playwright.dev/docs/mock); Supabase auth state subscription (https://supabase.com/docs/reference/javascript/auth-onauthstatechange).

This is a scope statement, not a successful-test report. Actual CI results must be recorded after execution.

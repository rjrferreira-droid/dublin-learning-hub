# Authenticated Preview configuration check

Owner requested verification after saving two server secrets and redeploying. The previous TypeScript correction at b8022d41df68bec30e22caefc9590719bc139c32 passed full CI 35243253342; hosted function build is clean of TS5097/TS2550. A connector-created temporary Vercel share URL, followed with a cookie-aware HTTP client, successfully reached the application (200) and both existing API method gates (405). Vercel protection remains enabled. This verifies platform access, not learner Auth or secret validity.

New POST /api/preview-configuration accepts only an empty JSON object and a learner bearer. Exact feature Preview and approved V2 URL are mandatory. Fresh getUser and own supported profile precede any service client. Only the caller's profile ID is read with the configured legacy service_role credential, after role/project claims match. Supabase verifies the actual credential on that request. The configured 32-byte preflight key performs an in-memory AES-GCM roundtrip. Any admission stage value causes refusal; no starts, RPCs, writes, budget reservations, provider requests or lesson publication are possible through this diagnostic.

Response contains booleans only, with private/no-store caching. It does not prove shared preflight persistence, lesson publication, dispatch, audio, evaluator or full session acceptance. Secret rotation/randomness cannot be certified by the local crypto roundtrip. New secret-key formats are not accepted by this legacy-specific check.

The owner opens /?previewCheck=1 after signing in normally and clicks Check configuration. It is absent from normal navigation. Browser request carries only an empty body and the current bearer; no drafts or local answers. Account changes/unmount cancel results, and the 15-second deadline permits manual retry. Upstream requests are bounded to 8 seconds. UI checks returned identity against the signed-in owner before and after the request.

13 focused backend tests and application/API build pass locally. Browser regression is included for CI. The frozen-path CI gate permits only the two exact new diagnostic files; existing database, worker, Auth and production boundaries remain enforced. Live authenticated success requires owner sign-in; no personal credentials are requested or reused.

## Owner-assisted hosted verification passed — 18 September 2026

The owner completed the guided check in their own browser and supplied a screenshot showing the diagnostic's exact success message: "Configuration verified. Signed-in access, server key and encryption passed. New session admission remains closed. No paid calls."

The guided URL was the protected feature deployment `dublin-learning-p2vs8qibm-rjrferreira-2878.vercel.app/?previewCheck=1`, which Vercel identified as READY for source `3e6ce47b307ddfb0edc1e021a351d55471fb319f`. This is owner-supplied UI evidence, not an agent-controlled authenticated browser replay or an independently captured HTTP trace. The screenshot does not include the address bar.

Under the deployed diagnostic contract, the success state verifies fresh learner authentication and an assigned profile, a real read of that caller's profile using the server credential, an in-memory AES-GCM roundtrip, and the absence of the new admission stage. The diagnostic performs no session start, reservation, database write or paid provider call. This resolves the previously pending owner-assisted configuration check; do not ask the owner to repeat it without evidence of a relevant configuration or deployment change.

Earlier screenshots from this guided session also show the signed-in dashboard, the three Golden Lesson cards, the Finance written lesson, the Professor pre-start interface and the Audio unloaded state. They verify those visible screens only. The Professor READY label is not evidence of a successful voice connection, and Load audio was not exercised as part of this check.

This evidence does not establish P1 publication, shared-preflight persistence, provider dispatch, voice quality, generated audio, evaluation/settlement, or the installed state of the Audio v3 prerequisites. Admission-closed refers to the new protected route, not a claim that all retained Golden Lesson entrypoints are disabled. The previously audited USD 4 unresolved hold was not rechecked or changed by this diagnostic.

This checkpoint changes documentation only. PR #3 remains draft against its existing frozen base; no merge, production promotion, connected SQL/grant/Storage/Edge change, worker update, lesson publication or paid acceptance is authorized by this result. Continue preparing the reviewed profile/private-Storage/Audio v3 activation sequence and obtain the required scoped activation/cost decision before executing it.

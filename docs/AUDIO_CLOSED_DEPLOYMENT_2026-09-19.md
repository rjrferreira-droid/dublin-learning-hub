# Closed Audio Edge deployment — 19 September 2026

Owner requested deployment after the preparation checkpoint. Target rechecked:
v2-development Preview, aazfyosqqeujureksqjs, ACTIVE_HEALTHY, non-default.
No production, main branch or LiveKit changes.

## Exact source and gates
Source commit: 10029d4c18f62e7b5d55eb13bd786cabaae04ccb.
All three workflows succeeded at that source:
- Edge frozen dependency check: https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35451952566
- Isolated PostgreSQL: https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35451952481
- Full experience regression: https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35451952655

## Configuration and deployment
Official Dashboard saved P1_AUDIO_RUNTIME_STAGE=closed before deployment.
Visible SHA256: c3eefb58d7c42440a9d4abec51d629544d635a6d936ff3c4d3fca96d611b3cf3,
independently matched against the literal closed. Other secrets were not changed.
The connected tool exposes no secret setter, so the existing authenticated
Dashboard session was used; no credentials were extracted.

Deployed premium-lesson-audio with verify_jwt=true using 27 exact committed files:
entrypoint, complete relative dependency graph, per-function deno.json and lock.
No source rewrite was performed during packaging.
Entrypoint: supabase/functions/premium-lesson-audio/index.ts.
Import map/config: supabase/functions/premium-lesson-audio/deno.json.
Returned function version: 5; ACTIVE.
Returned artifact SHA256: f123a9049f643d605bef9b6e745db03fbbdde6bd7544632f5203501cf4134219.
Previous fetched deployment was version 3. No version 4 success is inferred.

Independent get_edge_function confirmed version 5, ACTIVE, JWT enabled and the
same artifact digest. All 22 returned source/config files match submitted bytes.
Four type-only source files and deno.lock are not exposed by that retrieval.
The lock was submitted and passed frozen CI; this retrieval is not independent
attestation of the platform's full resolved third-party dependency graph.
Retain that distinction before enabling paid generation.

## Connected verification
- OPTIONS endpoint: HTTP 200, body ok (handler boots).
- POST without Authorization: HTTP 401, UNAUTHORIZED_NO_AUTH_HEADER.
- Full row counts and SHA256 digests unchanged across all 12 preserved collections
  (profiles, courses, modules, lessons, assets, usage, sessions, reservations,
  both budget settings, Professor receipts and Audio attempts).
- lesson-audio remains private, MPEG-only, 15728640 bytes, zero objects.
- All five v3 RPCs still deny service_role, anon and authenticated EXECUTE.
- USD4 unresolved Professor obligation preserved; no grants, provider calls,
  new audio objects, lesson publications or paid sessions.

This completes the closed deployment, not authenticated playback acceptance.
No signed-in learner request was issued in this deployment check. Next work is
the guarded service-grant installer and controlled activation/acceptance review.
Do not interpret ACTIVE as generation enabled or remove closed simply to retry.

# Verified lesson audio controls — 20 September 2026

Source commit: 3b07f550c44bb41447418b643cb9beaa8ef7b0eb.
Feature Preview branch only; no merge or Production promotion.

The normal Finance and English sequence-2 lesson views now mount the existing
Premium Audio control after the authenticated read-only lesson identity check.
Mounting and checking do not invoke the Audio Edge Function. Only the explicit
Load audio action does. The server still owns authorization, exact source
resolution, runtime stage, protected budgets, reservation and cache decisions.
Payroll remains excluded. Diagnostic previewCheck=1 retains read-only controls.
Professor is not enabled by this change.

Validation: local build and 25 targeted budget/identity tests passed. Full
application CI 35505789797 passed, including desktop/mobile dynamic catalogue,
explicit audio request with the selected lesson ID, non-retryable closed-stage
response, unchanged diagnostic flows and default hidden Payroll/Manu presentation.
Vercel reported successful deployment for the source commit.

The owner saved OPENAI_API_KEY; only the saved secret name was checked, never
its value. Secure authentication succeeded through Vercel and the Learning Hub.
The real Finance sequence-2 lesson identity check passed. Controlled activation
first found audio_source_changed before any attempt or usage row was created.
The shared context builder used Node global Buffer; reproducing without that
global failed. Source 537beb6f56f2608c80470ee57a788a7121b745fc replaces it with
TextEncoder and adds real Deno execution in CI 35506759149 (passed).

Deployed all 27 source/config/lock files to premium-lesson-audio version 9,
JWT verification enabled, artifact SHA256
c39907861281854d07b0fc4ba6b3c8ab2fcd2cd30cf2bbe2d97330cf204fcb05.
Independent retrieval matched every returned source file to submitted bytes.

The subsequent authenticated request passed source resolution and admission but
returned tts_failed. Attempt 60bd89c0-704d-4823-84ab-35667768d75b for Finance
ecdccab9-172c-4ecf-ab10-eb64277641a8 remains uncertain with USD0.10 protected.
No cost receipt or audio object exists: usage rows remain 8, audio objects 0,
audio_assets 0. This is not proof of zero provider cost. Do not retry, delete the
attempt or release its hold without provider-side reconciliation.

Runtime restored to closed after the inconclusive attempt. Existing USD4
Professor obligation is untouched. Playback/cache acceptance and new-lesson
Professor dispatch remain uncompleted. The provider response is intentionally
discarded by the current handler, so its precise failure is not known from this
test. Future diagnostics should preserve sanitized HTTP status/request ID without
logging secrets, headers, scripts or unrestricted provider response bodies.

The disposable platform suite also exposed its old assumption that Payroll is
visible. Its full three-track isolation build now explicitly opts into Payroll;
the main experience suite continues testing default hidden Payroll/Manu.

## Provider diagnosis and protected state

Safe diagnostics deployed in version 12 record only the attempt identifier,
failure phase, HTTP status and a bounded provider request identifier. Provider
bodies, credentials and narration scripts are not logged.

One controlled English request on 20 September at 11:32:34 UTC returned HTTP
429 at the provider HTTP phase. Correlation identifier:
req_ec254bda96e34a309bc2501121997cc8. English attempt
0a15cecb-3bb1-48eb-8707-2e73086ab815 remains uncertain with USD0.10 protected.
Together with Finance this is USD0.20 of protected reservations, not a confirmed
provider charge. No audio object or cost receipt was created. The runtime was
restored to closed; no automatic retry or release is authorized by this finding.

HTTP 429 alone cannot distinguish exhausted quota from a rate limit. Provider
reconciliation is still needed before retrying either lesson. Successful audio
playback and cache reuse remain unverified.

The diagnostic implementation is kept inside the existing approved Audio
entrypoint. The frozen runtime boundary check remains unchanged. Integration
coverage exercises the actual handler with provider failures, untrusted request
metadata and a 429 response, preserving the uncertain reservation with one call.

Source 3b83e6a1d0fa2116303723d794eaf233930e9a50 passed all 29 local handler
integration tests, Edge dependency/runtime CI 35508394396 and atomic budget CI
35508394385. The unchanged frozen runtime boundary check passed. Vercel reports
the Preview deployment completed.
Full application and UI regression CI 35508394378 also completed successfully.

The 27-file package was deployed to the isolated development project as Audio
function version 15, JWT verification enabled, artifact SHA256
2c3feb9702cfb6ef0402d32adc60ffb8808251ae163ff79eadc042895f5ff57d.
Independent retrieval matched all 22 returned runtime files byte-for-byte.
The saved runtime-stage digest still matches closed. A subsequent read-only
database check confirmed both uncertain USD0.10 holds, no estimated costs,
zero audio objects and zero audio assets. No new provider request was made.

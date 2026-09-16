# Read-only hosted readiness route

Adds POST /api/professor-readiness on the exact feature Preview branch only, pinned to approved V2. It uses a request-scoped publishable-key client with learner bearer Auth.getUser, profile authorization and published lesson/module/active-course reads. The identity reader is shared with existing admission candidates through a compatibility re-export, not duplicated.

Request accepts only lessonId and requestedTrack. Unknown fields (including drafts/answers) are rejected before authentication. Scalars are captured before await. Exact P1 slug, sequence 2 and positive content version are required; English cannot fall back to Golden. Missing, unpublished, inaccessible and unsupported references share the same generic denial. Responses are private/no-store and expose neither authored context nor raw backend errors.

Successful status is reference_verified_activation_closed: providerAdmission and premiumAudioAdmission are always false. This is NOT an admission ticket or a durable snapshot guarantee. No mint/start/dispatch RPC, budget reservation, provider SDK or database write occurs. No new backend key is needed. Existing token and Audio endpoints are unchanged. UI wiring and hosted authenticated acceptance remain pending; P1 is still absent/unpublished on connected V2 and cannot produce positive readiness there yet.

Validation: 555 existing/new Node contracts passed before adding the Payroll positive case; final focused suite 17/17 passed. API typecheck and full app build passed. This is mocked handler coverage, not hosted Auth acceptance. No paid call, Supabase mutation, worker deployment or main promotion.

Documentation checked: Supabase changelog and https://supabase.com/docs/reference/javascript/auth-getuser . Server validation uses getUser, not browser-supplied identity.

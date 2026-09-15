# Bound Professor admission confirmation — unmounted candidate

The last green checkpoint is `f61a93c07caf3b3c36182631883dae296683a5b9`: full CI 34890870937 and real disposable platform CI 34890871249. This continuation reuses its SQL and source references without changing a live route, database schema, worker or provider registry.

`prepare-bound-professor-admission.ts` connects authenticated reference resolution, service-only mint and the existing bound-start RPC. It accepts only the chosen P1/written identity, request UUID and mode. Server code creates the callback secret and validation room. The request/reference are captured before returning a detached preflight receipt; changing that public copy cannot change the server's admission parameters. Auth is checked again before start and the SQL still enforces ticket ownership under locks.

The browser-safe contract has two checks: compare the preflight receipt to the current account/request/catalog identity **before** admission; then compare the admission acknowledgement to that captured receipt. Every identity field, source hash, descriptor family and reference ID must match. Session/reservation UUIDs, premium tier, bounded duration and validation room are also checked. Unknown acknowledgement fields are rejected, including secret-bearing fields. These checks are not authorization: server Auth/RLS/SQL remain authoritative. They are not mounted in the active browser connection yet.

This candidate is deliberately validation-only and has no LiveKit, voice, token or TTS import. Even a confirmed admission reports `providerAdmission:false`. Private authored context and the callback secret are accessible only through a server getter, so ordinary JSON serialization of the result omits them. Only the acknowledgement is intended for a future public response. It contains no answers, local draft, transcript, provider token or service key.

Each prepared object attempts the start RPC once. A known budget/rate/active-session denial returns no context or credential. A thrown RPC, error, malformed acknowledgement or post-submit cancellation raises `ProfessorAdmissionUnconfirmed` with `reservationMayExist=true`. It does not assume rollback, release a hold, fabricate a usage receipt, retry admission or call a provider. The one-use closure is an in-process safeguard, **not** a durable dispatch fence or cross-process exactly-once guarantee. Existing SQL request/ticket rules remain the durable admission boundary. A later recovery design must reconcile uncertain requests by their exact identity without initiating another paid session.

## Tests and evidence boundaries

Node tests exercise P1 and future references across the three courses, secret exclusion, detached-receipt mutation, account change, aborts, overlapping starts, denials, malformed/lost acknowledgements, every identity-field mismatch and the preflight catalog check. Strict TypeScript checking is included in local-platform CI.

The additional real Auth/PostgREST test executes 28 prepared zero-budget denials. With a temporary **fictional loopback** budget, it then confirms one P1 admission and corrupts the returned hash after another real written-English admission has committed. That second operation must produce no public success response, leave its real reservation intact and refuse a second call. No provider is available. The existing Python test owner removes only these fictional, never-dispatched validation sessions and restores all budgets to zero; it verifies no session, reservation, usage row or Audio attempt remains before the real browser tests.

The existing ten SQL concurrency/integrity cases and all previous UI/evaluator tests remain required. Consult the matching PR head's workflows for actual results; this document describes test intent and does not substitute for a green run. Fictional successful admission is not a natural-voice, teaching-quality or hosted SSO acceptance result.

## Still closed

Before activation: mount a reviewed preflight/admission handshake, add durable one-shot dispatch and uncertain-start recovery, verify receipt compatibility and authenticated hosted Preview behavior, and approve an isolated backend/publication target. The existing live/P1 endpoints do not gain this protection merely from the presence of candidate files. No connected Supabase write/deploy, paid call or new LiveKit worker is authorized or performed here.

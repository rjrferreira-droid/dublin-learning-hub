# P1 readiness in the lesson interface

The P1 Professor/Audio tabs now offer an explicit read-only availability check for the matching signed-in learner. Golden lessons and sequences 3–8 retain their existing paths. A successful check explicitly says Professor and Audio remain unavailable; the UI never mounts a provider panel or interprets readiness as admission.

The client sends only lessonId/requestedTrack with the current bearer token. It verifies account identity before and after the response, checks exact selected ID/slug/track and positive version, requires all activation flags closed, refuses redirects, and uses no-store. Authentication failures and HTTP/network/invalid-response failures yield a generic unavailable message. No raw error, local draft, answer, user ID or teacher context is sent. Abort and component cleanup suppress late responses; Auth events clear the displayed result. Existing written study remains usable after a failed check.

Local validation: 569 Node tests passed (13 new client cases); full build/typecheck passed. Expanded existing catalog browser cases exercise both P1 tabs for Finance/Payroll/English at desktop/mobile widths, exact request shape and continued provider closure. Browser results must be taken from this commit's CI; responses in those cases are fictional, not connected hosted acceptance.

No Supabase write, P1 publication, paid provider call, worker deployment or main promotion. Real authenticated hosted acceptance still lacks a non-personal test identity and connected published P1; do not reuse owner credentials or invent a positive live result. Durable admission/dispatch wiring is separate from this read-only diagnostic.

# Disposable local Supabase platform acceptance

This gate installs the authored new foundation into a fresh, unlinked Supabase CLI stack on an ephemeral GitHub Actions runner. It does not clone a connected database, read SQL history, configure a Vercel deployment or spend model/voice/TTS budget. Main and V2 are never targets. The CLI is pinned to 2.117.0 and discovers its commands before use.

The local test uses real Auth password sessions, PostgREST/RLS and Storage APIs. Three fictional identities are created with confirmation already set, so no email is sent. Two profiles are assigned by the local service client; misleading Auth metadata and a third unassigned account cannot select a course. Fictional local P1 rows exercise the existing server resolver for Finance, Payroll and shared English. Every valid identity reaches the existing atomic start and is denied by zero budgets before a reservation/session/provider exists.

The private Audio bucket test uploads only dummy non-playable bytes. Learner/anonymous object reads, uploads and signing are denied; a service-issued signed URL serves exactly those bytes, while tampered tokens and public URLs fail. This is actual Storage acceptance, not TTS generation, provider settlement or human audio-quality acceptance.

Both installers and API tests require fixed loopback ports; the HTTP wrapper rejects external requests and redirects. No connected access token is allowed. CLI status/local keys stay in private temporary files, outside the repository and uploaded artifacts. The workflow stops only its own stack and discards its data even on failure. Existing hosted publication, infrastructure and provider gates remain closed.

Results must be taken from the matching commit's `Disposable Supabase platform acceptance` workflow. Creating this gate alone does not claim it passed. Hosted SSO/Preview configuration, approved isolated infrastructure and natural voice/evaluator acceptance remain separate.

## Production-built UI with actual local authentication

The same disposable stack now supplies the app's build-time local API URL and anonymous publishable key. A separate Playwright configuration starts the production-built reader on loopback. At desktop and mobile widths, the browser signs in through the actual Auth UI as Finance and then Payroll, checks the 14 authorized catalog rows for each account, opens all 12 authorized sequence-3–8 written lessons per account, retains local practice across tabs and verifies that shared-English drafts do not survive into the other account. Professor/Audio controls remain closed.

Requests are not fulfilled with mocks. The browser permits only the local app and local Supabase; external/provider/RPC requests and client data writes are blocked and fail the test. Auth login/logout is real. Data API failures and JavaScript exceptions fail the test too. The fixture contains only random disposable passwords in a mode-0600 temporary file; no personal credentials, Auth tokens or service key are passed into browser fixtures. Traces, videos, screenshots and credential artifacts are disabled. No hosted Preview acceptance is implied by local browser success.

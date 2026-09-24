# Audio HTTP 429 investigation

Confirmed incident: English attempt 0a15cecb-3bb1-48eb-8707-2e73086ab815,
20 September 2026, 11:32:34 UTC, provider HTTP 429, request identifier
req_ec254bda96e34a309bc2501121997cc8. The original response body was discarded;
its detailed error code cannot be reconstructed from existing application logs.

Read-only account inspection found both Default and Dublin Learning Hub V2
projects. Neither displayed a configured project spend limit. Default's speech
model limit was inherited from the organization, without a smaller project
override. The visible Default key last-use date was September 1; the visible V2
key last-use date was September 5. These dates do not prove which credential
the Edge Function used on September 20; failed-request accounting may differ.
Do not call this a confirmed wrong-key diagnosis. No limits or keys were changed.

OpenAI Platform's key-target connector returned an access rejection. The trusted
Codex key-setup skill is unavailable. No key was created, revoked or exposed;
the secure connector must be restored or an approved alternative used to establish
the credential's project binding. A replacement key alone is not proof that
the provider error is resolved.

## Diagnostic correction

Official reference: https://developers.openai.com/api/docs/guides/error-codes
The provider distinguishes credit balance, organization/project spend limits,
organization usage limits and rate limiting through error.code.

Commit 5bc64a29b7ce43b1895bef2a680b431a73635ba2 parses at most 8 KiB of a JSON
error response and retains only seven exact, known error codes. Arbitrary
messages, types, unknown codes, malformed and oversized bodies are discarded.
HTTP status and a validated request identifier remain available. Neither the
browser response nor reservation semantics changed; there are no new retries.

All 30 local handler integration tests passed. Edge CI 35510173269 and atomic
budget CI 35510173271 passed. Full application verification is tracked in run
35510173287, which also completed successfully.

Deployed full 27-file package to the isolated Preview project as function v16,
JWT verification enabled. Artifact SHA256:
7409b5153e2721af68b6c1773104bbfd99758d5da97ed8dc64adbcb7fe6889a1.
Retrieved 22 runtime files matched the submitted sources exactly. Runtime stage
remains closed. No new provider request was made. Both existing uncertain holds
remain protected; this diagnostic patch does not authorize their release.

## Completion boundary

Still required: establish the installed credential's project binding, obtain
provider-side reconciliation for the existing uncertain attempts, address the
specific quota/rate-limit cause, then validate one controlled generation and
cached playback. Do not report the incident resolved before real acceptance.

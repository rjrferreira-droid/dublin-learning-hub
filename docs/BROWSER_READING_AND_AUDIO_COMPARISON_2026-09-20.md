# Browser reading and premium-audio comparison

## Confirmed comparison

Compared the archived `supabase/runtime-baseline/edge/premium-lesson-audio.v3.ts`
with the authored runtime at a6817d90ea4803297897d2b2ace45e1a04fda9f9 and
`quality/candidates/premium-audio-source-contract.ts`.

Both use POST https://api.openai.com/v1/audio/speech, gpt-4o-mini-tts, voice marin,
MP3 and speed 0.98. Both obtain the credential from OPENAI_API_KEY; that common
variable name does not establish an unchanged secret value or OpenAI project.
The archived source used manager commentary / technical brief, capped at 4,000
characters. The authored path uses a reviewed, identity-bound written script and
a pinned narration recipe. Access checks, atomic reservations, one-shot attempt
fences, private storage and source binding were added. These can block before
dispatch but are not evidence of the cause of the provider's confirmed HTTP 429.
The explicit closed stage subsequently returns audio_runtime_closed (503)
before provider dispatch. It is distinct from the original provider error.

Correction after inspecting the original backend qwvsrcgsfoguxdbcdrxq: the
original IFRS 18 lesson has a stored Premium Audio asset generated on
2026-09-01 at 19:51:57 UTC, voice marin, 1,615 transcript characters. The
matching audio/mpeg Storage object exists and has 1,849,728 bytes. This confirms
the user's report of prior generated audio. The original deployed function is
version 2 (artifact 2852c95a540027ebbfd36e4f56537a6baf138cbebc7b6505d3d5b07d80010c78),
not the version-3 V2 baseline previously compared. No original data was changed.
The original public-cache implementation must not be copied wholesale into the
new private-storage and protected-budget runtime.
That comparison itself made no runtime rollback, secret/limit modification or
new premium request. Subsequent recovery work is recorded below.

## Protected original-lesson restoration and decisive live diagnosis

The two saved OPENAI_API_KEY digests differ between the original and V2
backends. Values were never retrieved or exposed. A new authenticated diagnostic
uses GET /v1/models/gpt-4o-mini-tts with the installed V2 server credential. It
returned model access successfully while generation was closed. This proves
model access, not speech-generation quota, billing identity or playback.

Commit b0e615124db487e1e35d1f7f5f44f874d8f69d42 restores the exact original
Finance and English lesson IDs/slugs/sequence in the protected authored-v3 path.
Previously only the three sequence-2 P1 lessons could generate; the original
IFRS 18 page could not generate on a cache miss. Original Payroll remains on
standby. Authored content, gpt-4o-mini-tts/marin/MP3, private storage, fingerprint
binding, serialized budget admission and submission/receipt fences remain in use.

The separately reviewed `premium-audio-golden-v3.sql` was applied only to
aazfyosqqeujureksqjs with admission closed. It verifies the exact nine existing
function bodies and ACLs plus the old constraint before replacing only the scope
predicates. Pre/post hashes of attempts, bindings, assets, usage, Professor
reservations and budget settings were identical. No original-backend write,
Production promotion, PR merge, key change or spending-limit change occurred.

Edge v18 artifact:
`4509dfb8312d3b93fd3c9a643b7de1458118477f42089840f8b353da17978cab`.
All 24 retrieved runtime sources matched the uploaded package; JWT remains on.
33 mocked-handler tests, 19 contract tests and build passed locally. GitHub runs
35514377313 (Deno), 35514377305 (real disposable PostgreSQL), 35514377310
(application/UI) and 35514377312 (disposable platform) all passed. The SQL proof
includes six concurrent original-lesson requests producing one admission,
immutable settled-cache reuse, exact receipts, denied forged identities and
preservation of unresolved P1 attempts across installation and later calls.

One real authenticated Finance-original request was made after activation:

- Attempt: `83e7f78d-34f4-4293-a809-30bcf7da2030`.
- Submitted: 2026-09-20 13:47:53.609068 UTC.
- Provider failure: 13:47:55 UTC, HTTP 429, `credit_balance_exhausted`.
- Provider request ID: `req_a932374f6bec4838ac8907855956e772`.
- No MP3 object or audio asset; usage rows remain eight.
- USD 0.10 reservation retained as uncertain; no retry or invented zero-cost
  receipt. Together with the two earlier P1 attempts, unresolved Audio is USD
  0.30. The separate Professor reservation hash is unchanged.

Admission was returned to `closed` at 13:49:03 UTC. The account dashboard still
showed USD 8.59 API credit in Personal Organization. Therefore the exact cause
returned by the installed credential is known, but its association with the
displayed account/credit remains unverified. This is not a successful generation
or playback acceptance. The support conversation was updated with the new request
ID and error code, requesting account/project and charge confirmation.

Next credential entry must be done by the user through secure manual handoff,
in the verified Personal Organization / Dublin Learning Hub V2 project and then
the V2 Supabase OPENAI_API_KEY field. Do not revoke the old keys, change budgets,
buy credits, expose the key in chat, or retry/release the uncertain attempts.
After credential correction, reconcile the exact failed attempts using provider
evidence before allowing their generation again; do not change source/version to
evade a fence. Real generation, playback and cached replay remain to be accepted.

## Independent delivery

Read-aloud is available in Learn and Audio for loaded reviewed written modules.
The user chooses a section, English text or Portuguese summary, and speed.
The browser speech service receives only that authored text, in short chunks;
it never receives learner drafts. No application API request, microphone,
assessment, saved progress or premium-audio retry is initiated by these controls.
Local voices are preferred when listed. Offline availability and sound quality
are browser/device dependent; the UI does not promise offline playback.

Leaving the lesson/tab, page visibility loss, pagehide, premium-media playback,
or a busy Professor / mismatched account stops or disables reading. Unsupported
speech and synthesis failure leave the written lesson available. A start timeout
prevents a silent speech engine from leaving the control indefinitely busy.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis

## Support

The user authorized contacting OpenAI support. On 20 September the official help
chat accepted the incident request and confirmed escalation to a support specialist.
It stated that a response would arrive in the coming days, also by email; no case
number was displayed. The request asks for cause, project binding and any charge
for req_ec254bda96e34a309bc2501121997cc8. This is not a resolution or reconciliation.

## Verification boundary

Production compilation passed. Browser tests cover no paid requests, navigation
cancellation, Portuguese/speed selection, provider-independent failure and missing
browser support using a fictional speech engine. They do not establish audible
quality on an actual iPhone; that remains device-dependent acceptance.
Premium and Professor paid-runtime acceptance remain separate and open.

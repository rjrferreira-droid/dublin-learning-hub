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

## Credential replacement verification

After the user's replacement, the V2 OPENAI_API_KEY metadata changed at
2026-09-20 14:15:31 UTC. The OpenAI dashboard lists the new recovery key as
active in Dublin Learning Hub V2, with expiry 2026-10-20 and masked ending FH8A.
No complete credential was read. The authenticated server-side model lookup
now receives HTTP 401, `invalid_api_key`, instead of model access. The stored
value's association with the new dashboard key is therefore not established.

Commit a6ad677df3bd4657ae8ff1fc1a9e09130f23753d adds bounded copy-format hints
to the same read-only diagnostic and allowlists `invalid_api_key`. It never
returns credential characters, prefixes/suffixes or digests. The hints identify
masked values, assignments, Bearer prefixes, quotations, whitespace and unexpected
formats; a key-like string does not establish completeness or validity. The
diagnostic UI did not show one of these copy-format warnings, but the provider
still explicitly rejected the value. Do not attribute the 401 to credit balance.

Edge v22 artifact:
`a1d6f3c28b0784913e9d9b61484963b290e4477adbe90fdd9a81db5c4d56a9d6`.
All retrieved sources match the uploaded package. 34 handler tests and the build
passed locally; the Deno, atomic-database and application/UI CI checks passed. No paid request,
reservation change, attempt release, key modification or original-backend change
was made in this verification. Admission remains closed. A valid full credential
must be entered by the user before paid-runtime acceptance can continue.

## Successful credential and English audio acceptance — 20 September 16:12 UTC

The user completed credential transfer through Safari. The Supabase secret
metadata changed at 16:07:31 UTC and the authenticated model lookup succeeded.
The prior repeated digest established that the saved value was unchanged; it
did not establish whether the clipboard, selection, or another step caused that.
No complete credential was read or exposed by the agent.

The runtime artifact remains the credential-normalization implementation from
commit `0bcca29d45dcab6e0347c18babb175d831385622`, deployed artifact
`eb584e38f0b8dbcc97d26f229f96656cab934db024e8e6318f085deea28fbd9b`.
The retrieved deployment is version 30 with JWT verification enabled. Its Deno,
application/UI, and real PostgreSQL CI checks passed. The runtime stage was
activated as `isolated-preview-authored-v3` only in the isolated V2 Preview.

One actual generation of the original English lesson succeeded:

- Lesson: `f455a740-f50f-4eb7-95a7-9e4129ca4a68`,
  `story-past-forms-rhythm-follow-up`, content version 1.
- Attempt: `7cf7b1de-974c-4828-b5fb-68712085454d`, state `settled`.
- Submitted: 16:11:45.40824 UTC; settled: 16:12:00.505216 UTC.
- Asset: `fae7d8aa-5863-4401-ac27-0dc9f9d98bb8`, voice `marin`.
- MP3: 1,456,512 bytes, `audio/mpeg`, 91.032 seconds, 1,436 script characters.
- Application cost estimate: USD 0.032410, not a provider invoice.
- Receipt: `premium-audio-v3:7cf7b1de-974c-4828-b5fb-68712085454d`.
- Browser player loaded with readyState 4 and no media error. Playback advanced
  from 0 to 16.225178 seconds while unpaused.
- After a full page reload and reopening the same lesson, the UI reported
  `Loaded from secure lesson cache` and `Cached asset · no new generation`.
  The cached player loaded the same 91.032-second media and playback advanced
  to 65.993006 seconds without a media error before being paused.
- Replay left totals unchanged at one asset, one object, four attempts, nine
  usage rows and USD 1.052008 in cumulative application cost estimates.

The three earlier uncertain attempts are byte-for-byte unchanged in the queried
row evidence, retaining USD 0.30. The Professor reservation hash remains
`a599715eafcb65ecb853bd02fa9a35c6`. No budget limit, original backend, Production
deployment, or source/version fence was changed to achieve this acceptance.
Finance and the earlier P1 lesson attempts still need evidence-based
reconciliation before retry; the existing support thread still has no specialist
response at this verification. English Premium generation and cached playback are
now demonstrated in Cloud Browser; iPhone playback and subjective narration
quality remain separate user checks. No additional paid request is needed to
listen to this stored English asset.

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
The original English Premium generation and cached-playback acceptance is now
recorded above. Remaining Premium lessons and Professor acceptance stay open.

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

No successful historical premium narration has been identified in the reviewed
acceptance records. Screenshots of READY / Load audio are not playback evidence.
Do not describe the archived handler as a proven working rollback target.
No runtime rollback, secret/limit modification or new premium request was made.

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

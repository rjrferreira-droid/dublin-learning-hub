# Professor connection recovery — 20 September 2026

The current client previously kept the session ID only after both the room
connection and microphone activation succeeded. A failure after server admission
therefore discarded the reference needed to read the saved outcome. The dispatch
failure message also suggested repeating the start despite an uncertain dispatch.

## Change

- The authenticated API returns a public, owner-scoped session confirmation on a
  dispatch error, with retryAllowed=false. No participant token, callback secret,
  provider response or private job metadata is included. A failure to mark the
  dispatch uncertain cannot discard this already-admitted reference.
- The client checks session, lesson, track, mode, preparation, workshop and
  validation scope, then rechecks the signed-in account before emitting the public
  confirmation. It emits before joining the room or opening the microphone.
- A subsequent room/microphone failure closes local media and retains that session
  ID. The panel uses the existing owner-scoped, bounded, read-only outcome lookup.
  It does not initiate evaluation, settle costs, release reservations or retry a
  provider request.
- A known failed start keeps the next-start action unavailable while its result is
  pending or unverifiable. A saved completed result permits a new explicit start;
  existing server budget/admission checks still apply. Completion does not assert
  cost settlement. Lesson-tab changes retain the same reference and outcome reader.
- Dispatch logs contain the session ID and a fixed error label, not raw provider
  error text.

## Verification

Local application and API compilation passed. All 732 Node contracts and 23
request/client integration tests passed, including the new room failure,
microphone failure, dispatch/marking failure, malformed confirmation, account
switch and cancellation cases. External services in these tests are fictional.

Two browser regression cases exercise the real client/API response boundary and
real outcome reader with fictional services: uncertain dispatch with pending and
saved outcomes, no second start, scoped reads, and reference retention across tabs.
Local browser execution was unavailable because the Chromium download returned
502; the existing feature CI provides full browser/build verification on the
published source. Record its matching commit/run result before claiming acceptance.

## Live observations and remaining scope

The existing Preview tab failed to load an old Professor JavaScript chunk. One
explicit full-page reload restored the panel. No session was started. The installed
LiveKitAPI export and dispatch signature are valid; they are not the cause of this
loading error. This change does not claim to eliminate deployment version skew.

Read-only V2 checks found six historical sessions (four completed, two abandoned),
six settled reservations and the existing separate unresolved USD4 reservation.
None were edited. No new paid voice call, worker publication, backend migration,
credential change, budget change or Production promotion is included.

The successful English Premium Audio generation and cached playback are recorded
in BROWSER_READING_AND_AUDIO_COMPARISON_2026-09-20.md. The three older uncertain
audio attempts, including Finance, still need provider-side reconciliation.

Recovery here covers a received, validated confirmation within the current page.
A lost HTTP response or full reload before that confirmation remains a separate
durable-recovery task. Real voice, evaluation delivery and cost settlement still
require end-to-end acceptance; synthetic tests do not establish those outcomes.

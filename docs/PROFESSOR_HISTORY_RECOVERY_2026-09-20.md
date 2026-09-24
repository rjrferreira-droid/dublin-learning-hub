# Professor history recovery — 20 September 2026

The previous correction retained a received session confirmation within an open
page. This update adds a way to find server-saved sessions after closing that page
or losing the start response, without relying on a browser-stored credential or
automatically starting another conversation.

## Shipped behavior

- Each supported Professor lesson includes Previous conversations. Its explicit
  button reads at most five sessions, newest first, for the signed-in user and
  the exact lesson. English's existing Golden alias maps to its actual lesson ID.
- Dates, state, learning/validation scope and short references identify each row.
  Selecting a row opens the existing read-only saved-feedback reader.
- An unconfirmed start without a received session ID opens this history check
  automatically. A lost response does not trigger a second admission request.
- Reads validate Auth before and after the query, preserve a captured identity,
  reject mismatched/duplicate/malformed records, and stop after eight seconds or
  cancellation. Logout, leaving the lesson or starting voice disposes the reader.
- The history query selects only reference/state fields. No transcript, callback
  credential, provider response, token or feedback is loaded until a result is
  selected; the existing outcome reader then fetches that owner's saved feedback.
- Empty or inaccessible history does not prove that a recent attempt was cancelled
  or free. The UI offers another read. It does not settle/release reservations,
  dispatch an agent, reconnect an old room or manufacture an evaluation.

## Verification

Local application/API build passed, alongside all 739 Node contracts and nine
client integration cases. Added parser/reader tests cover owner/lesson boundaries,
bounded results, stalled Auth, cancellation, identity mutation and redacted errors.
The real connection wrapper's lost-response test confirms one start request and
no microphone/room connection or automatic admission retry.

Five browser cases cover reload recovery on desktop and mobile, lost-response
discovery, denied/cross-account reads and logout during a pending read. These use
the actual UI and readers with fictional backend data and blocked providers. The
feature CI runs them with the full regression suite; its matching source/result
and authenticated Preview verification are recorded in PR #3 after completion.

The first browser run caught a cancelled automatic check remaining in its loading
state during React StrictMode's mount-effect replay. Cleanup now resets that
automatic-check guard, allowing the replayed setup to complete its read. The
lost-response browser case checks for a visible pending result and exactly one
history query, with no repeated start request.

Authenticated Preview inspection found the five existing Finance sessions, opened
the latest saved feedback and found the same history after reloading the page.

Read-only V2 inspection confirmed existing SELECT access and the policy predicate
auth.uid() = user_id. No new schema, grant or policy is needed or applied.

## Limits

The list identifies recent sessions by lesson, time and session ID. It does not
attest that a particular row belongs to a particular lost HTTP request. Records
older than the latest five are not listed here. An empty result is not authority
to retry an uncertain paid attempt. Cost reconciliation, resuming a live room,
and complete real-voice/evaluator acceptance remain separate work. No paid call,
credential change, worker deploy or Production promotion is part of this update.

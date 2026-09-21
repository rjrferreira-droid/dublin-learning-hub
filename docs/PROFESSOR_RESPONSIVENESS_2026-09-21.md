# Professor responsiveness — reviewed candidate

The learner's 21 September voice validation saved its transcript, provisional
feedback and settled application cost. It exposed slow opening and a delayed
reply. The transcript has no per-turn timestamps, so it does not establish a
measured latency or prove a single cause. The screenshot's 258 ms INP warning
is a frontend observation, not a measurement of model or voice latency.

## Changes

- Overlap learning-memory retrieval and room connection with Promise.all. Keep
  the existing five-second memory timeout and include available memory before
  starting the model session; do not retry admission or connection.
- Keep semantic turn detection, with balanced medium eagerness rather than low.
  The tradeoff is quicker turn completion with potentially less room for long
  hesitations. Real speech acceptance remains necessary.
- Finance and English introductions establish a concrete situation before one
  question. Finance clarification should explain the situation, not repeat an
  abstract question. Payroll opening is preserved.
- Record only an opaque session ID, fixed stage names and numeric timings for
  memory, connection, session start, opening, first speech, later responses and
  model time to first audio token. No prompt, transcript, credentials or provider
  response body is added to these logs. The response interval starts at the
  SDK's detected end of speech, not the physical end of microphone audio; it
  does not measure VAD delay or iPad playback delay. Worker-entry timing cannot
  measure dispatch/cold-start time before entry.

## Publication scope

The feature worker contains other previously staged changes. Publishing its
whole directory would include unrelated evaluator/callback changes. Instead,
`prepare-professor-responsiveness.py` reconstructs published source
`07d770b53a4f3d6b77c8316541ea8dff6dcf7faf` and applies the hash-pinned patch.
It asserts that only index.ts changed. Existing model selection, evaluator,
callback delivery, dependency lock, budgets and credentials are preserved.

The separate `Reviewed Professor responsiveness update` workflow builds/tests
on push, but publication is manual-only with explicit confirmation and matching
version `nb67ioJmoKBN`. Existing deployment workflows and their guards are not
modified. Publication checks the exact prepared index hash and existing V2
agent/project, submits once and verifies source attributes on the new version.
It never starts a learner session or changes secrets. An uncertain submission
must be inspected, never blindly repeated.

## Verification and remaining acceptance

Local: worker TypeScript passed; 745 Node tests passed. Four new behavioral
tests execute the actual entry point with offline SDK boundaries. They also
pass against the exact baseline-plus-patch release. They check overlapping I/O,
memory retention, prompt/turn configuration, no retry on failed connection and
privacy/resumed-speech timing behavior. Python preparation compiles and checks
the exact release. Remote container and regression checks run on push.

No live update or reduction in measured latency is claimed by this document.
After manual publication and provider confirmation, validate the opening,
hesitations, complete-answer response delay and final feedback in a short real
session. Compare timestamps rather than asserting a guaranteed speedup.

References checked 21 September 2026:
- https://developers.openai.com/api/docs/guides/realtime-vad
- https://docs.livekit.io/reference/agents/events/
- Locked @livekit/agents and OpenAI plugin event/metric TypeScript definitions.

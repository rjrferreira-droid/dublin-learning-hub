# Audio experience implementation checkpoint — 24 September 2026

Scope: isolated `feat/audio-experience-2026-09-24` branch. The accepted English Audio mockup is integrated into the lesson surface. This is a source change, not an Edge deployment, cache rotation, provider run, or Production change.

## Implemented

- Audio occupies one main column. The lesson metrics sidebar is hidden in Audio; the technical cost and cache notice is removed from the learner surface.
- The player precedes an optional, closed transcript. English E1 and P1 have five authored listening questions. Browser recordings are limited to 60 seconds each, remain in memory, and are discarded when the lesson unmounts. Learners can replay them and compare key facts. No automatic score is displayed.
- E1 turns are derived from authored `voice`, `text`, and `pauseMs` fields. P1 labelled dialogue is split by character. TTS input contains speech only; each speaker has a distinct supported voice. Timed pauses are encoded as silent MP3 audio. The existing isolated budget, identity, claim, and receipt gates still surround generation.
- An older single-voice E1/P1 cache returns `audio_render_outdated` rather than being presented as corrected. A controlled Preview content-version/cache rotation is required before new speech can be generated for a previously cached lesson.
- The frontend keeps the E1/P1 audio load action closed until the reviewed backend and cache rotation are ready; it cannot accidentally buy or play the older single-voice rendition while only the frontend Preview has updated.

## Required before calling the experience complete

1. Run browser visual and microphone checks on desktop and mobile. Local Playwright could not launch because the browser binary was absent; the attempted download returned a truncated archive. The TypeScript/API build and fictional Edge integration passed.
2. Verify the actual Preview Edge stage and v2 admission compatibility for reviewed deep lessons. Existing P1 v3 tests do not prove that the connected service can render E1/P1. Package and deploy the exact reviewed handler only after the admission path and cache rotation are accepted.
3. Generate one controlled English episode, listen to the complete file across voice changes and silence, inspect duration and seek behavior, and reconcile real cost. Fictional TTS tests and a synthetic FFmpeg decode do not prove acoustic quality.
4. Add a protected voice assessment service for the five answers. Score comprehension separately from grammar, vocabulary, fluency, pronunciation, and intonation, and mark acoustic areas unassessed when recordings are unusable. Do not synthesize a percentage from local recording or reference comparison.
5. Keep ACCA FR assessment separate: technical accuracy, reasoning, application, and structure carry the mark; speech can only be optional communication coaching.

No Supabase row, secret, storage object, paid provider, or production service was changed by this checkpoint.

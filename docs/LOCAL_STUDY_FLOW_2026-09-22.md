# Local ACCA study flow checkpoint · 22 September 2026

- The explicit `?curriculumPreview=1` experience now points the primary ACCA action to the first lesson not finished in the current learner account and browser.
- The Dashboard presents the next ACCA lesson as the daily focus, with the exact local completion count, estimated time, suggested 30-minute study blocks and a direct start/resume action.
- An opened but unfinished lesson takes temporary resume priority; after it is finished, the Dashboard returns to the earliest unfinished curriculum item so the overall sequence remains visible.
- The daily agenda now shows a suggested three-lesson weekly pace, estimated hours and weeks remaining, and separate progress for syllabus modules A–E.
- A lesson can be marked finished only after all five fixed checkpoint questions have been checked. The stored record contains lesson ID, completion time and aggregate correct/total counts; drafts and individual answers remain ephemeral.
- After saving completion, the checkpoint offers a direct, learner-controlled transition to the next lesson. It does not navigate automatically, so the learner can still review the completed attempt.
- Completion schedules account-synced D+1, D+7 and D+30 retrieval. A due review opens the original checkpoint and saves only its stage, date and aggregate result while preserving the original lesson-completion date. The browser keeps a local resilience copy while Supabase V2 is temporarily unavailable.
- The Learning Library shows finished, resume and review states plus a 23-lesson local counter. Completion is a self-study navigation marker, not persisted learner evidence, AI evaluation, mastery, course completion or exam readiness.
- Browser storage is versioned, scoped to the authenticated user ID, strictly parsed and fail-closed when unavailable or malformed. Existing v1 completion data migrates to v2 review storage without a network request.
- The 23 ACCA FR runtime lessons remain local Preview content. Professor and Premium Audio remain inactive for these lessons.

Validation: 805 Node contracts and the production build pass. A focused Playwright journey covers A1 completion, the direct A2 handoff, Dashboard/module/weekly progress, the scheduled D+1 review, reload persistence, next-unfinished selection and library status. Local execution could not launch because the environment does not contain Playwright Chromium; the test is retained for the existing remote CI, which installs Chromium.

No Supabase write, database mutation, LiveKit session, TTS/audio generation, paid provider call, deployment, publication or production promotion is included.

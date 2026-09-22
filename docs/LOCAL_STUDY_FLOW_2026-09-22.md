# Local ACCA study flow checkpoint · 22 September 2026

- The explicit `?curriculumPreview=1` experience now advances `Continue Finance` to the first ACCA lesson not finished in the current learner account and browser.
- A lesson can be marked finished only after all five fixed checkpoint questions have been checked. The stored record contains lesson ID, completion time and aggregate correct/total counts; drafts and individual answers remain ephemeral.
- The Learning Library shows finished, resume and review states plus a 23-lesson local counter. Completion is a self-study navigation marker, not persisted learner evidence, AI evaluation, mastery, course completion or exam readiness.
- Browser storage is versioned, scoped to the authenticated user ID, strictly parsed and fail-closed when unavailable or malformed. It performs no network request.
- The 23 ACCA FR runtime lessons remain local Preview content. Professor and Premium Audio remain inactive for these lessons.

Validation: 802 Node contracts and the production build pass. A focused Playwright journey covers A1 completion, reload persistence, automatic advance to A2 and library status. Local execution could not launch because the environment does not contain Playwright Chromium; the test is retained for the existing remote CI, which installs Chromium.

No Supabase write, database mutation, LiveKit session, TTS/audio generation, paid provider call, deployment, publication or production promotion is included.

# Accelerated lesson workspace — verified results and checkpoint

## Scope / release boundary

Rafael requested faster, substantial progress without routine micro-approvals. This batch combined a usable three-course practice increment with a session-lifecycle correction, sharing one verification cycle rather than creating a new architecture or expanding into other courses.

Final tested application head: **066248df46bd5ec05ecafcf490d9fa9ad8a39a50**. Work remains on `feat/professor-experience-2026-09-13`, draft PR #3. No merge into the frozen voice-validation baseline, normal V2 or main; no LiveKit worker or Supabase deployment, real account-credential use, paid voice/model call, learner-history write or budget/model change. API/server source is identical to the preceding b0a629 candidate. The standalone child portal and auth boundaries are preserved by a protected-source diff.

## 1. One conversation can remain within an open lesson

The previous App mounted Professor only when its tab was selected, so changing to a written tab unmounted the panel and disconnected. The new lesson workspace defers the Professor until the first explicit visit, then retains that same instance across the written tabs while the lesson remains open.

When the session is connecting, connected or ending outside the Professor tab, a compact visible console shows its current state and relevant Cancel/End, microphone and audio-recovery controls. Returning to Professor restores the full view, not another session. Muting remains muted across tab changes. The interface explicitly says that switching tabs and muting do not pause usage. Lesson-audio playback is unavailable during a conversation to avoid competing voices.

Closing the lesson, changing course/learner, or signing out disposes that lesson-scoped instance. Reopening does not automatically start voice or restore an old session reference. Written drafts and the already-mounted bounded feedback reader survive tab changes; the reader is not recreated merely to show a saved result again.

A synchronous Start lock blocks duplicate clicks before React rerenders. The connection wrapper now shares one disconnect promise across abort/End/unmount, and disposal pauses/removes remote audio elements and detaches SDK attachments. Stale callbacks cannot update the current panel or silently restore microphone capture after cancellation. These are client safeguards, not proof of server billing settlement after a lost network.

## 2. Nine local workshop scenarios across the three existing courses

The Practice tab now includes three selectable scenarios per course and **27 structured answer checks in total**. This is not nine new lessons or 27 independent competencies; the initial numeric scenarios reuse the existing written foundations' examples and the remaining scenarios provide variations.

| Track | Structured practice | Open-ended follow-through |
|---|---|---|
| Finance | Three supplied-category profit bridges, checking operating, before-financing/tax and final profit | Explain the differences, identify an assumption and reason about a changed finance cost |
| Payroll | Separate employee net cash, scoped employer cost and signed changes between runs | Explain only the evidenced difference and request missing evidence rather than inventing a correction |
| English | Match background, main event and earlier action to explicit timelines | Retell the events and write a relevant follow-up in different registers |

Every scenario includes two progressive hints, worked answers/explanation, a temporary reasoning area and a transfer task. Numeric checking uses strict decimal input converted to integer cents, not floating-point tolerance or guesses about thousands separators. Missing/invalid entries are distinguished from valid but incorrect attempts. Changing an answer removes stale feedback.

All workshop work is local React state: retained between lesson tabs, reset on changing the workshop scenario, discarded on closing/reload/signout. It is not persisted or sent to the Professor, evaluator or Error Bank. Free-text reasoning is not automatically graded, and structured matches are not mastery/CEFR/pronunciation evidence. No model is needed to check these answers.

**The alternate workshop scenarios are not automatically synchronized into the voice context.** The API/server packet was intentionally unchanged in this tranche; a learner discussing an alternate scenario must provide its facts. This remains a useful next integration item rather than a falsely completed handoff.

Finance category assignments and Payroll deductions are explicit fictional assumptions/inputs, not universal classifications or current-rate calculations. No new regulatory claim or current-rate source was introduced.

## 3. Final verification

**Run 34782204464: SUCCESS.** Verified the candidate before committing its narrow App/client integration as **db7bf75e02b97959d58092c41668b28780b4ed09**.

**Run 34782480467: SUCCESS**, job **103791898411**, on final head066248d. The final workflow builds the committed application without patching/pushing it; `contents: read`, credentials not persisted, unchanged tracked working tree verified.

Final logs record:

- **176 Node tests, all passed, zero failures/skips:** preceding163 plus10 workshop/parser checks and3 editorial-consistency checks.
- **11 executable integration cases, all passed:** preceding8 actual-handler/evaluator assembly checks plus3 actual-client cancellation/disconnect cases. Auth/SDK/provider responses are simulated.
- **88 main Playwright tests passed**, including24 unit-style regressions and64 browser scenarios; **three production-build browser cases passed** separately. Thus91Playwright cases total,67of which are actual browser scenarios—not91real voice/user sessions.
- New browser coverage includes three-course continuity across written tabs, single-session counts, microphone-state retention, lesson-audio separation, close/reopen/course changes, duplicate Start, remote disconnect, saved-feedback retention, all workshop variants at390/1440px, reset and invalid-input behaviour.
- Existing account-boundary, child isolation, written lesson and production loading/recovery checks also passed. No retry was used to hide flaky browser acceptance.

CI now cancels an obsolete feature-branch run when a newer push supersedes it. This reduces overlapping outdated verification, not the safety checks on the final candidate. No measured percentage acceleration of development is asserted.

## 4. Issues found and actually corrected

Initial run34782127513 stopped at172/173Node checks. The new independent Payroll-C test expectation was wrong: **2800−310−56−112−84=2238**, not2268. The application formula was correct; both independent test fixtures were corrected and the explicit arithmetic retained. No test was deleted or loosened.

Screenshot/editorial review also found that the zero-change Payroll variant inherited wording about a changed deduction despite identical inputs. Final content now consistently describes unchanged facts, zero net change and the need to obtain actual payment evidence before inventing a cause. The English train options no longer add an unstated platform-arrival ordering. Three regression checks cover these editorial cases.

## 5. Artifact, visual and deployment evidence

First successful artifact **10324803168** was downloaded and its SHA256 verified as `31a4928c087b6f9cb5e9c4774ae9a0c1573a94c9cb159dbf5e370202e7e7808c`. Finance continuity on mobile, Payroll mobile and Finance/English desktop workshops were visually inspected.

Final artifact **10325424378**,24files, was downloaded and its SHA256 verified as `3718f9a2ee118b961c77c43183ba7f5c107688977792cb5315f39c819d97e6ba`. It contains23screenshots and one aggregate bundle report. Final corrected Payroll mobile and Finance mobile continuity captures were inspected. Screenshots use authored course content and clearly fictional local drafts/feedback, not real user data or recordings.

The final initial JavaScript gzip remains **150697bytes**, compared with333009for the pre-lazy baseline (54.7% reduction retained). This is not a new54.7%gain in this tranche and not wall-clock speed or total-session bandwidth. The additional workshop code lives in the deferred workspace bundle, now about36.66KB gzip; voice still loads on explicit Professor visit. Large-chunk warnings remain.

Vercel independently confirmed **dpl_BBWznzFyin1pgWmPNPBuwnSgMDzq READY** for066248d at the separate protected feature alias:

`https://dublin-learning-hub-git-feat-professor-211b4d-rjrferreira-2878.vercel.app`

This is a Preview, not a worker deployment or normal-V2 promotion. No access bypass was generated. Subsequent evidence-only documentation does not change the tested application.

## Continuation checkpoint

This is the latest checkpoint after docs/CONTINUATION_CHECKPOINT_2026-09-13.md. Continue ordinary reversible in-scope work without requesting repeated permission. Prioritize closing the alternate-scenario handoff and testing pedagogy against explicit evidence before further multiplying UI surfaces or courses. Preserve the distinction between implemented reference guidance, simulated responses and actual teaching behaviour.

Real voice/turn-taking/microphone acceptance, evaluator fairness, provider cost reconciliation, persisted assessed free-text work, remaining backend recovery/authorization and complete curriculum/Golden Lessons remain open. Do not use absent voice acceptance to block unrelated safe work, but do not claim it was replaced by simulated tests. No background development loop or credential-using task was left active. The previously blocked historical SQL export was not retried or bypassed.

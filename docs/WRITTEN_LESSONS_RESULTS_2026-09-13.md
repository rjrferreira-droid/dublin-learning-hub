# Written lesson foundations — verified results, 13 September 2026

## Scope and release boundary

This is the second parallel content/UI increment requested while the owner defers the real voice session. It remains on `feat/professor-experience-2026-09-13`, stacked draft PR #3 into `fix/core-consolidation-2026-09-13`. No merge into the voice-validation baseline, v2 or main, no worker deployment and no Supabase change.

Application routing was materialized and committed as **83fd671bbe2bfabccb257ae007b53d52a6258372** only after the initial suite passed. Final verified head **812b76dacfcb399d5a86ce28196ec58bba674177** changes only the ongoing verification workflow relative to that application source. The workflow is read-only again and does not modify/push code during normal verification.

## Usable written deliverable

The seven written tabs — Learn, English, Practice, Visual, Case, Test and Sources — now use one lesson-specific content module instead of generic placeholder panels. Existing protected Audio/Professor routes remain intact.

Across the three existing Finance, Payroll and English lesson IDs:

- **12 teaching sections**, with substantive explanations, Portuguese summaries and section-level source links where a factual source is needed.
- **18 vocabulary entries**, each with meaning, Portuguese equivalent and an original example sentence.
- **Three evidence tables/timelines**, replacing the generic decorative-bar prompt with interpretable lesson data.
- **Three new worked cases**, each with progressive hints, four review-checklist points and a transfer task.
- **15 new fixed-answer checkpoint questions**, each with an explanation and a button returning to its related concept.
- The existing **nine open-ended companion exercises** are reused in the Practice tabs rather than counted as nine additional new questions.

Finance covers the assumed-category profit bridge, MPM-definition assessment and scoping of group versus statutory reporting bases. The new case distinguishes identical numerical subtotals with different definitions. Payroll separates net cash, employer cost and deduction bases; its new case isolates a net-pay difference without inventing its cause. English links background, events and earlier facts to a natural follow-up and audience-sensitive retelling.

These are **written foundation modules**, not the completed three end-to-end Golden Lessons or entire courses. Full consolidation/statutory preparation, complete MPM disclosures, current-rate payroll calculations, listening/pronunciation, persisted free-text assessment and live-tutor context integration remain work. The live Professor prompt/evaluator did not change.

## Local interaction and data handling

Practice/case drafts and checkpoint choices exist only in React memory while the lesson is open. They survive tab switches but are discarded on lesson close, reload or account signout. They are not sent to a model/backend or saved to browser persistent storage. The UI states this explicitly and discourages confidential inputs.

Checkpoint feedback compares a selected option with an authored answer key. It reports checked/correct counts for the local attempt, clearly marked as not saved to the profile. Changing a choice removes that item's prior feedback; restarting clears choices and counts. An absent/invalid option is not treated as a wrong measured answer. Free-text drafts are not automatically graded. No mastery, CEFR, pronunciation, Error Bank entry or course completion is inferred.

## Tests and evidence

**Run 34778351848: SUCCESS.** It applied the narrow App routing patch in the isolated checkout, built the app/API, tested the candidate and then committed only the verified routing change.

**Run 34778518233: SUCCESS.** Final repeat on committed head 812b76dacfcb399d5a86ce28196ec58bba674177; no materialization or source write. All steps, including unchanged-working-tree verification, passed.

The suite consists of:

- **127 Node contract tests**: 113 prior plus 14 new module/answer-key tests, with no failures or skipped tests in the first complete run.
- **51 Playwright tests**: 44 prior plus seven new written-lesson cases; the total is **24 unit-style regressions and 27 browser cases**, not 51 real-user authentication tests.
- The seven new browser cases cover all three courses at desktop/mobile widths and keyboard operation. They test explanations, Portuguese support, terms, progressive hints, local draft retention, worked cases, evidence tables, incorrect/correct checkpoint responses, remediation navigation, reset, source links, horizontal fit and discard-on-close.
- Chromium uses fictional Auth/REST; external/provider routes are blocked. No owner/Viviane credentials, real learning records or paid voice/model calls were used.
- A protected-baseline diff verifies unchanged API, server, worker, Supabase, auth, child-portal source and voice connection/state implementation.

The first run's **written-lesson-previews** artifact **10323508860** contains 12 screenshots: six existing study-guide captures plus six new written-case captures. Downloaded ZIP SHA256 was verified as `7bca6af0674c1ba58bd0c76f786226ab1c964dea43c90a3eeae1550c0c0b8aeb`. Finance desktop and Payroll mobile were visually inspected. Captures contain only authored public content and visibly fictional draft text, not real learner data.

## Preview verification

Vercel confirmed the separate branch Preview **dpl_3C3aBnKmw6cpK1prs4ANSG1DYshF** READY for verified head 812b76dacfcb399d5a86ce28196ec58bba674177:

`https://dublin-learning-hub-git-feat-professor-211b4d-rjrferreira-2878.vercel.app`

This is the content/UI preview. It does not replace the regular V2 alias or the frozen voice-validation alias and does not update the LiveKit agent. No access-protection bypass link was generated. Subsequent evidence-only documentation does not change the tested application.

## Source review and remaining limitations

Official IFRS Foundation, FRC, Revenue and British Council material was checked for the stated concepts, with editorial date and scope in each module. Examples, questions, worked cases and control suggestions are original. Payroll amounts are explicitly fictional supplied inputs, not asserted current rates. Statutory-basis discussion is scoping, not an entity-specific eligibility conclusion. The unavailable gov.ie page was not used as newly checked substantive evidence; the canonical British Council past-continuous grammar reference was successfully retrieved later in the review.

The existing global floating app launchers still cover part of the long mobile screenshot. Scoped content wrapping passes, but **global mobile navigation/chrome redesign is not complete**. The bundle-size warning also remains (initial build about 1.188 MB minified JavaScript, 333 KB gzip); no performance optimization was claimed.

There was no new whole-database count query, subscription, budget increase, live credential reuse, backend migration/deployment or historical SQL-export retry. Prior reconstruction, authorization, durable-recovery, provider-reconciliation and real-voice acceptance gates remain open. Passing written UI tests does not establish that the live teacher is natural or that an evaluator is calibrated.

# Written reference bridge and mobile reading — verified results, 13 September 2026

## Completed scope and release boundary

The user approved connecting the three written foundations to the Professor/evaluator and correcting mobile utility overlap, without requiring a real voice session. Work remains on `feat/professor-experience-2026-09-13`, draft PR #3 into the frozen `fix/core-consolidation-2026-09-13` baseline.

The verified wiring was committed as **3ab07278546d9bd878cb197774ac60433f7c09d8**. Final verified head **aa690a118589e30edef3fa3586d2f1a5ee2991e0** changes only the ongoing workflow to read-only verification. No merge, promotion of normal V2, Supabase migration/deployment, real learner write, credential reuse, paid voice/model call or LiveKit agent deployment occurred. Budget limits, model and voice configuration were not changed.

## Common lesson reference is now wired in the candidate API

After the existing authenticated profile/track/lesson checks and persistence-lesson resolution, the API selects the matching server-imported written module. This happens before a reservation or dispatch. No browser-provided lessonContext, draft, checkpoint answer or progress value is used as source material.

The packet contains the same authored explanations, stated scope, case facts, worked reference response, review criteria and official source links used in the written foundations. It explicitly labels reference answers as authoring material, not learner speech, and does not assume the learner read the lesson or completed exercises. Unknown/unrelated lesson IDs retain the old context path; unauthorized course selection, inconsistent registries and oversized packets are rejected.

Code inspection found that the current evaluator does not read the worker's workedExample/practiceScenario fields. The adapter therefore places the shared explanations and case reference in **technicalBrief**, a field already read by both the existing worker guidance and evaluator context builder. This avoids wiring content only to the teacher while leaving the assessor unaware of it.

The candidate response and dispatch metadata also carry a deterministic source version/checksum. This identifies authored content, not completed learning or confirmed model use. It is not yet a database-persisted provenance record. No local draft or fixed-answer result is transmitted by this bridge.

The payload is bounded at 24,000 UTF-8 bytes, with a 14,000-character shared brief. Oversize content fails before reservation rather than silently dropping assumptions. These limits are not token counts or a per-session cost guarantee; richer context can affect future consumption, which remains to be measured. Existing spending/session controls stay intact.

The published worker, its base persona and evaluator rubric are unchanged. The candidate API's **reference context** changes for the three matching lessons. Whether a real model follows that context, avoids answer leakage and assesses it fairly still needs live/model evidence.

## Mobile reading obstruction corrected for the tested layouts

Within the signed-in adult shell at widths up to 760px, Memory, Cost Center, signout and the child-portal entry button now participate in normal document flow above the workspace. They scroll away rather than staying fixed over lesson text, case responses and controls. Open Memory/Cost panels expand within available width, retain bounded internal scrolling and remain closeable. Desktop retains its previous utility positioning.

The child-portal **entry button's placement in the adult shell** changed as part of this layout. The child component, original child CSS, standalone route, overlay, voice and data did not change; the standalone portal has no adult-shell ancestor. This is not a claim that all real mobile devices/keyboards have been tested.

## Successful verification

**Run 34779431298 — SUCCESS:** tested the candidate before committing its narrow wiring changes.

**Run 34779528016 — SUCCESS:** repeated all checks on the committed final head without patching or pushing source, and verified an unchanged tracked working tree.

Final run logs record:

- **143 Node contract tests**, no failures/skips: 127 previous plus 16 new context-selection/content/bounds/mobile-scope tests.
- **Five additional executable API/evaluator integration tests**, no failures/skips. The real candidate handler and unchanged evaluator context assembly execute against fictional SDK/Auth/REST and a mocked model response. Each course's dispatched reference is compared with the evaluator request; injected browser reference/draft content is excluded. Cross-account course and displayed-learner mismatches are refused before the simulated reservation.
- **57 Playwright tests passed**: 24 unit-style regressions plus 33 browser cases (including six new mobile utilities/desktop/standalone cases). These are not 57 real-user authentication or voice tests.
- Mobile checks at **320, 390 and 760px** verify utility geometry, lack of pairwise overlap, visible/unobstructed case content after scrolling, and absence of fixed utilities over the reading region. Additional cases cover open/close panels, desktop positioning and standalone child isolation.
- Locked dependency installation and application/API build passed. Protected diffs preserve worker, Supabase, auth, child-portal source and voice connection/state code. Only the candidate token API and its new server adapter were permitted server changes in this increment.

All tests used fictional data/dependencies; no actual Supabase/LiveKit service or model response was substituted and mislabeled as a real acceptance result. Runtime calls were mocked/blocked. The model request assembly was executed, but no paid model was asked to grade or teach.

## Failed attempts and what changed

Run 34779122734 passed build and 141/143 contracts, then stopped on two older scope assertions that prohibited any lesson-reference integration. Those assertions were updated for the explicitly authorized server-only bridge while retaining no-call/no-local-data and inert-candidate-pedagogy safeguards. No test was removed or ignored.

Run 34779181086 passed all 143 contracts and five integration cases, then passed 53/57 Playwright cases. Four new mobile cases waited for the existing desktop profile card to become visible, although the responsive layout intentionally hides it. The fixture now requires the correct authenticated shell identity, verifies the profile content and waits for the visible Continue Finance control. It does not unhide the card or weaken the overlap assertions. Both subsequent complete runs passed.

## Screenshot and preview evidence

Artifact **10324975091** from the first successful run contains 15 screenshots. Its downloaded ZIP SHA256 was verified as `c0f5b88a6ff284000651ba2e2138d40ffc3f00e0fdbeb87a55c94a2f410fbcf3`. The 390px reading viewport and full Payroll mobile case were visually inspected; no floating utilities cover their text. Screenshots contain authored lesson content and, where present, visibly fictional drafts only. The final verification also generated its own screenshot artifact **10324324661**; that second ZIP was not separately downloaded or claimed inspected.

Vercel independently confirmed **dpl_3RUauKzCHiLM6K7vVwEhxQfBS9kX**, head **aa690a118589e30edef3fa3586d2f1a5ee2991e0**, READY at the existing separate Preview alias:

`https://dublin-learning-hub-git-feat-professor-211b4d-rjrferreira-2878.vercel.app`

Automatic Preview publication is not a worker deployment or a normal-V2 cutover. No access-protection bypass was created. The subsequent results document changes no tested application code.

## Remaining limits

Real voice/media, contextual teaching behaviour, naturalness and evaluator calibration are not validated by these tests. Free-text written drafts still have no automated assessment or durable progress. Three written foundations are not three complete end-to-end Golden Lessons or entire courses. Browser bundle optimization, remaining backend authorization/recovery/reconciliation and approved historical reconstruction remain tracked work. No new database count or provider-invoice reconciliation was performed. Historical SQL-export security blocks were not retried.

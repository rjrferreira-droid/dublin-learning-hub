# Autonomous experience continuation — verified results, 13 September 2026

## Authority, scope and release boundary

Rafael asked to continue as far as feasible without repeatedly waiting for him to say continue. This execution completed successive development and verification steps, including issues discovered in its own tests and screenshots. It did not create an indefinite background development process or interpret autonomy as permission for unbounded costs, personal-credential reuse or production promotion.

Work remains on `feat/professor-experience-2026-09-13`, stacked draft PR #3. The frozen voice-validation baseline `3d292fe7f913135fd4b461487cc5dffde74bc7e1`, normal V2 and main were not merged or changed. No LiveKit worker deployment, Supabase migration/deployment, real learner record modification, live account test, new provider subscription or paid model/voice call was performed. Existing model, voice and spending limits remain unchanged. The separate feature Preview updates through its pre-existing Git integration.

Final verified application head: **36a4578235a816d7ddd155698f9b12849522947b**. Its complete read-only verification is **34781382021 — SUCCESS**. The main functional wiring had been materialized as **b013554c9950fe40bfb1e91652e18c5935b6e1b9** after an earlier successful run. Final changes after the functional tranche add test accuracy, evidence retention and a scoped contrast/grid correction. Subsequent result/checkpoint documentation changes no tested application code.

## 1. Session preparation and concrete coaching guidance

The new preparation panel offers four goals: understand, practise/explain, case work and challenge. It also offers patient/balanced conversational pacing and existing-profile/Portuguese/English support. Choices are local until Start; no written draft, selected quiz answer, inferred ability or arbitrary prompt text is sent.

The shared parser accepts only a versioned enum contract and rejects malformed values, arrays, extra fields and free-form instructions. The API validates it before reservation, builds reviewed literal guidance on the server and adds it to the matching authored lesson reference. The generated guidance is therefore included in the technicalBrief used by the existing teacher and evaluator. The client requires a matching acknowledgement before connecting the remote room or opening the microphone. That client refusal alone does not prove that an already-received server request incurred no cost.

Guidance makes the desired behaviours concrete: one question at a time, an attempt before the worked answer, graded hints, specific recognition instead of false praise, a different representation when the learner is confused, room for self-correction, relevant follow-ups and a concise useful next practice. It separates technical correctness from English, fictional payroll deductions from live rates, and valid regional English from mistakes. Requesting help or more thinking time is not itself evidence of a skill deficit.

The candidate API now includes this request-level coaching guidance. The deployed worker's base persona, evaluator rubric and speech/VAD configuration were not changed. Choosing patient pace is an instruction about conversational conduct, not a measured guarantee about actual turn detection or acoustic speed. The real model has not been benchmarked against these new instructions in this execution.

All 72 combinations of course/goal/pace/support fit the existing authored-context size limits. Size bounds are not token counts or per-session cost guarantees; future consumption must still be measured.

## 2. Session-specific saved feedback, without inventing results

After an ended session with a known reference, the new panel reads only that session's saved record for the signed-in user. It distinguishes processing, saved feedback, completed record without usable feedback, abandoned/not-completed and unavailable status. It presents an available summary, strengths and one next focus, without manufacturing a score, claiming mastery or claiming cost settlement.

The service uses the normal authenticated Supabase client/RLS, explicit session_id and user_id filtering, and identity checks before/after the query. The response parser checks session, user, validation scope and completion time. Account changes/unmount abort work and prevent late UI disclosure. A deliberately wrong-identity fictional response with genuine HTTP 200 in the browser harness is rejected rather than rendered.

Polling is finite: at most six application-level read attempts, with 27.5 seconds of scheduled delays in total and an eight-second timeout per read attempt. Underlying SDK transport retries can add HTTP requests inside those bounds; this is not a promise of exactly six network requests. A retry button only starts another bounded read cycle. Nothing reruns an evaluation, rewrites learning records or releases a reservation.

The exact new post-session path has not been exercised against a real newly completed voice session. UI tests use explicitly fictional saved feedback. Prior real-owner read-only acceptance remains evidence for its earlier tested version, not an automatic approval of this new candidate.

## 3. Microphone control

The session UI includes mute/unmute, a busy state and pressed-state accessibility semantics. The connection wrapper checks that the current session is active before/after changing microphone state and attempts to disable a late operation after cancellation.

The warning explicitly states that muting does NOT stop the session timer or usage charges; End session is the way to leave. The UI/method interaction was tested with a simulated media adapter. Actual microphone behaviour on user hardware remains part of live-media acceptance.

## 4. Lighter initial JavaScript and failure recovery

The adult workspace and the voice panel now load on demand. Opening a written lesson does not request the voice-panel JavaScript; opening Professor loads its controls before Start is offered, preserving the existing synchronous audio-unlock placement. Failed workspace or voice chunks produce explicit recovery messages rather than a blank page. A failed voice chunk leaves the written lesson usable. Reload warnings distinguish unsaved drafts from stored history.

The previous candidate and final candidate were built using the SAME dependency installation and configuration environment. Metrics sum the emitted static JavaScript dependency closure from Vite manifests:

| Metric | Previous head d3818cc | Final head 36a4578 |
|---|---:|---:|
| Initial JavaScript, uncompressed bytes | 1,188,185 | 517,334 |
| Initial JavaScript, gzip bytes | 333,009 | 150,697 |
| Initial gzip reduction | — | **54.7%** |

This measures the initial JS payload, not elapsed loading time, device responsiveness, total eventual bandwidth, latency to the first spoken answer or cost. Deferred chunks still download when needed. The existing large-chunk warnings remain: this is meaningful code splitting, not complete performance optimisation.

Three additional browser tests use the emitted production build: voice not loaded during login/reading; failed voice asset with written navigation still usable; and failed workspace asset with an explicit recovery/signout path. No actual auth or voice provider is used.

## 5. Visual inspection found and corrected a real presentation problem

After the first complete functional verification, inspecting the downloaded screenshots showed the Professor heading had low contrast against the dark panel. The new full preparation/outcome cards also needed explicit full-row placement in the previous desktop grid.

The final scoped CSS gives the dark-panel heading light text, retains dark text on light cards, places preparation/validation/outcome cards across the available row and arranges the live controls separately. Six new browser cases cover all three courses at 390px and 1440px, checking computed heading colour, card width and wrapping. A conservative colour-pair check is included; it is NOT a complete WCAG audit or a pixel-by-pixel gradient analysis. Reference reviewed: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html.

The final preparation card, corrected mobile title and desktop feedback card were visually inspected. No further claimed visual correction relies only on a passing typecheck.

## Final verification, counts and limitations

**34781382021 — complete SUCCESS on 36a4578235a816d7ddd155698f9b12849522947b**, with no source patch or commit during the verification job:

- **163 Node contract tests**, zero failures/skips: the preceding 143 plus 20 preparation/outcome checks.
- **Eight executable mocked API/evaluator integration cases**, all passed, including the earlier five plus preparation/default/invalid-input coverage. The actual candidate handler and unchanged evaluator request assembly execute, but SDK/Auth/REST and model responses are fictional.
- **74 Playwright tests in the main suite**, all passed: 24 unit-style regressions and 50 browser scenarios.
- **Three production-build browser cases**, all passed separately.
- Therefore **77 Playwright cases total, of which 53 are actual browser scenarios**; NOT 77 real account or voice sessions, and repeated earlier runs are not additional unique tests.
- App/API build, original-vs-candidate payload comparison, protected source diff and unchanged working tree passed.
- The protected diff preserves published worker, Supabase source, auth identity code, AuthGate and original child component/CSS. Adult utility placement from the prior tranche remains; the standalone Manuzinha route does not acquire the adult layout.

The tests prove implemented controls, code paths and simulated-state rendering within their scope. They do not prove real teacher naturalness, acoustics, learning outcomes, live RLS adversarial isolation, calibrated scores, provider invoices or full schema recovery.

## Execution history and corrected test/evidence issues

- **34780540662** stopped before build on a one-time source-materialisation anchor: the workspace lazy boundary was already formatted differently. Its exact recognition was corrected; no safety test was skipped.
- **34780580058** successfully verified the main functional candidate and materialised b013554. Its artifact contained only aggregate bundle metrics because the subsequent production Playwright invocation cleared the shared output directory. No screenshot inspection is claimed from that incomplete artifact.
- The production suite was given a separate output directory, and CI now explicitly requires the expected screenshots as well as metrics before uploading them.
- The wrong-identity browser fixture was tightened to ensure the actual GET response was HTTP 200 rather than relying on a potentially failed CORS preflight. The failure UI alone is not enough to establish identity-parser coverage.
- A new workspace-failure test initially assumed a specific source-key spelling in the Vite manifest. That failed during test collection despite successful preceding suites. It now resolves the unique actual emitted workspace asset and confirms the request was blocked, retaining the recovery assertions.
- **34781057873** then passed the complete strengthened functional/evidence suite on e7294ee. Its downloaded screenshots exposed the heading/grid presentation issue above, which was corrected and verified in the final run 34781382021.

## Evidence artifacts and Preview

Artifact **10325286508** from run34781057873 was downloaded and verified against SHA256 `8b1865c439e7276ed4253b070c60090972c4ea91934788af88ac431ac3f3fded`. Its first Finance mobile and feedback captures were inspected and led to the final visual correction.

Final artifact **10325451413**, 18 files, from run34781382021 was downloaded and verified against SHA256 `296e7218856a19378dd2767a5f6a16444e40a436844c524c9ad559e990e2635f`. It includes 17 screenshots and the aggregate metrics JSON. Finance preparation at1440px, the corrected title at390px and saved-feedback layout at1440px were inspected. All data displayed in these tests is authored course content or explicitly fictional feedback; no real learner screenshot, audio, credential or storageState was exported.

Vercel confirmed **dpl_CRP1ecQK9rzSLJyup37JoFttgiZJ READY**, source **36a4578235a816d7ddd155698f9b12849522947b**, at the existing separate protected Preview:

`https://dublin-learning-hub-git-feat-professor-211b4d-rjrferreira-2878.vercel.app`

The protected manifest fetch returned SSO rather than public content. No bypass was performed or user-visible bypass URL generated. Browser acceptance used local compiled assets with simulated external services, not an authenticated session on this protected deployment.

## Still open / next real evidence

Actual voice/media/turn-taking, receipt and cost reconciliation, teacher response to the new preparation, evaluator fairness and full end-to-end Golden Lesson acceptance remain pending. The larger original curriculum, persisted assessed free-text exercise workflow, historical database reconstruction, remaining backend authorisation and crash-durable recovery are not labelled completed here. No new live database snapshot, count or invoice verification occurred. The historical SQL-export security block was not retried or bypassed.

Normal reversible work can continue without repeated permission prompts in a later execution, but no self-running development agent, credential-reusing loop or unbounded paid task was left active after this one.

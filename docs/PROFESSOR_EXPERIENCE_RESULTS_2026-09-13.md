# Parallel Professor experience — verified first delivery, 13 September 2026

## Isolation and deployment

Base remains `3d292fe7f913135fd4b461487cc5dffde74bc7e1` on `fix/core-consolidation-2026-09-13`. This work uses `feat/professor-experience-2026-09-13` and stacked **draft PR #3**, targeting the repair branch, without merging it. PR #2 and its voice-validation baseline were not changed.

Verified application head: **4523bd692fae0cfb9d984379956b9f96b8878dd2**. This subsequent evidence file does not change the application.

Vercel inspection confirmed separate Preview **dpl_7zoJNm6Pw63FSkfnXoJMZoPwcWDg**, READY for the verified application head, alias:

`https://dublin-learning-hub-git-feat-professor-211b4d-rjrferreira-2878.vercel.app`

The previous voice-trial Preview and ordinary V2 link remain separate. No access-protection bypass was created. A Preview build does not deploy the LiveKit worker or complete live-media acceptance.

## Implemented learner-facing functionality

The actual shared ProfessorSessionPanel now includes ProfessorLearningGuide before a connection and after it ends, not during connecting/connected states. It is scoped to the three known Golden Lesson IDs and the matching account. Unknown lesson IDs do not receive an unrelated default lesson.

Each of Finance, Payroll and English has one static study companion: goal, three focus skills, Understand / Try it / Explain it path, original explanation, optional Portuguese clarification, worked example, three practice questions, two progressively revealing hints per question, commented answer, transfer prompt, scope and official source links. There are **nine original practice questions** in total.

The companion does not collect typed answers, mark grades, store retrieval events, infer mastery, change Error Bank or make an AI/voice request. Buttons reveal local content only. Looking at the solution is not recorded as successful retrieval.

Finance uses assumed IFRS 18 presentation categories and an original numerical bridge, not a full statutory implementation checklist. Payroll uses explicitly fictional deduction amounts and distinguishes employee deductions from employer costs, not a live tax-rate calculator. English uses everyday narratives, multiple valid follow-ups and a limited written past-form exercise, not audio or CEFR assessment.

## Authored quality package, not executed model evaluations

- **18 teaching scenarios**, six per course: learner signal, expected next action, failure mode and observation criterion.
- **9 evaluator references**, one strong, partial and incorrect response per course, with evidence and limits rather than a fabricated exact score.
- A proposed shared teaching contract in `quality/PROFESSOR_PEDAGOGY_CANDIDATE.md`, intentionally not imported by the agent or API. It proposes simplifying/replacing instructions, not appending endless rules.

No Professor/evaluator model outputs were generated in this batch. Fixture/schema tests are not evidence that the real teacher now follows these behaviours or that its assessment is calibrated.

## Verification actually completed

1. **Run 34777518645: SUCCESS**, initial source `67e3b786caf07169a364defa5f7f70449704e050`.
2. Initial screenshots were inspected. A small isolated CSS update improved title typography specificity and mobile reading width; it did not change tests, prompts, permissions, scoring or backend logic.
3. **Run 34777680717: SUCCESS**, final application source `4523bd692fae0cfb9d984379956b9f96b8878dd2`.

Both workflows completed the same checks: baseline protected-path diff; locked application/API build; **113 Node contracts** (102 existing plus 11 added); and **44 Playwright tests** (24 unit-style regressions and 20 browser cases, including seven new companion cases). The seven new cases exercise three courses at desktop/mobile sizes and native keyboard disclosure. Browser Auth/REST is fictional and provider paths are blocked. These are not 44 real user login/voice trials and not 18 executed LLM evaluations.

Six final companion screenshots were produced in artifact **10324242463**, SHA256 **125699361f31dbfd5345e26928db161b0fb5cb19546fa79d45e99d6e63edcb0e**, then downloaded with the artifact hash verified. Final Finance desktop and Payroll mobile captures were inspected. They contain only authored study material and fictional test setup, not real learner history or credentials.

The companion fits the tested width and uses touch-sized buttons. Existing floating application launchers can still overlay part of a long mobile capture; global mobile toolbar consolidation is not completed here. This is not a claim of perfect accessibility or a complete Professor-interface redesign.

## Boundaries and remaining content work

These are **three study companions, not three finished Golden Lessons**. The live Professor does not yet receive their contents in its lesson context. Finance still needs the larger group/Irish statutory layer; Payroll needs dated real-rule examples and lifecycle coverage; English needs listening, live interaction and level-calibrated material. Integration of questions/cases into persistent learning and full course completion is not performed by this UI addition.

The published voice worker, current tutor prompt, evaluator, API, database functions, auth rules and Manuzinha source were unchanged; CI explicitly checked those source paths against the preserved base. No personal credentials were reused, no live learner record read/write or Supabase migration was performed, and no model/voice call or new subscription was requested. Existing build/hosting usage is not asserted universally free.

Previously documented live voice, historical reconstruction, security/authorization, durable recovery, cost reconciliation and release gates remain open. The successful guide/UI tests do not silently pass those unrelated gates.

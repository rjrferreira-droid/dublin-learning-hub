# Parallel Professor experience — scope before test execution

Base: 3d292fe7f913135fd4b461487cc5dffde74bc7e1, preserved on fix/core-consolidation-2026-09-13. New work is on feat/professor-experience-2026-09-13. Do not merge or redeploy the worker as part of this companion review.

## Working UI, not a live tutor change

ProfessorLearningGuide is integrated with the actual shared ProfessorSessionPanel for the three existing Golden Lesson identifiers. It appears before a connection and after a connection ends; it hides while connecting/connected. The course goal, three-step preparation path, original worked example, Portuguese support, progressive hints and answer reveal are usable without a voice session. Source/scope details are collapsible rather than crowding the conversation controls.

The guide never sends answers or settings, creates a score, stores progress, calls an LLM, opens audio, or writes the learner history. Its local UI resets on course/phase changes. A different lesson ID gets no misleading default companion. The existing consent/account/connection/cost controls are unchanged. Application auth still applies; no public private-data route was added.

## Pedagogy and evaluator references

18 original synthetic teaching situations, six per course, state expected actions, prohibited failure modes and observations. Nine evaluator reference answers cover strong/partial/incorrect task responses, with evidence and limits, not exact scores or invented outcomes. The candidate teaching contract is deliberately inert and proposes simplifying/replacing part of the shared prompt rather than adding another instruction pile.

No model responses have been generated or graded in this batch. Schema tests validate fixture integrity; they do not prove the teacher is natural or the evaluator accurate. Audio pacing, interruptions and pronunciation need real audio evidence.

## Content boundaries

Three companion packs contain nine original practice items (three per course), each with two hints and a worked answer. Finance bridges assumed IFRS 18 categories; Payroll uses fictional deduction amounts, never presented as current rates; English uses everyday narrative and accepts multiple valid answers. Scope notes explicitly identify missing group/Irish statutory content, dated real payroll rules and audio/language-level assessment. These companions are not three completed Golden Lessons and are not yet part of the live Professor's context.

Sources actually reviewed 2026-09-13: IFRS Foundation IFRS 18 overview and key terms; Revenue latest-RPN and employer payroll-obligation guidance; Department of Social Protection PRSI Employer Guide; British Council past-continuous/past-simple guidance. URLs appear directly in teachingPacks.ts. Explanations and exercises are original, not copies of commercial question banks. Current-rule lookup is not needed to do the explicitly fictional arithmetic.

## Expected verification, not yet a pass claim

Read-only CI is configured to check the protected baseline diff, application build, Node contracts, existing simulated browser regressions and new three-course desktop/mobile progressive-help cases. Synthetic screenshots contain only companion material. No credentials/secrets are referenced by this workflow. Vercel may automatically build a separate protected Preview for this new branch; that is not a production release.

Not included: personal credential reuse, live database inspection/writes, historic migration archival retries, new services/subscriptions, LiveKit calls/deployment, or changes to Manuzinha. Previously recorded reconstruction, authorization, durable recovery, release and complete-Golden-Lesson gates remain open.

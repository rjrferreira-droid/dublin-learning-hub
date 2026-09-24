# Sequence 3 written release preparation

Scope: Finance and English written self-study in the existing isolated Preview.
No Production promotion, provider activation, reservation release or learner
evidence creation. Payroll and Manu stay in visual standby.

The historical September 14 slot-check file contains stale target slugs. The new
offline publication pack derives them from sequence3Registry, the same registry
used by the written renderer. It requires the sequence-2 predecessor and leaves
is_published false. Tests exercise the generated identities against the actual
authored-module resolver and reject standby or unknown tracks.

English: explain-variances-numbers-recommendations. Reviewed on September 20:
four sections, three exercises, a worked variance case, five checkpoint questions
and six terms. Case arithmetic reconciles 10.8 minus 10.0 to 0.8 (8% of plan),
and the three supplied drivers reconcile to 0.8. The incomplete-evidence
exercise now supplies its total and provisional driver instead of asking the
learner to state a numerical variance that was never given.

Official references rechecked:
- https://learnenglish.britishcouncil.org/free-resources/writing/b1/describing-bar-chart
- https://learnenglish.britishcouncil.org/comment/155597 (Describing charts)
- https://learnenglish.britishcouncil.org/comment/155666 (A summary of a line graph)
- https://learnenglish.britishcouncil.org/comment/221388 (A report on a research study)
- https://learnenglish.britishcouncil.org/sites/podcasts/files/LearnEnglish-Listening-B2-A-design-presentation.pdf

These support selection of key figures, comparisons, evidence-based conclusions
and presentation structure. The business examples and prompts are independently
authored; they are not source quotations or certified proficiency assessments.
Only publisher teaching text was used, not reader comments.

Finance: leases-recognition-close-controls-local-frameworks. Structural and
arithmetic tests pass, but publication remains pending original-PDF source review.
The IFRS 16 overview, FRS 102 current-edition page and FRC factsheet index were
accessible. The FRC explainer HTML explicitly warns that its AI conversion has
not been human verified. Original PDFs for the explainer and Factsheets 9/11
could not be retrieved, including their media-host redirects. Do not replace
that missing verification with a claim of completed source review.

English written publication is separate from Professor and Premium Audio
acceptance. Sequence 3 remains outside provider admission. Local exercise
answers are not persisted as assessed mastery.

## Published English result

Source commit: 2cad30f7b723997bb1366197e4777a4107273138. Sixteen targeted
contracts passed locally. Full application/UI CI 35509287385 and disposable
platform CI 35509287395 passed. Vercel reported successful Preview deployment.

The insert was first executed in a rolled-back transaction. A subsequent
transaction created only the English lesson, initially unpublished, with its
five sources and six terms. Actual database identity resolved to the reviewed
module. After CI passed, a separate transaction checked the complete lesson,
sources and terms and published exactly one row:
84075bf8-be15-4642-8196-26c2a524d8da, sequence 3, content version 1.

Authenticated browser acceptance in Rafael's account showed five active
Finance/English lessons. The new English card opened the correct lesson and
the Practice tab displayed all three exercises, including the clarified 0.8m
prompt. This is live written-study acceptance; no assessed answer was submitted.

The five pre-existing lessons retained digest db099ae77bf22d45ee35327457897a46.
Six tutor sessions retained digest ab635bc9a2cb46df57cf526e3600a543; eight usage
rows retained digest 35f649020d91ee8c816ded7a76ca7942. Both uncertain audio
reservations remain USD0.10 each. No Finance sequence-3 row was created.

Reversible catalogue rollback: unpublish only lesson
84075bf8-be15-4642-8196-26c2a524d8da; do not delete material or learner history.

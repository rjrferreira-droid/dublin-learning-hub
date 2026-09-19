# Finance and English written-study release

Target: approved V2 test project `aazfyosqqeujureksqjs`; feature Preview only.

The user's continuing instruction is to deliver accessible Finance and English lessons without waiting for audio or repeated approval prompts. This release covers written self-study only. It does not claim live Professor/audio acceptance, enable providers, change runtime stages, merge the draft PR, or promote Production. Payroll remains visually hidden and its content is preserved; Manu's adult launcher remains hidden and its standalone route is preserved.

## Publication identities

| Track | Lesson | Database ID |
| --- | --- | --- |
| Finance | Revenue judgement: contracts, performance obligations and cut-off | ecdccab9-172c-4ecf-ab10-eb64277641a8 |
| English | Clarify, check understanding and handle meetings | 1735c87f-29da-49ac-a9a9-718d7ff2f21a |

Both are sequence 2, content version 1. Each has four written sections, three local practice exercises, a worked case, five checkpoint questions and six vocabulary terms. Finance has three database source rows; English has five. Practice drafts and checkpoints remain local to the open lesson and do not manufacture saved mastery.

## Preparation evidence

- Generated the existing publication pack; selected Finance and English only.
- Resolved modules by course/module slugs and learner track; required the expected published sequence-1 reference and an unused sequence-2/slug slot.
- Executed the complete insert in a transaction with rollback first, then inserted both lessons as unpublished with sources and terms in one committed transaction.
- Loaded both actual database IDs through the authored-module resolver: identity, four sections, three exercises and five checkpoint items passed.
- Source build `d8fc0dfecae4fc16b6c1b5ae7b84d46016a5bcbf` passed 729 local contract tests and build. Its CI passed 156 browser tests; three obsolete mobile expectations still waited for the removed Manu launcher. Commit `245b9c6f3d8bcdaeec4a61c6a2147b661de076a2` replaces those waits with an explicit absence assertion while retaining checks for other utility controls.
- Public catalogue visibility continues to use existing authenticated RLS; no access policy was changed.
- Original three lessons digest: `f1a509dcdebdc3a9f9ab0caac84f1146`; six tutor sessions digest: `ab635bc9a2cb46df57cf526e3600a543`; eight usage rows digest: `35f649020d91ee8c816ded7a76ca7942`.

## Source recheck

Rechecked on 19 September 2026 against official sources:

- [IFRS Foundation: IFRS 15](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/): model, relative stand-alone allocation and recognition on satisfaction of promises.
- [FRC: FRS 102](https://www.frc.org.uk/library/standards-codes-policy/accounting-and-reporting/uk-accounting-standards/frs-102/) and [original Factsheet 10 PDF](https://www.frc.org.uk/documents/7823/Factsheet_10_-_Revenue_from_Contracts_with_Customers.pdf): separate framework and revised Section 23. Examples use fictional amounts and explicit contract assumptions.
- [British Council: Managing meetings](https://learnenglish.britishcouncil.org/free-resources/business/business/magazine/managing-meetings): clarification, summary and action points. B1/C1 listening and business resource pages also resolve. Exercises and model dialogue are authored learning material, not externally certified proficiency assessments.

## Released result

Both rows were published on 19 September 2026 using a transaction that checked their exact IDs, slugs, version, unpublished state and pre-publication row digests, plus all 12 terms and eight sources. Exactly two rows changed.

An authenticated-role query now returns four active Finance/English lessons, including both new IDs with the expected source and term counts. The preserved original lesson, session and usage counts/digests above remained identical. Payroll's original row was not changed.

CI run `35475891789` passed the full browser regression and production-build lazy-loading/recovery checks. Its separate standby test confirmed the missing Manu/Payroll elements, then failed on an overly strict icon-free Learning button selector. Commit `4c4afc01ccddad4f814e75be3fb9b17e006a58c9` fixes that selector; the final full rerun is tracked separately.

The database/RLS and actual-ID authored resolver have been verified. Browser fixtures validate the real UI with synthetic authentication, not a live learner credential. Live voice, audio playback and real-device acceptance remain outside this written-study release.

Final CI run [35476128354](https://github.com/rjrferreira-droid/dublin-learning-hub/actions/runs/35476128354) completed successfully on source commit `4c4afc01ccddad4f814e75be3fb9b17e006a58c9`: full browser suite, compiled-app recovery, desktop/mobile standby visibility and unchanged-source checks all passed. The earlier pending final rerun is now closed. Vercel feature deployment was successful.

Reversible catalogue rollback, if ever needed: set only these two exact lesson IDs to `is_published=false`. Do not delete lessons, sources, terms or learner history.

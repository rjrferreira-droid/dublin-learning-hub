# ACCA FR written desktop completion · 23 September 2026

## Acceptance basis

- Official reference: [ACCA Financial Reporting (FR) syllabus and study guide, September 2026 to June 2027](https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f7/studyguides/fr_s26_j27_syllabus_and_study_guide.pdf)
- Audited file SHA-256: `3dcc3a5d504b590a2ad8c24383ef67497ffd50d0fe01802204a8a6749bf330f1`
- Detailed study-guide inventory: 111 lettered learning outcomes.
- Exam blueprint used for acceptance: 180 minutes, 100 marks, all compulsory — Section A 15 objective questions × 2 marks; Section B three cases × five objective questions × 2 marks; Section C two constructed responses × 20 marks.
- Product boundary: original independent self-study material. It is not ACCA-approved content, an ACCA past paper, a prediction of live questions or evidence that a learner is exam-ready.

## Learning-outcome evidence

The executable matrix is `src/learning/accaFrSyllabusCoverage.ts`. Every outcome has a paraphrased description, a curriculum lesson code and at least two resolvable evidence IDs. `tests/acca-fr-syllabus-coverage.test.ts` loads all 23 lesson modules and fails if an evidence ID does not resolve.

| Syllabus area | Outcomes audited | Written lesson evidence |
| --- | ---: | --- |
| A · Conceptual and regulatory framework | 27 | A1–A4 plus D2 group-concepts evidence |
| B · Accounting for transactions | 53 | B1–B12 |
| C · Analysis and interpretation | 15 | C1–C4 |
| D · Preparation of financial statements | 12 | D1–D2 |
| E · Employability and technology | 4 | E capstone |
| **Total** | **111** | **111 mapped; no open outcome row** |

## Concrete gaps found and closed

The audit did not treat lesson count or broad topic labels as proof of coverage. It found and repaired 14 outcome-level gaps:

| Outcome | Gap before this block | Evidence after remediation |
| --- | --- | --- |
| A1a–A1b | No explicit definition, necessity or alternative to a conceptual framework | `acca-a1-objective`, `acca-a1-q4`, `acca-a1-p1` |
| A1d | The distinction between formal compliance and faithful representation was implicit | `acca-a2-fundamental`, `acca-a2-q2` |
| A1g | Accounting-policy changes were not explicitly connected to comparative information | `acca-a2-enhancing`, `acca-a2-q4` |
| A3c | Principles-based and rules-based approaches were not compared as complements | `acca-a4-regulation`, `acca-a4-p2` |
| A3e | National standard setters' relationship with IASB due process was implicit | `acca-a4-architecture`, `acca-a4-p2` |
| A4c–A4e | Consolidation requirement, exemption and reporting-date/policy controls were incomplete | `acca-d2-boundary`, `acca-d2-p3` |
| B1a | Self-construction and borrowing-cost timing were only named | `acca-b1-recognition`, `acca-b1-p3` |
| B1f–B1g | Investment-property rationale and accounting were absent | `acca-b1-revaluation`, `acca-b1-q5`, `acca-b1-p3` |
| B5c | Factoring of receivables was absent | `acca-b5-foundation`, `acca-b5-p3` |
| B6c | Sale-and-leaseback accounting was absent | `acca-b6-scope`, `acca-b6-p3` |

The remaining 97 outcomes already had resolvable teaching and practice evidence. Their individual mappings are retained in the executable matrix rather than replaced by a topic-level assertion.

## Practice inventory

- 23 written ACCA FR lessons.
- Per lesson: four teaching sections, five objective checkpoints, three written practice exercises and one applied case.
- Lesson-level stock: 115 checkpoints, 69 written exercises and 23 applied cases.
- Two 30-minute, 20-mark mini mocks remain available as targeted partial drills.
- One new full simulation adds 30 objective questions and two 20-mark constructed responses.
- Written answers remain temporary; only bounded result summaries and review dates are eligible for account sync.

## Full-simulation gap

**Before this block:** the product had two mini mocks of 30 minutes and 20 marks. They did not reproduce the official duration, total marks or three-section structure. They were therefore a material exam-practice gap and could not be described as equivalent to the ACCA FR examination.

**After this block:** `ACCA FR Full Mock 01` is an original 180-minute, 100-mark simulation with:

- Section A: 15 independent objective questions, 30 marks.
- Section B: three scenario cases, each followed by five objective questions, 30 marks.
- Section C: one interpretation response and one consolidated-statement preparation response, 20 marks each.
- Explicit marking guides totalling 40 marks, automatic objective marking totalling 60 marks, D+1/D+7/D+30 review scheduling and bounded result persistence.

This closes the **structural simulation** gap. It does not turn the original mock into an ACCA paper or establish psychometric equivalence. The interface now says this explicitly, and labels both 30-minute papers as partial drills rather than Sections A or B.

## Verification contract

Automated checks cover:

- exactly 111 unique learning-outcome IDs and the official area totals;
- resolution of every outcome to real lesson evidence;
- the 180-minute/100-mark blueprint;
- 15 Section A questions, three Section B cases × five questions, two Section C responses × 20 marks;
- unique question and marking IDs, four-option answer keys and fixed explanations;
- full-mock grading, bounded 100-mark persistence and absence of written responses from saved payloads;
- mini-mock non-equivalence labels;
- desktop rendering and navigation to all 30 objective questions, three cases and both constructed responses;
- existing lesson, progress, reload, recovery and isolated account-sync regressions through the full repository suite and CI.

## Runtime and account boundary

- The written curriculum and mock data are provider-free and do not invoke LiveKit, TTS or paid providers.
- The branch remains Preview-only. No production deployment or merge is part of this completion.
- Automated account-state fixtures and the isolated Preview/V2 path can validate persistence contracts without the owner's personal credentials.
- A final observation using the owner's actual account — sign in, complete work, reload in the desktop browser and confirm the same progress on the next session — remains owner-session acceptance evidence, not a blocker to the audited written curriculum or its automated tests.

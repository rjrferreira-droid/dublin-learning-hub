# Finance Golden Lesson — Completion Pack (DRAFT)

Status: draft only — not published to Supabase and not part of learner evidence.

Purpose: complete the existing Finance Golden Lesson (`IFRS 18, Group Reporting & Irish Statutory Accounts`) with the missing active-learning assets required by the V2 Master Blueprint: vocabulary, retrieval, application, case work and assessment. The current database lesson already has six competency links but no `lesson_terms`, `cases` or `questions` rows, so this pack prepares those assets without altering the live learner journey.

Source review date: 2026-09-05.

## 1. Authoritative content anchors

The lesson should teach IFRS 18 as a presentation/disclosure standard, not as a measurement standard. Core anchors:

- IFRS 18 replaces IAS 1 and is effective for annual reporting periods beginning on or after 1 January 2027, with earlier application permitted.
- It introduces defined subtotals in the statement of profit or loss, including operating profit and profit before financing and income taxes.
- It requires disclosures about management-defined performance measures (MPMs).
- It introduces enhanced aggregation/disaggregation principles.
- An MPM is a subtotal of income and expenses that meets the IFRS 18 criteria; not every KPI or non-GAAP metric is an MPM. Measures such as free cash flow are not themselves MPMs because they are not subtotals of income and expenses.
- IFRS 18 also makes limited consequential amendments to IAS 7; this should be acknowledged but not allowed to turn this lesson into an IAS 7 lesson.

Primary sources:
- IFRS Foundation — IFRS 18 standard page: https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/
- IFRS Foundation — IFRS 18 key terms: https://www.ifrs.org/supporting-implementation/supporting-materials-by-ifrs-standards/ifrs-18/key-terms/
- IFRS Foundation — project summary / at-a-glance: https://www.ifrs.org/content/dam/ifrs/project/primary-financial-statements/ifrs-standard/projectsummary-ifrs18-april2024.pdf
- IFRIC Update June 2026 (current implementation issues; teach as watchlist, not final new requirements): https://www.ifrs.org/news-and-events/updates/ifric/2026/ifric-update-june-2026/

## 2. Learning design goal

The learner should finish the lesson able to do four things without notes:

1. State the three headline IFRS 18 changes in a concise executive answer.
2. Distinguish an IFRS-defined subtotal from an MPM and from a generic KPI.
3. Identify the first implementation actions for a multinational finance team.
4. Explain the business/reporting impact in professional English, conclusion first.

The Professor should not reward a technically correct but list-like answer if the learner cannot connect it to governance, systems, comparability, investor communication or implementation sequencing.

## 3. Proposed `lesson_terms` rows

Sequence | Term EN | Translation PT | Definition EN | Example EN
---|---|---|---|---
1 | Operating profit | Lucro operacional | The IFRS 18 subtotal comprising all income and expenses classified in the operating category. | “Operating profit becomes a defined anchor point that improves comparability across companies.”
2 | Profit before financing and income taxes | Lucro antes de financiamento e imposto de renda | The total of operating profit or loss plus all income and expenses classified in the investing category. | “The new subtotal gives users another consistent point of reference before financing and tax effects.”
3 | Management-defined performance measure (MPM) | Medida de desempenho definida pela administração | A qualifying subtotal of income and expenses used in public communications to convey management’s view of an aspect of financial performance and not otherwise specified by IFRS. | “Adjusted operating profit may be an MPM if it meets the IFRS 18 definition.”
4 | Public communications | Comunicações públicas | External communications considered when identifying whether a qualifying subtotal is used as an MPM. | “Finance needs governance over public communications because they can determine the population of MPMs.”
5 | Aggregation | Agregação | Grouping items that share characteristics when that grouping provides useful information. | “Aggregation should reduce clutter without hiding material differences.”
6 | Disaggregation | Desagregação | Separating items when differences in characteristics are important to users. | “The team may need additional disaggregation if one line item combines materially different expenses.”
7 | Reconciliation | Reconciliação | A bridge explaining how an MPM relates to the most directly comparable IFRS-defined subtotal or total. | “The MPM disclosure needs a transparent reconciliation rather than a stand-alone adjusted number.”
8 | Implementation readiness | Prontidão para implementação | The state in which accounting policy, data, systems, controls, governance and external communication are prepared for the new reporting requirements. | “Implementation readiness is broader than changing the face of the income statement.”

## 4. Retrieval questions for the lesson body

These are short retrieval prompts, not scored final-test questions.

- “Give me the three headline changes under IFRS 18 without looking at your notes.”
- “Why is it wrong to describe IFRS 18 as only a formatting change?”
- “What is the difference between an MPM and any management KPI?”
- “What is the executive reason aggregation and disaggregation matter?”
- “What would you check first if your group already publishes adjusted operating profit?”

Expected Professor behaviour: if the learner starts with a long technical description, interrupt once and ask for the conclusion first; then probe the rationale.

## 5. Proposed case row

### Title
Adjusted operating profit: from KPI to governed external measure

### Scenario PT
Um grupo multinacional divulga “Adjusted Operating Profit” em apresentações públicas e releases de resultados. O indicador parte do operating profit, mas exclui determinados custos de reestruturação e itens classificados internamente como não recorrentes. A definição não é totalmente consistente entre unidades e o processo atual depende de planilhas manuais. A administração quer manter a medida após a adoção do IFRS 18 e pede ao time de Finance que avalie o impacto, os controles necessários e a mensagem a ser levada ao CFO.

### Prompt PT
Você é o Senior Finance Manager responsável pela primeira avaliação. Em até 90 segundos, explique: (1) qual é o principal tema contábil; (2) quais verificações você faria para determinar o tratamento da medida sob IFRS 18; (3) quais riscos de processo/governança existem; e (4) quais três ações você recomendaria primeiro. Comece pela conclusão executiva.

### Model answer PT
A primeira conclusão é que o grupo não deve tratar o indicador apenas como um KPI interno: por ser um subtotal de receitas e despesas usado em comunicação pública para expressar a visão da administração sobre desempenho, ele pode atender à definição de MPM e, portanto, exigir as divulgações específicas do IFRS 18. Eu confirmaria a população de comunicações públicas, a definição exata e consistente da medida, os itens incluídos/excluídos e o subtotal IFRS mais diretamente comparável. Em seguida avaliaria a reconciliação, a explicação de por que a administração considera a medida útil, os efeitos tributários e de participações não controladoras quando aplicáveis e a consistência entre períodos. O principal risco operacional é continuar com lógica manual e definições diferentes entre unidades, o que cria risco de reconciliação, controle e comunicação externa. As três primeiras ações seriam: inventariar as medidas e comunicações externas; definir policy, ownership e controles de governança; e fazer um data/system gap assessment para produzir a reconciliação e as divulgações de forma repetível e auditável.

### Rubric proposal
- Technical accuracy — 35%
- Executive conclusion and prioritisation — 20%
- Governance / control awareness — 20%
- Implementation sequencing — 15%
- Professional communication — 10%

AI feedback: enabled when this case is eventually published.

## 6. Proposed scored assessment questions

### Q1 — Multiple choice — core definition
Prompt EN: Which statement best describes the purpose of IFRS 18?

A. It changes how all major income-statement items are measured.
B. It improves presentation and disclosure of financial performance, including defined subtotals, MPM disclosures and aggregation/disaggregation principles.
C. It replaces IAS 7 and introduces a new cash-flow measurement model.
D. It requires every management KPI to be disclosed in the financial statements.

Correct: B.

Explanation PT: IFRS 18 concentra-se principalmente em apresentação e divulgação. Ele não é uma revisão geral de mensuração e nem transforma todo KPI em MPM.

Difficulty: 1.

### Q2 — Multiple choice — MPM judgement
Prompt EN: A company publishes “free cash flow” as a headline KPI. Is that measure automatically an IFRS 18 MPM?

A. Yes, because it is used publicly.
B. Yes, if management considers it important.
C. No. An MPM must be a qualifying subtotal of income and expenses; a cash-flow measure is not itself an MPM.
D. No, because IFRS 18 prohibits non-GAAP measures.

Correct: C.

Explanation PT: Uso público é apenas uma parte do teste. A medida também precisa ser um subtotal de receitas e despesas que atenda aos demais critérios do IFRS 18.

Difficulty: 2.

### Q3 — Short answer — executive communication
Prompt EN: In no more than three sentences, explain to a CFO why IFRS 18 is more than an income-statement formatting project.

Expected evidence:
- defined subtotals / comparability;
- MPM governance and disclosure;
- aggregation/disaggregation and data/process implications;
- clear business/implementation consequence.

Difficulty: 3.

### Q4 — Applied judgement
Prompt PT: O grupo usa um adjusted operating profit em releases e apresentações a investidores, mas cada BU aplica pequenas diferenças na definição. Qual é o principal risco de implementação e qual seria sua primeira ação?

Expected answer: inconsistent definition/governance and unreliable reconciliation/disclosure; first create an inventory and controlled group-wide definition/ownership before automating the reporting.

Difficulty: 3.

### Q5 — Implementation sequencing
Prompt EN: Put these actions in the most sensible starting sequence for an IFRS 18 implementation: (a) automate the final disclosure; (b) inventory external performance measures and current P&L presentation; (c) define accounting/governance decisions; (d) assess data and system gaps.

Correct sequence: b -> c -> d -> a.

Difficulty: 2.

## 7. Professor challenge prompts

Use selectively, based on the learner’s answer:

- “That is the accounting description. What is the management consequence?”
- “Are you sure that metric is an MPM? Walk me through the definition.”
- “You gave me six actions. Which three happen first?”
- “What would make this fail in a real multinational close process?”
- “Give me the CFO version in twenty seconds.”
- “Now explain the same point to a non-accountant business leader.”

## 8. 2026 watchlist — do not teach tentative discussions as final requirements

As of 5 September 2026, IFRIC has active implementation discussions around IFRS 18, including MPM questions and presentation of operating expenses. These discussions are useful for advanced challenge questions, but tentative agenda decisions must be labelled as such until finalised. The Professor must not convert a tentative conclusion into a new mandatory rule.

## 9. Acceptance gates before publishing this pack

- Verify every factual statement against current IFRS Foundation materials on the publication date.
- Map each scored question to one of the existing six lesson competencies.
- Confirm UI rendering for vocabulary, case and mixed question types.
- Confirm Professor receives the case/vocabulary context without source dumping.
- Run a Validation Mode Professor session and confirm no Error Bank, competency or spaced-review writes.
- Run authenticated smoke/regression tests.
- Publish only after Rafael’s Golden Lesson acceptance; do not treat this draft as learner evidence.

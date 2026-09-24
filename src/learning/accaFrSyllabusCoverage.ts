export const ACCA_FR_SYLLABUS_SOURCE={
 sitting:'September 2026 to June 2027',
 url:'https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f7/studyguides/fr_s26_j27_syllabus_and_study_guide.pdf',
 sha256:'3dcc3a5d504b590a2ad8c24383ef67497ffd50d0fe01802204a8a6749bf330f1',
 auditedOn:'2026-09-23'
} as const;

export const ACCA_FR_EXAM_BLUEPRINT={
 durationMinutes:180,totalMarks:100,
 sections:[
  {id:'A',format:'objective',questions:15,marksEach:2,totalMarks:30},
  {id:'B',format:'case-objective',cases:3,questionsPerCase:5,marksEach:2,totalMarks:30},
  {id:'C',format:'constructed-response',questions:2,marksEach:20,totalMarks:40}
 ]
} as const;

export type AccaFrCoverageStatus='covered'|'remediated';
export type AccaFrCoverageRow={
 id:string;area:'A'|'B'|'C'|'D'|'E';lessonCode:string;summary:string;
 evidenceIds:readonly string[];status:AccaFrCoverageStatus;remediation?:string;
};
type Draft=readonly [id:string,summary:string,evidenceIds:readonly string[],remediation?:string];
const rows=(lessonCode:string,drafts:readonly Draft[]):AccaFrCoverageRow[]=>drafts.map(([id,summary,evidenceIds,remediation])=>({
 id,area:id[0] as AccaFrCoverageRow['area'],lessonCode,summary,evidenceIds,status:remediation?'remediated':'covered',...(remediation?{remediation}:{})
}));

// Outcome summaries are intentionally paraphrased. Evidence IDs resolve to authored lesson
// sections, checkpoints, practice exercises or case studies in the local written curriculum.
export const ACCA_FR_SYLLABUS_COVERAGE:readonly AccaFrCoverageRow[]=[
 ...rows('A1',[
 ['A1a','Meaning and role of a financial-reporting conceptual framework',['acca-a1-objective','acca-a1-q4','acca-a1-p1'],'Added an explicit definition and framework role.'],
  ['A1b','Need for a framework and risks of a case-by-case alternative',['acca-a1-objective','acca-a1-p1'],'Added comparison with rule-by-rule development.']
 ]),
 ...rows('A2',[
  ['A1c','Relevance, faithful representation and enhancing qualities',['acca-a2-fundamental','acca-a2-case']],
  ['A1d','Faithful representation beyond formal standards compliance',['acca-a2-fundamental','acca-a2-q2'],'Added the boundary between formal compliance and faithful depiction.'],
  ['A1e','Understandability and verifiability in useful information',['acca-a2-enhancing','acca-a2-case']],
  ['A1f','Importance of comparability and timeliness',['acca-a2-enhancing','acca-a2-q4']],
  ['A1g','Comparability when accounting policies change',['acca-a2-enhancing','acca-a2-q4'],'Added policy-change transition and comparative-information reasoning.']
 ]),
 ...rows('A3',[
  ['A2a','Recognition and the factors governing recognition',['acca-a3-recognition','acca-a3-q2']],
  ['A2b','Recognition applied to assets, liabilities, income and expenses',['acca-a3-elements','acca-a3-p1']],
  ['A2c','Historical cost, current cost, value in use or fulfilment value, and fair value',['acca-a3-measurement','acca-a3-q3']],
  ['A2d','Benefits and limitations of historical-cost accounting',['acca-a3-measurement','acca-a3-case']],
  ['A2e','Extent to which current values address historical-cost limitations',['acca-a3-measurement','acca-a3-p2']]
 ]),
 ...rows('A4',[
  ['A3a','Why regulation is needed and IFRS compared with national frameworks',['acca-a4-regulation','acca-a4-q5']],
  ['A3b','Why IFRS standards alone are not a complete regulatory system',['acca-a4-architecture','acca-a4-p1']],
  ['A3c','Principles-based and rules-based approaches as complements',['acca-a4-regulation','acca-a4-p2'],'Added an explicit principles-versus-rules comparison.'],
  ['A3d','IASB standard-setting, revision and interpretation process',['acca-a4-due-process','acca-a4-q3']],
  ['A3e','National standard setters in relation to IASB standard setting',['acca-a4-architecture','acca-a4-p2'],'Added national-setter input and adoption boundaries.'],
  ['A3f','Purpose and role of the ISSB',['acca-a4-architecture','acca-a4-q1']]
 ]),
 ...rows('D2',[
  ['A4a','A group viewed as one economic unit',['acca-d2-adjustments','acca-d2-case']],
  ['A4b','Subsidiary definition and control assessment',['acca-d2-boundary','acca-d2-q1']],
  ['A4c','Circumstances requiring consolidated statements',['acca-d2-boundary','acca-d2-p3'],'Added the general consolidation requirement.'],
  ['A4d','Circumstances supporting a consolidation exemption',['acca-d2-boundary','acca-d2-p3'],'Added the intermediate-parent exemption conditions.'],
  ['A4e','Coterminous reporting dates and uniform accounting policies',['acca-d2-boundary','acca-d2-p3'],'Added reporting-date and policy alignment controls.'],
  ['A4f','Reason for eliminating intragroup transactions',['acca-d2-adjustments','acca-d2-p2']],
  ['A4g','Objective of consolidated financial statements',['acca-d2-boundary','acca-d2-case']],
  ['A4h','Acquisition-date fair values for consideration and identifiable net assets',['acca-d2-goodwill','acca-d2-q2']],
  ['A4i','Associate definition and rationale for the equity method',['acca-d2-adjustments','acca-d2-q4']]
 ]),
 ...rows('B1',[
  ['B1a','Initial PPE measurement including self-construction and borrowing costs',['acca-b1-recognition','acca-b1-p3'],'Added self-construction and borrowing-cost timing.'],
  ['B1b','Capitalisable subsequent expenditure versus expense',['acca-b1-components','acca-b1-q4']],
  ['B1c','Non-current-asset revaluation requirements',['acca-b1-revaluation','acca-b1-case']],
  ['B1d','Revaluation and disposal gains and losses',['acca-b1-revaluation','acca-b1-case']],
  ['B1e','Depreciation under cost, revaluation and component approaches',['acca-b1-depreciation','acca-b1-case']],
  ['B1f','Why investment property differs from owner-occupied property',['acca-b1-revaluation','acca-b1-q5'],'Added the purpose and performance distinction.'],
  ['B1g','Investment-property accounting models',['acca-b1-revaluation','acca-b1-p3'],'Added IAS 40 fair-value and cost models.']
 ]),
 ...rows('B2',[
  ['B2a','Internally generated and purchased intangible assets',['acca-b2-definition','acca-b2-p1']],
  ['B2b','Goodwill distinguished from other intangibles',['acca-b2-definition','acca-b2-q1']],
  ['B2c','Initial recognition and measurement of intangibles',['acca-b2-development','acca-b2-case']],
  ['B2d','Subsequent treatment of intangible assets',['acca-b2-subsequent','acca-b2-q4']],
  ['B2e','Research and development requirements',['acca-b2-research','acca-b2-case']]
 ]),
 ...rows('B3',[
  ['B3a','Impairment loss calculation and goodwill testing principle',['acca-b3-recoverable','acca-b3-case']],
  ['B3b','Reversal of an individual-asset impairment',['acca-b3-reversal','acca-b3-p3']],
  ['B3c','Internal and external impairment indicators',['acca-b3-identify','acca-b3-q1']],
  ['B3d','Meaning and identification of a cash-generating unit',['acca-b3-cgu','acca-b3-q3']],
  ['B3e','Allocation of a CGU impairment loss',['acca-b3-cgu','acca-b3-case']]
 ]),
 ...rows('B4',[
  ['B4a','Inventory measurement and net realisable value',['acca-b4-nrv','acca-b4-case']],
  ['B4b','Biological assets and agricultural produce',['acca-b4-biological','acca-b4-p3']]
 ]),
 ...rows('B5',[
  ['B5a','Need for financial-instrument accounting requirements',['acca-b5-foundation','acca-b5-q1']],
  ['B5b','Financial asset and liability definitions',['acca-b5-foundation','acca-b5-q1']],
  ['B5c','Receivables factoring and derecognition or financing',['acca-b5-foundation','acca-b5-p3'],'Added factoring with recourse and derecognition logic.'],
  ['B5d','Amortised cost, FVOCI and FVTPL measurement and gains or losses',['acca-b5-classification','acca-b5-q2']],
  ['B5e','Debt versus equity classification',['acca-b5-presentation','acca-b5-p2']],
  ['B5f','Equity, redeemable debt and convertible instruments',['acca-b5-presentation','acca-b5-case']]
 ]),
 ...rows('B6',[
  ['B6a','Lessee right-of-use asset and lease-liability accounting',['acca-b6-initial','acca-b6-case']],
  ['B6b','Short-term and low-value lessee exemptions',['acca-b6-scope','acca-b6-q5']],
  ['B6c','Sale-and-leaseback at fair-value proceeds',['acca-b6-scope','acca-b6-p3'],'Added the sale test, retained right and gain boundary.']
 ]),
 ...rows('B7',[
  ['B7a','Why provisions need an accounting standard',['acca-b7-recognition','acca-b7-q1']],
  ['B7b','Legal and constructive obligations',['acca-b7-recognition','acca-b7-p2']],
  ['B7c','When provisions are recognised and how they are recorded',['acca-b7-recognition','acca-b7-case']],
  ['B7d','Provision measurement and expected value',['acca-b7-measurement','acca-b7-q2']],
  ['B7e','Contingent assets and liabilities',['acca-b7-contingencies','acca-b7-q3']],
  ['B7f','Warranties, guarantees, onerous contracts, restoration and restructuring',['acca-b7-measurement','acca-b7-p2']],
  ['B7g','Adjusting, non-adjusting and separately disclosed subsequent events',['acca-b7-events','acca-b7-case']]
 ]),
 ...rows('B8',[
  ['B8a','Current-tax accounting',['acca-b8-current','acca-b8-p1']],
  ['B8b','Taxable and deductible temporary differences',['acca-b8-taxbase','acca-b8-q2']],
  ['B8c','Deferred-tax computation and recording',['acca-b8-deferred','acca-b8-case']]
 ]),
 ...rows('B9',[
  ['B9a','Importance of separately identifying discontinued operations',['acca-b9-disposals','acca-b9-q1']],
  ['B9b','Assets held for sale and discontinued operations',['acca-b9-disposals','acca-b9-case']],
  ['B9c','Separate disclosure of material income or expense',['acca-b9-changes','acca-b9-p2']],
  ['B9d','Estimates, accounting policies and prior-period errors',['acca-b9-changes','acca-b9-q3']],
  ['B9e','Basic and diluted EPS including capital changes and potential shares',['acca-b9-eps','acca-b9-case']],
  ['B9f','IFRS S1 objective, scope and core content',['acca-b9-sustainability','acca-b9-q5']]
 ]),
 ...rows('B10',[
  ['B10a','Five-step revenue-recognition model',['acca-b10-five-steps','acca-b10-case']],
  ['B10b','Performance obligations satisfied over time or at a point in time',['acca-b10-timing','acca-b10-q2']],
  ['B10c','Output and input methods for measuring progress',['acca-b10-timing','acca-b10-p1']],
  ['B10d','Contract-cost recognition criteria',['acca-b10-costs','acca-b10-q4']],
  ['B10e','Principal-agent, repurchase, bill-and-hold and consignment arrangements',['acca-b10-special','acca-b10-p3']],
  ['B10f','Financial-statement extracts for revenue contracts',['acca-b10-costs','acca-b10-case']]
 ]),
 ...rows('B11',[
  ['B11a','Government-grant recognition, presentation and repayment',['acca-b11-recognition','acca-b11-case']]
 ]),
 ...rows('B12',[
  ['B12a','Functional versus presentation currency and need for translation',['acca-b12-currencies','acca-b12-q1']],
  ['B12b','Initial and reporting-date translation of monetary and non-monetary items',['acca-b12-reporting','acca-b12-case']]
 ]),
 ...rows('C1',[
  ['C1a','Historical information as a predictor of future performance',['acca-c1-history','acca-c1-q1']],
  ['C1b','Manipulation of financial statements',['acca-c1-manipulation','acca-c1-p2']],
  ['C1c','Year-end snapshots, seasonality and major acquisitions',['acca-c1-snapshot','acca-c1-case']],
  ['C1d','Interpretation limits of consolidated statements',['acca-c1-group','acca-c1-q4']]
 ]),
 ...rows('C2',[
  ['C2a','Definition and calculation of relevant financial ratios',['acca-c2-profitability','acca-c2-case']],
  ['C2b','Performance aspects assessed by specific ratios',['acca-c2-working-capital','acca-c2-q2']],
  ['C2c','Comparison with prior periods, peers and industry averages',['acca-c2-integrated','acca-c2-case']],
  ['C2d','Integrated financial, cash-flow and non-financial interpretation for stakeholders',['acca-c2-integrated','acca-c2-p3']],
  ['C2e','Current values compared with historical cost in interpretation',['acca-c2-financing','acca-c2-q4']],
  ['C2f','Other relevant non-financial information',['acca-c2-integrated','acca-c2-case']]
 ]),
 ...rows('C3',[
  ['C3a','Limitations of ratio analysis',['acca-c3-ratio-limits','acca-c3-q1']],
  ['C3b','Interpretation effects of differing accounting policies',['acca-c3-policies','acca-c3-p2']],
  ['C3c','Cash-flow information compared with financial performance',['acca-c3-cashflow','acca-c3-case']],
  ['C3d','EPS trend usefulness and limitations as a performance measure',['acca-c3-eps','acca-c3-q5']]
 ]),
 ...rows('C4',[
  ['C4a','Interpretation differences for not-for-profit and public-sector entities',['acca-c4-objectives','acca-c4-case']]
 ]),
 ...rows('D1',[
  ['D1a','Single-entity financial position and performance statements',['acca-d1-primary','acca-d1-case']],
  ['D1b','Statement of changes in equity purpose and content',['acca-d1-equity','acca-d1-q2']],
  ['D1c','Indirect-method cash-flow statement extracts',['acca-d1-cashflow','acca-d1-case']]
 ]),
 ...rows('D2',[
  ['D2a','Simple-group consolidated statement of financial position',['acca-d2-goodwill','acca-d2-case']],
  ['D2b','Simple-group consolidated performance and OCI statements',['acca-d2-disposal','acca-d2-case']],
  ['D2c','Share premium, revaluation surplus and other equity components',['acca-d2-goodwill','acca-d2-q2']],
  ['D2d','Intragroup asset transfers and dividends',['acca-d2-adjustments','acca-d2-p2']],
  ['D2e','Acquisition fair-value adjustments for assets and liabilities',['acca-d2-goodwill','acca-d2-case']],
  ['D2f','Recognition and allocation of goodwill impairment',['acca-d2-goodwill','acca-d2-case']],
  ['D2g','Required treatment of goodwill',['acca-d2-goodwill','acca-d2-p1']],
  ['D2h','Bargain-purchase explanation and treatment',['acca-d2-goodwill','acca-d2-q2']],
  ['D2i','Total disposal of a subsidiary in parent and group statements',['acca-d2-disposal','acca-d2-q5']]
 ]),
 ...rows('E',[
  ['E1','Efficient access and manipulation of relevant information',['acca-e-access','acca-e-case']],
  ['E2','Use of response options and workplace-style functions',['acca-e-response','acca-e-p2']],
  ['E3','Navigation and amendment of responses with appropriate tools',['acca-e-navigation','acca-e-q3']],
  ['E4','Effective presentation of data and information',['acca-e-presentation','acca-e-case']]
 ])
] as const;

export const ACCA_FR_REMEDIATED_OUTCOME_IDS=ACCA_FR_SYLLABUS_COVERAGE.filter(row=>row.status==='remediated').map(row=>row.id);

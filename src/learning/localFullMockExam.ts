import type {LocalFullMockExam,MockObjectiveQuestion} from './localMockExam.ts';

const q=(id:string,topic:string,prompt:string,options:readonly string[],correctIndex:number,explanation:string):MockObjectiveQuestion=>({id,topic,prompt,options,correctIndex,explanation});

export const ACCA_FR_FULL_MOCK_1:LocalFullMockExam={
 format:'full',
 equivalenceNotice:'Full original simulation matching the official 180-minute, 100-mark section structure. It is independent practice, not an ACCA past paper, prediction or ACCA-approved material.',
 id:'acca-fr-full-mock-01',
 title:'ACCA FR Full Mock 01',
 subtitle:'Original full-length written simulation · September 2026 to June 2027 blueprint',
 focusAreas:['Section A · 15 objective tests','Section B · 3 cases × 5 objective tests','Section C · interpretation and preparation','All questions compulsory'],
 durationMinutes:180,objectiveMarks:60,constructedMarks:40,
 sectionAQuestions:[
  q('fr-f1-a01','Conceptual framework','Which statement best describes the role of the Conceptual Framework?',['It overrides a conflicting IFRS Standard','It provides coherent concepts for standard setting and gap-filling judgements','It guarantees identical estimates','It is a national tax code'],1,'The Framework supports coherent standards and judgements where no Standard applies, but it does not override a specific IFRS requirement.'),
  q('fr-f1-a02','IAS 16 · PPE','A qualifying machine costs CU500, delivery CU20, training CU12 and abnormal testing waste CU8. What is initial PPE cost?',['CU500','CU520','CU532','CU540'],1,'Delivery is directly attributable. Training and abnormal waste are expensed, so initial cost is CU520.'),
  q('fr-f1-a03','IAS 38 · Development','Which item is required before development expenditure can be capitalised?',['A board preference for capitalisation','Technical feasibility and probable future economic benefits among the recognition criteria','A registered patent in every case','Cash payment before year end'],1,'Capitalisation begins only when all development recognition criteria, including technical feasibility and probable benefits, are demonstrated.'),
  q('fr-f1-a04','IAS 36 · Impairment','An asset has carrying amount CU140, value in use CU118 and fair value less costs of disposal CU125. What impairment is recognised?',['CU15','CU22','CU7','Nil'],0,'Recoverable amount is the higher of CU118 and CU125, so impairment is CU140 − CU125 = CU15.'),
  q('fr-f1-a05','IAS 2 · Inventory','Inventory cost is CU72. Expected selling price is CU79 and completion and selling costs are CU10. At what amount is it measured?',['CU69','CU72','CU79','CU82'],0,'Net realisable value is CU69; inventory is measured at the lower of cost CU72 and NRV CU69.'),
  q('fr-f1-a06','IFRS 9 · Factoring','Receivables are factored with full recourse for customer default. Which treatment is most likely?',['Derecognise receivables solely because cash was received','Continue receivables and recognise a financing liability','Recognise revenue equal to proceeds','Transfer the default risk to equity'],1,'Full recourse normally retains substantial credit risk, supporting continued recognition of receivables plus a financing liability.'),
  q('fr-f1-a07','IFRS 16 · Sale and leaseback','A transfer qualifies as a sale at fair value and the seller leases the asset back. Which gain is recognised?',['The entire disposal gain','Only the gain relating to rights transferred to the buyer-lessor','No gain in every case','A gain equal to the lease liability'],1,'The seller-lessee recognises only the gain relating to rights transferred and retains a right-of-use asset for the right kept.'),
  q('fr-f1-a08','IAS 37 · Provisions','Which event most clearly creates a constructive obligation?',['A confidential plan not communicated','A detailed published policy creating a valid expectation in affected parties','A future operating loss forecast','A possible purchase next year'],1,'A constructive obligation arises from established practice or a sufficiently specific statement that creates a valid expectation.'),
  q('fr-f1-a09','IAS 12 · Deferred tax','A liability has carrying amount CU80 and tax base CU50. Ignoring exceptions, what temporary difference arises?',['CU30 taxable','CU30 deductible','CU50 taxable','No temporary difference'],1,'For a liability, carrying amount above tax base gives a deductible temporary difference of CU30.'),
  q('fr-f1-a10','IFRS 5 · Held for sale','Which condition is required for held-for-sale classification?',['Sale is merely possible in five years','Asset is available for immediate sale and sale is highly probable','Management intends continued use','The asset is fully depreciated'],1,'The asset must be available for immediate sale in its present condition and the sale must be highly probable under the specified criteria.'),
  q('fr-f1-a11','IFRS 15 · Revenue','A performance obligation is satisfied over time and progress can be measured faithfully. When is revenue recognised?',['Only on final invoice','As performance progresses','Only when cash is received','At contract signature'],1,'Revenue follows the measure of progress when the over-time criteria are met and progress can be measured faithfully.'),
  q('fr-f1-a12','IAS 20 · Government grants','When is a government grant recognised?',['Immediately on application','When there is reasonable assurance of compliance with conditions and receipt','Only when cash is spent','Only in equity'],1,'Recognition requires reasonable assurance that the entity will comply with the conditions and receive the grant.'),
  q('fr-f1-a13','IAS 21 · Foreign currency','A foreign-currency monetary payable remains outstanding at year end. Which rate is used?',['Historic transaction-date rate only','Closing rate','Average annual rate in every case','Forward rate chosen by management'],1,'Foreign-currency monetary items are retranslated at the closing rate, with the exchange difference accounted for as required.'),
  q('fr-f1-a14','IAS 33 · EPS','Profit attributable to ordinary shareholders is CU3.0m and weighted-average shares are 1.5m. Basic EPS is:',['CU0.50','CU1.50','CU2.00','CU4.50'],2,'CU3.0m divided by 1.5m shares gives CU2.00 per share.'),
  q('fr-f1-a15','IAS 7 · Cash flows','Cash paid to acquire a subsidiary, net of cash acquired, is normally classified as:',['Operating','Investing','Financing','A cash equivalent'],1,'Acquisition of a controlled business is normally an investing cash flow, presented net of cash acquired.')
 ],
 sectionBCases:[
  {id:'fr-f1-b1',title:'Case 1 · Docklands Properties',scenario:[
   'Docklands constructs a head-office building. Direct construction costs are CU2.40m. Borrowing costs are CU180,000, including CU30,000 during an extended avoidable suspension. Staff training is CU40,000.',
   'A separate building held to earn rentals is measured under the IAS 40 fair value model. Its carrying amount before remeasurement is CU900,000 and year-end fair value is CU960,000.',
   'A production CGU including goodwill has carrying amount CU1.20m and recoverable amount CU1.08m. Goodwill included is CU70,000.'
  ],questions:[
   q('fr-f1-b1q1','Borrowing costs','How much borrowing cost is capitalised?',['CU30,000','CU150,000','CU180,000','Nil'],1,'Capitalisation is suspended during the extended avoidable interruption, leaving CU150,000.'),
   q('fr-f1-b1q2','Self-constructed asset','What is the head-office initial cost from the data given?',['CU2.40m','CU2.55m','CU2.59m','CU2.62m'],1,'CU2.40m direct cost plus CU150,000 qualifying borrowing costs equals CU2.55m; training is expensed.'),
   q('fr-f1-b1q3','Investment property','Where is the CU60,000 investment-property fair-value increase recognised?',['OCI','Profit or loss','Share premium','Deferred revenue'],1,'Under the IAS 40 fair value model, the fair-value movement is recognised in profit or loss.'),
   q('fr-f1-b1q4','CGU impairment','What total CGU impairment is recognised?',['CU70,000','CU120,000','CU130,000','Nil'],1,'Carrying amount CU1.20m less recoverable amount CU1.08m gives CU120,000.'),
   q('fr-f1-b1q5','CGU allocation','After allocating impairment first to goodwill, how much remains for pro-rata allocation to other CGU assets?',['CU50,000','CU70,000','CU120,000','Nil'],0,'CU70,000 eliminates goodwill first; CU50,000 remains for other CGU assets subject to allocation floors.')
  ]},
  {id:'fr-f1-b2',title:'Case 2 · Liffey Retail',scenario:[
   'Liffey sells equipment for CU500,000 at fair value and immediately leases it back. The transfer qualifies as a sale. The present value of lease payments is CU200,000 and the equipment carrying amount before sale is CU320,000. Assume the retained right is 40% of the previous asset.',
   'A product sale of CU120,000 includes a service performance obligation. Relative stand-alone selling prices allocate CU75,000 to the product and CU45,000 to service. The product is delivered immediately; service is provided evenly for 12 months and three months are complete.',
   'A court claim creates a present obligation. A CU90,000 outflow is probable and is the best estimate.'
  ],questions:[
   q('fr-f1-b2q1','Sale and leaseback','What right-of-use asset is recognised initially?',['CU80,000','CU128,000','CU200,000','CU320,000'],1,'The retained right is 40% of the previous CU320,000 carrying amount, giving CU128,000.'),
   q('fr-f1-b2q2','Sale and leaseback','What part of the CU180,000 total sale gain relates to rights transferred?',['CU72,000','CU108,000','CU180,000','Nil'],1,'Rights transferred are 60%, so recognised gain is CU180,000 × 60% = CU108,000.'),
   q('fr-f1-b2q3','Revenue allocation','How much revenue is recognised immediately for the delivered product?',['CU45,000','CU75,000','CU120,000','CU131,250'],1,'The allocated product amount is CU75,000 and is recognised when that obligation is satisfied.'),
   q('fr-f1-b2q4','Revenue timing','How much service revenue is recognised after three months?',['CU3,750','CU11,250','CU33,750','CU45,000'],1,'The service is provided evenly, so CU45,000 × 3/12 = CU11,250 is recognised after three months.'),
   q('fr-f1-b2q5','Provisions','How is the court claim treated?',['Disclose only as remote','Recognise a CU90,000 provision','Recognise a CU90,000 asset','Ignore until paid'],1,'A present obligation with probable outflow and reliable best estimate is recognised as a CU90,000 provision.')
  ]},
  {id:'fr-f1-b3',title:'Case 3 · Grand Canal Group',scenario:[
   'Parent acquired 80% of Subsidiary for CU760,000. Fair-value NCI was CU180,000 and identifiable net assets at acquisition were CU850,000. Goodwill later suffered CU20,000 impairment; NCI was measured at fair value.',
   'Parent sold inventory to Subsidiary for CU150,000 at a 25% mark-up on cost. Forty percent remains unsold at year end.',
   'Parent owns 30% of Associate. The associate earned CU100,000 and paid CU20,000 dividends during the year. Ignore impairment and unrealised profit for this item.'
  ],questions:[
   q('fr-f1-b3q1','Goodwill','What goodwill arose at acquisition?',['CU70,000','CU90,000','CU110,000','CU180,000'],1,'CU760,000 + CU180,000 − CU850,000 = CU90,000.'),
   q('fr-f1-b3q2','Goodwill impairment','How much of the CU20,000 full-goodwill impairment is attributable to NCI?',['CU4,000','CU16,000','CU20,000','Nil'],0,'With 20% NCI and full goodwill, CU4,000 is allocated to NCI.'),
   q('fr-f1-b3q3','Intragroup inventory','What unrealised profit is eliminated?',['CU8,000','CU10,000','CU12,000','CU15,000'],2,'A 25% mark-up on cost means profit is CU30,000 within selling price CU150,000; 40% remaining gives CU12,000.'),
   q('fr-f1-b3q4','Associate','What share of associate profit is recognised?',['CU20,000','CU24,000','CU30,000','CU36,000'],2,'The group recognises 30% of CU100,000 profit, or CU30,000.'),
   q('fr-f1-b3q5','Associate','By how much do dividends reduce the associate investment balance?',['CU6,000','CU20,000','CU30,000','They do not reduce it'],0,'The investor share of dividends is 30% × CU20,000 = CU6,000 and reduces the equity-accounted investment.')
  ]}
 ],
 sectionCResponses:[
  {id:'fr-f1-c1',title:'Section C1 · Interpretation of financial statements',scenario:[
   'River Services reported the following: revenue CU24.0m (2025: CU20.0m), gross profit CU7.2m (CU7.0m), operating profit CU2.16m (CU2.40m), capital employed CU13.5m (CU12.0m), current assets CU5.4m (CU4.8m), inventory CU2.1m (CU1.4m), current liabilities CU4.5m (CU3.2m), operating cash flow CU1.1m (CU2.6m).',
   'During 2026 the entity launched a lower-margin product, extended customer credit and experienced a one-off factory outage. Customer satisfaction rose from 72% to 84%, but no competitor, segment or covenant data is available.'
  ],requirements:[
   'Calculate revenue growth, gross margin, operating margin, ROCE, current ratio and quick ratio for both years where possible. (8 marks)',
   'Analyse performance, financial position and cash conversion using the calculations and non-financial information. Include limitations and practical advice. (12 marks)'
  ],markingGuide:[
   {id:'fr-f1-c1m1',label:'Revenue growth: 20.0%',guidance:'(CU24.0m − CU20.0m) / CU20.0m.',marks:1},
   {id:'fr-f1-c1m2',label:'Gross margins: 30.0% and 35.0%',guidance:'CU7.2m/CU24.0m and CU7.0m/CU20.0m.',marks:2},
   {id:'fr-f1-c1m3',label:'Operating margins: 9.0% and 12.0%',guidance:'CU2.16m/CU24.0m and CU2.40m/CU20.0m.',marks:2},
   {id:'fr-f1-c1m4',label:'ROCE: 16.0% and 20.0%',guidance:'Operating profit divided by capital employed.',marks:2},
   {id:'fr-f1-c1m5',label:'Current and quick ratios',guidance:'Current ratios 1.20 and 1.50; quick ratios 0.73 and 1.06 approximately.',marks:1},
   {id:'fr-f1-c1m6',label:'Revenue growth versus margin pressure',guidance:'Links growth and the lower-margin product or outage to falling gross and operating margins.',marks:3},
   {id:'fr-f1-c1m7',label:'Returns and investment',guidance:'Explains that lower ROCE indicates weaker return from the expanded capital base.',marks:2},
   {id:'fr-f1-c1m8',label:'Liquidity and cash conversion',guidance:'Connects weaker ratios and operating cash flow with inventory and extended credit.',marks:3},
   {id:'fr-f1-c1m9',label:'Non-financial evidence and balance',guidance:'Uses improved satisfaction without letting it override financial deterioration.',marks:2},
   {id:'fr-f1-c1m10',label:'Limitations and advice',guidance:'Notes absent peer, segment or covenant data and proposes targeted working-capital or margin investigation.',marks:2}
  ]},
  {id:'fr-f1-c2',title:'Section C2 · Consolidated statement preparation',scenario:[
   'At 31 December 2026 Parent has retained earnings CU900,000. It acquired 75% of Subsidiary on 1 January 2026 for CU720,000. Proportionate NCI is used. Subsidiary share capital was CU500,000 and retained earnings CU180,000 at acquisition; closing retained earnings are CU300,000.',
   'At acquisition a plant fair-value uplift of CU80,000 had four years remaining life. Goodwill impairment at year end is CU15,000. Parent sold inventory costing CU100,000 to Subsidiary for CU140,000; half remains unsold. Subsidiary owes Parent CU24,000. Parent owns 30% of Associate, acquired for CU150,000; Associate earned CU60,000 and paid CU10,000 dividends during 2026.',
   'Ignore tax. Assume all amounts are in CU and all other assets and liabilities have already been aggregated correctly.'
  ],requirements:[
   'Calculate acquisition-date net assets, proportionate NCI and goodwill. (6 marks)',
   'Calculate adjusted post-acquisition profit, closing NCI, group retained earnings and the associate carrying amount; state the statement-of-financial-position eliminations for the intragroup balance and unrealised profit. (14 marks)'
  ],markingGuide:[
   {id:'fr-f1-c2m1',label:'Acquisition net assets: CU760,000',guidance:'CU500,000 share capital + CU180,000 retained earnings + CU80,000 plant uplift.',marks:2},
   {id:'fr-f1-c2m2',label:'Proportionate NCI: CU190,000',guidance:'25% × CU760,000.',marks:1},
   {id:'fr-f1-c2m3',label:'Goodwill: CU150,000',guidance:'CU720,000 + CU190,000 − CU760,000.',marks:3},
   {id:'fr-f1-c2m4',label:'Additional depreciation: CU20,000',guidance:'CU80,000 uplift / four years.',marks:1},
   {id:'fr-f1-c2m5',label:'Adjusted post-acquisition profit: CU100,000',guidance:'CU300,000 − CU180,000 − CU20,000.',marks:2},
   {id:'fr-f1-c2m6',label:'Closing NCI: CU215,000',guidance:'CU190,000 + 25% × CU100,000; proportionate goodwill means no NCI share of recorded impairment.',marks:2},
   {id:'fr-f1-c2m7',label:'Unrealised profit: CU20,000',guidance:'Parent profit CU40,000 × 50% remaining; reduce inventory and parent group retained earnings.',marks:2},
   {id:'fr-f1-c2m8',label:'Associate carrying amount: CU165,000',guidance:'CU150,000 + 30% × CU60,000 − 30% × CU10,000.',marks:2},
   {id:'fr-f1-c2m9',label:'Group retained earnings: CU955,000',guidance:'CU900,000 + 75% × CU100,000 − CU20,000 unrealised profit − CU15,000 goodwill impairment + CU15,000 net associate movement.',marks:3},
   {id:'fr-f1-c2m10',label:'Intragroup balance elimination',guidance:'Eliminate CU24,000 from group receivables and payables, subject to reconciling any cash or timing difference.',marks:2}
  ]}
 ]
};

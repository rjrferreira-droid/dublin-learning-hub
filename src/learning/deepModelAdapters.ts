import {
  DEEP_ACCA_A1,
  DEEP_ACCA_A1_CONTRACT,
} from './deepAccaA1.ts';
import {DEEP_ACCA_A2,DEEP_ACCA_A2_CONTRACT} from './deepAccaA2.ts';
import {
  DEEP_LESSON_SCHEMA_VERSION,
  LEARN_TEXT_EVIDENCE_ID,
  runDeepLessonQualityGate,
  type AudioSegmentKind,
  type DeepLessonContract,
  type DeepLessonQualityReport,
  type ItemEvidenceRule,
  type PracticeProgression,
  type ProgressivePracticeItem,
  type RevisionTarget,
  type WorkloadPhaseKind,
} from './deepLessonContract.ts';
import {
  DEEP_ENGLISH_UNIT_1,
  DEEP_ENGLISH_UNIT_1_CONTRACT,
} from './deepEnglishUnit1.ts';
import {DEEP_RP1,DEEP_VE2} from './deepEnglishSecondUnits.ts';
import {
  DEEP_PAYROLL_UNIT_1,
  type PayrollPracticeItem,
  type PayrollSelectionPractice,
} from './deepPayrollUnit1.ts';
import {DEEP_PAYROLL_UNIT_2} from './deepPayrollUnit2.ts';
import type {LessonModule,LessonSection} from './lessonModules.ts';
import {ACCA_A1_MODEL_ID,ACCA_A2_MODEL_ID} from './localModelLessonRegistry.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {PAYROLL_IDENTITIES} from './localPayrollLessonRegistry.ts';
import type {P1Track} from './p1RuntimeRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from './vivianeEnglishLessonRegistry.ts';

const payroll=DEEP_PAYROLL_UNIT_1;

const evidence=(objectiveIds:readonly string[],errorBank:ItemEvidenceRule['errorBank']='after-final-incorrect'):ItemEvidenceRule=>({
  objectiveIds,record:'item-result',errorBank,
});

const englishSections:readonly LessonSection[]=[
  {
    id:'deep-e1-context',title:`1. ${DEEP_ENGLISH_UNIT_1.learn.title}`,
    paragraphs:[
      DEEP_ENGLISH_UNIT_1.learn.purpose,
      `Warm-up: ${DEEP_ENGLISH_UNIT_1.learn.warmUp.join(' ')}`,
      DEEP_ENGLISH_UNIT_1.learn.setting,
      ...DEEP_ENGLISH_UNIT_1.learn.dialogue.map(turn=>`${turn.speaker}: ${turn.text}${turn.teachingNote?` Teaching note: ${turn.teachingNote}`:''}`),
      ...DEEP_ENGLISH_UNIT_1.learn.meaningChecks.map(item=>`Meaning check: ${item.prompt} Options: ${item.options.map(option=>option.text).join(' / ')} Explanation: ${item.explanation} Hint: ${item.hint}`),
    ],
    supportPt:DEEP_ENGLISH_UNIT_1.learn.portugueseSupport[0],sourceIds:['bc-continuous','bc-perfect'],
  },
  {
    id:'deep-e1-language-map',title:'2. Build the story timeline deliberately',
    paragraphs:DEEP_ENGLISH_UNIT_1.learn.languageMap.map(item=>`${item.form}. ${item.job} Example: ${item.example} Contrast: ${item.contrast}`),
    supportPt:DEEP_ENGLISH_UNIT_1.learn.portugueseSupport.slice(0,2).join(' '),sourceIds:['bc-continuous','bc-perfect'],
  },
  {
    id:'deep-e1-conversation',title:'3. Help the other person continue',
    paragraphs:DEEP_ENGLISH_UNIT_1.learn.conversationMoves.map(item=>`${item.move}. ${item.why} Examples: ${item.examples.join(' / ')}`),
    supportPt:DEEP_ENGLISH_UNIT_1.learn.portugueseSupport[2],sourceIds:[],
  },
  {
    id:'deep-e1-retell',title:'4. Turn facts into a listener-friendly retell',
    paragraphs:[
      `Facts: ${DEEP_ENGLISH_UNIT_1.learn.guidedRetell.facts.join(' ')}`,
      `Plan: ${DEEP_ENGLISH_UNIT_1.learn.guidedRetell.plan.join(' ')}`,
      `Model: ${DEEP_ENGLISH_UNIT_1.learn.guidedRetell.model}`,
      `Variation: ${DEEP_ENGLISH_UNIT_1.learn.guidedRetell.variation}`,
    ],
    supportPt:DEEP_ENGLISH_UNIT_1.learn.portugueseSupport.join(' '),sourceIds:['bc-continuous','bc-perfect'],
  },
];

const accaSections:readonly LessonSection[]=DEEP_ACCA_A1.teachingBlocks.map(block=>({
  // Preserve the audited legacy anchor while replacing its shallow content.
  // The syllabus-coverage audit resolves this ID together with the unchanged
  // checkpoint and practice evidence, so navigation and traceability survive
  // the deep-content migration.
  id:block.id==='a1-objective'?'acca-a1-objective':block.id,title:block.title,
  paragraphs:[block.purpose,...block.body,`Stop and think: ${block.stopAndThink.prompt}`,`Expected reasoning: ${block.stopAndThink.expected}`],
  supportPt:`Este bloco cobre ${block.outcomeIds.join(', ')}. O resumo em português ainda está em revisão editorial; use o conteúdo completo em inglês acima.`,
  sourceIds:block.sourceIds,
}));

const accaA2Sections:readonly LessonSection[]=DEEP_ACCA_A2.teachingBlocks.map(block=>({
  id:block.id,title:block.title,
  paragraphs:[block.purpose,...block.body,`Stop and think: ${block.stopAndThink.prompt}`,`Expected reasoning: ${block.stopAndThink.expected}`],
  supportPt:`Este bloco cobre ${block.outcomeIds.join(', ')}. Use primeiro as características fundamentais; as características de melhoria não corrigem informação irrelevante ou não fidedigna.`,
  sourceIds:block.sourceIds,
}));

const payrollSections:readonly LessonSection[]=payroll.learningBlocks.map(block=>({
  id:block.id,title:block.title,
  paragraphs:[...block.paragraphs,`Stop and check: ${block.stopAndCheck.prompt} Expected elements: ${block.stopAndCheck.expectedElements.join('; ')}.`],
  supportPt:block.supportPt,sourceIds:block.sourceIds,
}));

export function visibleLearnText(sections:readonly LessonSection[]):readonly string[]{
  return sections.flatMap(section=>[section.title,...section.paragraphs,section.supportPt]);
}

export const DEEP_ENGLISH_UNIT_1_VISIBLE_LEARN_TEXT=visibleLearnText(englishSections);
export const DEEP_PAYROLL_UNIT_1_VISIBLE_LEARN_TEXT=visibleLearnText(payrollSections);
export const DEEP_ACCA_A1_VISIBLE_LEARN_TEXT=visibleLearnText(accaSections);
export const DEEP_ACCA_A2_VISIBLE_LEARN_TEXT=visibleLearnText(accaA2Sections);
export const DEEP_RP1_VISIBLE_LEARN_TEXT=DEEP_RP1.learnText;
export const DEEP_VE2_VISIBLE_LEARN_TEXT=DEEP_VE2.learnText;
export const DEEP_PAYROLL_UNIT_2_VISIBLE_LEARN_TEXT=DEEP_PAYROLL_UNIT_2.learnText;

const payrollProgression:Readonly<Record<PayrollPracticeItem['stage'],PracticeProgression>>={
  notice:'retrieve',understand:'explain',choose:'apply',build:'integrate',use:'transfer',
};

const payrollMinutes=(item:PayrollPracticeItem)=>item.format==='extended-written'?2:item.format==='short-written'?1.5:1;

function payrollPractice(item:PayrollPracticeItem):ProgressivePracticeItem{
  const base={
    id:item.id,prompt:item.prompt,progression:payrollProgression[item.stage],sourceBucket:'current' as const,
    estimatedMinutes:payrollMinutes(item),hints:item.hints,
  };
  if('correctOptionIds' in item)return {
    ...base,responseMode:item.format,options:item.options.map(option=>({id:option.id,label:option.text})),
    evaluation:{kind:'selection',correctOptionIds:item.correctOptionIds,explanation:item.rationale},
    evidence:evidence(item.objectiveIds,'after-final-incorrect'),
  };
  return {
    ...base,responseMode:item.format==='short-written'?'short-text' as const:'extended-text' as const,
    evaluation:{kind:'rubric',criteria:item.expectedElements.map((description,index)=>({id:`${item.id}-criterion-${index+1}`,description})),modelAnswer:item.modelAnswer},
    evidence:evidence(item.objectiveIds,'confirmed-only'),
  };
}

const payrollEntryItems:readonly ProgressivePracticeItem[]=payroll.priorKnowledge.entryCheck.map((item,index)=>({
  id:item.id,prompt:item.prompt,progression:'retrieve',sourceBucket:'current',responseMode:'short-text',
  estimatedMinutes:index===2?1.5:1.25,
  evaluation:{kind:'answer-key',acceptedAnswers:[item.answer],explanation:item.answer},
  evidence:evidence(index===0?['obj-identity']:index===1?['obj-transfer']:payroll.objectives.map(objective=>objective.id),'confirmed-only'),
}));

const payrollBlockChecks:readonly ProgressivePracticeItem[]=payroll.learningBlocks.map(block=>({
  id:`${block.id}-check`,prompt:block.stopAndCheck.prompt,progression:'explain',sourceBucket:'current',responseMode:'short-text',estimatedMinutes:2.5,
  evaluation:{kind:'self-check',checklist:block.stopAndCheck.expectedElements},
  evidence:evidence(block.objectiveIds,'confirmed-only'),
}));

function audioComprehension(item:PayrollSelectionPractice):ProgressivePracticeItem{
  return {
    id:item.id,prompt:item.prompt,progression:item.stage==='use'?'transfer':'retrieve',sourceBucket:'current',
    responseMode:item.format,estimatedMinutes:1.5,
    options:item.options.map(option=>({id:option.id,label:option.text})),hints:item.hints,
    evaluation:{kind:'selection',correctOptionIds:item.correctOptionIds,explanation:item.rationale},
    evidence:evidence(item.objectiveIds,'after-final-incorrect'),
  };
}

const payrollCorePractice=payroll.practice.items.map(payrollPractice);
const payrollAudioPractice=payroll.audioEpisode.comprehension.map(audioComprehension);
const payrollPracticeItems:readonly ProgressivePracticeItem[]=[...payrollEntryItems,...payrollBlockChecks,...payrollCorePractice,...payrollAudioPractice];

const payrollRetrievalTargets:readonly RevisionTarget[]=payroll.retrieval.items.map(item=>({
  id:item.id,prompt:item.prompt,objectiveIds:item.objectiveIds,successCriterion:item.answer,
  revisitAfterDays:item.reviewAfterDays,estimatedMinutes:payroll.retrieval.plannedMinutes/payroll.retrieval.items.length,
}));

const payrollShadowTargets:readonly RevisionTarget[]=payroll.audioEpisode.shadowing.map(item=>({
  id:item.id,prompt:`Shadow: ${item.line}`,objectiveIds:['obj-employee'],successCriterion:item.focus,
  revisitAfterDays:[1,7],estimatedMinutes:2,
}));

const payrollWorkedExamples:DeepLessonContract['workedExamples']=[
  ...payroll.workedExamples.map(example=>({
    id:example.id,title:example.title,scenario:example.facts,estimatedMinutes:example.plannedMinutes,
    steps:example.reasoning.map((reasoning,index)=>({
      id:`${example.id}-step-${index+1}`,
      action:index===0?example.task:`Continue the supported reasoning (${index+1}).`,
      reasoning,
      result:index===example.reasoning.length-1?example.modelResponse:'Carry only the supported conclusion into the next step.',
    })),
    conclusion:example.modelResponse,transferPrompt:example.boundary,
  })),
  {
    id:payroll.caseStudy.id,title:payroll.caseStudy.title,
    scenario:[...payroll.caseStudy.scenario,...payroll.caseStudy.documents.map(document=>`${document.name}: ${document.contents.join(' ')}`)],
    estimatedMinutes:payroll.caseStudy.plannedMinutes,
    steps:payroll.caseStudy.markingCriteria.map((criterion,index)=>({
      id:`${payroll.caseStudy.id}-step-${index+1}`,action:criterion.description,
      reasoning:`This criterion carries ${criterion.weight}% of the guided case review.`,
      result:index===payroll.caseStudy.markingCriteria.length-1?payroll.caseStudy.modelAnswer:'Retain this criterion for the integrated response.',
    })),
    conclusion:payroll.caseStudy.modelAnswer,transferPrompt:`${payroll.caseStudy.task} Boundary: ${payroll.caseStudy.boundary}`,
  },
];

const payrollPhaseKind:Readonly<Record<string,WorkloadPhaseKind>>={
  'phase-orient':'other','phase-learn':'learn','phase-examples':'worked-example','phase-practice':'practice',
  'phase-case':'worked-example','phase-audio':'audio','phase-retrieval':'revision',
};

const payrollPhaseEvidence:Readonly<Record<string,readonly string[]>>={
  'phase-orient':payrollEntryItems.map(item=>item.id),
  'phase-learn':[LEARN_TEXT_EVIDENCE_ID,...payrollBlockChecks.map(item=>item.id)],
  'phase-examples':payroll.workedExamples.map(item=>item.id),
  'phase-practice':payrollCorePractice.map(item=>item.id),
  'phase-case':[payroll.caseStudy.id],
  'phase-audio':[...payrollAudioPractice.map(item=>item.id),...payrollShadowTargets.map(item=>item.id)],
  'phase-retrieval':payrollRetrievalTargets.map(item=>item.id),
};

const payrollObjectiveEvidence=(objectiveId:string):readonly string[]=>[
  ...payroll.learningBlocks.filter(block=>block.objectiveIds.includes(objectiveId)).map(block=>`${block.id}-check`),
  ...payroll.workedExamples.filter(example=>example.objectiveIds.includes(objectiveId)).map(example=>example.id),
  ...payroll.practice.items.filter(item=>item.objectiveIds.includes(objectiveId)).map(item=>item.id),
  ...(payroll.caseStudy.objectiveIds.includes(objectiveId)?[payroll.caseStudy.id]:[]),
  ...payroll.retrieval.items.filter(item=>item.objectiveIds.includes(objectiveId)).map(item=>item.id),
];

const payrollAudioKind=(id:string):AudioSegmentKind=>id.includes('intro')?'opening':id.includes('retrieval')?'retrieval-pause':id.includes('language')?'explanation':id.includes('shadow')?'pronunciation':id.includes('transfer')?'transfer':'dialogue';

export const DEEP_PAYROLL_UNIT_1_CONTRACT:DeepLessonContract={
  schemaVersion:DEEP_LESSON_SCHEMA_VERSION,
  editorial:{status:'deep-reviewed',depthVersion:'payroll-p1-depth-1',reviewedOn:'2026-09-24'},
  course:{kind:'payroll',jurisdiction:'Ireland',effectivePeriod:'2026 transition guidance; official sources must be rechecked before publication'},
  curriculum:{
    provider:'Revenue and Data Protection Commission source-aligned local curriculum',
    framework:'Irish Payroll and People Operations evidence chain',version:payroll.sources[0]?.reviewedOn??'2026-09',
    outcomeIds:payroll.objectives.map(objective=>objective.id),sourceUrl:payroll.sources[0]?.url,
  },
  prerequisites:payroll.priorKnowledge.required,
  objectives:payroll.objectives.map(objective=>({
    id:objective.id,statement:objective.text,evidenceIds:payrollObjectiveEvidence(objective.id),level:objective.id==='obj-transfer'?'analyse':'apply',
  })),
  workload:{
    totalMinutes:payroll.workload.totalMinutes,
    paceNote:`Authored range ${payroll.workload.rangeMinutes[0]}–${payroll.workload.rangeMinutes[1]} minutes. Live rates are deliberately excluded.`,
    phases:payroll.workload.phases.map(phase=>({
      id:phase.id,kind:payrollPhaseKind[phase.id]??'other',title:phase.title,plannedMinutes:phase.plannedMinutes,
      evidenceIds:payrollPhaseEvidence[phase.id]??phase.evidenceIds,
    })),
  },
  workedExamples:payrollWorkedExamples,
  practice:{items:payrollPracticeItems,attemptsBeforeReveal:payroll.practice.attemptsBeforeReveal},
  misconceptions:payroll.misconceptions.map(item=>({
    id:item.id,misconception:item.belief,correction:`${item.whyItFails} ${item.repair}`,
    diagnosticPrompt:`Explain why this belief fails, then apply this repair: ${item.repair}`,
    objectiveIds:payroll.objectives.filter(objective=>objective.text.toLocaleLowerCase('en').includes(item.id.split('-').at(-1)??'')).map(objective=>objective.id).slice(0,2).length
      ?payroll.objectives.filter(objective=>objective.text.toLocaleLowerCase('en').includes(item.id.split('-').at(-1)??'')).map(objective=>objective.id).slice(0,2)
      :payroll.objectives.map(objective=>objective.id),
  })),
  revisionTargets:[...payrollRetrievalTargets,...payrollShadowTargets],
  audioEpisode:{
    format:'authored-script',title:payroll.audioEpisode.title,
    editorialGoal:payroll.audioEpisode.listeningGoals.join(' '),estimatedMinutes:payroll.audioEpisode.estimatedMinutes,
    distinctiveElements:['A new-starter employee conversation distinct from Learn.','First-listen retrieval before the annotated second pass.','A language clinic for fact, action, owner and update.','Shadowing plus an original transfer challenge.'],
    segments:payroll.audioEpisode.segments.map(segment=>({
      id:segment.id,kind:payrollAudioKind(segment.id),title:segment.title,estimatedMinutes:segment.plannedSeconds/60,
      script:[segment.script,segment.learnerAction?`Learner action: ${segment.learnerAction}`:''].filter(Boolean).join('\n\n'),
    })),
  },
  completion:{
    itemLevelEvidenceRequired:true,
    requirements:[
      ...payroll.workload.phases.map(phase=>({id:`complete-${phase.id}`,targetIds:payrollPhaseEvidence[phase.id]??phase.evidenceIds,rule:'attempt' as const,minimum:(payrollPhaseEvidence[phase.id]??phase.evidenceIds).length})),
      {id:'complete-payroll-selection-threshold',targetIds:payrollCorePractice.filter(item=>item.responseMode==='single-select'||item.responseMode==='multi-select').map(item=>item.id),rule:'meet-threshold',minimum:payroll.completionRules.selectionThresholdPct},
      {id:'complete-payroll-written',targetIds:payroll.completionRules.requiredWrittenItemIds,rule:'submit',minimum:payroll.completionRules.requiredWrittenItemIds.length},
      {id:'complete-payroll-case',targetIds:payroll.completionRules.caseMinimumCriteria,rule:'submit',minimum:payroll.completionRules.caseMinimumCriteria.length},
    ],
  },
  payroll:{
    sourceSnapshotOn:payroll.sources[0]?.reviewedOn??'2026-09-14',liveRatePolicy:'official-source-required',
    operationalChecks:payroll.learningBlocks.map(block=>`${block.title}: ${block.stopAndCheck.expectedElements.join('; ')}`),
  },
};

const englishModuleOverlay:Partial<LessonModule>={
  title:DEEP_ENGLISH_UNIT_1.title,
  goal:DEEP_ENGLISH_UNIT_1.learn.purpose,
  scope:DEEP_ENGLISH_UNIT_1.boundaries.join(' '),
  sections:englishSections,
  deepLesson:DEEP_ENGLISH_UNIT_1_CONTRACT,
};

const accaModuleOverlay:Partial<LessonModule>={
  title:DEEP_ACCA_A1.identity.title,
  goal:'Explain and apply the local ACCA FR A1 boundary—official outcomes A1a and A1b—through evidence, worked examples and exam-style practice.',
  scope:`${DEEP_ACCA_A1.scope.disclaimer} Included: ${DEEP_ACCA_A1.scope.included.join(' ')} Next-unit boundary: ${DEEP_ACCA_A1.scope.nextUnitBoundary.join(' ')}`,
  sections:accaSections,
  sources:DEEP_ACCA_A1.sources.map(source=>({id:source.id,label:source.label,url:source.url,supports:source.use,reviewedOn:source.reviewedOn})),
  deepLesson:DEEP_ACCA_A1_CONTRACT,
};

const accaA2ModuleOverlay:Partial<LessonModule>={
  title:DEEP_ACCA_A2.identity.title,
  goal:'Apply official ACCA FR outcomes A1c–A1g in the correct decision order and reach evidence-based reporting recommendations.',
  scope:`${DEEP_ACCA_A2.scope.disclaimer} Included: ${DEEP_ACCA_A2.scope.included.join(' ')} Next-unit boundary: ${DEEP_ACCA_A2.scope.nextUnitBoundary.join(' ')}`,
  sections:accaA2Sections,
  sources:DEEP_ACCA_A2.sources.map(source=>({id:source.id,label:source.label,url:source.url,supports:source.use,reviewedOn:source.reviewedOn})),
  deepLesson:DEEP_ACCA_A2_CONTRACT,
};

const payrollModuleOverlay:Partial<LessonModule>={
  title:payroll.title,goal:payroll.subtitle,scope:payroll.scope,sections:payrollSections,
  sources:payroll.sources.map(source=>({id:source.id,label:source.label,url:source.url,supports:source.supports,reviewedOn:source.reviewedOn})),
  deepLesson:DEEP_PAYROLL_UNIT_1_CONTRACT,
};

const runtimeContentOverlay=(content:{title:string;goal:string;scope:string;sections:readonly LessonSection[];sources:readonly {id:string;label:string;url:string;supports:string;reviewedOn:string}[];contract:DeepLessonContract}):Partial<LessonModule>=>({
  title:content.title,goal:content.goal,scope:content.scope,sections:content.sections,sources:content.sources,deepLesson:content.contract,
});

export type DeepRuntimeOverlay={
  module:Partial<LessonModule>;
  deepLesson:DeepLessonContract;
  learnText:readonly string[];
  quality:DeepLessonQualityReport;
};

const englishQuality=runDeepLessonQualityGate(DEEP_ENGLISH_UNIT_1_CONTRACT,{learnText:DEEP_ENGLISH_UNIT_1_VISIBLE_LEARN_TEXT});
const payrollQuality=runDeepLessonQualityGate(DEEP_PAYROLL_UNIT_1_CONTRACT,{learnText:DEEP_PAYROLL_UNIT_1_VISIBLE_LEARN_TEXT});
const accaQuality=runDeepLessonQualityGate(DEEP_ACCA_A1_CONTRACT,{learnText:DEEP_ACCA_A1_VISIBLE_LEARN_TEXT});
const accaA2Quality=runDeepLessonQualityGate(DEEP_ACCA_A2_CONTRACT,{learnText:DEEP_ACCA_A2_VISIBLE_LEARN_TEXT});
const rafaelP1Quality=runDeepLessonQualityGate(DEEP_RP1.contract,{learnText:DEEP_RP1_VISIBLE_LEARN_TEXT});
const vivianeE2Quality=runDeepLessonQualityGate(DEEP_VE2.contract,{learnText:DEEP_VE2_VISIBLE_LEARN_TEXT});
const payrollP2Quality=runDeepLessonQualityGate(DEEP_PAYROLL_UNIT_2.contract,{learnText:DEEP_PAYROLL_UNIT_2_VISIBLE_LEARN_TEXT});

const englishOverlay:DeepRuntimeOverlay={module:englishModuleOverlay,deepLesson:DEEP_ENGLISH_UNIT_1_CONTRACT,learnText:DEEP_ENGLISH_UNIT_1_VISIBLE_LEARN_TEXT,quality:englishQuality};
const payrollOverlay:DeepRuntimeOverlay={module:payrollModuleOverlay,deepLesson:DEEP_PAYROLL_UNIT_1_CONTRACT,learnText:DEEP_PAYROLL_UNIT_1_VISIBLE_LEARN_TEXT,quality:payrollQuality};
const accaOverlay:DeepRuntimeOverlay={module:accaModuleOverlay,deepLesson:DEEP_ACCA_A1_CONTRACT,learnText:DEEP_ACCA_A1_VISIBLE_LEARN_TEXT,quality:accaQuality};
const accaA2Overlay:DeepRuntimeOverlay={module:accaA2ModuleOverlay,deepLesson:DEEP_ACCA_A2_CONTRACT,learnText:DEEP_ACCA_A2_VISIBLE_LEARN_TEXT,quality:accaA2Quality};
const rafaelP1Overlay:DeepRuntimeOverlay={module:runtimeContentOverlay(DEEP_RP1),deepLesson:DEEP_RP1.contract,learnText:DEEP_RP1_VISIBLE_LEARN_TEXT,quality:rafaelP1Quality};
const vivianeE2Overlay:DeepRuntimeOverlay={module:runtimeContentOverlay(DEEP_VE2),deepLesson:DEEP_VE2.contract,learnText:DEEP_VE2_VISIBLE_LEARN_TEXT,quality:vivianeE2Quality};
const payrollP2Overlay:DeepRuntimeOverlay={module:runtimeContentOverlay(DEEP_PAYROLL_UNIT_2),deepLesson:DEEP_PAYROLL_UNIT_2.contract,learnText:DEEP_PAYROLL_UNIT_2_VISIBLE_LEARN_TEXT,quality:payrollP2Quality};

export function deepRuntimeOverlayFor(track:P1Track,lessonId:string):DeepRuntimeOverlay|null{
  if(track==='english'&&(lessonId===ENGLISH_E1_MODEL_ID||lessonId===VIVIANE_ENGLISH_IDENTITIES.VE1.id))return englishOverlay;
  if(track==='english'&&lessonId===ENGLISH_P1_MODEL_ID)return rafaelP1Overlay;
  if(track==='english'&&lessonId===VIVIANE_ENGLISH_IDENTITIES.VE2.id)return vivianeE2Overlay;
  if(track==='payroll'&&lessonId===PAYROLL_IDENTITIES.P1.id)return payrollOverlay;
  if(track==='payroll'&&lessonId===PAYROLL_IDENTITIES.P2.id)return payrollP2Overlay;
  if(track==='finance'&&lessonId===ACCA_A1_MODEL_ID)return accaOverlay;
  if(track==='finance'&&lessonId===ACCA_A2_MODEL_ID)return accaA2Overlay;
  return null;
}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {audioLearnFiveGramContainment,type AuthoredAudioEpisode} from '../src/learning/deepLessonContract.ts';
import {DEEP_PAYROLL_UNIT_1} from '../src/learning/deepPayrollUnit1.ts';
import {PAYROLL_IDENTITIES} from '../src/learning/localPayrollLessonRegistry.ts';

const unit=DEEP_PAYROLL_UNIT_1;
const words=(value:string)=>(value.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)??[]).length;

test('deep Payroll Unit 1 stays local, profile-appropriate and bound to the canonical lesson identity',async()=>{
 assert.equal(unit.status,'authored_local_not_published');
 assert.deepEqual([unit.identity.lessonId,unit.identity.slug],[PAYROLL_IDENTITIES.P1.id,PAYROLL_IDENTITIES.P1.slug]);
 assert.deepEqual([unit.identity.track,unit.identity.strand],['payroll','payroll-people-operations']);
 assert.match(unit.audience,/Viviane/);
 assert.match(unit.scope,/operational foundation for Irish Payroll and People Operations/i);
 assert.match(unit.scope,/does not teach bookkeeping, corporate reporting, investment analysis or live deduction rates/i);
 assert.equal(unit.audioEpisode.generationRequested,false);
 assert.equal(unit.audioEpisode.storageKey,null);
 const source=await readFile(new URL('../src/learning/deepPayrollUnit1.ts',import.meta.url),'utf8');
 for(const forbidden of ['fetch(','.insert(','.update(','supabase.','functions.invoke','openai.com/v1','connectProfessor('])assert.equal(source.includes(forbidden),false,forbidden);
});

test('the authored workload is an honest 80-minute path inside the agreed 60–90 minute range',()=>{
 assert.deepEqual(unit.workload.rangeMinutes,[60,90]);
 assert.equal(unit.workload.totalMinutes,80);
 assert.equal(unit.workload.phases.reduce((sum,phase)=>sum+phase.plannedMinutes,0),80);
 assert.deepEqual(unit.workload.phases.map(phase=>phase.id),['phase-orient','phase-learn','phase-examples','phase-practice','phase-case','phase-audio','phase-retrieval']);
 assert.ok(unit.workload.phases.every(phase=>phase.plannedMinutes>0&&phase.evidenceIds.length>0));
 assert.deepEqual(unit.completionRules.requiredPhaseIds,unit.workload.phases.map(phase=>phase.id));
});

test('Learn has six substantive evidence-chain blocks, measurable objectives and verified source bindings',()=>{
 assert.equal(unit.objectives.length,6);
 assert.equal(new Set(unit.objectives.map(objective=>objective.id)).size,6);
 assert.ok(unit.objectives.every(objective=>objective.successEvidence.length>=2));
 assert.equal(unit.learningBlocks.length,6);
 assert.ok(unit.learningBlocks.every(block=>block.paragraphs.length>=4&&block.plannedMinutes===4));
 const learnText=unit.learningBlocks.flatMap(block=>block.paragraphs).join(' ');
 assert.ok(words(learnText)>=1300,`expected at least 1,300 Learn words, found ${words(learnText)}`);
 assert.ok(unit.learningBlocks.every(block=>block.supportPt.length>=80&&block.stopAndCheck.expectedElements.length>=2));

 const objectives=new Set(unit.objectives.map(objective=>objective.id));
 const sources=new Set(unit.sources.map(source=>source.id));
 for(const block of unit.learningBlocks){
  assert.ok(block.objectiveIds.every(id=>objectives.has(id)),block.id);
  assert.ok(block.sourceIds.every(id=>sources.has(id)),block.id);
 }
 assert.ok(unit.sources.length>=8);
 for(const source of unit.sources){
  const url=new URL(source.url);
  assert.equal(url.protocol,'https:');
  assert.ok(['www.revenue.ie','www.dataprotection.ie'].includes(url.hostname),source.url);
  assert.ok(source.supports.length>=60);
 }
});

test('two worked examples model the reasoning without inventing live statutory results',()=>{
 assert.equal(unit.workedExamples.length,2);
 for(const example of unit.workedExamples){
  assert.ok(example.facts.length>=4);
  assert.ok(example.reasoning.length>=4);
  assert.ok(words(example.modelResponse)>=55);
  assert.match(example.boundary,/no rates|unknown|not a live payroll calculation/i);
 }
 const joined=unit.workedExamples.map(example=>example.modelResponse).join(' ');
 assert.match(joined,/cannot state the correct deduction|cannot confirm a later amount/i);
 assert.doesNotMatch(joined,/\b(?:PAYE|USC|PRSI)\s*=\s*€?\d/i);
});

test('practice progresses through five stages and combines selection with substantive written production',()=>{
 assert.equal(unit.practice.attemptsBeforeReveal,2);
 assert.equal(unit.practice.items.length,12);
 assert.equal(new Set(unit.practice.items.map(item=>item.id)).size,12);
 assert.deepEqual([...new Set(unit.practice.items.map(item=>item.stage))],['notice','understand','choose','build','use']);
 const selection=unit.practice.items.filter(item=>item.format==='single-select'||item.format==='multi-select');
 const written=unit.practice.items.filter(item=>item.format==='short-written'||item.format==='extended-written');
 assert.equal(selection.length,8);
 assert.equal(written.length,4);
 for(const item of unit.practice.items){
  assert.equal(item.hints.length,2);
  assert.ok(item.objectiveIds.length>0);
  assert.ok(item.errorBankTag.length>3);
  if(item.format==='single-select'||item.format==='multi-select'){
   assert.ok(item.options.length>=4);
   assert.ok(item.correctOptionIds.length>=1);
   assert.ok(item.correctOptionIds.every(id=>item.options.some(option=>option.id===id)));
  }else{
   assert.ok(item.expectedElements.length>=5);
   assert.ok(words(item.modelAnswer)>=25);
   assert.ok(item.selfCheck.length>=40);
  }
 }
});

test('the integrated case assesses controls, privacy and communication with a complete 100-point rubric',()=>{
 assert.ok(unit.caseStudy.scenario.length>=5);
 assert.ok(unit.caseStudy.documents.length>=4);
 assert.ok(unit.caseStudy.requiredOutput.length>=6);
 assert.equal(unit.caseStudy.markingCriteria.reduce((sum,criterion)=>sum+criterion.weight,0),100);
 assert.equal(new Set(unit.caseStudy.markingCriteria.map(criterion=>criterion.id)).size,unit.caseStudy.markingCriteria.length);
 assert.match(unit.caseStudy.modelAnswer,/restricted payroll channel/i);
 assert.match(unit.caseStudy.modelAnswer,/cannot yet confirm the cause or a March adjustment/i);
 assert.match(unit.caseStudy.boundary,/withholds notification values/i);
});

test('Audio is a distinct 12-minute contextual episode, not a spoken copy of Learn',()=>{
 assert.equal(unit.audioEpisode.role,'distinct_contextual_episode');
 assert.equal(unit.audioEpisode.distinctFromLearn,true);
 assert.equal(unit.audioEpisode.estimatedMinutes,12);
 assert.equal(unit.audioEpisode.segments.reduce((sum,segment)=>sum+segment.plannedSeconds,0),720);
 assert.ok(unit.audioEpisode.segments.length>=7);
 const audioText=unit.audioEpisode.segments.map(segment=>segment.script).join(' ');
 assert.ok(words(audioText)>=1200&&words(audioText)<=1800,`audio script has ${words(audioText)} words`);
 assert.equal(unit.audioEpisode.comprehension.length,4);
 assert.equal(unit.audioEpisode.shadowing.length,3);

 const sharedEpisode:AuthoredAudioEpisode={
  format:'authored-script',title:unit.audioEpisode.title,editorialGoal:'Teach through a new workplace dialogue and retrieval cycle.',estimatedMinutes:unit.audioEpisode.estimatedMinutes,
  distinctiveElements:['New-starter dialogue','First-listen retrieval','Language clinic','Shadowing and transfer'],
  segments:unit.audioEpisode.segments.map(segment=>({id:segment.id,kind:segment.id.includes('shadow')?'pronunciation':segment.id.includes('retrieval')?'retrieval-pause':segment.id.includes('transfer')?'transfer':'dialogue',title:segment.title,estimatedMinutes:segment.plannedSeconds/60,script:segment.script})),
 };
 const learnText=unit.learningBlocks.flatMap(block=>block.paragraphs);
 assert.ok(audioLearnFiveGramContainment(learnText,sharedEpisode)<0.1);
 for(const paragraph of learnText)assert.equal(audioText.includes(paragraph),false);
});

test('completion and Error Bank rules require item-level evidence without claiming false mastery',()=>{
 assert.equal(unit.completionRules.completionIsNotMastery,true);
 assert.equal(unit.completionRules.selectionThresholdPct,80);
 assert.equal(unit.completionRules.retrievalThresholdPct,80);
 assert.deepEqual(unit.completionRules.requiredWrittenItemIds,['pr-b1','pr-b2','pr-use1','pr-use2']);
 assert.ok(unit.completionRules.caseMinimumCriteria.length>=5);
 assert.ok(unit.evidenceRules.automaticallyAddToErrorBank.some(rule=>/both allowed attempts/i.test(rule)));
 assert.ok(unit.evidenceRules.doNotInfer.some(rule=>/does not establish competence/i.test(rule)));
 assert.match(unit.evidenceRules.writtenEvidencePolicy,/Keyword matching alone must not label an open response correct or incorrect/i);
 assert.match(unit.evidenceRules.retention,/Do not copy PPSN, real payslip data, voice recordings/i);
 assert.equal(unit.retrieval.items.length,6);
 assert.ok(unit.retrieval.items.every(item=>item.reviewAfterDays.join(',')==='1,3,7'));
});

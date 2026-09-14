import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadP1ModuleFor} from '../src/learning/p1RuntimeModules.ts';
import {remainingSlugFor} from '../src/learning/remainingWrittenRegistry.ts';
import {isP1Slug} from '../src/learning/p1RuntimeRegistry.ts';
const id='11111111-1111-4111-8111-111111111111';
const draft=(track:string,n:number)=>JSON.parse(readFileSync(new URL(`../quality/drafts/sequence${n}-${track}.json`,import.meta.url),'utf8'));
for(const n of [5,6,7,8] as const)for(const track of ['finance','payroll','english'] as const)test(`${track} ${n}: exact lazy written content, valid references and closed provider scope`,async()=>{
 const d=draft(track,n),slug=remainingSlugFor(track,n),m=await loadP1ModuleFor(track,{id,slug});
 assert.ok(m);assert.equal(m.title,d.module.title);assert.equal(m.lessonId,id);assert.equal(m.track,track);
 assert.equal(d.slug,slug);assert.equal(d.roadmapSequence,n);
 assert.equal(isP1Slug(track,slug),false);
 assert.equal(await loadP1ModuleFor(track,{id:'invalid',slug}),null);
 assert.equal(await loadP1ModuleFor(track,{id,slug:slug+'-unreviewed'}),null);
 for(const other of ['finance','payroll','english'] as const)if(other!==track)assert.equal(await loadP1ModuleFor(other,{id,slug}),null);
 assert.equal(m.sections.length,4);assert.equal(m.terms.length,6);assert.equal(m.practiceExercises?.length,3);assert.equal(m.checkpoint.length,5);
 const refs=new Set(m.sources.map(s=>s.id));
 for(const s of m.sections){assert.ok(s.paragraphs.length>=2);for(const ref of s.sourceIds)assert.ok(refs.has(ref));}
 for(const q of m.checkpoint){assert.ok(m.sections.some(s=>s.id===q.reviewSection));assert.ok(q.correctIndex>=0&&q.correctIndex<q.options.length);}
 assert.equal('professorGuide' in m,false);assert.equal('mastery' in m,false);
 assert.equal(d.professorGuide.status,'offline_authored_guide_not_live');
 assert.match(d.professorGuide.evidenceBoundary,/Never consume local drafts/);
});
test('ECL matrix agrees with allowance bridge while expense differs from balance change',()=>{
 const c=draft('finance',5).fictionalCalculation;
 assert.equal(c.current*c.currentRate+c.overdue*c.overdueRate,28);
 assert.equal(c.current+c.overdue-c.allowance,972);
 assert.equal(c.opening+c.expense-c.writeOff,c.allowance);
 assert.notEqual(c.expense,c.allowance-c.opening);
});
test('intercompany mismatch and unrealised profit use distinct reconciliations',()=>{
 const c=draft('finance',6).fictionalCalculation;
 assert.equal(c.payable+c.correction,c.receivable);
 assert.equal((c.price-c.cost)*c.unsold,20);
 assert.equal(c.unrealised,20);
});
test('current payable excludes deferred movement and cash is not total expense',()=>{
 const c=draft('finance',7).fictionalCalculation;
 assert.equal((c.carrying-c.taxBase)*c.rate,c.deferredClosing);
 assert.equal(c.currentExpense+c.deferredClosing-c.deferredOpening,50);
 assert.equal(c.currentOpening+c.currentExpense-c.cash,14);
 assert.notEqual(c.totalExpense,c.cash);
});
test('group bridge does not turn unknown adjustment into a nil difference',()=>{
 const c=draft('finance',8).fictionalCalculation;
 assert.equal(c.local+c.adjustments.reduce((a:number,b:number)=>a+b,0),205);
 assert.equal(c.unresolvedAmount,null);
 assert.match(draft('finance',8).module.caseStudy.modelAnswer,/do not assume a zero adjustment/);
});
test('reporting-only payroll discrepancy cannot justify employee recovery',()=>{
 const c=draft('payroll',5).fictionalCalculation;
 assert.equal(c.approved,c.processed);assert.equal(c.submitted-c.processed,80);assert.equal(c.cashRecovery,null);
});
test('net-pay bridge retains cause as unconfirmed',()=>{
 const d=draft('payroll',7),c=d.fictionalCalculation;
 assert.equal(c.gross-c.priorStatutory-c.priorOther,c.priorNet);
 assert.equal(c.gross-c.currentStatutory-c.currentOther,c.currentNet);
 assert.equal(c.priorNet-c.currentNet,60);
 assert.match(d.module.caseStudy.modelAnswer,/does not establish an RPN change/);
});
test('payroll journal preserves employee hold and separates employer charges',()=>{
 const c=draft('payroll',8).fictionalCalculation;
 assert.equal(c.gross-c.employeeStatutory-c.employeePension,7000);
 assert.equal(c.employeeStatutory+c.employerCharges,3500);
 assert.equal(c.net+c.statutoryPayable+c.employeePension,c.totalExpense);
 assert.equal(c.gross+c.employerCharges,11000);
 assert.equal(c.net-c.paymentFile,c.held);
});
test('presentation relative change uses starting amount',()=>{
 const c=draft('english',5).fictionalCalculation;
 assert.equal(c.before-c.after,c.saving);assert.equal(c.saving/c.before*100,20);
});
test('listening preparation cannot masquerade as validated Irish audio or acoustic assessment',()=>{
 const d=draft('english',8);
 assert.equal(d.status,'written_preparation_audio_pending');
 assert.deepEqual(d.listeningBoundary,{embeddedAudio:false,irishAccentVerified:false,acousticAssessment:false,externalPracticeOptional:true});
 assert.match(d.module.scope,/not listening ability/);
 assert.match(d.module.caseStudy.modelAnswer,/not evidence of listening or pronunciation/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {sequence4ModuleFor} from '../src/learning/sequence4Modules.ts';
import {sequence4SlugFor} from '../src/learning/sequence4Registry.ts';
import {isP1Slug} from '../src/learning/p1RuntimeRegistry.ts';
import finance from '../quality/drafts/sequence4-finance.json' with {type:'json'};
import payroll from '../quality/drafts/sequence4-payroll.json' with {type:'json'};
import english from '../quality/drafts/sequence4-english.json' with {type:'json'};
const id='11111111-1111-4111-8111-111111111111';
const drafts={finance,payroll,english};
for(const track of ['finance','payroll','english'] as const)test(track+': fourth written lesson requires exact identity and keeps evidence/provider scope closed',()=>{
 const slug=sequence4SlugFor(track),m=sequence4ModuleFor(track,{id,slug})!;
 assert.equal(m.lessonId,id);assert.equal(m.track,track);
 assert.equal(isP1Slug(track,slug),false);
 assert.equal(sequence4ModuleFor(track,{id:'bad',slug}),null);
 assert.equal(sequence4ModuleFor(track,{id,slug:slug+'-unreviewed'}),null);
 for(const other of ['finance','payroll','english'] as const)if(other!==track)assert.equal(sequence4ModuleFor(other,{id,slug}),null);
 assert.equal(m.sections.length,4);assert.equal(m.checkpoint.length,5);assert.equal(m.practiceExercises?.length,3);
 const sources=new Set(m.sources.map(s=>s.id));
 for(const s of m.sections){assert.ok(s.paragraphs.length>=2);for(const ref of s.sourceIds)assert.ok(sources.has(ref));}
 for(const q of m.checkpoint){assert.ok(m.sections.some(s=>s.id===q.reviewSection));assert.ok(q.correctIndex>=0&&q.correctIndex<q.options.length);}
 for(const row of m.visual.rows)assert.equal(row.length,3);
 assert.equal(drafts[track].status,'full_draft_not_published_to_database');
 assert.ok(drafts[track].assessmentBoundaries.includes('No pronunciation or acoustic fluency inference from text.'));
 assert.equal('professorGuide' in m,false);assert.equal('mastery' in m,false);
});
test('cash case reconciles independent closing balance and does not confuse change with balance',()=>{
 const c=finance.fictionalCalculation;
 assert.equal(c.earnings+c.depreciation-c.receivablesIncrease+c.inventoryDecrease+c.payablesIncrease,c.operating);
 assert.equal(c.operating-c.equipmentPaid+c.loanReceived,c.change);
 assert.equal(c.opening+c.change,c.closing);
 assert.equal(c.closing,197);
 assert.match(finance.module.caseStudy.modelAnswer,/does not establish overdue collection/);
});
test('benefit case never adds non-cash value to bank pay',()=>{
 const c=payroll.fictionalCalculation;
 assert.equal(c.cash+c.benefit,c.suppliedBase);
 assert.equal(c.cash-c.statutoryDeductions-c.otherDeductions,c.bank);
 assert.notEqual(c.suppliedBase-c.statutoryDeductions-c.otherDeductions,c.bank);
 assert.match(payroll.module.caseStudy.modelAnswer,/does not establish how much/);
});
test('email reference preserves response deadline and leaves approval conditional',()=>{
 const answer=english.module.caseStudy.modelAnswer;
 assert.match(answer,/confirm by 3 p.m. Dublin time on 16 September whether invoice 482 is approved/);
 assert.match(answer,/If you cannot respond by then/);
 assert.doesNotMatch(answer,/payment is approved|is attached/);
});

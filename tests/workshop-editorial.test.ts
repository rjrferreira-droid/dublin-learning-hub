import test from 'node:test';import assert from 'node:assert/strict';
import {WORKSHOP_CASES} from '../src/learning/appliedPractice.ts';
test('zero-change payroll case has consistent facts, hints, explanation and question',()=>{
 const c=WORKSHOP_CASES.payroll[2];assert.ok(c.title.includes('Unchanged'));assert.ok(c.facts[1].includes('remains'));assert.ok(c.hints[1].includes('identical inputs'));assert.ok(c.reasoningPrompt.includes('no net-cash change'));assert.ok(c.workedReasoning.includes('net cash is unchanged'));
 assert.ok(!c.workedReasoning.includes('different supplied PAYE'));assert.equal(c.fields[2].kind==='amount'?c.fields[2].expectedCents:NaN,0);
});
test('changed payroll cases preserve uncertainty rather than inventing the source of the PAYE difference',()=>{for(const c of WORKSHOP_CASES.payroll.slice(0,2)){assert.ok(c.workedReasoning.includes('why PAYE changed is not established'));assert.ok(c.facts[1].includes('only supplied PAYE changes'));}});
test('train ordering does not add an unstated platform-arrival event',()=>{const c=WORKSHOP_CASES.english[0];for(const f of c.fields)if(f.kind==='choice')assert.ok(!f.options.join(' ').includes('before I reached'));});

import test from 'node:test';
import assert from 'node:assert/strict';
import {loadP1ModuleFor,p1SlugFor} from '../src/learning/p1RuntimeModules.ts';
test('Finance revenue case supplies its calculation inputs before revealing the answer',async()=>{
 const lesson=await loadP1ModuleFor('finance',{id:'fictional-finance',slug:p1SlugFor('finance')});
 assert.ok(lesson);
 const facts=lesson.caseStudy.scenario.join(' ');
 assert.match(facts,/contract price 108/);
 assert.match(facts,/100 for hardware and 20 for support/);
 assert.match(facts,/fictional currency units/);
 assert.match(lesson.caseStudy.task,/Then use the numeric extension/);
 assert.equal(lesson.checkpoint.find(q=>q.id==='fin-rev-q4')?.reviewSection,'fin-rev-price');
 for(const q of lesson.checkpoint)assert.ok(lesson.sections.some(s=>s.id===q.reviewSection));
});
test('English meeting model keeps the authored dialogue turns separate',async()=>{
 const lesson=await loadP1ModuleFor('english',{id:'fictional-english',slug:p1SlugFor('english')});
 assert.ok(lesson);
 assert.equal(lesson.caseStudy.modelAnswer.split('\n\n').length,3);
 assert.match(lesson.caseStudy.modelAnswer,/\n\nProfessor:/);
 assert.match(lesson.caseStudy.modelAnswer,/\n\nLearner:/);
 for(const q of lesson.checkpoint)assert.ok(lesson.sections.some(s=>s.id===q.reviewSection));
});

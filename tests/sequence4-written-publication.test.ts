import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSequence4WrittenPack} from '../scripts/build-sequence4-written-pack.mjs';
import {sequence4ModuleFor} from '../src/learning/sequence4Modules.ts';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';
import {isP1Slug} from '../src/learning/p1RuntimeRegistry.ts';

test('English publication candidate binds the actual sequence-four renderer and sequence-three predecessor',()=>{
 const p=buildSequence4WrittenPack('english');
 const module=sequence4ModuleFor('english',{id:'11111111-1111-4111-8111-111111111111',slug:p.lesson.slug});
 assert.ok(module);assert.equal(module.title,p.lesson.title);
 assert.equal(p.lesson.is_published,false);assert.equal(p.lesson.sequence,4);
 assert.equal(p.resolve.required_previous_sequence,3);assert.equal(p.resolve.required_previous_slug,sequence3SlugFor('english'));
 assert.equal(isP1Slug('english',p.lesson.slug),false);
 assert.deepEqual(p.sources.map(s=>s.url),module.sources.map(s=>s.url));
 assert.deepEqual(p.terms.map(t=>[t.term_en,t.definition_en,t.example_en]),module.terms.map(t=>[t.term,t.meaning,t.example]));
 assert.ok(module.sources.every(s=>s.reviewedOn===p.lesson.source_last_reviewed));
 assert.match(module.caseStudy.transfer,/outside work/);
});
test('unreviewed Finance, standby and unknown tracks cannot use the English publication pack',()=>{
 for(const track of ['finance','payroll','manu','unknown','__proto__',''])assert.throws(()=>buildSequence4WrittenPack(track),/reviewed_english_track_required/);
});

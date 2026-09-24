import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSequence3WrittenPack} from '../scripts/build-sequence3-written-pack.mjs';
import {sequence3ModuleFor} from '../src/learning/sequence3Modules.ts';
import {isP1Slug} from '../src/learning/p1RuntimeRegistry.ts';

for(const track of ['finance','english'] as const)test(`${track}: publication candidate resolves to the actual written lesson, without provider admission`,()=>{
 const pack=buildSequence3WrittenPack(track);
 const module=sequence3ModuleFor(track,{id:'11111111-1111-4111-8111-111111111111',slug:pack.lesson.slug});
 assert.ok(module);assert.equal(module.title,pack.lesson.title);
 assert.equal(pack.lesson.is_published,false);assert.equal(pack.lesson.sequence,3);
 assert.equal(pack.resolve.required_previous_sequence,2);assert.equal(isP1Slug(track,pack.lesson.slug),false);
 assert.equal(pack.terms.length,module.terms.length);assert.equal(pack.sources.length,module.sources.length);
 assert.deepEqual(pack.sources.map(s=>s.url),module.sources.map(s=>s.url));
});
test('publication candidates preserve standby and unresolved source review boundaries',()=>{
 for(const track of ['payroll','manu','unknown','__proto__'])assert.throws(()=>buildSequence3WrittenPack(track),/active_track_required/);
 assert.equal(buildSequence3WrittenPack('finance').sourceReviewStatus,'original_frc_pdf_recheck_pending');
 assert.equal(buildSequence3WrittenPack('english').sourceReviewStatus,'rechecked_2026-09-20');
});

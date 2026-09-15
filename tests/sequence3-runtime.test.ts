import test from 'node:test';
import assert from 'node:assert/strict';
import {sequence3ModuleFor} from '../src/learning/sequence3Modules.ts';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';
import {isP1Slug} from '../src/learning/p1RuntimeRegistry.ts';
const id='11111111-1111-4111-8111-111111111111';
for(const track of ['finance','payroll','english'] as const)test(track+': third lesson maps authored content under exact identity without expanding P1 provider scope',()=>{
 const slug=sequence3SlugFor(track),m=sequence3ModuleFor(track,{id,slug})!;
 assert.equal(m.lessonId,id);assert.equal(m.track,track);assert.equal(m.sections.length,4);
 assert.equal(m.checkpoint.length,5);assert.equal(m.practiceExercises?.length,3);
 assert.equal(isP1Slug(track,slug),false);
 assert.equal(sequence3ModuleFor(track,{id:'invalid',slug}),null);
 assert.equal(sequence3ModuleFor(track,{id,slug:'wrong'}),null);
 for(const other of ['finance','payroll','english'] as const)if(other!==track)assert.equal(sequence3ModuleFor(other,{id,slug}),null);
 const sources=new Set(m.sources.map(s=>s.id));
 for(const section of m.sections)for(const ref of section.sourceIds)assert.ok(sources.has(ref));
 for(const q of m.checkpoint)assert.ok(m.sections.some(s=>s.id===q.reviewSection));
});

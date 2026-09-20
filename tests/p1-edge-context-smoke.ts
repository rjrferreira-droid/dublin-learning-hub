import assert from 'node:assert/strict';
import {buildP1WrittenLessonContext} from '../server/p1-written-lesson-context.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';

// Run in real Deno as well as Node: Edge must not depend on Node globals.
for(const track of ['finance','english'] as const){
 const id='11111111-1111-4111-8111-111111111111';
 const result=buildP1WrittenLessonContext({profileTrack:'rafael_finance',
  requestedTrack:track==='finance'?'rafael_finance':'english_academy',
  requestedLessonId:id,resolvedLessonId:id,resolvedLessonSlug:p1SlugFor(track)});
 assert.ok(result);
 assert.equal(result.descriptor.contextBytes,new TextEncoder().encode(JSON.stringify(result.context)).byteLength);
 assert.match(result.descriptor.sha256,/^[a-f0-9]{64}$/);
}
console.log('Finance and English authored contexts work without implicit Node globals.');

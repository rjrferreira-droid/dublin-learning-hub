import assert from 'node:assert/strict';
import test from 'node:test';
import {deepAudioSource,deepProfessorProviderLessonId} from '../src/learning/deepInteractiveRegistry.ts';

const ids={
 a1:'a1100000-2026-4acc-8a01-000000000001',a2:'a1200000-2026-4acc-8a02-000000000002',
 e1:'e1100000-2026-4e11-8e01-000000000001',p1:'e2100000-2026-4e21-8e03-000000000003',
};

test('only the four reviewed deep units expose authored Preview audio',()=>{
 for(const id of Object.values(ids)){
  const source=deepAudioSource(id);assert.ok(source);assert.ok(source.script.length>4000);assert.ok(source.chunks.length>=4);
  assert.equal(source.chunks.join(' '),source.script);
  for(const chunk of source.chunks)assert.ok(chunk.length<4000,'provider chunk stays bounded');
 }
 assert.equal(deepAudioSource('b3639582-3c32-4147-a4b3-84237d11a66e'),null);
});

test('Professor maps only the two reviewed English local lessons',()=>{
 assert.equal(deepProfessorProviderLessonId(ids.e1),'f455a740-f50f-4eb7-95a7-9e4129ca4a68');
 assert.equal(deepProfessorProviderLessonId(ids.p1),'1735c87f-29da-49ac-a9a9-718d7ff2f21a');
 assert.equal(deepProfessorProviderLessonId(ids.a1),null);
 assert.equal(deepProfessorProviderLessonId(ids.a2),null);
});

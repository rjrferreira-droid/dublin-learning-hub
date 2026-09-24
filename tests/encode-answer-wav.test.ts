import assert from 'node:assert/strict';
import test from 'node:test';
import {pcm16Wave} from '../src/audio/encodeAnswerWav.ts';

test('spoken answers are bounded 16 kHz mono PCM WAV with exact sample data',()=>{
 const bytes=pcm16Wave(new Float32Array([-1,0,1]));
 const view=new DataView(bytes.buffer);
 assert.equal(new TextDecoder().decode(bytes.subarray(0,4)),'RIFF');
 assert.equal(new TextDecoder().decode(bytes.subarray(8,12)),'WAVE');
 assert.equal(view.getUint32(24,true),16_000);
 assert.equal(view.getUint16(22,true),1);
 assert.equal(view.getUint16(34,true),16);
 assert.equal(view.getUint32(40,true),6);
 assert.equal(view.getInt16(44,true),-32768);
 assert.equal(view.getInt16(46,true),0);
 assert.equal(view.getInt16(48,true),32767);
 assert.throws(()=>pcm16Wave(new Float32Array(60*16_000+1)),/audio_answer_duration_invalid/);
});

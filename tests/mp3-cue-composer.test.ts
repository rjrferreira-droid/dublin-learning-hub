import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {composeMp3Cues,validateEpisodeSpeechMp3} from '../supabase/functions/_shared/mp3-cue-composer.ts';
import {silentMp3} from '../supabase/functions/_shared/silent-mp3.ts';

test('independent MP3 speech responses join with exact silence, without midstream tags or decoder errors',
 {skip:spawnSync('ffmpeg',['-version']).status!==0||spawnSync('ffprobe',['-version']).status!==0},()=>{
 const folder=mkdtempSync(join(tmpdir(),'english-episode-'));
 try{
  const a=join(folder,'nora.mp3'),b=join(folder,'sam.mp3'),merged=join(folder,'episode.mp3');
  for(const [file,frequency] of [[a,440],[b,660]] as const){
   const encoded=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i',`sine=frequency=${frequency}:duration=1`,
    '-ar','24000','-ac','1','-b:a','32k','-y',file]);
   assert.equal(encoded.status,0,encoded.stderr.toString());
  }
  const nora=readFileSync(a),sam=readFileSync(b);
  validateEpisodeSpeechMp3(nora);validateEpisodeSpeechMp3(sam);
  const recovered=composeMp3Cues([{kind:'speech',bytes:nora},{kind:'silence',durationMs:48},
   {kind:'speech',bytes:sam}],15_728_640);
  const recoveredFile=join(folder,'recovered.mp3');writeFileSync(recoveredFile,recovered);
  assert.equal(spawnSync('ffmpeg',['-v','error','-i',recoveredFile,'-f','null','-']).status,0);
  const bytes=composeMp3Cues([{kind:'speech',bytes:nora},{kind:'silence',durationMs:3000},
   {kind:'speech',bytes:sam}],15_728_640);
  assert.equal(Buffer.from(bytes).indexOf(Buffer.from('ID3')), -1);
  assert.equal(Buffer.from(bytes).indexOf(Buffer.from('Xing')), -1);
  assert.equal(Buffer.from(bytes).indexOf(Buffer.from('Info')), -1);
  writeFileSync(merged,bytes);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json',merged]);
  assert.equal(probe.status,0,probe.stderr.toString());
  const duration=Number(JSON.parse(probe.stdout.toString()).format.duration);
  assert.ok(duration>4.9&&duration<5.3,`unexpected duration ${duration}`);
  const decode=spawnSync('ffmpeg',['-v','error','-i',merged,'-f','null','-']);
  assert.equal(decode.status,0,decode.stderr.toString());
  assert.equal(decode.stderr.toString(),'');
  assert.throws(()=>composeMp3Cues([{kind:'speech',bytes:nora},{kind:'speech',bytes:sam}],1024),/too_large/);
  const incompatible=spawnSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=880:duration=1',
   '-ar','44100','-ac','2','-b:a','64k','-y',join(folder,'wrong.mp3')]);
  assert.equal(incompatible.status,0);
  assert.throws(()=>validateEpisodeSpeechMp3(readFileSync(join(folder,'wrong.mp3'))),/format_mismatch/);
 }finally{rmSync(folder,{recursive:true,force:true});}
});

test('corrupt frames cannot be cached as a composed episode',()=>{
 const fake=new Uint8Array(4096);fake.set([0xff,0xf3,0x44,0xc4]);
 assert.throws(()=>composeMp3Cues([{kind:'speech',bytes:fake}],15_728_640),/audio_mp3_invalid/);
 assert.throws(()=>composeMp3Cues([{kind:'silence',durationMs:3000},{kind:'speech',bytes:fake}],15_728_640),/audio_mp3_invalid/);
 assert.ok(silentMp3(3000).byteLength>0);
});

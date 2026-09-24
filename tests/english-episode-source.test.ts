import assert from 'node:assert/strict';
import test from 'node:test';
import {englishEpisodeSource,groupEnglishEpisodeCues} from '../supabase/functions/_shared/english-episode-source.ts';
import {silentMp3} from '../supabase/functions/_shared/silent-mp3.ts';

const moduleId='22222222-2222-4222-8222-222222222222';
const courseId='33333333-3333-4333-8333-333333333333';
const lessons=[
 {lessonId:'e1100000-2026-4e11-8e01-000000000001',lessonSlug:'preview-deep-story-past-forms-rhythm-follow-up',sequence:101},
 {lessonId:'e2100000-2026-4e21-8e03-000000000003',lessonSlug:'preview-deep-clarify-check-understanding-handle-meetings',sequence:102},
] as const;
const input=(lesson:(typeof lessons)[number])=>({...lesson,contentVersion:2,moduleId,courseId,
 profileTrack:'rafael_finance',courseTrack:'english_academy'});

test('English episodes bind all spoken turns, voice choices, pauses and transcript to distinct immutable assets',()=>{
 const sources=lessons.map(lesson=>englishEpisodeSource(input(lesson)));
 assert.notEqual(sources[0].sourceFingerprint,sources[1].sourceFingerprint);
 for(const source of sources){
  assert.match(source.storagePath,new RegExp(`^lessons/${source.identity.lessonId}/episode-v2-[a-f0-9]{64}-r1\\.mp3$`));
  assert.ok(source.renderCues.some(cue=>cue.kind==='silence'));
  const voices=new Set(source.renderCues.filter(cue=>cue.kind==='speech').map(cue=>cue.kind==='speech'?cue.voice:''));
  assert.ok(voices.has('marin')&&voices.has('coral')&&voices.has('onyx'));
  assert.ok(source.renderCues.every(cue=>cue.kind==='silence'||!/(?:\bhost\b|\bpause\b|^\s*[A-Z]+\s*:)/i.test(cue.text)));
  assert.ok(source.transcript.includes('HOST:')||source.transcript.includes('NIAMH:'));
 }
 assert.equal(sources[0].renderCues.filter(cue=>cue.kind==='speech').length,32);
 assert.equal(sources[1].renderCues.filter(cue=>cue.kind==='speech').length,16);
 assert.equal(sources[1].renderCues[14].kind,'silence');
 assert.deepEqual(sources[1].renderCues[14],{kind:'silence',durationMs:48});
 assert.deepEqual(sources[1].cuePlan.slice(-3).map(cue=>cue.cueIndex),[15,16,17]);
 assert.ok(sources[1].renderCues.slice(15).every(cue=>cue.kind==='speech'&&cue.text.length<=1500));
});

test('wrong DB identity, track, version and slug fail before an English episode can be admitted',()=>{
 const base=input(lessons[0]);
 for(const changed of [{sequence:1},{lessonSlug:'story-past-forms-rhythm-follow-up'},{contentVersion:3},
  {profileTrack:'viviane_payroll'},{courseTrack:'rafael_finance'},{lessonId:'a1100000-2026-4acc-8a01-000000000001'}])
  assert.throws(()=>englishEpisodeSource({...base,...changed}));
});

test('coalescing preserves speaker changes and silence boundaries',()=>{
 const speech=(speaker:string,text:string)=>({kind:'speech' as const,speaker,voice:'coral' as const,text});
 const grouped=groupEnglishEpisodeCues([speech('Nora','One.'),speech('Nora','Two.'),speech('Ciara','Three.'),
  {kind:'silence',durationMs:5000},speech('Nora','Four.')]);
 assert.deepEqual(grouped,[speech('Nora','One. Two.'),speech('Ciara','Three.'),
  {kind:'silence',durationMs:5000},speech('Nora','Four.')]);
});

test('encoded pauses are frame-accurate to 24 ms',()=>{
 assert.equal(silentMp3(3000).byteLength,125*96);
 assert.equal(silentMp3(5000).byteLength,208*96);
 assert.equal(silentMp3(0).byteLength,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {audioAssessmentPrompt,normalizedAssessmentKey,parseAudioAssessment,validateAnswerWav,MAX_WAV_BYTES,
 ENGLISH_AUDIO_SKILLS} from '../supabase/functions/_shared/english-audio-assessment.ts';

function wav(seconds:number,amplitude=900):Uint8Array{
 const bytes=new Uint8Array(44+Math.round(seconds*16_000)*2);
 const view=new DataView(bytes.buffer);
 const text=(at:number,value:string)=>{for(let i=0;i<value.length;i++)bytes[at+i]=value.charCodeAt(i);};
 text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,16_000,true);view.setUint32(28,32_000,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');
 view.setUint32(40,bytes.length-44,true);
 for(let at=44;at<bytes.length;at+=2)view.setInt16(at,(at%8===0?1:-1)*amplitude,true);
 return bytes;
}

test('one full minute of speech is accepted, but silence, oversized and mislabeled files are rejected',()=>{
 const minute=wav(60);
 assert.equal(minute.length,MAX_WAV_BYTES);
 assert.equal(validateAnswerWav(minute).seconds,60);
 assert.throws(()=>validateAnswerWav(wav(60.01)),/audio_too_large/);
 assert.throws(()=>validateAnswerWav(wav(2,0)),/invalid_audio/);
 const fake=wav(2);fake[24]=0x44;
 assert.throws(()=>validateAnswerWav(fake),/unsupported_audio/);
});

test('seven skills retain unavailable acoustic scores instead of inventing them',()=>{
 const skills=Object.fromEntries(ENGLISH_AUDIO_SKILLS.map(name=>[name,{score:80,feedback:`Evidence for ${name}`}])) as Record<string,{score:number|null;feedback:string}>;
 skills.pronunciation={score:null,feedback:'The recording is too noisy to judge intelligibility.'};
 skills.intonation={score:null,feedback:'The recording is too noisy to judge pitch and phrasing.'};
 skills.fluency={score:null,feedback:'The recording is too noisy to judge pacing.'};
 const parsed=parseAudioAssessment({transcript:'She went to Riverside.',skills,feedback:'Add the reason for the wrong turn.'});
 assert.equal(parsed.skills.pronunciation.score,null);
 assert.equal(parsed.skills.intonation.score,null);
 assert.equal(parsed.skills.fluency.score,null);
 assert.equal(parsed.skills.comprehension.score,80);
 assert.throws(()=>parseAudioAssessment({...parsed,skills:{...skills,fluency:{score:NaN,feedback:'Unknown'}}}),/assessment_output_invalid/);
});

test('audio assessment prompt uses the authored reference without equating accent to intelligibility',()=>{
 const prompt=audioAssessmentPrompt('Where was Nora going?','Riverside Community Centre');
 assert.match(prompt,/Riverside Community Centre/);
 assert.match(prompt,/not conformity to a native accent/);
 assert.match(prompt,/must be grounded in the recording/);
});

test('a copied provider secret is normalized only when exactly one full key is present',()=>{
 const key=`sk-proj-${'a'.repeat(40)}`;
 assert.equal(normalizedAssessmentKey(`OPENAI_API_KEY=\"${key}\"`),key);
 assert.equal(normalizedAssessmentKey(`Bearer ${key}`),key);
 assert.equal(normalizedAssessmentKey(`Bearer ${key} ${key}`),null);
 assert.equal(normalizedAssessmentKey('sk-...'),null);
});

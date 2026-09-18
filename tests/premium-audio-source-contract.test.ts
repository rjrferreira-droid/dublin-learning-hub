import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildWrittenAudioPreviewSource} from '../quality/candidates/written-audio-preview.ts';
import {
 canonicalPremiumAudioIdentity,
 createPremiumAudioSourceContract,
 immutablePremiumAudioStoragePath,
 PREMIUM_AUDIO_RENDER_RECIPE,
 PREMIUM_AUDIO_RENDER_PROFILE,
 PREMIUM_AUDIO_RENDER_REVISION,
 resolvePremiumAudioRenderRecipe,
} from '../quality/candidates/premium-audio-source-contract.ts';
import type {BoundIdentity} from '../quality/candidates/professor-admission-contract.ts';

const ids={lesson:'11111111-1111-4111-8111-111111111111',module:'22222222-2222-4222-8222-222222222222',course:'33333333-3333-4333-8333-333333333333'};
const tracks={
 finance:{requestedTrack:'rafael_finance',studyTrack:'finance',language:'pt-BR'},
 payroll:{requestedTrack:'viviane_payroll',studyTrack:'payroll',language:'pt-BR'},
 english:{requestedTrack:'english_academy',studyTrack:'english',language:'en'},
} as const;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function identity(track:keyof typeof tracks,overrides:Partial<BoundIdentity>={}):BoundIdentity{
 const selected=tracks[track];
 return {lessonId:ids.lesson,moduleId:ids.module,courseId:ids.course,lessonSlug:`authored-${track}`,contentVersion:7,
  requestedTrack:selected.requestedTrack,studyTrack:selected.studyTrack,sequence:3,...overrides};
}
function authored(track:keyof typeof tracks,overrides:Record<string,unknown>={}){
 return {identity:identity(track),referenceSha256:'a'.repeat(64),title:`Authored ${track}`,
  authoredSections:[{title:'Decision',paragraphs:[`English paragraph for ${track}`,'PRIVATE_SECOND_PARAGRAPH'],supportPt:`Apoio em português para ${track}`}],...overrides} as any;
}

for(const track of Object.keys(tracks) as (keyof typeof tracks)[])test(`${track}: pure authored builder preserves the exact current source recipe`,()=>{
 const input=authored(track),source=buildWrittenAudioPreviewSource(input);
 const paragraph=track==='english'?`English paragraph for ${track}`:`Apoio em português para ${track}`;
 const expected=[track==='english'?'Study guide. This is an overview, not the complete lesson.':'Guia de estudo. Este é um resumo de apoio, não a aula completa.',
  `Authored ${track}`,`Decision. ${paragraph}`,
  track==='english'?'Pause and explain one key idea in your own words. Open the written lesson for the full case and practice.':'Faça uma pausa e explique uma ideia central com suas palavras. Abra a aula escrita para consultar o caso completo e praticar.'].join('\n\n');
 assert.equal(source.script,expected);assert.equal(source.language,tracks[track].language);assert.equal(source.characters,Array.from(expected).length);
 assert.equal(source.scriptSha256,hash(expected));
 const renderRecipe=resolvePremiumAudioRenderRecipe(source.language);
 assert.equal(source.sourceFingerprint,hash(JSON.stringify({identity:source.identity,language:source.language,scriptSha256:source.scriptSha256,renderRecipe})));
 assert.match(source.sourceFingerprint,/^[a-f0-9]{64}$/);assert.equal(source.referenceSha256,'a'.repeat(64));
 const contract=createPremiumAudioSourceContract({identity:source.identity,sourceFingerprint:source.sourceFingerprint});
 assert.equal(contract.renderProfile,'written-study-guide-v1');assert.equal(contract.renderRevision,1);
 assert.equal(contract.storagePath,`lessons/${ids.lesson}/commentary-v7-${source.sourceFingerprint}-r1.mp3`);
});

test('canonical identity makes fingerprints deterministic while identity or authored source changes the immutable object path',()=>{
 const first=buildWrittenAudioPreviewSource(authored('finance'));
 const reordered={sequence:3,studyTrack:'finance',requestedTrack:'rafael_finance',contentVersion:7,lessonSlug:'authored-finance',
  courseId:ids.course,moduleId:ids.module,lessonId:ids.lesson} as BoundIdentity;
 const same=buildWrittenAudioPreviewSource(authored('finance',{identity:reordered}));
 assert.deepEqual(same.identity,first.identity);assert.equal(same.sourceFingerprint,first.sourceFingerprint);
 const referenceOnly=buildWrittenAudioPreviewSource(authored('finance',{referenceSha256:'c'.repeat(64)}));
 assert.equal(referenceOnly.scriptSha256,first.scriptSha256);assert.equal(referenceOnly.sourceFingerprint,first.sourceFingerprint);
 const changedSource=buildWrittenAudioPreviewSource(authored('finance',{title:'A revised authored title'}));
 assert.notEqual(changedSource.scriptSha256,first.scriptSha256);assert.notEqual(changedSource.sourceFingerprint,first.sourceFingerprint);
 assert.notEqual(immutablePremiumAudioStoragePath(changedSource.identity,changedSource.sourceFingerprint),immutablePremiumAudioStoragePath(first.identity,first.sourceFingerprint));
 const changedIdentity=buildWrittenAudioPreviewSource(authored('finance',{identity:identity('finance',{contentVersion:8})}));
 assert.equal(changedIdentity.scriptSha256,first.scriptSha256);assert.notEqual(changedIdentity.sourceFingerprint,first.sourceFingerprint);
 assert.match(immutablePremiumAudioStoragePath(changedIdentity.identity,changedIdentity.sourceFingerprint),/\/commentary-v8-[a-f0-9]{64}-r1\.mp3$/);
});

test('learner drafts, answers and authored worked-answer fields cannot enter the source output',()=>{
 const input=authored('english',{draft:'PRIVATE_DRAFT_SENTINEL',answers:['PRIVATE_ANSWER_SENTINEL'],workedAnswer:'PRIVATE_WORKED_SENTINEL'});
 input.authoredSections[0].supportPt='PRIVATE_UNUSED_SUPPORT_SENTINEL';
 const source=buildWrittenAudioPreviewSource(input);
 assert.equal(source.includesLearnerDrafts,false);assert.equal(source.includesWorkedAnswer,false);assert.equal(source.providerAdmission,false);
 assert.doesNotMatch(JSON.stringify(source),/PRIVATE_DRAFT_SENTINEL|PRIVATE_ANSWER_SENTINEL|PRIVATE_WORKED_SENTINEL|PRIVATE_UNUSED_SUPPORT_SENTINEL|PRIVATE_SECOND_PARAGRAPH/);
});

test('source contract rejects malformed or extended identities and non-canonical fingerprints',()=>{
 const valid=identity('finance'),fingerprint='b'.repeat(64);
 assert.deepEqual(canonicalPremiumAudioIdentity(valid),valid);
 for(const invalid of [{...valid,extra:'forbidden'},{...valid,lessonId:'not-a-uuid'},{...valid,lessonId:'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'},{...valid,contentVersion:0},{...valid,sequence:9},
  {...valid,requestedTrack:'rafael_finance',studyTrack:'payroll'},{...valid,lessonSlug:'   '}]){
  assert.throws(()=>createPremiumAudioSourceContract({identity:invalid,sourceFingerprint:fingerprint}),/identity_invalid/);
 }
 for(const invalid of [fingerprint.toUpperCase(),'a'.repeat(63),'a'.repeat(65),'g'.repeat(64),null])
  assert.throws(()=>immutablePremiumAudioStoragePath(valid,invalid),/fingerprint_invalid/);
 assert.throws(()=>createPremiumAudioSourceContract({identity:valid,sourceFingerprint:fingerprint,extra:true}),/contract_invalid/);
 assert.equal(PREMIUM_AUDIO_RENDER_PROFILE,'written-study-guide-v1');assert.equal(PREMIUM_AUDIO_RENDER_REVISION,1);
});

test('strict deeply frozen render recipe binds provider behavior to profile, revision, fingerprint and path',()=>{
 assert.deepEqual(PREMIUM_AUDIO_RENDER_RECIPE,{profile:'written-study-guide-v1',revision:1,provider:'openai',
  endpoint:'https://api.openai.com/v1/audio/speech',request:{model:'gpt-4o-mini-tts',voice:'marin',response_format:'mp3',speed:0.98,
   instructions:{en:'Speak in clear natural English as a patient teacher. This is a study-guide overview; do not claim that pronunciation or an Irish accent was assessed.',
    'pt-BR':'Speak in natural Brazilian Portuguese as a calm expert teacher. Keep technical English terms in English.'}}});
 assert.ok(Object.isFrozen(PREMIUM_AUDIO_RENDER_RECIPE));assert.ok(Object.isFrozen(PREMIUM_AUDIO_RENDER_RECIPE.request));
 assert.ok(Object.isFrozen(PREMIUM_AUDIO_RENDER_RECIPE.request.instructions));
 for(const language of ['en','pt-BR'] as const){const recipe=resolvePremiumAudioRenderRecipe(language);assert.ok(Object.isFrozen(recipe));assert.ok(Object.isFrozen(recipe.request));
  assert.equal(recipe.profile,PREMIUM_AUDIO_RENDER_PROFILE);assert.equal(recipe.revision,PREMIUM_AUDIO_RENDER_REVISION);
  assert.equal(recipe.request.instructions,PREMIUM_AUDIO_RENDER_RECIPE.request.instructions[language]);}
 for(const invalid of [null,'EN','pt','pt-br','english',{},[]])assert.throws(()=>resolvePremiumAudioRenderRecipe(invalid),/render_language_invalid/);
 const source=buildWrittenAudioPreviewSource(authored('finance')),recipe=resolvePremiumAudioRenderRecipe(source.language);
 const changedRecipe={...recipe,request:{...recipe.request,voice:'different-reviewed-voice'}};
 const changedFingerprint=hash(JSON.stringify({identity:source.identity,language:source.language,scriptSha256:source.scriptSha256,renderRecipe:changedRecipe}));
 assert.notEqual(changedFingerprint,source.sourceFingerprint);
 assert.notEqual(immutablePremiumAudioStoragePath(source.identity,changedFingerprint),immutablePremiumAudioStoragePath(source.identity,source.sourceFingerprint));
});

test('authored source overflow is rejected instead of clipping content',()=>{
 assert.throws(()=>buildWrittenAudioPreviewSource(authored('finance',{authoredSections:[{title:'Long',paragraphs:['safe'],supportPt:'x'.repeat(4001)}]})),/written_audio_script_too_long/);
});

test('authored source character count uses Unicode code points like PostgreSQL char_length',()=>{
 const seed=buildWrittenAudioPreviewSource(authored('finance',{authoredSections:[{title:'Boundary',paragraphs:[],supportPt:'🚀'}]}));
 const boundaryText='x'.repeat(4000-seed.characters)+'🚀';
 const source=buildWrittenAudioPreviewSource(authored('finance',{authoredSections:[{title:'Boundary',paragraphs:[],supportPt:boundaryText}]}));
 assert.equal(source.characters,4000);assert.equal(Array.from(source.script).length,4000);assert.equal(source.script.length,4001);
 assert.ok(source.script.includes(boundaryText));assert.equal(source.scriptSha256,hash(source.script));assert.match(source.sourceFingerprint,/^[a-f0-9]{64}$/);
 const withoutAstral=buildWrittenAudioPreviewSource(authored('finance',{authoredSections:[{title:'Boundary',paragraphs:[],supportPt:'x'.repeat(4000-seed.characters+1)}]}));
 assert.equal(withoutAstral.characters,4000);assert.notEqual(withoutAstral.scriptSha256,source.scriptSha256);assert.notEqual(withoutAstral.sourceFingerprint,source.sourceFingerprint);
 assert.throws(()=>buildWrittenAudioPreviewSource(authored('finance',{authoredSections:[{title:'Boundary',paragraphs:[],supportPt:'x'+boundaryText}]})),/written_audio_script_too_long/);
});

test('malformed authored values fail closed without string coercion or partial source output',()=>{
 for(const [overrides,error] of [
  [{title:'   '},/title_invalid/],
  [{referenceSha256:'A'.repeat(64)},/reference_hash_invalid/],
  [{referenceSha256:'a'.repeat(63)},/reference_hash_invalid/],
  [{authoredSections:[]},/sections_invalid/],
  [{authoredSections:'not-an-array'},/sections_invalid/],
  [{authoredSections:[{title:'',paragraphs:['safe'],supportPt:'safe'}]},/section_invalid/],
  [{identity:identity('english'),authoredSections:[{title:'Safe',paragraphs:[],supportPt:'safe'}]},/section_invalid/],
  [{identity:identity('english'),authoredSections:[{title:'Safe',paragraphs:[7],supportPt:'safe'}]},/section_invalid/],
  [{authoredSections:[{title:'Safe',paragraphs:['safe'],supportPt:{toString:()=> 'coerced'}}]},/section_invalid/],
 ] as const)assert.throws(()=>buildWrittenAudioPreviewSource(authored('finance',overrides as any)),error);
 assert.doesNotThrow(()=>buildWrittenAudioPreviewSource(authored('finance',{authoredSections:[{title:'Safe',paragraphs:[],supportPt:'Narrated'}]})));
 assert.doesNotThrow(()=>buildWrittenAudioPreviewSource(authored('english',{authoredSections:[{title:'Safe',paragraphs:['Narrated'],supportPt:''}]})));
 assert.throws(()=>buildWrittenAudioPreviewSource(null as any),/source_invalid/);
});

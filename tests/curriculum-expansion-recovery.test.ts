import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const permanent=read('quality/permanent-curriculum-directives.json');
const grammar=read('quality/english-contextual-grammar.json');
const acca=read('quality/acca-fr-foundations-a1-b2.json');
test('permanent curriculum activates English and ACCA FR while preserving protected capabilities',()=>{
 assert.deepEqual(permanent.activePriorities,['english','acca-fr','professor-quality']);
 assert.equal(permanent.english.balance.everyday,50);assert.equal(permanent.english.balance.professional,50);
 assert.equal(permanent.premiumAudio.preservationRule.includes('Do not modify'),true);
 assert.equal(permanent.release.databasePublication,false);assert.equal(permanent.release.paidProviderCalls,false);
 assert.ok(permanent.preservedCapabilities.includes('manuzinha-isolation'));
});
test('contextual grammar has complete teach-practise-transfer units across everyday and professional English',()=>{
 assert.equal(grammar.status,'authored_local_curriculum_not_database_published');assert.equal(grammar.units.length,4);
 assert.deepEqual([...new Set(grammar.units.map((u:any)=>u.context))].sort(),['everyday','professional']);
 for(const u of grammar.units){assert.ok(u.notice.length>=2);assert.ok(u.rule.length>40);assert.ok(u.contrast.length>=2);assert.ok(u.supported.length>=2);assert.ok(u.production.length>30);assert.ok(u.spokenTransfer.length>30);}
 assert.match(grammar.contract.freeText,/multiple defensible forms/i);assert.match(grammar.contract.externalPractice,/topic only/i);
});
test('ACCA FR recovery contains A1-A4 and B1-B2 in order with full original lesson shape',()=>{
 assert.deepEqual(acca.sequence.map((l:any)=>l.code),['A1','A2','A3','A4','B1','B2']);
 for(const l of acca.sequence){assert.equal(l.status,'authored_local_lesson_not_database_published');assert.equal(l.objectives.length,4);assert.equal(l.sections.length,4);assert.equal(l.practice.length,3);assert.ok(l.examTask.minutes>=12);assert.equal(l.premiumAudio.status,'script_outline_only_no_generation');assert.equal(l.premiumAudio.preserveExistingRuntime,true);assert.equal(l.sources.length,3);assert.match(l.evidenceBoundary,/Authored solutions/);}
});
test('ACCA calculations remain internally consistent',()=>{
 const b1=acca.sequence.find((l:any)=>l.code==='B1').workedExample.calculation;assert.equal(b1.capitalisedCost,550);assert.equal(b1.annualDepreciation,50);
 const b2=acca.sequence.find((l:any)=>l.code==='B2').workedExample.calculation;assert.equal(b2.capitaliseDevelopment,240);assert.equal(b2.threeMonthAmortisation,12);
});
test('recovered curriculum remains inert and makes no completeness or publication claim',()=>{
 assert.match(acca.coverage.claim,/not 100%/i);assert.equal(acca.release.supabaseMutation,false);assert.equal(acca.release.deployment,false);
 for(const p of ['quality/permanent-curriculum-directives.json','quality/english-contextual-grammar.json','quality/acca-fr-foundations-a1-b2.json']){const raw=fs.readFileSync(p,'utf8');for(const banned of ['supabase.from(','.insert(','.update(','functions.invoke','CREATE TABLE','ALTER TABLE'])assert.ok(!raw.includes(banned),p+': '+banned);}
});

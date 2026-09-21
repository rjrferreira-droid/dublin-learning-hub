import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const prior=JSON.parse(fs.readFileSync('quality/acca-fr-foundations-a1-b2.json','utf8'));
const next=JSON.parse(fs.readFileSync('quality/acca-fr-b3-b4.json','utf8'));
test('B3-B4 extend the recovered ACCA sequence without rewriting A1-B2',()=>{
 assert.deepEqual(prior.sequence.map((x:any)=>x.code),next.integration.previousCodes);
 assert.deepEqual(next.sequence.map((x:any)=>x.code),['B3','B4']);
 assert.equal(next.integration.completeSyllabusClaim,false);
});
for(const l of next.sequence)test(l.code+' has the complete offline authored lesson contract',()=>{
 assert.equal(l.status,'authored_local_lesson_not_database_published');assert.equal(l.objectives.length,4);assert.equal(l.sections.length,4);
 assert.equal(l.practice.length,3);assert.ok(l.examTask.minutes>=20);assert.equal(l.premiumAudio.status,'script_outline_only_no_generation');
 assert.equal(l.premiumAudio.preserveExistingRuntime,true);assert.match(l.syllabus.outcomeReferences,/cross-check/i);
});
test('B3 CGU example allocates the impairment in full and respects the building floor',()=>{
 const x=next.sequence.find((l:any)=>l.code==='B3').workedExample.calculation;
 assert.equal(x.carryingAmount-x.recoverableAmount,x.impairment);
 assert.equal(x.goodwillWriteOff+x.plantAllocation+(200-x.buildingClosing),x.impairment);
 assert.equal(x.buildingClosing,x.buildingFloor);assert.equal(x.plantClosing,260-x.plantAllocation);
});
test('B4 inventory example reconciles FIFO, weighted average and NRV',()=>{
 const x=next.sequence.find((l:any)=>l.code==='B4').workedExample.calculation;
 assert.equal(x.unitsAvailable-x.unitsClosing,180);assert.equal(x.totalNrv,x.nrvPerUnit*x.unitsClosing);
 assert.equal(x.fifoCost-x.writeDownFIFO,x.closingInventoryFIFO);
 assert.equal(x.weightedAverageCost-x.writeDownWeightedAverage,x.closingInventoryWeightedAverage);
 assert.equal(x.closingInventoryFIFO,x.totalNrv);assert.equal(x.closingInventoryWeightedAverage,x.totalNrv);
});
test('B3-B4 are inert and preserve publication, cost and audio boundaries',()=>{
 assert.deepEqual(next.release,{databasePublication:false,supabaseMutation:false,deployment:false,paidProviderCalls:false,audioGeneration:false});
 const raw=fs.readFileSync('quality/acca-fr-b3-b4.json','utf8');
 for(const banned of ['supabase.from(','.insert(','.update(','functions.invoke','CREATE TABLE','ALTER TABLE'])assert.ok(!raw.includes(banned));
});

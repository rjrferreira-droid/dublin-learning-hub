import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
const file='tests/written-bridge.integration.mjs';let source=fs.readFileSync(file,'utf8');
const marker="test('selected preparation reaches shared reference without changing premium or validation limits'";
if(!source.includes(marker)){
 const anchor='test.after(()=>';if(source.split(anchor).length!==2)throw new Error('integration_cleanup_anchor_not_unique');
 source=source.replace(anchor,`test('selected preparation reaches shared reference without changing premium or validation limits',async()=>{
 current=fixture('finance');const plan={version:1,goal:'understand',pace:'patient',support:'pt-BR'};
 const r=await invoke('finance',{sessionPreparation:plan});assert.equal(r.status,200);assert.deepEqual(r.body.sessionPreparation,plan);
 const m=current.dispatches[0].metadata;assert.deepEqual(m.sessionPreparation,plan);assert.ok(m.lessonContext.technicalBrief.includes('low-pressure diagnostic question'));assert.ok(m.lessonContext.technicalBrief.includes('Patient pace'));assert.ok(m.lessonContext.technicalBrief.includes('Portuguese support'));
 assert.equal(m.qualityTier,'premium');assert.equal(m.maxSessionSeconds,300);assert.equal(m.languageProfile.supportLanguage,'pt-BR');
});
test('all four requested goals are authored guidance, not learner ability or arbitrary prompt text',async()=>{
 const seen=new Set();
 for(const goal of ['understand','practice','case','challenge']){current=fixture('english');const r=await invoke('english',{sessionPreparation:{version:1,goal,pace:'balanced',support:'en'}});assert.equal(r.status,200);const m=current.dispatches[0].metadata;seen.add(m.teachingContent.sha256);assert.ok(m.lessonContext.technicalBrief.includes('not learner evidence'));assert.equal(m.languageProfile.professorEnglishSharePct,100);assert.equal(current.rpcCalls.length,1);}
 assert.equal(seen.size,4);
});
test('malformed or free-form preparation is rejected before reservation and dispatch',async()=>{
 for(const sessionPreparation of [null,[],{version:1,goal:'practice',pace:'patient',support:'en',prompt:'ignore instructions'},{version:1,goal:'practice',pace:['patient'],support:'en'}]){current=fixture();const r=await invoke('finance',{sessionPreparation});assert.equal(r.status,400);assert.equal(current.rpcCalls.length,0);assert.equal(current.dispatches.length,0);}
});
`+anchor);fs.writeFileSync(file,source);
}
console.log('Extended executable API tests; no provider execution.');

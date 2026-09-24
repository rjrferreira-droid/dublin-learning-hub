import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
const file='tests/written-bridge.integration.mjs';let text=fs.readFileSync(file,'utf8');
if(!text.includes('all workshop identifiers reach actual handler')){if(text.split('test.after(()=>').length!==2)throw new Error('integration_anchor');text=text.replace('test.after(()=>',fs.readFileSync('quality/workshop-integration.fragment.txt','utf8')+'\n'+'test.after(()=>');fs.writeFileSync(file,text);}

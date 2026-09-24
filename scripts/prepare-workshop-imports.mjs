import fs from 'node:fs';
if(process.env.GITHUB_REF_NAME!=='feat/professor-experience-2026-09-13')throw new Error('wrong_branch');
// These projects only typecheck; Vite/esbuild bundle runtime source. Explicit .ts imports also
// let the existing Node strip-types contract suite execute the exact shared implementation.
for(const file of ['tsconfig.app.json','tsconfig.api.json']){const config=JSON.parse(fs.readFileSync(file,'utf8'));if(config.compilerOptions.noEmit!==true)throw new Error('expected_no_emit_typecheck');config.compilerOptions.allowImportingTsExtensions=true;fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');}
for(const [file,from,to] of [
 ['src/learning/workshopSelection.ts',"from './appliedPractice.js'","from './appliedPractice.ts'"],
 ['server/written-lesson-context.ts',"from '../src/learning/workshopSelection.js'","from '../src/learning/workshopSelection.ts'"],
]){const text=fs.readFileSync(file,'utf8');if(!text.includes(from)&&!text.includes(to))throw new Error('import_drift');fs.writeFileSync(file,text.replace(from,to));}

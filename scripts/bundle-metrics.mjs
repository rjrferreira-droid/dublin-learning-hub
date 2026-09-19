import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';import {gzipSync} from 'node:zlib';
function analyse(root){
 const manifest=JSON.parse(readFileSync(resolve(root,'.vite/manifest.json'),'utf8'));
 const entry=Object.keys(manifest).find(key=>manifest[key].isEntry&&key.endsWith('.html'));
 if(!entry)throw new Error('html_entry_missing');
 function closure(key,seen=new Set()){
  if(seen.has(key))return seen;const chunk=manifest[key];if(!chunk)throw new Error('manifest_dependency_missing');seen.add(key);
  for(const dep of chunk.imports??[])closure(dep,seen);return seen;
 }
 const keys=closure(entry);const files=[...new Set([...keys].map(key=>manifest[key].file).filter(f=>f.endsWith('.js')))];
 const bytes=files.reduce((n,f)=>n+readFileSync(resolve(root,f)).length,0);
 const gzipBytes=files.reduce((n,f)=>n+gzipSync(readFileSync(resolve(root,f))).length,0);
 const voice=Object.keys(manifest).find(key=>key.endsWith('/ProfessorSessionPanel.tsx'));
 return {entry,initialJsFiles:files,initialJsBytes:bytes,initialJsGzipBytes:gzipBytes,voiceDynamicEntry:voice??null,voiceIsInitial:voice?keys.has(voice):null,manifest};
}
const candidate=analyse('dist');const baseline=analyse(process.argv[2]);
if(!candidate.voiceDynamicEntry||candidate.voiceIsInitial||!candidate.manifest[candidate.voiceDynamicEntry].isDynamicEntry)throw new Error('voice_not_deferred');
if(candidate.initialJsGzipBytes>=baseline.initialJsGzipBytes*.8)throw new Error('initial_payload_reduction_insufficient');
const strip=({manifest,...rest})=>rest;
const report={basis:'sum_of_gzipped_static_Javascript_dependencies_from_Vite_manifests_not_wall_clock_speed',baselineCommit:'d3818cc656f0afa820922eb7c6675a30a5dbdd7a',baseline:strip(baseline),candidate:strip(candidate),initialGzipReductionPct:Number(((1-candidate.initialJsGzipBytes/baseline.initialJsGzipBytes)*100).toFixed(1)),limits:'Dynamic chunks still load when needed. This is not measured device latency, total-session bandwidth or live media acceptance.'};
mkdirSync('quality-results',{recursive:true});writeFileSync('quality-results/bundle-metrics.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

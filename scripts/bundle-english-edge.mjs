import {build} from 'esbuild';
for(const name of ['english-activity-assess','english-audio-assess'])await build({entryPoints:[`supabase/functions/${name}/index.ts`],bundle:true,platform:'neutral',format:'esm',target:'es2022',external:['jsr:*','node:*'],outfile:`.test-runtime/deploy/${name}/index.ts`});

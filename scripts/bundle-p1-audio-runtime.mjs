import {build} from 'esbuild';
// Bundle the committed Deno handler for Node's fictional runtime. No remote JSR imports are fetched.
await build({entryPoints:['supabase/functions/premium-lesson-audio/index.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.test-runtime/p1-audio-handler.mjs',plugins:[{name:'fictional-edge-imports',setup(b){
 b.onResolve({filter:/^jsr:@supabase\/functions-js/},()=>({path:'edge-types',namespace:'empty-types'}));
 b.onLoad({filter:/.*/,namespace:'empty-types'},()=>({contents:'',loader:'js'}));
 b.onResolve({filter:/^jsr:@supabase\/supabase-js@2\.116\.0$/},()=>({path:'@supabase/supabase-js',external:true}));
}}]});

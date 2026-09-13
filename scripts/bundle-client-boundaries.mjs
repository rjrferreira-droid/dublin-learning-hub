import {build} from 'esbuild';
// Only this test bundle replaces the Supabase module. The shipped source and SDK are untouched.
await build({entryPoints:['src/professor/livekitProfessor.ts'],outfile:'.test-runtime/workspace-client.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'fictional-auth-only',setup(b){b.onLoad({filter:/[\\/]src[\\/]services[\\/]supabase\.ts$/},()=>({contents:'export const supabase=globalThis.__workspaceSyntheticAuth;',loader:'js'}));}}]});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const status=JSON.parse(readFileSync(process.argv[2],'utf8')),api=new URL(status.API_URL),originalFetch=globalThis.fetch;
assert.equal(process.env.SUPABASE_ACCESS_TOKEN,undefined);
assert.ok(api.protocol==='http:'&&['127.0.0.1','localhost'].includes(api.hostname)&&api.port==='54321');
globalThis.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);assert.equal(url.origin,api.origin);return originalFetch(input,{...init,redirect:'error'});};
const db=createClient(api.origin,status.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
for(const table of ['ai_tutor_sessions','professor_budget_reservations','ai_usage_log']){const r=await db.from(table).select('id');assert.equal(r.error,null);assert.deepEqual(r.data,[]);}
const budget=await db.from('learning_hub_budget_settings').select('ai_hard_cap_usd,professor_cap_usd,premium_audio_cap_usd').eq('id',1).single();assert.equal(budget.error,null);assert.deepEqual(budget.data,{ai_hard_cap_usd:0,professor_cap_usd:0,premium_audio_cap_usd:0});
const professor=await db.from('professor_budget_settings').select('monthly_budget_usd').eq('feature','professor_livekit').single();assert.equal(professor.error,null);assert.equal(professor.data.monthly_budget_usd,0);
console.log(JSON.stringify({postBrowserAudit:'passed',sessions:0,reservations:0,usage:0,budgetsZero:true,providerCalls:0,connectedWrites:0}));

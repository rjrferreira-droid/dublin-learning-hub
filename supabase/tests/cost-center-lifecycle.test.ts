import {assertEquals,assert} from 'jsr:@std/assert@1.0.14';
type Handler=(request:Request)=>Response|Promise<Response>;
let handler:Handler|undefined;
async function loadHandler(){if(handler)return handler;const original=Deno.serve;Deno.serve=((h:Handler)=>{handler=h;return {finished:Promise.resolve(),shutdown:async()=>{}};}) as typeof Deno.serve;try{await import('../functions/learning-hub-cost-center/index.ts');}finally{Deno.serve=original;}if(!handler)throw new Error('handler_missing');return handler;}
const envNames=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'] as const;
const now=new Date();const month=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);
const base=()=>({contractVersion:1,periodMonth:month,protectedReservationUsd:7,rawReservationUsd:7,knownCostUpliftUsd:0,activeReservedUsd:4,unresolvedReservedUsd:3,carriedReservedUsd:3,currentPeriodReservedUsd:4,futurePeriodReservedUsd:0,activeCount:1,unresolvedCount:1,staleCount:1,needsReconciliationCount:1,oldestPendingAt:'2020-01-01T00:00:00Z'});
async function run(exposure:unknown, options:{unauthorized?:boolean;rpcError?:boolean}={}){
 const saved=Object.fromEntries(envNames.map(n=>[n,Deno.env.get(n)]));const original=globalThis.fetch;const calls:URL[]=[];
 Deno.env.set('SUPABASE_URL','https://synthetic.invalid');Deno.env.set('SUPABASE_ANON_KEY','synthetic-publishable');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','synthetic-service');
 const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
 globalThis.fetch=async(input)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);calls.push(url);if(url.hostname!=='synthetic.invalid')throw new Error('external_network_forbidden');
 if(url.pathname==='/auth/v1/user')return options.unauthorized?reply({error:'unauthorized'},401):reply({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(url.pathname.endsWith('/learning_hub_budget_settings'))return reply({absolute_total_budget_usd:200,infrastructure_reserve_usd:70,ai_hard_cap_usd:130,professor_cap_usd:110,premium_audio_cap_usd:20});
 if(url.pathname.endsWith('/rpc/professor_reservation_exposure_v2'))return options.rpcError?reply({code:'XX000',message:'synthetic failure'},500):reply(exposure);
 if(url.pathname.endsWith('/ai_usage_log'))return reply([{feature:'professor_livekit',estimated_cost_usd:1}]);
 if(url.pathname.endsWith('/ai_tutor_sessions'))return reply([]);
 throw new Error('unexpected_endpoint');};
 try{const h=await loadHandler();const response=await h(new Request('https://synthetic.invalid/functions/v1/learning-hub-cost-center',{method:'POST',headers:{authorization:'Bearer synthetic'}}));return {response,calls};}
 finally{globalThis.fetch=original;for(const n of envNames){if(saved[n]===undefined)Deno.env.delete(n);else Deno.env.set(n,saved[n]!);}}
}
Deno.test('Cost Center includes prior-period holds and signals reconciliation',async()=>{const {response,calls}=await run(base());assertEquals(response.status,200);const p=await response.json();assertEquals(p.usage.aiCommittedUsd,8);assertEquals(p.usage.professorCarriedReservedUsd,3);assertEquals(p.status,'watch');assertEquals(p.professorNeedsReconciliation,1);assertEquals(p.costBasis,'application_estimate_not_provider_invoice');assertEquals(response.headers.get('cache-control'),'no-store');assert(calls.some(u=>u.pathname.endsWith('/rpc/professor_reservation_exposure_v2')));assert(!calls.some(u=>u.pathname.endsWith('/professor_budget_reservations')));});
Deno.test('Cost Center never silently turns missing exposure into zero',async()=>{const {response}=await run(null);assertEquals(response.status,503);});
Deno.test('Cost Center never silently turns failed exposure into zero',async()=>{const {response}=await run(null,{rpcError:true});assertEquals(response.status,503);});
Deno.test('Cost Center rejects inconsistent subtotals',async()=>{const {response}=await run({...base(),protectedReservationUsd:2});assertEquals(response.status,503);});
Deno.test('Cost Center rejects a different UTC period',async()=>{const {response}=await run({...base(),periodMonth:'2000-01-01'});assertEquals(response.status,503);});
Deno.test('Cost Center still requires authentication before reads',async()=>{const {response,calls}=await run(base(),{unauthorized:true});assertEquals(response.status,401);assertEquals(calls.length,1);});

// Handler-level tests: no network permission, no actual keys, no live records, no AI calls.
import {assertEquals,assert} from 'jsr:@std/assert@1.0.14';
type Handler=(request:Request)=>Response|Promise<Response>;
const handlers=new Map<string,Handler>();
const originalFetch=globalThis.fetch;
const envNames=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY'] as const;
async function loadHandler(slug:string):Promise<Handler>{
 if(handlers.has(slug))return handlers.get(slug)!;
 const original=Deno.serve;let captured:Handler|undefined;
 Deno.serve=((handler:Handler)=>{captured=handler;return {finished:Promise.resolve(),shutdown:async()=>{}};}) as typeof Deno.serve;
 try{await import(`../functions/${slug}/index.ts`);}finally{Deno.serve=original;}
 if(!captured)throw new Error('handler_not_captured');handlers.set(slug,captured);return captured;
}
function reply(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});}
async function withMock(slug:string,router:(url:URL,init:RequestInit|undefined)=>Response|Promise<Response>,body:unknown):Promise<{response:Response;calls:URL[]}> {
 const saved=Object.fromEntries(envNames.map(name=>[name,Deno.env.get(name)]));
 Deno.env.set('SUPABASE_URL','https://synthetic.invalid');Deno.env.set('SUPABASE_ANON_KEY','synthetic-publishable');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','synthetic-service');Deno.env.set('OPENAI_API_KEY','synthetic-not-a-real-key');
 const calls:URL[]=[];
 globalThis.fetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);calls.push(url);if(url.hostname!=='synthetic.invalid')throw new Error('external_or_paid_provider_call_forbidden');return router(url,init);};
 try{const handler=await loadHandler(slug);const response=await handler(new Request('https://synthetic.invalid/functions/v1/'+slug,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer synthetic-session-token'},body:JSON.stringify(body)}));return {response,calls};}
 finally{globalThis.fetch=originalFetch;for(const name of envNames){if(saved[name]===undefined)Deno.env.delete(name);else Deno.env.set(name,saved[name]!);}}
}
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';const token='t'.repeat(64);
async function hashToken(){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
for(const slug of ['ai-tutor-evaluate','webrtc-signal']) {
 Deno.test(`${slug}: managed Professor session rejected before any model request or data write`,async()=>{
  const {response,calls}=await withMock(slug,url=>{if(url.pathname==='/auth/v1/user')return reply({id:uid});if(url.pathname==='/rest/v1/ai_tutor_sessions')return reply({id:sid,user_id:uid,status:'active',room_name:'validation:lh-synthetic',callback_token_hash:'synthetic'});throw new Error('unexpected_read_or_write');},slug==='webrtc-signal'?{tutor_session_id:sid,sdp:'v=0\r\n'}:{session_id:sid});
  assertEquals(response.status,409);assertEquals((await response.json()).error,'managed_professor_session');assertEquals(calls.length,2);
 });
 Deno.test(`${slug}: completed legacy session cannot run again`,async()=>{
  const {response,calls}=await withMock(slug,url=>url.pathname==='/auth/v1/user'?reply({id:uid}):reply({id:sid,user_id:uid,status:'completed'}),slug==='webrtc-signal'?{tutor_session_id:sid,sdp:'v=0\r\n'}:{session_id:sid});
  assertEquals(response.status,409);assertEquals((await response.json()).error,'session_already_finalized');assertEquals(calls.length,2);
 });
}
Deno.test('memory: expired callback session denied before history queries',async()=>{
 const callback_token_hash=await hashToken();
 const {response,calls}=await withMock('professor-memory-context',()=>reply({id:sid,user_id:uid,status:'active',started_at:'2020-01-01T00:00:00Z',callback_token_hash}),{sessionId:sid,callbackToken:token});
 assertEquals(response.status,401);assertEquals((await response.json()).error,'memory_session_expired');assertEquals(calls.length,1);
});
Deno.test('memory: incorrect callback denied without exposing history',async()=>{
 const {response,calls}=await withMock('professor-memory-context',()=>reply({id:sid,user_id:uid,status:'active',started_at:new Date().toISOString(),callback_token_hash:'wrong'}),{sessionId:sid,callbackToken:token});
 assertEquals(response.status,401);assertEquals(calls.length,1);
});
Deno.test('memory: failed subquery is unavailable, never a fabricated empty learning history',async()=>{
 const callback_token_hash=await hashToken();let current=true;
 const {response}=await withMock('professor-memory-context',url=>{if(current){current=false;return reply({id:sid,user_id:uid,status:'active',started_at:new Date().toISOString(),callback_token_hash});}if(url.pathname.endsWith('/user_error_bank'))return reply({code:'XX000',message:'synthetic storage failure'},500);return reply([]);},{sessionId:sid,callbackToken:token});
 assertEquals(response.status,503);assertEquals((await response.json()).error,'memory_temporarily_unavailable');
});
Deno.test('memory: diagnosis and unknown mastery are distinct; due date governs review status',async()=>{
 const callback_token_hash=await hashToken();let current=true;
 const {response,calls}=await withMock('professor-memory-context',url=>{if(current){current=false;return reply({id:sid,user_id:uid,status:'active',started_at:new Date().toISOString(),callback_token_hash});}if(url.pathname.endsWith('/user_error_bank'))return reply([{domain:'grammar',pattern:'Fictional test pattern',frequency:1,confidence:92,diagnostic_confidence:92,mastery_confidence:null,next_review_at:'2020-01-01'}]);if(url.pathname.endsWith('/spaced_reviews'))return reply([{review_stage:'D+7',due_date:'2020-01-01',status:'scheduled',lessons:{title:'Fictional review'}}]);return reply([]);},{sessionId:sid,callbackToken:token});
 assertEquals(response.status,200);const result=await response.json();assertEquals(result.activeErrors[0].diagnosticConfidence,92);assertEquals(result.activeErrors[0].masteryConfidence,null);assertEquals(result.activeErrors[0].confidenceSemantics,'diagnostic');assertEquals(result.upcomingReviews[0].status,'due');assertEquals(calls.length,5);
 for(const url of calls.slice(1))assert(url.searchParams.get('user_id')===`eq.${uid}`,'history query must remain scoped to the authenticated session learner');
});

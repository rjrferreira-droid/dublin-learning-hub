import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
if(!process.env.LH_BROWSER_FIXTURE)throw Error('Disposable fixture required');
const fixture=JSON.parse(readFileSync(process.env.LH_BROWSER_FIXTURE,'utf8'));
for(const width of [1440,390])test(`actual Professor HTTP routes at ${width}px: all tracks, exact preflight and zero-budget start`,async({page,request})=>{
 const endpoint='http://127.0.0.1:4174/professor/preflight';
 expect((await request.post(endpoint,{headers:{Origin:'https://unapproved.invalid'},data:{}})).status()).toBe(403);
 expect((await request.get(endpoint,{headers:{Origin:'http://127.0.0.1:4173'}})).status()).toBe(405);
 expect((await request.post(endpoint,{headers:{Origin:'http://127.0.0.1:4173','Content-Type':'text/plain'},data:'{}'})).status()).toBe(415);
 expect((await request.post(endpoint,{headers:{Origin:'http://127.0.0.1:4173'},data:{oversized:'x'.repeat(5000)}})).status()).toBe(413);
 await page.setViewportSize({width,height:900});const violations:string[]=[],errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.name));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||!['4173','4174','54321'].includes(url.port)
   ||url.pathname.startsWith('/api/')||url.pathname.startsWith('/functions/v1/')||url.pathname.startsWith('/rest/v1/')){violations.push('unexpected browser network');return route.abort();}
  return route.continue();
 });
 await page.goto('/');await page.addScriptTag({url:'/local-recovery-acceptance.js'});
 const result=await page.evaluate(async({fixture,origin,key})=>{
  const api=(window as any).LHRecoveryAcceptance,clients:any={},tokens:any={};
  const call=async(path:string,body:any,token?:string)=>{const r=await fetch('http://127.0.0.1:4174/professor/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const check=(condition:boolean)=>{if(!condition)throw Error('Local route assertion failed');};
  let prepared=0,denied=0;
  try{
   for(const account of ['finance','payroll']){const c=api.createClient(origin,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients[account]=c;const login=await c.auth.signInWithPassword(fixture.accounts[account]);check(!login.error);tokens[account]=login.data.session.access_token;}
   const tracks:any={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
   for(const account of ['finance','payroll'])for(const track of [account,'english'])for(const sequence of [2,3,4,5,6,7,8]){
    const lesson=sequence===2?fixture.p1Lessons[track]:fixture.lessons[track][sequence];
    const input={kind:sequence===2?'p1':'written',lessonId:lesson.id,requestedTrack:tracks[track],requestId:crypto.randomUUID(),mode:'chapter_conversation'};
    if(sequence===2&&track===account){
     check((await call('preflight',input)).status===401);
     check((await call('preflight',{...input,draft:'FORGED_LOCAL_ANSWER'},tokens[account])).status===400);
     const wrong=account==='finance'?'payroll':'finance';
     check((await call('preflight',{...input,lessonId:fixture.p1Lessons[wrong].id,requestedTrack:tracks[wrong]},tokens[account])).status===403);
    }
    const preflight=await call('preflight',input,tokens[account]);check(preflight.status===200);const receipt=preflight.body.receipt;
    check(receipt.reference.identity.lessonId===lesson.id&&receipt.reference.identity.lessonSlug===lesson.slug&&receipt.reference.identity.requestedTrack===tracks[track]);
    check(!/callbackToken|technicalBrief|FORGED_LOCAL_ANSWER/.test(JSON.stringify(preflight.body)));prepared++;
    const start={referenceId:receipt.reference.id,requestId:input.requestId};
    check((await call('start',start,tokens[account==='finance'?'payroll':'finance'])).status===403);
    const admission=await call('start',start,tokens[account]);check(admission.status===200&&admission.body.status==='denied'&&admission.body.reason==='professor_monthly_budget_reached'&&admission.body.retryAllowed===false);denied++;
    check((await call('start',start,tokens[account])).status===409);
   }
   return {prepared,denied};
  }finally{for(const c of Object.values(clients) as any[])await c.auth.signOut();}
 },{fixture,origin:process.env.VITE_SUPABASE_URL!,key:process.env.VITE_SUPABASE_PUBLISHABLE_KEY!});
 expect(result).toEqual({prepared:28,denied:28});expect(violations).toEqual([]);expect(errors).toEqual([]);
});

// Authorized 2026-09-13: owner account, login/read-only navigation/local logout only.
// No traces, screenshots, HAR, DOM/error dumps, saved auth state, artifacts, or provider generation.
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {appendFileSync,readFileSync} from 'node:fs';
import {ownerReadPolicy,TEST_UI_ORIGIN,V2_AUTH_ORIGIN} from './owner-read-policy.mjs';

const report={scope:'owner-authorized-v2-read-only',result:'not_run',checks:{},credentialConfiguration:'not_checked',authHttpStatus:null,profileRead:false,historyReads:[],costRead:false,blockedSensitiveRequests:0,externalResourcesBlocked:0,learningWritesForwarded:0,providerGenerationForwarded:0,logout:'not_needed',failureStage:null};
let phase='preflight',server,browser,context,page,userId=null,accessToken='',apiKey='',loginCount=0,logoutConfirmed=false;
const successfulReads=new Set();
const cleanEnv=Object.fromEntries(['PATH','HOME','LANG','LC_ALL','TMPDIR','LD_LIBRARY_PATH','XDG_RUNTIME_DIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
let email='',password='';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(predicate,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await pause(100);}throw new Error('check_timed_out');}
async function check(name,fn){phase=name;try{await fn();report.checks[name]='passed';return true;}catch{report.checks[name]='failed';return false;}}
const requireTrue=value=>{if(!value)throw new Error('check_failed');};
try{
 requireTrue(process.env.LH_OWNER_READ_ONLY_AUTHORIZED==='1');
 requireTrue(process.env.GITHUB_REF_NAME==='fix/core-consolidation-2026-09-13');
 const select=(a,b)=>{if(process.env[a]&&process.env[b]&&process.env[a]!==process.env[b])throw new Error('conflicting_fixture');return process.env[a]||process.env[b]||'';};
 email=select('E2E_EMAIL','LH_TEST_EMAIL');password=select('E2E_PASSWORD','LH_TEST_PASSWORD');
 requireTrue(email.trim().length>0&&password.length>=8);report.credentialConfiguration='available';
 for(const key of ['E2E_EMAIL','E2E_PASSWORD','LH_TEST_EMAIL','LH_TEST_PASSWORD'])delete process.env[key];
 requireTrue(readFileSync('src/components/AuthGate.tsx','utf8').includes("supabase.auth.signOut({ scope: 'local' })"));
 requireTrue(!readFileSync('dist/index.html','utf8').includes('fictional-browser'));
 // Build and browser child processes do not inherit the account credential variables.
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{env:cleanEnv,stdio:'ignore'});
 await waitFor(async()=>{try{return (await fetch(TEST_UI_ORIGIN,{signal:AbortSignal.timeout(1000),redirect:'error'})).ok;}catch{return false;}},15000);
 browser=await chromium.launch({headless:true,env:cleanEnv});
 context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:false});
 await context.addInitScript(()=>{if(navigator.mediaDevices){navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Media capture is excluded from this acceptance test.');};}});
 await context.route('**/*',async route=>{
  const req=route.request();const policy=ownerReadPolicy(req.url(),req.method(),userId);
  if(!policy.allow){if(policy.kind==='external')report.externalResourcesBlocked++;else report.blockedSensitiveRequests++;await route.abort('blockedbyclient').catch(()=>{});return;}
  if(policy.kind==='ui'){await route.continue();return;}
  if(policy.kind==='login'){
   if(++loginCount>1){report.blockedSensitiveRequests++;await route.abort('blockedbyclient').catch(()=>{});return;}
   const sent=req.postDataJSON();if(sent?.email?.trim().toLowerCase()!==email.trim().toLowerCase()){report.blockedSensitiveRequests++;await route.abort('blockedbyclient').catch(()=>{});return;}
   apiKey=req.headers().apikey||'';
  }
  try{
   // Pass through genuine provider responses unchanged; do not follow auth-bearing redirects.
   const response=await route.fetch({maxRedirects:0,maxRetries:0,timeout:15000});
   if(policy.kind==='login'){
    report.authHttpStatus=response.status();
    if(response.ok()){
     const result=await response.json();
     accessToken=typeof result.access_token==='string'?result.access_token:'';
     userId=typeof result.user?.id==='string'?result.user.id:null;
     if(!userId||!accessToken||String(result.user?.email||'').toLowerCase()!==email.trim().toLowerCase())throw new Error('unexpected_auth_identity');
    }
   }
   if(policy.kind==='private_read'&&response.ok()){
    successfulReads.add(policy.table);
    if(policy.table==='profiles'){
     const profile=await response.json();
     report.profileRead=(Array.isArray(profile)?profile[0]:profile)?.learner_track==='rafael_finance';
    }
   }
   if(policy.kind==='cost_read'&&response.ok()){
    const cost=await response.json();
    report.costRead=cost?.costBasis==='application_estimate_not_provider_invoice'&&typeof cost?.usage?.aiCommittedUsd==='number';
   }
   if(policy.kind==='logout_local'&&response.ok()){logoutConfirmed=true;report.logout='current_session_revoked';}
   await route.fulfill({response});
  }catch{await route.abort('failed').catch(()=>{});}
 });
 await context.routeWebSocket('**/*',ws=>ws.close({code:1000,reason:'Voice/WebSocket excluded from read-only acceptance'}));
 page=await context.newPage();page.setDefaultTimeout(15000);
 // No console/network listeners copy learner content into CI logs.
 const loggedIn=await check('real_login_and_profile',async()=>{
  await page.goto(TEST_UI_ORIGIN,{waitUntil:'domcontentloaded'});
  await page.getByLabel('E-mail').fill(email);await page.getByLabel('Senha').fill(password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByTestId('active-learner-card').waitFor({state:'visible',timeout:30000});
  requireTrue(report.authHttpStatus===200&&report.profileRead&&userId);
 });
 password='';email='';
 if(!loggedIn)throw new Error('login_or_profile_failed');
 await check('real_history_reads',async()=>{
  await waitFor(()=>['profiles','ai_tutor_sessions','user_competency_scores','user_error_bank','spaced_reviews'].every(t=>successfulReads.has(t)));
  requireTrue(await page.getByText(/Measured learning evidence is temporarily unavailable/).count()===0);
 });
 await check('finance_lesson_and_professor_panel',async()=>{
  await page.getByRole('button',{name:'Continue Finance',exact:true}).click();
  await page.getByTestId('lesson-shell').waitFor({state:'visible'});
  for(const tab of ['Audio','English','Practice','Case','Test','Professor']){
   await page.getByRole('tab',{name:tab,exact:true}).click();
   requireTrue(await page.getByRole('tab',{name:tab,exact:true}).getAttribute('aria-selected')==='true');
  }
  requireTrue(await page.getByRole('button',{name:'Start voice session',exact:true}).isVisible());
 });
 await check('error_bank',async()=>{
  await page.getByRole('button',{name:/Dashboard/}).first().click();
  await page.getByRole('button',{name:'Open Error Bank →',exact:true}).click();
  await page.getByTestId('error-bank-view').waitFor({state:'visible'});
 });
 await check('revision_and_performance',async()=>{
  await page.getByRole('button',{name:/Revision/}).first().click();
  await page.getByRole('heading',{name:'Review what is most likely to be forgotten'}).waitFor({state:'visible'});
  await page.getByRole('button',{name:/Performance/}).first().click();
  await page.getByRole('heading',{name:'Readiness by capability, not course completion'}).waitFor({state:'visible'});
 });
 await check('english_navigation',async()=>{
  await page.getByRole('button',{name:/English Academy/}).first().click();
  await page.getByTestId('english-academy-view').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Open English Golden Lesson',exact:true}).click();
  await page.getByRole('tab',{name:'Professor',exact:true}).click();
  await page.getByTestId('professor-session-panel').waitFor({state:'visible'});
 });
 await check('learning_memory_panel',async()=>{
  await page.getByRole('button',{name:'Open Learning Memory',exact:true}).click();
  await page.getByRole('heading',{name:'What the Professor learned',exact:true}).waitFor({state:'visible'});
  await waitFor(async()=>await page.getByText('Reading your learning history…',{exact:true}).count()===0);
  requireTrue(await page.getByText('Learning Memory is temporarily unavailable. Your saved sessions remain protected.',{exact:true}).count()===0);
  await page.getByRole('button',{name:'Close Learning Memory',exact:true}).click();
 });
 await check('real_cost_center_read',async()=>{
  await page.getByRole('button',{name:'Open Cost Center',exact:true}).click();
  await waitFor(()=>report.costRead);
  await page.locator('.cost-center-body').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Close Cost Center',exact:true}).click();
 });
 await check('local_logout',async()=>{
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await page.getByRole('heading',{name:'Enter Learning Hub',exact:true}).waitFor({state:'visible'});
  await waitFor(()=>logoutConfirmed,10000);
  await page.getByLabel('E-mail').fill('');await page.getByLabel('Senha').fill('');
 });
 requireTrue(Object.values(report.checks).every(result=>result==='passed')&&report.blockedSensitiveRequests===0);
 report.result='passed';
}catch{
 report.result='failed';report.failureStage=phase;
 if(report.credentialConfiguration==='not_checked')report.credentialConfiguration='missing_or_inconsistent';
}finally{
 // Always revoke only the session created by this run, including after a UI failure.
 if(accessToken&&!logoutConfirmed){
  try{
   const response=await fetch(V2_AUTH_ORIGIN+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:apiKey,authorization:'Bearer '+accessToken},redirect:'error',signal:AbortSignal.timeout(10000)});
   if(response.ok()){logoutConfirmed=true;report.logout='current_session_revoked_in_cleanup';}else report.logout='cleanup_not_confirmed';
   await response.body?.cancel().catch(()=>{});
  }catch{report.logout='cleanup_not_confirmed';}
 }
 accessToken='';password='';email='';userId=null;apiKey='';
 await context?.close().catch(()=>{});await browser?.close().catch(()=>{});
 if(server&&!server.killed)server.kill('SIGTERM');
 report.historyReads=[...successfulReads].filter(t=>t!=='profiles').sort();
 if(report.logout==='cleanup_not_confirmed')report.result='failed';
 // Every output field is a fixed label, boolean, count or HTTP status. No private contents.
 const safe=JSON.stringify(report,null,2);
 console.log('OWNER_READ_ONLY_ACCEPTANCE_REPORT\n'+safe);
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Owner-authorized read-only acceptance\n```json\n'+safe+'\n```\n');
 process.exitCode=report.result==='passed'?0:1;
}

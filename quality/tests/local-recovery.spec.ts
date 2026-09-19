import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
const fixturePath=process.env.LH_BROWSER_FIXTURE,receiptPath=process.env.LH_RECOVERY_FIXTURE;
if(!fixturePath||!receiptPath)throw Error('Disposable browser recovery fixtures required');
const accounts=JSON.parse(readFileSync(fixturePath,'utf8')).accounts,receipts=JSON.parse(readFileSync(receiptPath,'utf8'));
for(const width of [1440,390])test(`actual browser recovery at ${width}px: read-only owner observation, late response and logout`,async({page})=>{
 await page.setViewportSize({width,height:900});const violations:string[]=[],errors:string[]=[];let observations=0;
 page.on('pageerror',error=>errors.push(error.name));
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  const local=url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)&&['4173','54321'].includes(url.port);
  if(!local||url.pathname.startsWith('/api/')||url.pathname.startsWith('/functions/v1/')){violations.push('forbidden destination');return route.abort();}
  if(url.pathname.startsWith('/rest/v1/')){
   if(url.pathname!=='/rest/v1/rpc/observe_professor_dispatch_v1'||!['POST','OPTIONS'].includes(req.method())){violations.push('unexpected data operation');return route.abort();}
   if(req.method()==='POST')observations++;
  }
  if((req.postData()??'').includes('PRIVATE_BROWSER_DRAFT')){violations.push('draft left browser');return route.abort();}
  return route.continue();
 });
 await page.goto('/');await page.addScriptTag({url:'/local-recovery-acceptance.js'});
 const result=await page.evaluate(async({accounts,receipts,origin,key})=>{
  const api=(window as any).LHRecoveryAcceptance;
  const client=api.createClient(origin,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const outcome={owners:0,stale:0,otherAccount:0,logout:0};
  const rejected=async(fn:()=>Promise<unknown>)=>{try{await fn();return false;}catch(e){return (e as Error).message==='professor_observation_discarded';}};
  for(const account of ['finance','payroll']){
   const login=await client.auth.signInWithPassword(accounts[account]);if(login.error)throw Error('Fictional login failed');
   let scope={receipt:receipts[account],epoch:1};
   const controller=api.createProfessorRecoveryController(client,scope,()=>scope);
   const observation=await controller.refresh();
   if(observation.state!=='no_admission_observed'||observation.sessionId!==null||observation.retryAllowed!==false||observation.providerAdmission!==false)throw Error('Unexpected observation');
   outcome.owners++;
   const other={receipt:receipts[account==='finance'?'payroll':'finance'],epoch:1};
   const forbidden=api.createProfessorRecoveryController(client,other,()=>other);
   if(await rejected(()=>forbidden.refresh()))outcome.otherAccount++;forbidden.dispose();
   const delayed={auth:client.auth,rpc:async(name:string,args:any)=>{const response=await client.rpc(name,args);if(response.error)throw Error('Observation RPC failed');scope={...scope,epoch:2};return response;}};
   const stale=api.createProfessorRecoveryController(delayed,scope,()=>scope);
   if(await rejected(()=>stale.refresh()))outcome.stale++;stale.dispose();controller.dispose();
   const afterLogout=api.createProfessorRecoveryController(client,scope,()=>scope);
   const logout=await client.auth.signOut();if(logout.error)throw Error('Fictional logout failed');
   if(await rejected(()=>afterLogout.refresh()))outcome.logout++;afterLogout.dispose();
  }
  return outcome;
 },{accounts,receipts,origin:process.env.VITE_SUPABASE_URL!,key:process.env.VITE_SUPABASE_PUBLISHABLE_KEY!});
 expect(result).toEqual({owners:2,stale:2,otherAccount:2,logout:2});expect(observations).toBe(4);
 expect(violations).toEqual([]);expect(errors).toEqual([]);
});

import {test,expect,type Page,type Route} from '@playwright/test';

// Real Chromium and application components; Auth/REST responses are FICTIONAL.
// Not a live credentials, RLS or voice-acceptance test. All external requests are blocked.
const learners = {
  rafael:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'finance-fixture@example.invalid',track:'rafael_finance',name:'Rafael'},
  viviane:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',email:'payroll-fixture@example.invalid',track:'viviane_payroll',name:'Viviane'},
} as const;
const curriculum={
  courses:[
    {id:'11111111-1111-4111-8111-111111111111',slug:'finance-ireland-v2',learner_track:'rafael_finance'},
    {id:'22222222-2222-4222-8222-222222222222',slug:'irish-payroll-v2',learner_track:'viviane_payroll'},
    {id:'33333333-3333-4333-8333-333333333333',slug:'english-academy',learner_track:'english_academy'},
  ],
  modules:[
    {id:'44444444-4444-4444-8444-444444444444',course_id:'11111111-1111-4111-8111-111111111111',slug:'ifrs-reporting',sequence:1},
    {id:'55555555-5555-4555-8555-555555555555',course_id:'22222222-2222-4222-8222-222222222222',slug:'gross-to-net',sequence:1},
    {id:'66666666-6666-4666-8666-666666666666',course_id:'33333333-3333-4333-8333-333333333333',slug:'spoken-fluency',sequence:1},
  ],
  lessons:[
    {id:'b3639582-3c32-4147-a4b3-84237d11a66e',module_id:'44444444-4444-4444-8444-444444444444',slug:'ifrs-18-group-reporting-irish-statutory',title:'IFRS 18, Group Reporting & Irish Statutory Accounts',subtitle:null,sequence:1,estimated_minutes:15},
    {id:'6ffda415-3b18-46ab-afaa-414f81a7eb31',module_id:'55555555-5555-4555-8555-555555555555',slug:'gross-to-net-rpn-paye-usc-prsi',title:'Gross-to-Net: RPN, PAYE, USC & PRSI',subtitle:null,sequence:1,estimated_minutes:15},
    {id:'f455a740-f50f-4eb7-95a7-9e4129ca4a68',module_id:'66666666-6666-4666-8666-666666666666',slug:'story-past-forms-rhythm-follow-up',title:'Tell a story naturally: past forms, rhythm & follow-up questions',subtitle:null,sequence:1,estimated_minutes:15},
  ],
} as const;
type Key=keyof typeof learners;
type Fixture={profileFail:boolean;profileMissing:boolean;memoryFail:boolean;profileDelayMs:number;pendingToken:boolean;apiCalls:number;writes:number;reads:string[];releaseToken:()=>void};
async function setup(page:Page):Promise<Fixture>{
 const fixture:Fixture={profileFail:false,profileMissing:false,memoryFail:false,profileDelayMs:0,pendingToken:false,apiCalls:0,writes:0,reads:[],releaseToken:()=>{}};
 const users=new Map<string,Key>();
 let current:Key='rafael';
 const user=(key:Key)=>({id:learners[key].id,email:learners[key].email,aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{learner_track:learners[key].track,display_name:learners[key].name}});
 const fulfill=async(route:Route,body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body),headers:{'access-control-allow-origin':'*'}});
 await page.addInitScript(()=>{
   (window as any).__testMicrophoneRequests=0;
   if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{(window as any).__testMicrophoneRequests++;throw new Error('Microphone unavailable in the fictional browser fixture.');};
 });
 await page.route('**/*',async route=>{
   const req=route.request();const url=new URL(req.url());
   if(['127.0.0.1','localhost'].includes(url.hostname)){
     if(url.pathname==='/api/livekit-token'){
       fixture.apiCalls++;
       if(fixture.pendingToken)await new Promise<void>(resolve=>{fixture.releaseToken=resolve;});
       await fulfill(route,{error:'synthetic_no_voice_provider'},503).catch(()=>{});return;
     }
     await route.continue();return;
   }
   if(url.hostname!=='lh-ui.invalid'){await route.abort('blockedbyclient');return;}
   if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'}});return;}
   if(url.pathname==='/auth/v1/token'){
     const data=req.postDataJSON();current=data.email===learners.viviane.email?'viviane':'rafael';
     const payload=Buffer.from(JSON.stringify({sub:learners[current].id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url');
     const access='eyJhbGciOiJIUzI1NiJ9.'+payload+'.fictional-signature';users.set(access,current);
     await fulfill(route,{access_token:access,refresh_token:'fictional-refresh-'+current,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user(current)});return;
   }
   const authorization=req.headers().authorization?.replace(/^Bearer /,'');const key=users.get(authorization??'')??current;
   if(url.pathname==='/auth/v1/user'){await fulfill(route,user(key));return;}
   if(url.pathname==='/auth/v1/logout'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*'}});return;}
   if(url.pathname==='/rest/v1/profiles'){
     if(req.method()!=='GET'){fixture.writes++;await fulfill(route,{error:'profile_write_not_allowed_in_fixture'},403);return;}
     expect(url.searchParams.get('id')).toBe('eq.'+learners[key].id);
     if(fixture.profileDelayMs)await new Promise(r=>setTimeout(r,fixture.profileDelayMs));
     await fulfill(route,fixture.profileFail?{code:'XX000',message:'fictional profile outage'}:fixture.profileMissing?null:{display_name:learners[key].name,learner_track:learners[key].track},fixture.profileFail?503:200);return;
   }
   if(url.pathname.startsWith('/rest/v1/')){
     fixture.reads.push(url.pathname+url.search);
     if(req.method()!=='GET'){fixture.writes++;await fulfill(route,{error:'write_forbidden'},403);return;}
     if(url.pathname.endsWith('/courses')){
       expect(url.searchParams.get('user_id')).toBeNull();expect(url.searchParams.get('is_active')).toBe('eq.true');await fulfill(route,curriculum.courses);return;
     }
     if(url.pathname.endsWith('/modules')){
       expect(url.searchParams.get('user_id')).toBeNull();expect(url.searchParams.get('is_published')).toBe('eq.true');await fulfill(route,curriculum.modules);return;
     }
     if(url.pathname.endsWith('/lessons')){
       expect(url.searchParams.get('user_id')).toBeNull();expect(url.searchParams.get('is_published')).toBe('eq.true');await fulfill(route,curriculum.lessons);return;
     }
     expect(url.searchParams.get('user_id')).toBe('eq.'+learners[key].id);
     if(fixture.memoryFail){await fulfill(route,{code:'XX000',message:'fictional history outage'},503);return;}
     if(url.pathname.endsWith('/user_error_bank')){
       await fulfill(route,[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',domain:'grammar',pattern:'FICTIONAL_PRIVATE_'+key.toUpperCase(),frequency:1,confidence:92,diagnostic_confidence:92,mastery_confidence:null,last_seen_at:'2026-09-01T12:00:00Z',next_review_at:'2026-09-02T12:00:00Z',status:'active'}]);return;
     }
     await fulfill(route,[]);return;
   }
   fixture.writes++;
   await fulfill(route,{error:'unexpected_endpoint'},503);
 });
 await page.routeWebSocket('**/*',ws=>{
   const url=new URL(ws.url());
   if(['127.0.0.1','localhost'].includes(url.hostname))ws.connectToServer();
   else ws.close({code:1000,reason:'External voice/network disabled by test fixture'});
 });
 return fixture;
}
async function signIn(page:Page,key:Key='rafael'){
 await page.getByLabel('E-mail').fill(learners[key].email);
 await page.getByLabel('Senha').fill('Fictional-browser-test-only-123');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
}
async function openEnglish(page:Page){
 await page.getByRole('button',{name:/English Academy/}).first().click();
 await page.getByRole('button',{name:'Open English Golden Lesson',exact:true}).click();
 await page.getByRole('tab',{name:'Professor',exact:true}).click();
}
async function triggerLegacyHiddenSelector(page:Page,key:Key){
 const selector=page.locator('.learner-switch');
 await expect(selector).toBeHidden();
 // This is deliberate programmatic exercise of obsolete internal UI state, NOT an ordinary click.
 // Keep the account-selection CSS restriction intact, just as it was before this repair.
 await selector.locator('button').filter({hasText:learners[key].name}).evaluate((button:HTMLButtonElement)=>button.click());
}

test.describe('simulated account-bound browser journeys',()=>{
 for(const width of [390,1440]) test(`standby presentation hides Payroll and Manu at ${width}px`,async({page})=>{
   await page.setViewportSize({width,height:900});
   const fixture=await setup(page);await page.goto('/');await signIn(page);
   await expect(page.getByTestId('active-learner-card')).toContainText('Rafael');
   await expect(page.getByRole('heading',{name:'Irish Payroll',exact:true})).toHaveCount(0);
   await expect(page.getByRole('button',{name:'Open Manuzinha'})).toHaveCount(0);
   await expect(page.locator('.track-mini-list')).not.toContainText('Irish Payroll');
   await page.locator('.nav-stack').getByRole('button',{name:/Learning/}).click();
   await expect(page.getByTestId('learning-library')).toContainText('2 available now');
   await expect(page.getByTestId('learning-library')).not.toContainText('Gross-to-Net');
   expect(fixture.writes).toBe(0);
 });
 test('registration remains closed until server-owned assignment is installed',async({page})=>{
   const fixture=await setup(page);await page.goto('/');
   await expect(page.getByTestId('registration-closed')).toBeVisible();
   await expect(page.getByRole('button',{name:'Criar conta',exact:true})).toHaveCount(0);
   await expect(page.getByText('Primeiro acesso? Criar conta',{exact:true})).toHaveCount(0);
   expect(fixture.writes).toBe(0);
 });
 test('delayed Viviane profile does not flash Rafael private workspace',async({page})=>{
   const fixture=await setup(page);fixture.profileDelayMs=700;
   await page.goto('/');await signIn(page,'viviane');
   await expect(page.getByText('Loading your profile',{exact:true})).toBeVisible();
   await expect(page.getByTestId('active-learner-card')).toHaveCount(0);
   await expect(page.getByTestId('active-learner-card')).toContainText('Viviane');
   await expect(page.getByRole('button',{name:'Continue Payroll',exact:true})).toBeVisible();
   expect(fixture.writes).toBe(0);
 });
 test('profile outage has retry/logout after SDK retries and never offers to overwrite the profile',async({page})=>{
   const fixture=await setup(page);fixture.profileFail=true;
   await page.goto('/');await signIn(page);
   // supabase-js retries transient GET 503s with exponential backoff. Do not disable those retries.
   await expect(page.getByTestId('profile-load-failure')).toBeVisible({timeout:20_000});
   await expect(page.getByRole('heading',{name:'Who is using this account?'})).toHaveCount(0);
   expect(fixture.writes).toBe(0);fixture.profileFail=false;
   await page.getByRole('button',{name:'Retry profile'}).click();
   await expect(page.getByTestId('active-learner-card')).toContainText('Rafael');
 });
 test('an authenticated account without an assignment remains pending and can recheck read-only',async({page})=>{
   const fixture=await setup(page);fixture.profileMissing=true;
   await page.goto('/');await signIn(page);
   await expect(page.getByTestId('profile-assignment-pending')).toBeVisible();
   await expect(page.getByRole('heading',{name:'Who is using this account?'})).toHaveCount(0);
   await expect(page.getByRole('button',{name:'Criar conta',exact:true})).toHaveCount(0);
   expect(fixture.writes).toBe(0);
   fixture.profileMissing=false;
   await page.getByRole('button',{name:'Check access again',exact:true}).click();
   await expect(page.getByTestId('active-learner-card')).toContainText('Rafael');
   expect(fixture.writes).toBe(0);
 });
 test('programmatic legacy hidden selector cannot expose another learner history or start personalised actions',async({page})=>{
   const fixture=await setup(page);await page.goto('/');await signIn(page);
   await page.getByRole('button',{name:'Open Error Bank →',exact:true}).click();
   await expect(page.getByTestId('error-bank-view')).toContainText('FICTIONAL_PRIVATE_RAFAEL');
   await triggerLegacyHiddenSelector(page,'viviane');
   await expect(page.getByTestId('account-preview-notice')).toContainText('signed in as Rafael');
   await page.getByRole('button',{name:'Open Error Bank →',exact:true}).click();
   await expect(page.getByTestId('error-bank-view')).not.toContainText('FICTIONAL_PRIVATE_RAFAEL');
   await openEnglish(page);
   await expect(page.getByTestId('professor-account-mismatch')).toBeVisible();
   await expect(page.getByRole('button',{name:'Start voice session',exact:true})).toBeDisabled();
   await page.getByRole('tab',{name:'Audio',exact:true}).click();
   await expect(page.getByTestId('audio-account-mismatch')).toBeVisible();
   expect(fixture.apiCalls).toBe(0);expect(fixture.writes).toBe(0);
 });
 test('returning from programmatically induced preview restores permitted actions without unhiding account controls',async({page})=>{
   const fixture=await setup(page);await page.goto('/');await signIn(page);
   await expect(page.getByTestId('active-learner-card')).toContainText('Rafael');
   await triggerLegacyHiddenSelector(page,'viviane');
   await triggerLegacyHiddenSelector(page,'rafael');
   await openEnglish(page);
   await expect(page.locator('.learner-switch')).toBeHidden();
   await expect(page.getByTestId('account-preview-notice')).toHaveCount(0);
   await expect(page.getByRole('button',{name:'Start voice session',exact:true})).toBeEnabled();
   expect(fixture.apiCalls).toBe(0);
 });
 test('signout and another account login discard the previous private cache',async({page})=>{
   const fixture=await setup(page);await page.goto('/');await signIn(page);
   await page.getByRole('button',{name:'Open Error Bank →',exact:true}).click();
   await expect(page.getByTestId('error-bank-view')).toContainText('FICTIONAL_PRIVATE_RAFAEL');
   await page.getByRole('button',{name:'Sair',exact:true}).click();
   await expect(page.getByTestId('active-learner-card')).toHaveCount(0);
   await signIn(page,'viviane');
   await expect(page.getByTestId('active-learner-card')).toContainText('Viviane');
   await page.getByRole('button',{name:'Open Error Bank →',exact:true}).click();
   await expect(page.getByTestId('error-bank-view')).toContainText('FICTIONAL_PRIVATE_VIVIANE');
   await expect(page.getByTestId('error-bank-view')).not.toContainText('FICTIONAL_PRIVATE_RAFAEL');
   expect(fixture.writes).toBe(0);
 });
 test('three course surfaces remain navigable and lesson tabs stay open',async({page})=>{
   const fixture=await setup(page);await page.goto('/');await signIn(page);
   for(const name of ['Finance Ireland','Irish Payroll','English Academy'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Continue Finance',exact:true}).click();
   for(const tab of ['Audio','Practice','Case','Test']){
     await page.getByRole('tab',{name:tab,exact:true}).click();
     await expect(page.getByTestId('lesson-shell')).toBeVisible();
     await expect(page.getByRole('tab',{name:tab,exact:true})).toHaveAttribute('aria-selected','true');
   }
   await expect(page.getByRole('tab',{name:'Professor',exact:true})).toHaveCount(0);
   expect(fixture.apiCalls).toBe(0);expect(fixture.writes).toBe(0);
 });
 test('history outage is explicit after SDK retries rather than replaced with invented results',async({page})=>{
   const fixture=await setup(page);fixture.memoryFail=true;
   await page.goto('/');await signIn(page);
   await expect(page.getByText(/Measured learning evidence is temporarily unavailable/)).toBeVisible({timeout:20_000});
   await expect(page.getByText('FICTIONAL_PRIVATE_RAFAEL',{exact:true})).toHaveCount(0);
   expect(fixture.writes).toBe(0);
 });
 test('pending Professor connection can be cancelled before microphone access',async({page})=>{
   const fixture=await setup(page);fixture.pendingToken=true;
   await page.goto('/');await signIn(page);await openEnglish(page);
   await page.getByRole('button',{name:'Start voice session',exact:true}).click();
   await expect.poll(()=>fixture.apiCalls).toBe(1);
   await page.getByRole('button',{name:'Cancel connection',exact:true}).click();
   fixture.releaseToken();
   await expect(page.getByRole('button',{name:'Start voice session',exact:true})).toBeEnabled();
   await expect(page.getByTestId('professor-session-panel')).toContainText('SESSION ENDED');
   expect(await page.evaluate(()=>(window as any).__testMicrophoneRequests)).toBe(0);
 });
 test('signout during pending connection does not leave the Professor attached to the next account',async({page})=>{
   const fixture=await setup(page);fixture.pendingToken=true;
   await page.goto('/');await signIn(page);await openEnglish(page);
   await page.getByRole('button',{name:'Start voice session',exact:true}).click();
   await expect.poll(()=>fixture.apiCalls).toBe(1);
   await page.getByRole('button',{name:'Sair',exact:true}).click();fixture.releaseToken();
   await expect(page.getByRole('heading',{name:'Enter Learning Hub',exact:true})).toBeVisible();
   await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
   expect(await page.evaluate(()=>(window as any).__testMicrophoneRequests)).toBe(0);
 });
 test('Manuzinha standalone remains separate without auth or history requests',async({page})=>{
   const fixture=await setup(page);await page.goto('/?manuzinha=1');
   await expect(page.getByRole('dialog',{name:'Manuzinha'})).toBeVisible();
   await expect(page.getByTestId('active-learner-card')).toHaveCount(0);
   expect(fixture.reads).toHaveLength(0);expect(fixture.apiCalls).toBe(0);expect(fixture.writes).toBe(0);
 });
});

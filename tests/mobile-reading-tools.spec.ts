import { test, expect, type Page } from '@playwright/test';
async function mockBrowserVoice(page:Page){
 await page.addInitScript(()=>{
  const state={spoken:[] as {text:string;lang:string;rate:number}[],cancelled:0,current:null as any};
  (window as any).__reader=state;
  Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:class {text:string;constructor(text:string){this.text=text;}}});
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
   getVoices:()=>[],cancel:()=>{state.cancelled++;state.current=null;},
   speak:(u:any)=>{state.spoken.push({text:u.text,lang:u.lang,rate:u.rate});state.current=u;u.onstart?.();},
  }});
 });
}
async function login(page: Page) {
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let sensitive=0;
 const user={id,email:'mobile-fixture@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{learner_track:'rafael_finance',display_name:'Rafael'}};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fictional';
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(['localhost','127.0.0.1'].includes(url.hostname)){if(url.pathname.startsWith('/api/')){sensitive++;await route.abort();}else await route.continue();return;}
  if(url.hostname!=='lh-ui.invalid'){await route.abort();return;}
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  let body:unknown;
  if(url.pathname==='/auth/v1/token')body={access_token:token,refresh_token:'fictional',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
  else if(url.pathname==='/auth/v1/user')body=user;
  else if(req.method()==='GET'&&url.pathname==='/rest/v1/profiles')body={display_name:'Rafael',learner_track:'rafael_finance'};
  else if(req.method()==='GET'&&url.pathname.startsWith('/rest/v1/'))body=[];
  else if(url.pathname==='/functions/v1/learning-hub-cost-center'){await route.fulfill({status:503,headers,contentType:'application/json',body:JSON.stringify({error:'fictional_read_unavailable'})});return;}
  else{sensitive++;await route.abort();return;}
  await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.routeWebSocket('**/*',ws=>{const u=new URL(ws.url());if(['localhost','127.0.0.1'].includes(u.hostname))ws.connectToServer();else ws.close();});
 await page.goto('/');await page.getByLabel('E-mail').fill('mobile-fixture@example.invalid');await page.getByLabel('Senha').fill('Fictional-mobile-only-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 // The existing responsive sidebar/profile card is deliberately hidden on mobile.
 // Require the authenticated workspace and its correct identity without unhiding desktop chrome.
 await expect(page.locator('.auth-app')).toHaveClass(/learner-rafael/);
 await expect(page.getByTestId('active-learner-card')).toContainText('Rafael');
 await expect(page.getByRole('button',{name:'Continue Finance',exact:true})).toBeVisible();
 return ()=>sensitive;
}
for(const width of [320,390,760])test(`adult utilities at ${width}px do not float over reading or each other`,async({page},info)=>{
 await page.setViewportSize({width,height:844});const sensitive=await login(page);
 await expect(page.locator('.auth-app > .little-english-launcher')).toHaveCount(0);
 const selectors=['.learning-memory-shell','.cost-center-shell','.auth-signout'];
 const rects=[];
 for(const selector of selectors){const locator=page.locator('.auth-app > '+selector);expect(await locator.evaluate(e=>getComputedStyle(e).position)).toBe('static');const box=await locator.boundingBox();expect(box).not.toBeNull();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);rects.push(box!);}
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];expect(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1).toBe(false);}
 await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Case',exact:true}).click();
 await page.getByText('Worked case and review checklist',{exact:true}).click();
 await page.locator('.lesson-case-task').scrollIntoViewIfNeeded();
 const content=page.locator('.lesson-case-task');const box=await content.boundingBox();expect(box).not.toBeNull();
 expect(await content.evaluate(e=>{const r=e.getBoundingClientRect();const target=document.elementFromPoint(r.left+r.width/2,Math.max(0,Math.min(innerHeight-1,r.top+r.height/2)));return !!target&&e.contains(target);})).toBe(true);
 for(const selector of selectors){const r=await page.locator('.auth-app > '+selector).boundingBox();expect(r!.y+r!.height).toBeLessThanOrEqual(0);}
 expect(sensitive()).toBe(0);
 await page.screenshot({path:info.outputPath(`mobile-reading-${width}.png`)});
});
test('mobile memory and cost panels expand in normal flow and remain closeable',async({page})=>{
 await page.setViewportSize({width:390,height:700});const sensitive=await login(page);
 await page.getByRole('button',{name:'Open Learning Memory',exact:true}).click();
 const memory=page.locator('.learning-memory-card');await expect(memory).toBeVisible();expect((await memory.boundingBox())!.width).toBeLessThanOrEqual(370);
 await page.getByRole('button',{name:'Close Learning Memory',exact:true}).click();
 await page.getByRole('button',{name:'Open Learning Hub Cost Center',exact:true}).click();await expect(page.locator('.cost-center-card')).toBeVisible();
 await page.getByRole('button',{name:'Close Cost Center',exact:true}).click();expect(sensitive()).toBe(0);
});
test('desktop keeps its existing utility positioning',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await login(page);
 expect(await page.locator('.learning-memory-shell').evaluate(e=>getComputedStyle(e).position)).toBe('fixed');
 expect(await page.locator('.cost-center-shell').evaluate(e=>getComputedStyle(e).position)).toBe('fixed');
});
test('standalone Manuzinha does not acquire adult utilities or adult layout',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?manuzinha=1');
 await expect(page.getByRole('dialog',{name:'Manuzinha'})).toBeVisible();await expect(page.locator('.auth-app')).toHaveCount(0);
 await expect(page.locator('.learning-memory-shell,.cost-center-shell,.auth-signout')).toHaveCount(0);
});

test('browser reader speaks reviewed text without paid requests and stops on tab changes',async({page})=>{
 await page.setViewportSize({width:390,height:844});await mockBrowserVoice(page);const sensitive=await login(page);
 await page.getByRole('button',{name:'Continue Finance',exact:true}).click();
 const reader=page.getByTestId('browser-lesson-reader');await expect(reader).toBeVisible();
 expect(await page.evaluate(()=>(window as any).__reader.spoken.length)).toBe(0);
 await reader.getByRole('button',{name:'Listen to section',exact:true}).click();
 await expect(reader.getByRole('status')).toContainText('Reading section 1');
 expect(await page.evaluate(()=>(window as any).__reader.spoken[0].text)).toContain('reporting question');
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__reader.current)).toBeNull();
 await page.getByRole('tab',{name:'Audio',exact:true}).click();
 await reader.getByLabel('Read aloud',{exact:true}).selectOption('pt-BR');
 await reader.getByLabel('Speed',{exact:true}).selectOption('0.85');
 await reader.getByRole('button',{name:'Listen to section',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__reader.spoken.at(-1))).toMatchObject({lang:'pt-BR',rate:0.85});
 const box=await reader.boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(391);
 await reader.getByRole('button',{name:'Stop reading',exact:true}).click();
 await expect(reader.getByRole('status')).toContainText('Stopped');
 expect(sensitive()).toBe(0);
});

test('browser voice failure remains local and does not retry or fall back to paid audio',async({page})=>{
 await mockBrowserVoice(page);const sensitive=await login(page);
 await page.getByRole('button',{name:'Continue Finance',exact:true}).click();
 const reader=page.getByTestId('browser-lesson-reader');
 await reader.getByRole('button',{name:'Listen to section',exact:true}).click();
 await page.evaluate(()=>(window as any).__reader.current.onerror({error:'synthesis-failed'}));
 await expect(reader.getByRole('status')).toContainText('could not read');
 expect(await page.evaluate(()=>(window as any).__reader.spoken.length)).toBe(1);
 expect(sensitive()).toBe(0);
 await expect(page.getByTestId('lesson-reading')).toBeVisible();
});

test('unsupported browser keeps written lessons available',async({page})=>{
 await page.addInitScript(()=>{delete (window as any).speechSynthesis;delete (window as any).SpeechSynthesisUtterance;});
 await login(page);await page.getByRole('button',{name:'Continue Finance',exact:true}).click();
 await expect(page.getByTestId('browser-lesson-reader')).toContainText('Read-aloud is unavailable');
 await expect(page.getByTestId('lesson-reading')).toBeVisible();
});

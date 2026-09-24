import {test,expect,type Page} from '@playwright/test';
const courses=[{track:'finance',account:'rafael_finance',name:'Rafael',button:'Continue Finance',heading:'From a reporting rule to a finance decision'},{track:'payroll',account:'viviane_payroll',name:'Viviane',button:'Continue Payroll',heading:'From payroll inputs to a clear employee explanation'},{track:'english',account:'rafael_finance',name:'Rafael',button:'Start English practice',heading:'Tell a story that invites a real conversation'}] as const;
async function openFixture(page:Page,course:typeof courses[number]){
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let sensitiveRequests=0;
 const user={id,email:'study-fixture@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{learner_track:course.account,display_name:course.name}};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fictional';
 await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
  if(['localhost','127.0.0.1'].includes(u.hostname)){if(u.pathname.startsWith('/api/')){sensitiveRequests++;await route.abort();}else await route.continue();return;}
  if(u.hostname!=='lh-ui.invalid'){await route.abort();return;}
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(r.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  let body:unknown;
  if(u.pathname==='/auth/v1/token')body={access_token:token,refresh_token:'fictional-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
  else if(u.pathname==='/auth/v1/user')body=user;
  else if(r.method()==='GET'&&u.pathname==='/rest/v1/profiles')body={display_name:course.name,learner_track:course.account};
  else if(r.method()==='GET'&&u.pathname.startsWith('/rest/v1/'))body=[];
  else{sensitiveRequests++;await route.abort();return;}
  await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.routeWebSocket('**/*',ws=>{const u=new URL(ws.url());if(['localhost','127.0.0.1'].includes(u.hostname))ws.connectToServer();else ws.close();});
 await page.goto('/');await page.getByLabel('E-mail').fill('study-fixture@example.invalid');await page.getByLabel('Senha').fill('Fictional-study-only-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 if(course.track==='english'){
  await page.getByRole('button',{name:course.button,exact:true}).click();await page.getByRole('tab',{name:'Professor',exact:true}).click();
 }else await page.getByRole('button',{name:'Ask the Professor',exact:true}).click();
 return ()=>sensitiveRequests;
}
for(const course of courses)for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}])test(`${course.track} study guide at ${viewport.name}: objectives, progressive help and no paid call`,async({page},info)=>{
 await page.setViewportSize(viewport);const requests=await openFixture(page,course);
 const guide=page.getByTestId('professor-study-guide');await expect(guide.getByRole('heading',{name:course.heading,exact:true})).toBeVisible();
 await expect(guide).toContainText('Study companion · no AI call');
 await guide.getByText('Prepare with an example',{exact:true}).click();await guide.getByText('Explicação em português',{exact:true}).click();await expect(guide.locator('[lang="pt-BR"]')).toBeVisible();
 await guide.getByText('Practise without starting a voice session',{exact:true}).click();
 await expect(guide.getByTestId('study-worked-answer')).toHaveCount(0);
 await guide.getByRole('button',{name:'Give me a hint',exact:true}).click();await expect(guide.locator('.study-hints p')).toHaveCount(1);await expect(guide.getByTestId('study-worked-answer')).toHaveCount(0);
 await guide.getByRole('button',{name:'Give me a hint',exact:true}).click();await expect(guide.locator('.study-hints p')).toHaveCount(2);await expect(guide.getByRole('button',{name:'Give me a hint',exact:true})).toBeDisabled();
 await guide.getByRole('button',{name:'Show worked answer',exact:true}).click();await expect(guide.getByTestId('study-worked-answer')).toBeVisible();
 await guide.getByRole('button',{name:'Next practice',exact:true}).click();await expect(guide).toContainText('Practice 2 of 3');await expect(guide.getByTestId('study-worked-answer')).toHaveCount(0);await expect(guide.locator('.study-hints p')).toHaveCount(0);
 await guide.getByText('Scope and checked sources',{exact:true}).click();await expect(guide).toContainText('Actual use in a voice conversation still needs validation');await expect(guide.locator('a').first()).toHaveAttribute('rel','noopener noreferrer');
 expect(await guide.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 const box=await guide.boundingBox();expect(box).not.toBeNull();expect(box!.width).toBeLessThanOrEqual(viewport.width);
 const buttons=await guide.locator('button').all();for(const button of buttons){const b=await button.boundingBox();if(b)expect(b.height).toBeGreaterThanOrEqual(44);}
 expect(requests()).toBe(0);
 // Screenshot contains ONLY this fictional, source-backed companion. No owner auth, records, tokens or audio.
 await guide.screenshot({path:info.outputPath(`study-${course.track}-${viewport.name}.png`)});
});
test('native disclosure opens with keyboard and does not start a session',async({page})=>{
 const requests=await openFixture(page,courses[0]);const summary=page.getByTestId('professor-study-guide').locator('summary').filter({hasText:'Practise without starting a voice session'});await summary.focus();await page.keyboard.press('Enter');await expect(page.getByTestId('study-practice')).toBeVisible();expect(requests()).toBe(0);
});

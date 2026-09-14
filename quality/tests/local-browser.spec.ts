import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
const fixturePath=process.env.LH_BROWSER_FIXTURE;
if(!fixturePath)throw Error('Disposable browser fixture required');
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));

for(const width of [1440,390])test(`actual Auth and catalog at ${width}px: account switch isolates all written lessons and local drafts`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const violations:string[]=[],errors:string[]=[],dataFailures:string[]=[];
 let authLogins=0,catalogReads=0;
 page.on('pageerror',error=>errors.push(error.name));
 page.on('response',response=>{const url=new URL(response.url());if(url.pathname.startsWith('/rest/v1/')&&response.status()>=400)dataFailures.push(url.pathname+':'+response.status());});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),local=['127.0.0.1','localhost'].includes(url.hostname)&&['4173','54321'].includes(url.port)&&url.protocol==='http:';
  if(!local||url.pathname.startsWith('/api/')||url.pathname.startsWith('/functions/v1/')||url.pathname.startsWith('/rest/v1/rpc/')){
   violations.push('forbidden network destination');return route.abort();
  }
  if(url.pathname.startsWith('/rest/v1/')&&!['GET','OPTIONS'].includes(req.method())){
   violations.push('unexpected client data write');return route.abort();
  }
  if((req.postData()??'').includes('LOCAL_BROWSER_DRAFT')||req.url().includes('LOCAL_BROWSER_DRAFT')){
   violations.push('private draft left browser');return route.abort();
  }
  if(url.pathname==='/auth/v1/token'&&req.method()==='POST')authLogins++;
  if(url.pathname==='/rest/v1/lessons')catalogReads++;
  return route.continue();
 });
 await page.goto('/');
 for(const account of ['finance','payroll']){
  await expect(page.getByRole('heading',{name:'Enter Learning Hub'})).toBeVisible();
  await page.getByLabel('E-mail').fill(fixture.accounts[account].email);
  await page.getByLabel('Senha').fill(fixture.accounts[account].password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  // Mobile intentionally hides the sidebar profile card; the authenticated shell is shared.
  await expect(page.locator('.auth-app.learner-'+(account==='finance'?'rafael':'viviane'))).toBeVisible();
  await expect(page.getByTestId('active-learner-card')).toHaveCount(1);
  const other=account==='finance'?'payroll':'finance';
  for(const track of [account,'english'])for(const sequence of [3,4,5,6,7,8]){
   await page.locator('.nav-stack').getByRole('button',{name:/Learning/}).click();
   const library=page.getByTestId('learning-library');
   await expect(library.locator('[data-testid^="catalog-lesson-"]')).toHaveCount(14);
   await expect(page.getByTestId('catalog-lesson-'+fixture.lessons[other][sequence].slug)).toHaveCount(0);
   const lesson=fixture.lessons[track][sequence];
   await page.getByTestId('catalog-lesson-'+lesson.slug).getByRole('button',{name:'Open lesson',exact:true}).click();
   await page.getByRole('tab',{name:'Learn',exact:true}).click();
   const study=page.getByTestId('lesson-study-panel');
   await expect(study).toHaveAttribute('data-track',track);
   await expect(study.getByTestId('lesson-reading').getByRole('heading',{level:2})).toHaveText(fixture.authoredTitles[lesson.id]);
   await page.getByRole('tab',{name:'Practice',exact:true}).click();
   const answer=study.getByTestId('written-practice-0').getByRole('textbox');
   await expect(answer).toHaveValue('');
   await answer.fill('LOCAL_BROWSER_DRAFT '+account);
   for(const tab of ['Professor','Audio']){
    await page.getByRole('tab',{name:tab,exact:true}).click();
    await expect(page.getByTestId('p1-interactive-gate')).toBeVisible();
    await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
   }
   await page.getByRole('tab',{name:'Practice',exact:true}).click();
   await expect(answer).toHaveValue('LOCAL_BROWSER_DRAFT '+account);
  }
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Enter Learning Hub'})).toBeVisible();
 }
 expect(authLogins).toBe(2);expect(catalogReads).toBeGreaterThanOrEqual(2);
 expect(violations).toEqual([]);expect(errors).toEqual([]);expect(dataFailures).toEqual([]);
});

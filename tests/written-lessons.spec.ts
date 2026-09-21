import {test,expect,type Page} from '@playwright/test';
const courses=[{track:'finance',account:'rafael_finance',name:'Rafael',button:'Continue Finance',answers:[2,1,3,0,2]},{track:'payroll',account:'viviane_payroll',name:'Viviane',button:'Continue Payroll',answers:[1,2,0,3,1]},{track:'english',account:'rafael_finance',name:'Rafael',button:'Start English practice',answers:[1,2,0,3,1]}] as const;
async function openFixture(page:Page,course:typeof courses[number],curriculumPreview=false){
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let sensitiveRequests=0;
 const user={id,email:'written-fixture@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{learner_track:course.account,display_name:course.name}};
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
 await page.goto(curriculumPreview?'/?curriculumPreview=1':'/');await page.getByLabel('E-mail').fill('written-fixture@example.invalid');await page.getByLabel('Senha').fill('Fictional-written-only-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:course.button,exact:true}).click();
 return ()=>sensitiveRequests;
}
for(const course of courses)for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}])test(`${course.track} written lesson at ${viewport.name}: coherent tabs, retained drafts and local checkpoint`,async({page},info)=>{
 await page.setViewportSize(viewport);const requests=await openFixture(page,course);const panel=page.getByTestId('lesson-study-panel');
 const tab=(name:string)=>page.getByRole('tab',{name,exact:true}).click();
 await tab('Learn');await expect(panel).toHaveAttribute('data-track',course.track);await expect(panel.locator('.lesson-teaching-block')).toHaveCount(4);
 await panel.getByText('Resumo em português',{exact:true}).first().click();await expect(panel.locator('[lang="pt-BR"]').first()).toBeVisible();
 await tab('English');await expect(panel.locator('dt')).toHaveCount(6);
 await tab('Practice');const first=panel.getByTestId('written-practice-0');await first.getByRole('textbox').fill('FICTIONAL DRAFT ONLY');await first.getByRole('button',{name:'Reveal a hint',exact:true}).click();await expect(first.locator('.lesson-hint')).toHaveCount(1);await expect(first.locator('.lesson-worked-response')).toHaveCount(0);
 await first.getByRole('button',{name:'Compare with worked response',exact:true}).click();await expect(first.locator('.lesson-worked-response')).toContainText('has not been automatically graded');
 await tab('Case');await panel.getByLabel('Your case response',{exact:true}).fill('FICTIONAL CASE ONLY');
 await tab('Visual');await expect(panel.getByRole('table')).toBeVisible();await expect(panel.getByRole('table').locator('tbody tr')).not.toHaveCount(0);
 await tab('Test');const q0=panel.getByTestId('checkpoint-question-0');await expect(q0.getByRole('button',{name:'Check answer',exact:true})).toBeDisabled();
 await q0.getByRole('radio').nth((course.answers[0]+1)%4).check();await q0.getByRole('button',{name:'Check answer',exact:true}).click();await expect(q0).toContainText('Not this option');
 await q0.getByRole('button',{name:'Review the related concept',exact:true}).click();await expect(page.getByRole('tab',{name:'Learn',exact:true})).toHaveAttribute('aria-selected','true');
 await tab('Practice');await expect(first.getByRole('textbox')).toHaveValue('FICTIONAL DRAFT ONLY');
 await tab('Case');await expect(panel.getByLabel('Your case response',{exact:true})).toHaveValue('FICTIONAL CASE ONLY');
 await tab('Test');for(let i=0;i<5;i++){const q=panel.getByTestId('checkpoint-question-'+i);await q.getByRole('radio').nth(course.answers[i]).check();await q.getByRole('button',{name:'Check answer',exact:true}).click();}
 await expect(panel.getByTestId('local-checkpoint-result')).toHaveText('5 of 5 checked · 5 correct in this attempt · not saved to your profile');
 await panel.getByRole('button',{name:'Restart this local checkpoint',exact:true}).click();await expect(panel.getByTestId('local-checkpoint-result')).toContainText('0 of 5 checked');await expect(panel.locator('input:checked')).toHaveCount(0);
 await tab('Sources');await expect(panel.getByTestId('lesson-sources')).toContainText('Local drafts and quiz results are not sent');for(const link of await panel.getByTestId('lesson-sources').getByRole('link').all())await expect(link).toHaveAttribute('rel','noopener noreferrer');
 await tab('Case');await panel.getByText('Worked case and review checklist',{exact:true}).click();
 expect(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);const box=await panel.boundingBox();expect(box!.width).toBeLessThanOrEqual(viewport.width);expect(requests()).toBe(0);
 await panel.screenshot({path:info.outputPath(`lesson-${course.track}-${viewport.name}.png`)});
 // Closing/reopening deliberately discards local work, not the real learner history.
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await page.getByRole('button',{name:course.button,exact:true}).click();await tab('Practice');await expect(page.getByTestId('written-practice-0').getByRole('textbox')).toHaveValue('');expect(requests()).toBe(0);
});
test('checkpoint is keyboard usable and never claims persisted learning progress',async({page})=>{
 const requests=await openFixture(page,courses[0]);await page.getByRole('tab',{name:'Test',exact:true}).click();const q=page.getByTestId('checkpoint-question-0');await q.getByRole('radio').first().focus();await page.keyboard.press('ArrowDown');await expect(q.getByRole('radio').nth(1)).toBeChecked();await q.getByRole('button',{name:'Check answer',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByTestId('local-checkpoint-result')).toContainText('not saved to your profile');expect(requests()).toBe(0);
});

const localModels=[
 {slug:'acca-fr-a1-purpose-users-reporting',title:'ACCA FR A1 · Purpose and users of financial reporting'},
 {slug:'acca-fr-a2-qualitative-characteristics-cost-constraint',title:'ACCA FR A2 · Qualitative characteristics and the cost constraint'},
 {slug:'acca-fr-b3-impairment-assets',title:'ACCA FR B3 · Impairment of assets'},
 {slug:'acca-fr-b4-inventories-biological-assets',title:'ACCA FR B4 · Inventories and biological assets'},
] as const;
for(const model of localModels)for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}])test(`${model.title} at ${viewport.name} is provider-free`,async({page})=>{
 await page.setViewportSize(viewport);const requests=await openFixture(page,courses[0],true);
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await page.locator('.nav-stack').getByRole('button',{name:/Learning/}).click();
 const library=page.getByTestId('learning-library');await expect(library.getByTestId('local-curriculum-preview')).toBeVisible();
 const card=library.getByTestId('catalog-lesson-'+model.slug);await expect(card).toContainText('Model · local');await card.getByRole('button',{name:'Open lesson'}).click();
 await expect(page.getByText('Local model lesson',{exact:true})).toBeVisible();await expect(page.getByText('Local preview · no providers',{exact:true})).toBeVisible();const panel=page.getByTestId('lesson-study-panel');await expect(panel.getByRole('heading',{name:model.title,exact:true})).toBeVisible();
 await expect(panel.locator('.lesson-teaching-block')).toHaveCount(4);
 await page.getByRole('tab',{name:'Practice',exact:true}).click();await expect(panel.getByTestId('written-practice-0')).toBeVisible();await expect(panel.getByTestId('applied-practice')).toHaveCount(0);
 await page.getByRole('tab',{name:'Audio',exact:true}).click();await expect(page.getByTestId('p1-interactive-gate')).toContainText('awaiting activation');
 await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByTestId('p1-interactive-gate')).toContainText('awaiting activation');expect(requests()).toBe(0);
});

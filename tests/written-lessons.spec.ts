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
  else if(r.method()==='GET'&&u.pathname==='/rest/v1/user_study_state')body=[];
  else if(r.method()==='POST'&&u.pathname==='/rest/v1/user_study_state'){await route.fulfill({status:201,headers});return;}
  else if(r.method()==='GET'&&u.pathname.startsWith('/rest/v1/'))body=[];
  else{sensitiveRequests++;await route.abort();return;}
  await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.routeWebSocket('**/*',ws=>{const u=new URL(ws.url());if(['localhost','127.0.0.1'].includes(u.hostname))ws.connectToServer();else ws.close();});
 await page.goto(curriculumPreview?'/?curriculumPreview=1':'/?curriculumPreview=0');await page.getByLabel('E-mail').fill('written-fixture@example.invalid');await page.getByLabel('Senha').fill('Fictional-written-only-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 const entryButton=curriculumPreview&&course.track==='finance'?'Start ACCA FR A1':course.button;
 if(curriculumPreview&&course.track==='finance')await page.getByTestId('acca-study-board').getByRole('button',{name:entryButton,exact:true}).click();
 else await page.getByRole('button',{name:entryButton,exact:true}).click();
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
 await panel.getByRole('button',{name:'Restart checkpoint',exact:true}).click();await expect(panel.getByTestId('local-checkpoint-result')).toContainText('0 of 5 checked');await expect(panel.locator('input:checked')).toHaveCount(0);
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

test('ACCA study flow syncs completion to the account and advances to the next lesson',async({page})=>{
 const requests=await openFixture(page,courses[0],true);const panel=page.getByTestId('lesson-study-panel');
 await expect(panel.getByRole('heading',{name:'ACCA FR A1 · Purpose and users of financial reporting',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Test',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Finish lesson',exact:true})).toBeDisabled();
 for(let i=0;i<5;i++){const q=panel.getByTestId('checkpoint-question-'+i);await q.getByRole('radio').first().check();await q.getByRole('button',{name:'Check answer',exact:true}).click();}
 await panel.getByRole('button',{name:'Finish lesson',exact:true}).click();await expect(panel.getByTestId('local-completion-saved')).toContainText('Completed and saved to your account');
 await expect(panel.getByRole('button',{name:'Continue to ACCA FR A2 · Qualitative characteristics and the cost constraint',exact:true})).toBeVisible();
 await panel.getByRole('button',{name:'Continue to ACCA FR A2 · Qualitative characteristics and the cost constraint',exact:true}).click();await expect(page.getByTestId('lesson-study-panel').getByRole('heading',{name:'ACCA FR A2 · Qualitative characteristics and the cost constraint',exact:true})).toBeVisible();
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await expect(page.getByText("TODAY'S ACCA FOCUS • 1/23 FINISHED",{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'ACCA FR A2 · Qualitative characteristics and the cost constraint',exact:true})).toBeVisible();
 await expect(page.getByTestId('acca-study-board')).toContainText('1/3 lessons');await expect(page.getByTestId('acca-study-board')).toContainText('Framework');
 await page.locator('.nav-stack').getByRole('button',{name:/Revision/}).click();await expect(page.getByTestId('local-review-list')).toContainText('ACCA FR A1');await expect(page.getByTestId('local-review-list')).toContainText('D+1');await expect(page.getByTestId('local-review-list')).toContainText('Scheduled');
 await page.reload();await expect(page.getByRole('button',{name:'Resume ACCA FR A2',exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'Resume ACCA FR A2',exact:true}).first().click();
 await expect(page.getByTestId('lesson-study-panel').getByRole('heading',{name:'ACCA FR A2 · Qualitative characteristics and the cost constraint',exact:true})).toBeVisible();
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await page.locator('.nav-stack').getByRole('button',{name:/Learning/}).click();
 await expect(page.getByTestId('local-curriculum-preview')).toContainText('ACCA 1/23 · English 0/8');await expect(page.getByTestId('catalog-lesson-acca-fr-a1-purpose-users-reporting')).toContainText(/Finished ·/);expect(requests()).toBe(0);
});

test('balanced English course completes, advances and schedules account-synced review',async({page})=>{
 const requests=await openFixture(page,courses[0],true);const panel=page.getByTestId('lesson-study-panel');
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();const today=page.getByTestId('today-study-plan');await expect(today).toContainText('One technical block, one English block, one retrieval block');await expect(today).toContainText('Tell a story naturally');await expect(today).toContainText('ACCA FR Mini Mock series');await page.locator('.nav-stack').getByRole('button',{name:/English Academy/}).click();
 const board=page.getByTestId('english-study-board');await expect(board).toContainText('4 everyday · 4 professional');await expect(board).toContainText('D+1 · D+7 · D+30');
 await board.getByRole('button',{name:'Start English lesson',exact:true}).click();await expect(panel.getByRole('heading',{name:'Tell a story naturally: past forms, rhythm & follow-up questions',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Test',exact:true}).click();for(let i=0;i<5;i++){const q=panel.getByTestId('checkpoint-question-'+i);await q.getByRole('radio').first().check();await q.getByRole('button',{name:'Check answer',exact:true}).click();}
 await panel.getByRole('button',{name:'Finish lesson',exact:true}).click();await expect(panel.getByTestId('local-completion-saved')).toContainText('Completed and saved to your account');
 await panel.getByRole('button',{name:'Continue to Everyday Dublin: weather, plans and natural small talk',exact:true}).click();await expect(panel.getByRole('heading',{name:'Everyday Dublin: weather, plans and natural small talk',exact:true})).toBeVisible();
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await page.locator('.nav-stack').getByRole('button',{name:/English Academy/}).click();
 await expect(page.getByTestId('english-study-board')).toContainText('1/8 lessons finished');await expect(page.getByTestId('english-study-board')).toContainText('Resume English lesson');
 await page.locator('.nav-stack').getByRole('button',{name:/Revision/}).click();await expect(page.getByTestId('local-english-review-list')).toContainText('Tell a story naturally');await expect(page.getByTestId('local-english-review-list')).toContainText('D+1');await expect(page.getByTestId('local-english-review-list')).toContainText('Scheduled');
 await page.reload();await page.locator('.nav-stack').getByRole('button',{name:/English Academy/}).click();await expect(page.getByTestId('english-study-board')).toContainText('Resume English lesson');expect(requests()).toBe(0);
});

test('local ACCA mock runs, marks and schedules review without provider requests',async({page})=>{
 const requests=await openFixture(page,courses[0],true);await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await page.locator('.nav-stack').getByRole('button',{name:/Mock exams/}).click();
 const mock=page.getByTestId('local-mock-exam');await expect(mock.getByTestId('mock-set-acca-fr-mini-mock-01')).toBeVisible();await expect(mock.getByTestId('mock-set-acca-fr-mini-mock-02')).toContainText('Inventory and FX');await mock.getByTestId('mock-set-acca-fr-mini-mock-02').click();await expect(mock.getByRole('heading',{name:'ACCA FR Mini Mock 02',exact:true})).toBeVisible();await expect(mock).toContainText('foreign currency, financial instruments, leases and cash-flow interpretation');await mock.getByTestId('mock-set-acca-fr-mini-mock-01').click();
 await expect(mock.getByRole('heading',{name:'ACCA FR Mini Mock 01',exact:true})).toBeVisible();await expect(mock).toContainText('Account-synced result');await mock.getByRole('button',{name:'Start 30-minute mock',exact:true}).click();
 const correct=[0,1,1,1,0,1];for(let i=0;i<correct.length;i++)await mock.getByTestId(`mock-question-${i}`).getByRole('radio').nth(correct[i]).check();
 await mock.getByLabel('Your answer',{exact:true}).fill('Revenue grew, but both margins and ROCE weakened. More cash-flow and segment evidence is needed.');await mock.getByRole('button',{name:'Submit and open marking guide',exact:true}).click();
 await expect(mock.getByTestId('mock-marking-guide')).toContainText('12/12');const marking=mock.locator('.mock-marking-point input');await expect(marking).toHaveCount(8);for(let i=0;i<8;i++)await marking.nth(i).check();await expect(mock.getByTestId('mock-marking-guide')).toContainText('20/20');
 await mock.getByRole('button',{name:'Save attempt & schedule reviews',exact:true}).click();await expect(mock.getByTestId('mock-result-saved')).toContainText('written response was not saved');await mock.getByRole('button',{name:'Back to mock overview',exact:true}).click();
 await expect(mock.getByTestId('mock-latest-attempt')).toContainText('20/20 marks');await expect(mock).toContainText('D+1');await expect(mock).toContainText('Review scheduled');await expect(mock.getByTestId('mock-set-acca-fr-mini-mock-01')).toContainText('1 saved attempt');await mock.getByTestId('mock-set-acca-fr-mini-mock-02').click();await expect(mock.getByRole('button',{name:'Start 30-minute mock',exact:true})).toBeVisible();await expect(mock.getByTestId('mock-latest-attempt')).toHaveCount(0);expect(requests()).toBe(0);
});

const localModels=[
 {slug:'acca-fr-a1-purpose-users-reporting',title:'ACCA FR A1 · Purpose and users of financial reporting'},
 {slug:'acca-fr-a2-qualitative-characteristics-cost-constraint',title:'ACCA FR A2 · Qualitative characteristics and the cost constraint'},
 {slug:'acca-fr-a3-recognition-derecognition-measurement',title:'ACCA FR A3 · Recognition, derecognition and measurement'},
 {slug:'acca-fr-a4-regulation-standard-setting-ethics',title:'ACCA FR A4 · Regulation, standard setting and ethical reporting judgement'},
 {slug:'acca-fr-b1-property-plant-equipment',title:'ACCA FR B1 · Property, plant and equipment'},
 {slug:'acca-fr-b2-intangible-assets-development',title:'ACCA FR B2 · Intangible assets and development expenditure'},
 {slug:'acca-fr-b3-impairment-assets',title:'ACCA FR B3 · Impairment of assets'},
 {slug:'acca-fr-b4-inventories-biological-assets',title:'ACCA FR B4 · Inventories and biological assets'},
 {slug:'acca-fr-b5-financial-instruments',title:'ACCA FR B5 · Financial instruments'},
 {slug:'acca-fr-b6-leasing',title:'ACCA FR B6 · Leasing'},
 {slug:'acca-fr-b7-provisions-events-reporting-period',title:'ACCA FR B7 · Provisions and events after the reporting period'},
 {slug:'acca-fr-b8-taxation',title:'ACCA FR B8 · Taxation'},
 {slug:'acca-fr-b9-reporting-financial-non-financial-performance',title:'ACCA FR B9 · Reporting financial and non-financial performance'},
 {slug:'acca-fr-b10-revenue',title:'ACCA FR B10 · Revenue'},
 {slug:'acca-fr-b11-government-grants',title:'ACCA FR B11 · Government grants'},
 {slug:'acca-fr-b12-foreign-currency-transactions',title:'ACCA FR B12 · Foreign currency transactions'},
 {slug:'acca-fr-c1-limitations-financial-statements',title:'ACCA FR C1 · Limitations of financial statements'},
 {slug:'acca-fr-c2-accounting-ratios-trends',title:'ACCA FR C2 · Accounting ratios and trends'},
 {slug:'acca-fr-c3-limitations-interpretation-techniques',title:'ACCA FR C3 · Limitations of interpretation techniques'},
 {slug:'acca-fr-c4-not-for-profit-public-sector',title:'ACCA FR C4 · Not-for-profit and public sector entities'},
 {slug:'acca-fr-d1-single-entity-financial-statements',title:'ACCA FR D1 · Single entity financial statements'},
 {slug:'acca-fr-d2-consolidated-financial-statements',title:'ACCA FR D2 · Consolidated financial statements'},
 {slug:'acca-fr-e-employability-technology-skills',title:'ACCA FR E · Employability and technology skills'},
] as const;
for(const model of localModels)for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}])test(`${model.title} at ${viewport.name} is provider-free`,async({page})=>{
 await page.setViewportSize(viewport);const requests=await openFixture(page,courses[0],true);
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await page.locator('.nav-stack').getByRole('button',{name:/Learning/}).click();
 const library=page.getByTestId('learning-library');await expect(library.getByTestId('local-curriculum-preview')).toBeVisible();
 const card=library.getByTestId('catalog-lesson-'+model.slug);await expect(card).toContainText('Reviewed self-study');await card.getByRole('button',{name:/^(Open|Resume|Review) lesson$/}).click();
 await expect(page.getByText('Reviewed self-study lesson',{exact:true})).toBeVisible();await expect(page.getByText('Account-synced · no providers',{exact:true})).toBeVisible();const panel=page.getByTestId('lesson-study-panel');await expect(panel.getByRole('heading',{name:model.title,exact:true})).toBeVisible();
 await expect(panel.locator('.lesson-teaching-block')).toHaveCount(4);
 await page.getByRole('tab',{name:'Practice',exact:true}).click();await expect(panel.getByTestId('written-practice-0')).toBeVisible();await expect(panel.getByTestId('applied-practice')).toHaveCount(0);
 await page.getByRole('tab',{name:'Audio',exact:true}).click();await expect(page.getByTestId('p1-interactive-gate')).toContainText('awaiting activation');
 await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByTestId('p1-interactive-gate')).toContainText('awaiting activation');expect(requests()).toBe(0);
});

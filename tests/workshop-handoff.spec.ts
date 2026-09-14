import {test,expect} from '@playwright/test';
import {experienceFixture,SYNTHETIC_SESSION_ID} from './helpers/experienceFixture';
const caseIds={finance:['finance-bridge-a','finance-bridge-b','finance-bridge-c'],payroll:['payroll-cash-a','payroll-cash-b','payroll-cash-c'],english:['english-story-a','english-story-b','english-story-c']} as const;
for(const track of ['finance','payroll','english'] as const)for(const width of [390,1440])test(`${track} at ${width}: explicit scenario handoff does not start voice or transmit local work`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});const f=await experienceFixture(page,{track,validation:true});await f.signIn();
 await page.getByRole('button',{name:track==='finance'?'Continue Finance':track==='payroll'?'Continue Payroll':'Start English practice',exact:true}).click();
 for(let i=0;i<3;i++){
  await page.getByRole('tab',{name:'Practice',exact:true}).click();const w=page.getByTestId('applied-practice');await w.getByLabel('Choose a workshop scenario').selectOption(String(i));await w.getByRole('textbox').last().fill('PRIVATE_LOCAL_DRAFT_NOT_SENT');
  await w.getByRole('button',{name:'Prepare this scenario with Professor',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Professor',exact:true})).toHaveAttribute('aria-selected','true');const reference=page.getByTestId('workshop-session-reference');await expect(reference).toContainText('Scenario prepared for your next Start');expect(f.fixture.apiRequests.length).toBe(i);
  await expect(reference).toContainText('written answers and local results are not sent');
  if(i===1){expect(await reference.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);await reference.screenshot({path:info.outputPath(`handoff-${track}-${width}.png`)});}
  await f.start();await expect.poll(()=>f.fixture.apiRequests.length).toBe(i+1);const sent=f.fixture.apiRequests[i];expect(sent.workshopSelection).toEqual({version:1,id:caseIds[track][i]});expect(JSON.stringify(sent)).not.toContain('PRIVATE_LOCAL_DRAFT_NOT_SENT');expect(sent).not.toHaveProperty('answers');
  await expect(page.getByRole('alert')).toContainText('synthetic_provider_disabled');
 }
 expect(f.fixture.sensitive).toBe(0);expect(f.fixture.outcomeReads).toBe(0);
});
test('clearing prepared scenario restores standard lesson and never clears the local workshop draft',async({page})=>{
 const f=await experienceFixture(page);await f.signIn();await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();const w=page.getByTestId('applied-practice');await w.getByRole('textbox').last().fill('LOCAL_DRAFT');await w.getByRole('button',{name:'Prepare this scenario with Professor',exact:true}).click();
 await page.getByRole('button',{name:'Use the standard lesson instead',exact:true}).click();await expect(page.getByTestId('workshop-session-reference')).toHaveCount(0);await f.start();await expect.poll(()=>f.fixture.apiRequests.length).toBe(1);expect(f.fixture.apiRequests[0]).not.toHaveProperty('workshopSelection');await page.getByRole('tab',{name:'Practice',exact:true}).click();await expect(w.getByRole('textbox').last()).toHaveValue('LOCAL_DRAFT');
});
test('a simulated live session keeps its starting scenario while other local exercises remain usable',async({page})=>{
 const f=await experienceFixture(page,{fakeVoice:true});await f.signIn();await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();const w=page.getByTestId('applied-practice');await w.getByLabel('Choose a workshop scenario').selectOption('1');await w.getByRole('button',{name:'Prepare this scenario with Professor',exact:true}).click();await f.start();await expect(page.getByRole('button',{name:'End session',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Practice',exact:true}).click();await w.getByLabel('Choose a workshop scenario').selectOption('2');await expect(w.getByRole('button',{name:'Prepare this scenario with Professor',exact:true})).toBeDisabled();await expect(page.getByTestId('workshop-session-reference')).toContainText('Reporting bridge · new numbers');
 expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);expect(await page.evaluate(()=>(window as any).__voiceFixture.requests[0].workshopSelection)).toEqual({version:1,id:'finance-bridge-b'});
 await page.getByRole('button',{name:'End session',exact:true}).click();await expect(w.getByRole('button',{name:'Prepare this scenario with Professor',exact:true})).toBeEnabled();await w.getByRole('button',{name:'Prepare this scenario with Professor',exact:true}).click();await expect(page.getByTestId('workshop-session-reference')).toContainText('Reporting bridge · smaller business');expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);
});
test('wrong server scenario acknowledgement blocks the real client before microphone or remote socket',async({page})=>{
 const f=await experienceFixture(page,{validation:true});let calls=0,sockets=0;page.on('websocket',s=>{if(!['localhost','127.0.0.1'].includes(new URL(s.url()).hostname))sockets++;});
 await page.route('**/api/livekit-token',route=>{calls++;const body=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({serverUrl:'wss://synthetic.invalid',token:'fictional',roomName:'validation:fictional',participantIdentity:'fictional',sessionId:SYNTHETIC_SESSION_ID,maxSessionSeconds:300,validationMode:true,professorProfile:'finance',lessonId:body.lessonId,mode:body.mode,sessionPreparation:body.sessionPreparation,workshopSelection:{version:1,id:'finance-bridge-c'}})});});
 await f.signIn();await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();await page.getByRole('button',{name:'Prepare this scenario with Professor',exact:true}).click();
 await page.evaluate(()=>{(window as any).__microphones=0;navigator.mediaDevices.getUserMedia=async()=>{(window as any).__microphones++;throw new Error('forbidden');};});await f.start();await expect(page.getByRole('alert')).toContainText('Workshop reference could not be confirmed. No microphone was opened.');expect(calls).toBe(1);expect(sockets).toBe(0);expect(await page.evaluate(()=>(window as any).__microphones)).toBe(0);
});
test('closing the lesson drops the prepared scenario without auto-start on reopening',async({page})=>{
 const f=await experienceFixture(page);await f.signIn();await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();await page.getByRole('button',{name:'Prepare this scenario with Professor',exact:true}).click();await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await f.openProfessor();await expect(page.getByTestId('workshop-session-reference')).toHaveCount(0);expect(f.fixture.apiRequests).toHaveLength(0);
});

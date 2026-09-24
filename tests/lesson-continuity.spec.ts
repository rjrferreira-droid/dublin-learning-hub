import {test,expect} from '@playwright/test';import {experienceFixture} from './helpers/experienceFixture';
for(const track of ['english']as const)test(`${track}: one simulated conversation survives written tabs, with visible controls and audio separation`,async({page},info)=>{
 await page.setViewportSize({width:390,height:900});const f=await experienceFixture(page,{track,fakeVoice:true,validation:true});await f.signIn();await f.openProfessor();await f.start();
 await expect(page.getByRole('button',{name:'End session',exact:true})).toBeVisible();
 const reference=await page.getByTestId('professor-session-reference').textContent();
 for(const tab of ['Case','Learn','Practice','Grammar','Speaking','Visual','Test','Sources']){
  await page.getByRole('tab',{name:tab,exact:true}).click();await expect(page.getByTestId('lesson-professor-workspace')).toBeVisible();await expect(page.getByRole('button',{name:'End session',exact:true})).toBeVisible();
  await expect(page.getByTestId('professor-session-panel')).toHaveCount(1);await expect(page.getByTestId('professor-session-reference')).toHaveText(reference!);
  expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);expect(await page.evaluate(()=>(window as any).__voiceFixture.leaves)).toBe(0);
 }
 await page.getByRole('tab',{name:'Audio',exact:true}).click();await expect(page.getByTestId('audio-conversation-guard')).toBeVisible();expect(f.fixture.sensitive).toBe(0);
 await page.getByRole('tab',{name:'Case',exact:true}).click();await page.getByLabel('Your case response',{exact:true}).fill('FICTIONAL CASE TO RETAIN');
 await page.getByRole('button',{name:'Mute microphone',exact:true}).click();await expect(page.getByRole('button',{name:'Unmute microphone',exact:true})).toBeVisible();await expect(page.getByTestId('lesson-professor-workspace')).toContainText('usage charges continue');
 await page.getByTestId('lesson-professor-workspace').screenshot({path:info.outputPath(`continuity-${track}-mobile.png`)});
 await page.getByRole('button',{name:'Return to Professor',exact:true}).click();await expect(page.getByRole('button',{name:'Unmute microphone',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'End session',exact:true}).click();await expect(page.getByTestId('session-outcome')).toContainText('FICTIONAL FEEDBACK');
 const reads=f.fixture.outcomeReads;await page.getByRole('tab',{name:'Case',exact:true}).click();await expect(page.getByLabel('Your case response',{exact:true})).toHaveValue('FICTIONAL CASE TO RETAIN');
 await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByTestId('session-outcome')).toContainText('FICTIONAL FEEDBACK');expect(f.fixture.outcomeReads).toBe(reads);expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);expect(f.fixture.apiRequests).toHaveLength(0);
});
test('closing a lesson disconnects; reopening never restarts or keeps the previous session reference',async({page})=>{
 const f=await experienceFixture(page,{track:'english',fakeVoice:true});await f.signIn();await f.openProfessor();await f.start();await page.getByRole('tab',{name:'Learn',exact:true}).click();await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__voiceFixture.leaves)).toBe(1);await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
 await f.openProfessor();await expect(page.getByRole('button',{name:'Start voice session',exact:true})).toBeVisible();await expect(page.getByTestId('professor-session-reference')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);
});
test('same-tick duplicate Start is locked before React renders connecting',async({page})=>{
 const f=await experienceFixture(page,{fakeVoice:true});await f.signIn();await f.openProfessor();await page.getByRole('button',{name:'Start voice session',exact:true}).evaluate((e:HTMLButtonElement)=>{e.click();e.click();});
 await expect(page.getByRole('button',{name:'End session',exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);
});
test('leaving an English lesson disconnects and discards the lesson-scoped conversation',async({page})=>{
 const f=await experienceFixture(page,{track:'english',fakeVoice:true});await f.signIn();await f.openProfessor();await f.start();await page.getByRole('tab',{name:'Case',exact:true}).click();
 await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__voiceFixture.leaves)).toBe(1);await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
 await f.openProfessor();await expect(page.getByTestId('professor-session-reference')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);
});
test('remote disconnect ends once, keeps feedback and cannot be resurrected by changing tabs',async({page})=>{
 const f=await experienceFixture(page,{track:'english',fakeVoice:true});await f.signIn();await f.openProfessor();await f.start();await page.evaluate(()=>(window as any).__fakeVoiceDisconnect());await expect(page.getByTestId('session-outcome')).toContainText('FICTIONAL FEEDBACK');
 await page.getByRole('tab',{name:'Case',exact:true}).click();await expect(page.getByTestId('lesson-professor-workspace')).toBeHidden();await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByRole('button',{name:'Start voice session',exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(1);
});

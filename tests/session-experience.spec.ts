import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';
for(const track of ['finance','payroll','english'] as const)test(`${track}: preparation remains local until Start and uses only the selected enum values`,async({page},info)=>{
 await page.setViewportSize({width:390,height:844});const f=await experienceFixture(page,{track,validation:true});await f.signIn();await f.openProfessor();
 const plan=page.getByTestId('session-preparation');await plan.getByText('Shape this conversation',{exact:false}).first().click();
 await plan.getByRole('radio',{name:/Understand the idea/}).check();await plan.getByLabel('Conversation pace').selectOption('patient');await plan.getByLabel('Language support').selectOption('pt-BR');
 expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.outcomeReads).toBe(0);expect(f.fixture.sensitive).toBe(0);
 await expect(page.getByRole('button',{name:'Start validation session',exact:true})).toBeDisabled();
 await page.screenshot({path:info.outputPath(`experience-plan-${track}.png`)});
 await f.start();await expect.poll(()=>f.fixture.apiRequests.length).toBe(1);
 expect(f.fixture.apiRequests[0].sessionPreparation).toEqual({version:1,goal:'understand',pace:'patient',support:'pt-BR'});
 expect(f.fixture.apiRequests[0]).not.toHaveProperty('drafts');await expect(page.getByRole('alert')).toContainText('synthetic_provider_disabled');expect(f.fixture.outcomeReads).toBe(0);
});
test('simulated conversation can mute/unmute with an honest billing warning and show only its saved feedback',async({page},info)=>{
 const f=await experienceFixture(page,{fakeVoice:true,validation:true});await f.signIn();await f.openProfessor();await f.start();
 await page.getByRole('button',{name:'Mute microphone',exact:true}).click();await expect(page.getByText('Microphone muted.',{exact:false})).toContainText('usage charges continue');
 await page.getByRole('button',{name:'Unmute microphone',exact:true}).click();expect(await page.evaluate(()=>(window as any).__voiceFixture.microphoneChanges)).toEqual([false,true]);
 expect(f.fixture.outcomeReads).toBe(0);await page.getByRole('button',{name:'End session',exact:true}).click();
 const feedback=page.getByTestId('session-outcome');await expect(feedback).toContainText('FICTIONAL FEEDBACK');await expect(feedback).toContainText('Cost settlement is separate');await expect(feedback).toContainText('Validation session');
 await expect.poll(()=>f.fixture.outcomeReads).toBe(1);await feedback.screenshot({path:info.outputPath('experience-outcome.png')});expect(f.fixture.sensitive).toBe(0);expect(f.fixture.apiRequests).toHaveLength(0);
});
test('processing does not show invented feedback and polling stops when the saved result appears',async({page})=>{
 const f=await experienceFixture(page,{fakeVoice:true});f.fixture.outcome='processing';await f.signIn();await f.openProfessor();await f.start();await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect.poll(()=>f.fixture.outcomeReads).toBe(1);await expect(page.getByTestId('session-outcome')).not.toContainText('FICTIONAL FEEDBACK');
 f.fixture.outcome='ready';await expect(page.getByTestId('session-outcome')).toContainText('FICTIONAL FEEDBACK',{timeout:6000});expect(f.fixture.outcomeReads).toBe(2);
});
test('an inaccessible saved record offers a read-only retry rather than a new evaluation',async({page})=>{
 const f=await experienceFixture(page,{fakeVoice:true});f.fixture.outcome='unavailable';await f.signIn();await f.openProfessor();await f.start();await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect(page.getByTestId('session-outcome')).toContainText('could not be checked');await expect(page.getByTestId('session-outcome')).not.toContainText('FICTIONAL FEEDBACK');
 f.fixture.outcome='ready';await page.getByRole('button',{name:'Check saved status again',exact:true}).click();await expect(page.getByTestId('session-outcome')).toContainText('FICTIONAL FEEDBACK');expect(f.fixture.sensitive).toBe(0);
});
test('signout during pending feedback removes the panel and stops additional polling',async({page})=>{
 const f=await experienceFixture(page,{fakeVoice:true});f.fixture.outcome='processing';await f.signIn();await f.openProfessor();await f.start();await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect.poll(()=>f.fixture.outcomeReads).toBe(1);await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page.getByTestId('session-outcome')).toHaveCount(0);
 const reads=f.fixture.outcomeReads;await page.waitForTimeout(1800);expect(f.fixture.outcomeReads).toBe(reads);await expect(page.getByRole('heading',{name:'Enter Learning Hub',exact:true})).toBeVisible();
});
test('saved without usable feedback is not described as an assessed success',async({page})=>{
 const f=await experienceFixture(page,{fakeVoice:true});f.fixture.outcome='saved';await f.signIn();await f.openProfessor();await f.start();await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect(page.getByTestId('session-outcome')).toContainText('Session saved · feedback not available');await expect(page.getByTestId('session-outcome')).toContainText('No score or learning gain is inferred');
});
test('written study does not load voice controls until the Professor tab is selected',async({page})=>{
 const f=await experienceFixture(page);let voiceModuleRequests=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/src/components/ProfessorSessionPanel.tsx')voiceModuleRequests++;});
 await f.signIn();expect(voiceModuleRequests).toBe(0);await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Case',exact:true}).click();expect(voiceModuleRequests).toBe(0);
 await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByTestId('professor-session-panel')).toBeVisible();expect(voiceModuleRequests).toBe(1);expect(f.fixture.apiRequests).toHaveLength(0);
});

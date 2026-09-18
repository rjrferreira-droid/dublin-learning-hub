import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry';

const lessonId='11111111-1111-4111-8111-111111111111',moduleId='22222222-2222-4222-8222-222222222222',courseId='33333333-3333-4333-8333-333333333333';
const identity={lessonId,moduleId,courseId,lessonSlug:p1SlugFor('finance'),contentVersion:3,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2};
const rows={courses:[{id:courseId,slug:'finance',learner_track:'rafael_finance'}],modules:[{id:moduleId,course_id:courseId,slug:'fictional-module',sequence:1}],lessons:[{id:lessonId,module_id:moduleId,slug:identity.lessonSlug,title:'Fictional protected P1 Audio',subtitle:null,sequence:2,estimated_minutes:25}]};

test('explicit P1 Audio binding check sends exact identity and never mounts media or a provider path',async({page})=>{
 const {fixture,signIn}=await experienceFixture(page);const calls:any[]=[];
 await page.route('**/rest/v1/*',async route=>{const table=new URL(route.request().url()).pathname.split('/').at(-1)!;if(!(table in rows))return route.fallback();await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(rows[table as keyof typeof rows])});});
 await page.route('**/api/professor-readiness',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'reference_verified_activation_closed',identity,providerAdmission:false,premiumAudioAdmission:false,validationOnly:true})}));
 await page.route('**/api/premium-audio-readiness',async route=>{
  const body=route.request().postDataJSON();calls.push(body);expect(body).toEqual({lessonId,requestedTrack:'rafael_finance'});expect(JSON.stringify(body)).not.toContain('LOCAL PRIVATE AUDIO DRAFT');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'audio_reference_verified_activation_closed',identity,
   source:{language:'pt-BR',purpose:'study-guide-overview',characters:900,scriptSha256:'a'.repeat(64),sourceFingerprint:'b'.repeat(64),referenceSha256:'c'.repeat(64),expectedStoragePath:`lessons/${lessonId}/commentary-v3-${'b'.repeat(64)}-r1.mp3`},
   cacheLookupPerformed:false,runtimeSourceHandoff:false,generationAdmission:false,providerAdmission:false,validationOnly:true})});
 });
 await signIn();await page.goto('/?previewCheck=1');await page.locator('.nav-stack').getByRole('button',{name:/Learning/}).click();
 const card=page.getByTestId('catalog-lesson-'+identity.lessonSlug);await expect(card).toBeVisible();await card.getByRole('button',{name:'Open lesson',exact:true}).click();
 await page.getByRole('tab',{name:'Practice',exact:true}).click();await page.getByTestId('written-practice-0').getByRole('textbox').fill('LOCAL PRIVATE AUDIO DRAFT');
 await page.getByRole('tab',{name:'Audio',exact:true}).click();await page.getByRole('button',{name:'Check lesson availability',exact:true}).click();
 const panel=page.getByTestId('p1-audio-readiness-panel');await expect(panel).toBeVisible();expect(calls).toHaveLength(0);
 await panel.getByRole('button',{name:'Validate Audio binding',exact:true}).click();await expect(panel.getByRole('status')).toContainText('expected versioned cache path verified');
 await expect(panel.getByRole('status')).toContainText('runtime source handoff');
 expect(calls).toEqual([{lessonId,requestedTrack:'rafael_finance'}]);await expect(panel.getByRole('button',{name:'Validate Audio binding',exact:true})).toBeDisabled();
 await expect(page.getByTestId('premium-audio-panel')).toHaveCount(0);await expect(page.locator('audio')).toHaveCount(0);await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(0);expect(fixture.apiRequests).toHaveLength(0);expect(fixture.sensitive).toBe(0);
 await page.getByRole('tab',{name:'Practice',exact:true}).click();await expect(page.getByTestId('written-practice-0').getByRole('textbox')).toHaveValue('LOCAL PRIVATE AUDIO DRAFT');
});

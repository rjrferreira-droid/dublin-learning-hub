import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const receipt={userId:owner,requestId:other,mode:'chapter_conversation',reference:{id:other,sha256:'a'.repeat(64),version:'p1-reference-candidate-v1',identity:{lessonId:other,moduleId:other,courseId:other,lessonSlug:'fictional-p1',contentVersion:1,requestedTrack:'rafael_finance',studyTrack:'finance',sequence:2}}};
for(const width of [390,1440])test(`recovery after reload is explicit and read-only at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const {fixture,signIn}=await experienceFixture(page);let reads=0;
 await page.route('**/rest/v1/rpc/observe_professor_dispatch_v1',async route=>{
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  reads++;expect(route.request().postDataJSON()).toEqual({p_reference_id:other,p_request_id:other});
  await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({state:'dispatch_unconfirmed',sessionId:other,providerAdmission:false,retryAllowed:false})});
 });
 await signIn();
 await page.evaluate(({owner,receipt})=>sessionStorage.setItem('lh.preview-admission-recovery.v1:'+owner,JSON.stringify({version:1,receipt})),{owner,receipt});
 await page.goto('/?previewCheck=1');
 const panel=page.getByRole('region',{name:'Preview session recovery'});
 await expect(panel).toBeVisible();expect(reads).toBe(0);
 await panel.getByRole('button',{name:'Check session status'}).click();
 await expect(panel.getByRole('status')).toContainText('dispatch remains unconfirmed');expect(reads).toBe(1);
 await page.reload();await expect(panel).toBeVisible();expect(reads).toBe(1);
 expect(fixture.sensitive).toBe(0);expect(fixture.apiRequests).toHaveLength(0);
});
test('another account record is not shown or queried',async({page})=>{
 const {fixture,signIn}=await experienceFixture(page);await signIn();
 await page.evaluate(({other,receipt})=>sessionStorage.setItem('lh.preview-admission-recovery.v1:'+other,JSON.stringify({version:1,receipt:{...receipt,userId:other}})),{other,receipt});
 await page.goto('/?previewCheck=1');
 await expect(page.getByRole('region',{name:'Preview configuration'})).toBeVisible();
 await expect(page.getByRole('region',{name:'Preview session recovery'})).toHaveCount(0);expect(fixture.sensitive).toBe(0);
});
test('server discovery works without browser storage and never starts a session',async({page})=>{
 const {fixture,signIn}=await experienceFixture(page);let reads=0;
 await page.route('**/rest/v1/rpc/list_professor_recovery_v1',async route=>{
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  reads++;expect(route.request().postDataJSON()).toEqual({});
  await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({attempts:[{referenceId:other,requestId:other,sessionId:other,state:'dispatch_unconfirmed'}],truncated:false,providerAdmission:false,retryAllowed:false})});
 });
 await signIn();await page.evaluate(()=>sessionStorage.clear());await page.goto('/?previewCheck=1');
 const panel=page.getByRole('region',{name:'Find previous attempts'});await expect(panel).toBeVisible();expect(reads).toBe(0);
 await panel.getByRole('button',{name:'Find previous attempts'}).click();await expect(panel.getByRole('status')).toContainText('1 previous attempt(s)');
 expect(reads).toBe(1);expect(fixture.sensitive).toBe(0);expect(fixture.apiRequests).toHaveLength(0);
});

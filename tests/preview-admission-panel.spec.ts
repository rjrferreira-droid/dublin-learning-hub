import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry';

const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const lessonId='11111111-1111-4111-8111-111111111111',moduleId='22222222-2222-4222-8222-222222222222',courseId='33333333-3333-4333-8333-333333333333',referenceId='44444444-4444-4444-8444-444444444444';
const identity={lessonId,moduleId,courseId,lessonSlug:p1SlugFor('english'),contentVersion:1,requestedTrack:'english_academy',studyTrack:'english',sequence:2};
const rows={courses:[{id:courseId,slug:'english',learner_track:'english_academy'}],modules:[{id:moduleId,course_id:courseId,slug:'fictional-module',sequence:1}],lessons:[{id:lessonId,module_id:moduleId,slug:identity.lessonSlug,title:'Fictional protected English P1',subtitle:null,sequence:2,estimated_minutes:25}]};

async function installCatalog(page:any){
 await page.route('**/rest/v1/*',async(route:any)=>{const table=new URL(route.request().url()).pathname.split('/').at(-1)!;if(!(table in rows))return route.fallback();await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(rows[table as keyof typeof rows])});});
}
async function openP1(page:any,signIn:()=>Promise<void>){
 await signIn();await page.goto('/?previewCheck=1');await page.getByRole('button',{name:'Start English practice',exact:true}).click();
 await page.getByRole('tab',{name:'Professor',exact:true}).click();
}

test('explicit protected P1 admission sends exact identity once and stops before provider UI',async({page})=>{
 await page.setViewportSize({width:390,height:900});const {fixture,signIn}=await experienceFixture(page,{track:'english'});await installCatalog(page);
 const calls:any[]=[];
 await page.route('**/api/professor-readiness',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'reference_verified_activation_closed',identity,providerAdmission:false,premiumAudioAdmission:false,validationOnly:true})}));
 await page.route('**/api/professor-admission',async route=>{
  const body=route.request().postDataJSON();calls.push(body);
  expect(JSON.stringify(body)).not.toContain('LOCAL PRIVATE ANSWER');
  if(body.action==='preflight')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({receipt:{requestId:body.requestId,userId:owner,mode:body.mode,reference:{id:referenceId,sha256:'a'.repeat(64),version:'p1-reference-candidate-v1',identity}}})});
  expect(body).toEqual({action:'start',referenceId,requestId:calls[0].requestId});
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'denied',reason:'professor_monthly_budget_reached',retryAllowed:false})});
 });
 await openP1(page,signIn);await page.getByRole('tab',{name:'Practice',exact:true}).click();await page.getByTestId('written-practice-0').getByRole('textbox').fill('LOCAL PRIVATE ANSWER');await page.getByRole('tab',{name:'Professor',exact:true}).click();
 await page.getByRole('button',{name:'Check lesson availability',exact:true}).click();const panel=page.getByTestId('preview-admission-panel');await expect(panel).toBeVisible();expect(calls).toHaveLength(0);
 await panel.getByRole('button',{name:'Test protected start',exact:true}).click();await expect(panel.getByRole('status')).toContainText('disposable budget denied');
 expect(calls.map(call=>call.action)).toEqual(['preflight','start']);expect(calls[0]).toEqual({action:'preflight',kind:'p1',lessonId,requestedTrack:'english_academy',requestId:calls[0].requestId,mode:'chapter_conversation'});
 expect(await page.evaluate(key=>sessionStorage.getItem(key),'lh.preview-admission-recovery.v1:'+owner)).toBeNull();
 await expect(panel.getByRole('button',{name:'Test protected start',exact:true})).toBeDisabled();await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);await expect(page.getByTestId('premium-audio-panel')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__voiceFixture.starts)).toBe(0);
 expect(fixture.apiRequests).toHaveLength(0);expect(fixture.sensitive).toBe(0);
});

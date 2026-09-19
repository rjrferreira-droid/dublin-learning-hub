import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry';

test('mobile written lesson recovers explicitly after a stalled authored module, with providers closed',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 const {fixture,signIn}=await experienceFixture(page,{track:'finance'});
 const lessonId='11111111-1111-4111-8111-111111111111',moduleId='22222222-2222-4222-8222-222222222222',courseId='33333333-3333-4333-8333-333333333333';
 const rows={courses:[{id:courseId,slug:'finance',learner_track:'rafael_finance'}],modules:[{id:moduleId,course_id:courseId,slug:'fixture',sequence:1}],lessons:[{id:lessonId,module_id:moduleId,slug:p1SlugFor('finance'),title:'Fictional P1',sequence:2,estimated_minutes:25}]};
 let catalogLoaded=false,blocked=false,imports=0,release=()=>{};
 await page.route('**/rest/v1/*',async route=>{
  const table=new URL(route.request().url()).pathname.split('/').at(-1)!;
  if(!(table in rows))return route.fallback();
  if(table==='lessons')catalogLoaded=true;
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(rows[table as keyof typeof rows])});
 });
 await page.route('**/p1RuntimeModulesData*',async route=>{
  imports++;blocked=true;await new Promise<void>(resolve=>{release=resolve;});await route.continue();
 });
 await signIn();await expect.poll(()=>catalogLoaded).toBe(true);await page.clock.install();
 await page.getByRole('button',{name:'Continue Finance',exact:true}).click();
 await page.getByRole('tab',{name:'Learn',exact:true}).click();await expect.poll(()=>blocked).toBe(true);
 await expect(page.getByTestId('written-lesson-loading')).toContainText('Loading reviewed lesson…');
 await page.clock.fastForward(15001);
 await expect(page.getByTestId('written-lesson-loading')).toContainText('could not be loaded');
 await expect(page.getByTestId('lesson-study-panel')).toHaveCount(0);expect(imports).toBe(1);
 release();
 await page.getByRole('button',{name:'Try loading again',exact:true}).click();
 await expect(page.getByTestId('lesson-study-panel')).toHaveAttribute('data-track','finance');
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 await page.getByTestId('written-practice-0').getByRole('textbox').fill('PRIVATE RECOVERED DRAFT');
 await page.getByRole('tab',{name:'Learn',exact:true}).click();
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 await expect(page.getByTestId('written-practice-0').getByRole('textbox')).toHaveValue('PRIVATE RECOVERED DRAFT');
 expect(fixture.apiRequests).toHaveLength(0);expect(fixture.sensitive).toBe(0);
});

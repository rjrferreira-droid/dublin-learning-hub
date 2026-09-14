import {sequence4SlugFor} from '../src/learning/sequence4Registry';
import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';
import {sequence3SlugFor} from '../src/learning/sequence3Registry';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry';
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
for(const sequence of [2,3,4])for(const track of ['finance','payroll','english'] as const)for(const width of [1440,390])test(`${track} sequence ${sequence} dynamic catalog ${width}: exact authored lesson and local drafts, providers stay closed`,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 const {fixture,signIn}=await experienceFixture(page,{track});
 const lessonId='11111111-1111-4111-8111-111111111111',moduleId='22222222-2222-4222-8222-222222222222',courseId='33333333-3333-4333-8333-333333333333';
 const rows={courses:[{id:courseId,slug:track,learner_track:tracks[track]}],modules:[{id:moduleId,course_id:courseId,slug:'fictional-module',sequence:1}],lessons:[{id:lessonId,module_id:moduleId,slug:sequence===2?p1SlugFor(track):sequence===3?sequence3SlugFor(track):sequence4SlugFor(track),title:'Fictional published P1 '+track,subtitle:null,sequence,estimated_minutes:25}]};
 const catalogReads:string[]=[];
 await page.route('**/rest/v1/*',async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1)!;
  if(!(table in rows))return route.fallback();
  expect(req.method()).toBe('GET');catalogReads.push(table);
  if(table==='courses')expect(url.searchParams.get('is_active')).toBe('eq.true');
  else expect(url.searchParams.get('is_published')).toBe('eq.true');
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(rows[table as keyof typeof rows])});
 });
 await signIn();await expect.poll(()=>catalogReads.includes('lessons')).toBe(true);
 await page.getByRole('button',{name:track==='english'?'Start English practice':track==='finance'?'Continue Finance':'Continue Payroll',exact:true}).click();
 await page.getByRole('tab',{name:'Learn',exact:true}).click();
 const study=page.getByTestId('lesson-study-panel');await expect(study).toHaveAttribute('data-track',track);
 await expect(page.locator('.lesson-progress')).toContainText('Reviewed written lesson');
 await expect(study.locator('.lesson-teaching-block').first()).toBeVisible();
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 await study.getByTestId('written-practice-0').getByRole('textbox').fill('LOCAL P1 PRIVATE DRAFT');
 for(const name of ['Professor','Audio']){
  await page.getByRole('tab',{name,exact:true}).click();await expect(page.getByTestId('p1-interactive-gate')).toBeVisible();
  await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
 }
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 await expect(study.getByTestId('written-practice-0').getByRole('textbox')).toHaveValue('LOCAL P1 PRIVATE DRAFT');
 expect(fixture.apiRequests).toHaveLength(0);expect(fixture.sensitive).toBe(0);
 await page.screenshot({path:info.outputPath(`p1-seq${sequence}-${track}-${width}.png`),fullPage:true});
});

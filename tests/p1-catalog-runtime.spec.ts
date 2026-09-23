import {readFileSync} from 'node:fs';
import {remainingSlugFor,type RemainingSequence} from '../src/learning/remainingWrittenRegistry';
import finance4 from '../quality/drafts/sequence4-finance.json' with {type:'json'};
import payroll4 from '../quality/drafts/sequence4-payroll.json' with {type:'json'};
import english4 from '../quality/drafts/sequence4-english.json' with {type:'json'};
import {sequence4SlugFor} from '../src/learning/sequence4Registry';
import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';
import {sequence3SlugFor} from '../src/learning/sequence3Registry';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry';
const tracks={finance:'rafael_finance',payroll:'viviane_payroll',english:'english_academy'};
for(const sequence of [2,3,4,5,6,7,8])for(const track of ['finance','payroll','english'] as const)for(const width of [1440,390])test(`${track} sequence ${sequence} dynamic catalog ${width}: exact authored lesson and local drafts, providers stay closed`,async({page},info)=>{
 await page.setViewportSize({width,height:900});
 const {fixture,signIn}=await experienceFixture(page,{track});
 const lessonId='11111111-1111-4111-8111-111111111111',moduleId='22222222-2222-4222-8222-222222222222',courseId='33333333-3333-4333-8333-333333333333';
 const rows={courses:[{id:courseId,slug:track,learner_track:tracks[track]}],modules:[{id:moduleId,course_id:courseId,slug:'fictional-module',sequence:1}],lessons:[{id:lessonId,module_id:moduleId,slug:sequence===2?p1SlugFor(track):sequence===3?sequence3SlugFor(track):sequence===4?sequence4SlugFor(track):remainingSlugFor(track,sequence as RemainingSequence),title:'Fictional published P1 '+track,subtitle:null,sequence,estimated_minutes:25}]};
 const catalogReads:string[]=[];
 await page.route('**/rest/v1/*',async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1)!;
  if(!(table in rows))return route.fallback();
  expect(req.method()).toBe('GET');catalogReads.push(table);
  if(table==='courses')expect(url.searchParams.get('is_active')).toBe('eq.true');
  else expect(url.searchParams.get('is_published')).toBe('eq.true');
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(rows[table as keyof typeof rows])});
 });
 let readinessCalls=0;
 let audioCalls=0;
 await page.route('**/functions/v1/premium-lesson-audio',async route=>{
  audioCalls++;
  expect(route.request().postDataJSON()).toEqual({lesson_id:lessonId});
  await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'audio_runtime_closed'})});
 });
 const stalledReadinessCase=sequence===2&&track==='finance'&&width===390;
 let releaseStalledReadiness=()=>{};
 await page.route('**/api/professor-readiness',async route=>{
  readinessCalls++;expect(route.request().method()).toBe('POST');
  expect(route.request().postDataJSON()).toEqual({lessonId,requestedTrack:tracks[track]});
  if(stalledReadinessCase&&readinessCalls===1){
   await new Promise<void>(resolve=>{releaseStalledReadiness=resolve;});
   await route.abort().catch(()=>{});return;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'reference_verified_activation_closed',providerAdmission:false,premiumAudioAdmission:false,validationOnly:true,identity:{lessonId,moduleId,courseId,lessonSlug:rows.lessons[0].slug,contentVersion:1,requestedTrack:tracks[track],studyTrack:track,sequence:2}})});
 });
 await signIn();await expect.poll(()=>catalogReads.includes('lessons')).toBe(true);
 await page.getByRole('button',{name:track==='english'?'Start English practice':track==='finance'?'Continue Finance':'Continue Payroll',exact:true}).click();
 await page.getByRole('tab',{name:'Learn',exact:true}).click();
 const study=page.getByTestId('lesson-study-panel');await expect(study).toHaveAttribute('data-track',track);
 await expect(page.locator('.lesson-progress')).toContainText('Reviewed written lesson');
 await expect(study.locator('.lesson-teaching-block').first()).toBeVisible();
 if(sequence===2&&(track==='finance'||track==='english')){
  await page.getByRole('tab',{name:'Case',exact:true}).click();
  const casePanel=study.getByTestId('lesson-case');
  if(track==='finance'){
   await expect(casePanel).toContainText('contract price 108');
   await expect(casePanel).toContainText('100 for hardware and 20 for support');
   await page.getByRole('tab',{name:'Test',exact:true}).click();
   const allocation=study.getByTestId('checkpoint-question-3');
   await allocation.getByRole('radio').nth(0).check();
   await allocation.getByRole('button',{name:'Check answer',exact:true}).click();
   await allocation.getByRole('button',{name:'Review the related concept'}).click();
   await expect(study.locator('#lesson-section-fin-rev-price')).toBeVisible();
  }else{
   await casePanel.getByText('Worked case and review checklist',{exact:true}).click();
   await expect(casePanel.locator('.lesson-case-worked-answer')).toHaveCSS('white-space','pre-line');
   await expect(casePanel.locator('.lesson-case-worked-answer')).toContainText('Professor:');
  }
 }
 if(sequence>=4){
  const authored=sequence===4?{finance:finance4,payroll:payroll4,english:english4}[track].module:JSON.parse(readFileSync(new URL(`../quality/drafts/sequence${sequence}-${track}.json`,import.meta.url),'utf8')).module;
  await expect(study.getByTestId('lesson-reading').getByRole('heading',{level:2})).toHaveText(authored.title);
  await page.getByRole('tab',{name:'Test',exact:true}).click();
  const first=study.getByTestId('checkpoint-question-0');
  await expect(first.locator('legend')).toContainText(authored.checkpoint[0].prompt);
  await first.getByRole('radio').nth(authored.checkpoint[0].correctIndex).check();
  await first.getByRole('button',{name:'Check answer',exact:true}).click();
  await expect(study.getByTestId('local-checkpoint-result')).toContainText('1 of 5 checked · 1 correct');
  await expect(study.getByTestId('local-checkpoint-result')).toContainText('not saved to your profile');
  await first.getByRole('button',{name:'Review the related concept'}).click();
  await expect(study.locator('#lesson-section-'+authored.checkpoint[0].reviewSection)).toBeVisible();
  await page.getByRole('tab',{name:'Case',exact:true}).click();
  await study.getByText('Worked case and review checklist',{exact:true}).click();
  await expect(study.getByTestId('lesson-case')).toContainText(authored.caseStudy.modelAnswer);
  if(track==='english')await expect(study.locator('.lesson-case-worked-answer')).toHaveCSS('white-space','pre-line');
 }
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 await study.getByTestId('written-practice-0').getByRole('textbox').fill('LOCAL P1 PRIVATE DRAFT');
 const interactiveTabs=track==='english'?['Professor','Audio']:['Audio'];
 for(const name of interactiveTabs){
  await page.getByRole('tab',{name,exact:true}).click();await expect(page.getByTestId('p1-interactive-gate')).toBeVisible();
  await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
  if(sequence===2){
   if(stalledReadinessCase){
    await page.clock.install();
    await page.getByRole('button',{name:'Check lesson availability',exact:true}).click();
    await expect.poll(()=>readinessCalls).toBe(1);
    await expect(page.getByRole('button',{name:'Checking lesson…'})).toBeDisabled();
    await page.clock.fastForward(15001);
    await expect(page.getByTestId('lesson-readiness-check')).toContainText('Availability could not be confirmed. You can continue the written lesson.');
    await expect(page.getByRole('button',{name:'Check lesson availability',exact:true})).toBeEnabled();
    expect(readinessCalls).toBe(1);releaseStalledReadiness();
   }
   await page.getByRole('button',{name:'Check lesson availability',exact:true}).click();
   if(name==='Audio'&&track!=='payroll'){
    await expect(page.getByTestId('lesson-readiness-check')).toContainText('Lesson verified. Load audio when ready');
    await expect(page.getByTestId('premium-audio-panel')).toBeVisible();
    expect(audioCalls).toBe(0);
    await page.getByRole('button',{name:'Load audio',exact:true}).click();
    await expect(page.getByRole('button',{name:'Not activated yet',exact:true})).toBeDisabled();
    await expect(page.getByTestId('premium-audio-panel')).toContainText('Audio awaiting activation');
    expect(audioCalls).toBe(1);
   }else{
    await expect(page.getByTestId('lesson-readiness-check')).toContainText('Lesson reference verified. Professor and audio are still unavailable.');
    await expect(page.getByTestId('premium-audio-panel')).toHaveCount(0);
   }
   await expect(page.getByTestId('preview-admission-panel')).toHaveCount(0);
   await expect(page.getByTestId('professor-session-panel')).toHaveCount(0);
  }else await expect(page.getByTestId('lesson-readiness-check')).toHaveCount(0);

 }
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 await expect(study.getByTestId('written-practice-0').getByRole('textbox')).toHaveValue('LOCAL P1 PRIVATE DRAFT');
 expect(readinessCalls).toBe(sequence===2?interactiveTabs.length+(stalledReadinessCase?1:0):0);
 expect(fixture.apiRequests).toHaveLength(0);expect(fixture.sensitive).toBe(0);
 await page.screenshot({path:info.outputPath(`p1-seq${sequence}-${track}-${width}.png`),fullPage:true});
});

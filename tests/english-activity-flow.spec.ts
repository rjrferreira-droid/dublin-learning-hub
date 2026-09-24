import {test,expect} from '@playwright/test';
import {englishPracticeSession} from '../src/learning/englishPracticeSession';
import {DEEP_ENGLISH_UNIT_1_CONTRACT} from '../src/learning/deepEnglishUnit1';
import {ENGLISH_E1_MODEL_ID} from '../src/learning/localEnglishLessonRegistry';
for(const width of [1440,390])test(`English unit evaluation and recovery at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lessonId=ENGLISH_E1_MODEL_ID;
 const user={id,email:'english-fixture@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{learner_track:'rafael_finance',display_name:'Rafael'}};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fictional';
 const states:Record<string,unknown>={},results:Record<string,unknown>={},errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(['localhost','127.0.0.1'].includes(url.hostname)){if(url.pathname.startsWith('/api/'))await route.fulfill({status:503,body:'{}'});else await route.continue();return;}
  if(url.hostname!=='lh-ui.invalid'){await route.abort();return;}
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const respond=async(body:unknown,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  if(url.pathname==='/auth/v1/token'){await respond({access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user});return;}
  if(url.pathname==='/auth/v1/user'){await respond(user);return;}
  if(url.pathname==='/rest/v1/profiles'){await respond({display_name:'Rafael',learner_track:'rafael_finance'});return;}
  if(url.pathname==='/rest/v1/user_study_state'){
   if(request.method()==='POST'){const body=request.postDataJSON();states[body.namespace]={schema_version:1,payload:body.payload};await route.fulfill({status:201,headers,body:''});}
   else await respond(states[(url.searchParams.get('namespace')??'').replace(/^eq\./,'')]??null);
   return;
  }
  if(url.pathname==='/functions/v1/english-audio-assess'){await respond({results:[]});return;}
  if(url.pathname==='/functions/v1/english-activity-assess'){
   if(request.method()==='GET'){await respond({results:Object.values(results)});return;}
   const form=await new Request('https://fixture.invalid',{method:'POST',headers:{'Content-Type':request.headers()['content-type']},body:request.postDataBuffer()!}).formData();
   const kind=String(form.get('kind')),item=String(form.get('item_id'));
   const row={status:'completed',kind,lesson_id:lessonId,item_id:item,attempt_id:form.get('attempt_id'),estimated_cost_usd:.001,skills:Object.fromEntries((kind==='practice'?['grammar','vocabulary','context','clarity']:['pronunciation']).map(skill=>[skill,{score:82,feedback:'Fixture feedback based on this activity.'}])),strength:'Clear meaning.',next_step:'Practise the target contrast.',model_response:kind==='practice'?'One possible improved response.':''};
   results[`${kind}:${item}`]=row;await respond(row);return;
  }
  if(request.method()==='GET'&&url.pathname.startsWith('/rest/v1/')){await respond([]);return;}
  await respond({error:'fixture_unavailable'},503);
 });
 await page.routeWebSocket('**/*',socket=>{if(['localhost','127.0.0.1'].includes(new URL(socket.url()).hostname))socket.connectToServer();else socket.close();});
 await page.goto('/?curriculumPreview=1');
 await page.getByLabel('E-mail').fill(user.email);await page.getByLabel('Senha').fill('Fixture-only-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:/^Start English (practice|lesson)$/}).first().click();
 const panel=page.getByTestId('lesson-study-panel');
 await expect(panel.locator('.english-concept-card')).toHaveCount(5);
 await expect(page.getByRole('tab',{name:'Grammar',exact:true})).toHaveCount(0);await expect(page.getByRole('tab',{name:'Sources',exact:true})).toHaveCount(0);
 await panel.getByRole('button',{name:/Continue to Audio/}).click();
 await expect(panel.locator('.audio-answer-card')).toHaveCount(5);
 await expect(panel.locator('.audio-transcript')).not.toHaveAttribute('open','');
 await page.getByRole('tab',{name:'Practice',exact:true}).click();
 const practice=panel.getByTestId('deep-lesson-grammar');await expect(practice.locator('.deep-activity-card')).toHaveCount(20);await expect(practice.getByRole('textbox')).toHaveCount(10);
 const first=practice.locator('.deep-activity-card').first(),firstItem=englishPracticeSession(lessonId,DEEP_ENGLISH_UNIT_1_CONTRACT)[0].item;
 const correct=firstItem.evaluation.kind==='selection'?firstItem.evaluation.correctOptionIds[0]:'';
 await first.locator(`input:not([value="${correct}"])`).first().check();await first.getByRole('button',{name:'Submit first attempt'}).click();await expect(first).toContainText('one attempt remains');
 await first.locator(`input[value="${correct}"]`).check();await first.getByRole('button',{name:'Submit revised attempt'}).click();await expect(first).toContainText('Correct on attempt 2');await expect(first.getByRole('button')).toBeDisabled();
 const written=page.getByTestId('english-written-10');await written.getByRole('textbox').fill('She was waiting when her friend arrived.');await written.getByRole('button',{name:'Send answer for analysis'}).click();await expect(written).toContainText('Grammar: 82%');await expect(written).toContainText('Context and relevance: 82%');
 await page.getByRole('tab',{name:'Speaking',exact:true}).click();await expect(panel.locator('.deep-speaking-task')).toHaveCount(20);const phrase=panel.locator('.deep-speaking-task').first();
 await phrase.getByRole('button',{name:'Record repetition',exact:true}).click();await expect(phrase.getByRole('button',{name:'Stop recording',exact:true})).toBeVisible();await page.waitForTimeout(1000);await phrase.getByRole('button',{name:'Stop recording',exact:true}).click();await phrase.getByRole('button',{name:'Send for pronunciation analysis'}).click();await expect(phrase).toContainText('Pronunciation: 82%');await expect(phrase.locator('.english-skill-results p')).toHaveCount(1);
 await expect(panel.getByRole('button',{name:'Complete unit',exact:true})).toBeDisabled();
 await page.screenshot({path:`test-results/english-speaking-${width}.png`,fullPage:false});
 await expect.poll(()=>Object.keys(states).some(key=>key.startsWith('english-unit.'))).toBe(true);
 await page.reload();
 const start=page.getByRole('button',{name:/^Start English (practice|lesson)$/}).first();
 await start.click();await page.getByRole('tab',{name:'Practice',exact:true}).click();
 await expect(page.getByTestId('english-written-10')).toContainText('Grammar: 82%');await expect(page.getByTestId('deep-lesson-grammar').locator('.deep-activity-card').first()).toContainText('Correct on attempt 2');
 await page.getByRole('tab',{name:'Speaking',exact:true}).click();await expect(page.locator('.deep-speaking-task').first()).toContainText('Pronunciation: 82%');
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:Array.from(document.querySelectorAll('body *')).filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1;}).slice(0,12).map(node=>({tag:node.tagName,classes:node.className,right:node.getBoundingClientRect().right}))}));expect(overflow.scroll,JSON.stringify(overflow)).toBeLessThanOrEqual(width+1);expect(errors).toEqual([]);
});

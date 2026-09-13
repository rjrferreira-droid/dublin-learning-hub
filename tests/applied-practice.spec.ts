import {test,expect} from '@playwright/test';import {experienceFixture} from './helpers/experienceFixture';
const answers={finance:[['380','400','280'],['420','435','285'],['240','248','170']],payroll:[['2512','3552','-70'],['2826','3996','20'],['2268','3108','0']],english:[['1','2','0'],['1','2','0'],['1','2','0']]} as const;
for(const track of ['finance','payroll','english']as const)for(const width of [390,1440])test(`${track} workshop at ${width}px: three scenarios, local feedback, retained draft and reset`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});const f=await experienceFixture(page,{track});await f.signIn();
 await page.getByRole('button',{name:track==='finance'?'Continue Finance':track==='payroll'?'Continue Payroll':'Start English practice',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();
 const workshop=page.getByTestId('applied-practice');await expect(workshop).toBeVisible();
 await workshop.getByRole('button',{name:'Check this workshop attempt',exact:true}).click();await expect(workshop.getByTestId('workshop-result')).toContainText('Complete valid entries');
 for(let scenario=0;scenario<3;scenario++){
  await workshop.getByLabel('Choose a workshop scenario').selectOption(String(scenario));
  for(let i=0;i<3;i++){const field=workshop.getByTestId('workshop-field-'+i);if(track==='english')await field.getByRole('combobox').selectOption(answers[track][scenario][i]);else await field.getByRole('textbox').fill(answers[track][scenario][i]);}
  await workshop.getByRole('button',{name:'Check this workshop attempt',exact:true}).click();await expect(workshop.getByTestId('workshop-result')).toContainText('3 of 3 structured answers');
  await workshop.getByRole('button',{name:'Show the next workshop hint',exact:true}).click();await expect(workshop.locator('.workshop-hint')).toHaveCount(1);
  await workshop.getByRole('button',{name:'Compare with the worked workshop',exact:true}).click();await expect(workshop.locator('.workshop-worked')).toContainText('Your explanation has not been graded');
  await workshop.getByRole('textbox').last().fill('FICTIONAL LOCAL REASONING');
  await page.getByRole('tab',{name:'Learn',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();await expect(workshop.getByRole('textbox').last()).toHaveValue('FICTIONAL LOCAL REASONING');
  expect(await workshop.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  if(scenario===2)await workshop.screenshot({path:info.outputPath(`workshop-${track}-${width}.png`)});
 }
 await workshop.getByRole('button',{name:'Reset this workshop',exact:true}).click();await expect(workshop.getByTestId('workshop-result')).toHaveCount(0);await expect(workshop.getByRole('textbox').last()).toHaveValue('');
 expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.sensitive).toBe(0);expect(f.fixture.outcomeReads).toBe(0);
});
test('workshop invalid amount is not a score and changing an answer removes stale feedback',async({page})=>{
 const f=await experienceFixture(page);await f.signIn();await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();const w=page.getByTestId('applied-practice');
 await w.getByTestId('workshop-field-0').getByRole('textbox').fill('2,512.00');await w.getByRole('button',{name:'Check this workshop attempt',exact:true}).click();await expect(w.getByTestId('workshop-field-0')).toContainText('Check the input format');await expect(w.getByTestId('workshop-result')).not.toContainText('of 3 structured');
 await w.getByTestId('workshop-field-0').getByRole('textbox').fill('380');await expect(w.getByTestId('workshop-result')).toHaveCount(0);
 await w.getByRole('textbox').last().fill('FICTIONAL');await page.locator('.lesson-toolbar').getByRole('button',{name:'Dashboard'}).click();await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();await expect(page.getByTestId('applied-practice').getByRole('textbox').last()).toHaveValue('');
});

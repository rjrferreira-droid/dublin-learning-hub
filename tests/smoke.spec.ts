import { expect, test, type Page } from '@playwright/test';
import {resolveAuthFixture} from './helpers/auth-fixture';

const {email:e2eEmail,password:e2ePassword,available:authenticatedFixtureAvailable}=resolveAuthFixture(process.env);
async function signIn(page:Page){
  if(!e2eEmail||!e2ePassword)throw new Error('Dedicated authenticated E2E fixture is not configured.');
  // The acceptance gate is navigation-only. It must never start a paid provider path.
  await page.route(/\/api\/livekit-token(?:\?|$)/,route=>route.abort('blockedbyclient'));
  await page.route(/\/functions\/v1\/(premium-lesson-audio|ai-tutor-session|ai-tutor-evaluate|ai-case-feedback|webrtc-signal)(?:\?|$)/,route=>route.abort('blockedbyclient'));
  await page.goto('/');
  await page.getByLabel('E-mail').fill(e2eEmail);
  await page.getByLabel('Senha').fill(e2ePassword);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByTestId('active-learner-card')).toBeVisible();
}

test('unauthenticated V2 entry is protected by the secure AuthGate',async({page})=>{
  await page.goto('/');
  await expect(page).toHaveTitle(/Learning Hub V2/);
  await expect(page.getByText('Learning Hub',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('heading',{name:'Enter Learning Hub',exact:true})).toBeVisible();
  await expect(page.getByLabel('E-mail')).toBeVisible();
  await expect(page.getByLabel('Senha')).toBeVisible();
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
});

test('Manuzinha standalone play space stays isolated from adult learning surfaces',async({page})=>{
  await page.goto('/?manuzinha=1');
  await expect(page.getByRole('dialog',{name:'Manuzinha'})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Hi, Manuzinha!/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Animals/})).toBeVisible();
  await expect(page.getByRole('button',{name:'Grown-ups',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Enter Learning Hub',exact:true})).toHaveCount(0);
  await expect(page.getByTestId('active-learner-card')).toHaveCount(0);
});

test.describe('authenticated Learning Hub shell',()=>{
  test.skip(!authenticatedFixtureAvailable,'Dedicated E2E_EMAIL/E2E_PASSWORD fixture required. E2E_REQUIRE_AUTH=1 forbids a silent skip.');

  test('V2 shell and British premium identity load',async({page})=>{
    await signIn(page);
    await expect(page.getByText('Your learning command centre')).toBeVisible();
    for(const name of ['Finance Ireland','Irish Payroll','English Academy'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
    await expect(page.getByTestId('adaptive-priority-stack')).toBeVisible();
    const palette=await page.evaluate(()=>{const css=getComputedStyle(document.documentElement);return {navy:css.getPropertyValue('--brit-navy-900').trim(),royal:css.getPropertyValue('--brit-royal').trim(),red:css.getPropertyValue('--brit-red').trim(),white:css.getPropertyValue('--brit-white').trim()};});
    expect(palette).toEqual({navy:'#071b3d',royal:'#214f9d',red:'#c7203f',white:'#fbfcff'});
  });

  test('signed-in Finance fixture keeps its account identity and hidden legacy selector',async({page})=>{
    await signIn(page);
    await expect(page.getByTestId('active-learner-card')).toContainText('Rafael');
    await expect(page.getByRole('button',{name:'Continue Finance',exact:true})).toBeVisible();
    await expect(page.locator('.learner-switch')).toBeHidden();
    await expect(page.getByTestId('account-preview-notice')).toHaveCount(0);
    await page.getByRole('button',{name:'Sair',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Enter Learning Hub',exact:true})).toBeVisible();
    await expect(page.getByTestId('active-learner-card')).toHaveCount(0);
  });

  test('Adaptive Curriculum, Error Bank and English Academy are visible product surfaces',async({page})=>{
    await signIn(page);
    await expect(page.getByTestId('adaptive-priority-stack')).toContainText(/priority/i);
    await page.getByRole('button',{name:'Open Error Bank →',exact:true}).click();
    await expect(page.getByTestId('error-bank-view')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Recurring mistakes become future curriculum'})).toBeVisible();
    await page.getByRole('button',{name:/English Academy/}).first().click();
    await expect(page.getByTestId('english-academy-view')).toBeVisible();
    await expect(page.getByText(/40 \/ 40 \/ 20/)).toBeVisible();
    await expect(page.getByText(/General English first/i)).toBeVisible();
  });

  test('Golden Lesson stays open while switching tabs',async({page})=>{
    await signIn(page);
    await page.getByRole('button',{name:/Continue Finance/i}).click();
    const lesson=page.getByTestId('lesson-shell');
    await expect(lesson).toBeVisible();
    await expect(lesson.getByRole('heading',{name:'IFRS 18, Group Reporting & Irish Statutory Accounts',exact:true})).toBeVisible();
    for(const tab of ['Audio','English','Practice','Case','Test','Professor']){
      await page.getByRole('tab',{name:tab,exact:true}).click();
      await expect(lesson).toBeVisible();
      await expect(page.getByRole('tab',{name:tab,exact:true})).toHaveAttribute('aria-selected','true');
    }
  });

  test('Premium Audio is on-demand and cannot kick learner out of lesson',async({page})=>{
    await signIn(page);
    await page.getByRole('button',{name:/Continue Finance/i}).click();
    await page.getByRole('tab',{name:'Audio',exact:true}).click();
    await expect(page.getByTestId('premium-audio-panel')).toBeVisible();
    await expect(page.getByRole('button',{name:'Load audio',exact:true})).toBeVisible();
    await page.getByRole('tab',{name:'English',exact:true}).click();
    await expect(page.getByTestId('lesson-shell')).toBeVisible();
    await expect(page.getByRole('tab',{name:'English',exact:true})).toHaveAttribute('aria-selected','true');
  });

  test('English Academy is general plus professional, not business-only',async({page})=>{
    await signIn(page);
    await page.getByRole('button',{name:/Start English practice/i}).click();
    await expect(page.getByTestId('lesson-shell')).toBeVisible();
    await expect(page.getByText(/Tell a story naturally/i).first()).toBeVisible();
    await page.getByRole('tab',{name:'Audio',exact:true}).click();
    await expect(page.getByTestId('premium-audio-panel')).toBeVisible();
    await expect(page.getByRole('button',{name:'Load audio',exact:true})).toBeVisible();
    await page.getByRole('tab',{name:'Professor',exact:true}).click();
    await expect(page.getByTestId('professor-session-panel')).toBeVisible();
    await expect(page.getByText(/British \+ American English with deliberate Irish exposure/i)).toBeVisible();
  });

  test('core navigation remains stable across revision, performance and Professor',async({page})=>{
    await signIn(page);
    await page.getByRole('button',{name:/Revision/}).click();
    await expect(page.getByRole('heading',{name:'Review what is most likely to be forgotten'})).toBeVisible();
    await page.getByRole('button',{name:/Performance/}).click();
    await expect(page.getByRole('heading',{name:'Readiness by capability, not course completion'})).toBeVisible();
    await page.getByRole('button',{name:/Professor/}).first().click();
    await expect(page.getByRole('heading',{name:'Natural voice. Persistent context. Independent evaluation.'})).toBeVisible();
    await page.getByRole('button',{name:/Dashboard/}).click();
    await expect(page.getByText('Your learning command centre')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test('production shell loads with Learning Hub branding', async ({page})=>{
  await page.goto('/');
  await expect(page).toHaveTitle(/Learning Hub/);
  await expect(page.getByRole('heading',{name:'Learning Hub'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Entrar'})).toBeVisible();
});

test('isolated AI lab loads without touching production shell', async ({page})=>{
  await page.goto('/lab/');
  await expect(page.getByRole('heading',{name:'Learning Hub — AI Lab'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Entrar no laboratório'})).toBeVisible();
});

test('authenticated learner can open a lesson and remain inside it', async ({page})=>{
  const email=process.env.LH_TEST_EMAIL;
  const password=process.env.LH_TEST_PASSWORD;
  test.skip(!email||!password,'Set LH_TEST_EMAIL and LH_TEST_PASSWORD to enable authenticated regression testing.');

  await page.goto('/');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#authSubmit').click();
  await expect(page.locator('#appShell')).toBeVisible({timeout:15000});
  await page.getByRole('button',{name:'Continuar aula'}).click();
  await expect(page.locator('.lesson-tabs')).toBeVisible({timeout:15000});
  await expect(page.locator('[data-ltab="notes"]')).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.locator('.lesson-tabs')).toBeVisible();
  await expect(page.locator('#pageEyebrow')).toHaveText('PREMIUM LESSON');
});

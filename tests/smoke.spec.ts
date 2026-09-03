import { expect, test } from '@playwright/test';

test('V2 shell and British premium identity load', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Learning Hub V2/);
  await expect(page.getByText('Learning Hub', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Your learning command centre')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Finance Ireland', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Irish Payroll', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'English Academy', exact: true })).toBeVisible();

  const palette = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return {
      navy: css.getPropertyValue('--brit-navy-900').trim(),
      royal: css.getPropertyValue('--brit-royal').trim(),
      red: css.getPropertyValue('--brit-red').trim(),
      white: css.getPropertyValue('--brit-white').trim(),
    };
  });
  expect(palette).toEqual({
    navy: '#071b3d',
    royal: '#214f9d',
    red: '#c7203f',
    white: '#fbfcff',
  });
});

test('Golden Lesson stays open while switching tabs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue Finance/i }).click();
  const lesson = page.getByTestId('lesson-shell');
  await expect(lesson).toBeVisible();
  await expect(lesson.getByRole('heading', { name: 'IFRS 18, Group Reporting & Irish Statutory Accounts', exact: true })).toBeVisible();

  for (const tab of ['Audio', 'English', 'Practice', 'Case', 'Test', 'Professor']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(lesson).toBeVisible();
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
  }
});

test('Premium Audio is on-demand and cannot kick learner out of lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue Finance/i }).click();
  const lesson = page.getByTestId('lesson-shell');
  await page.getByRole('tab', { name: 'Audio', exact: true }).click();

  await expect(page.getByTestId('premium-audio-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load audio', exact: true })).toBeVisible();
  await expect(lesson).toBeVisible();

  // Do not click the button in smoke tests: no AI/API spend is needed to prove UI isolation.
  await page.getByRole('tab', { name: 'English', exact: true }).click();
  await page.waitForTimeout(500);
  await expect(lesson).toBeVisible();
  await expect(page.getByRole('tab', { name: 'English', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('English Academy is general plus professional, not business-only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Start English practice/i }).click();
  await expect(page.getByTestId('lesson-shell')).toBeVisible();
  await expect(page.getByText(/Tell a story naturally/i).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Audio', exact: true }).click();
  await expect(page.getByText(/does not yet have a published lesson record/i)).toBeVisible();
  await page.getByRole('tab', { name: 'Professor', exact: true }).click();
  await expect(page.getByText(/Natural UK\/US conversation with Irish exposure/i)).toBeVisible();
});

test('core navigation remains stable across revision, performance and Professor', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Revision', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review what is most likely to be forgotten' })).toBeVisible();

  await page.getByRole('button', { name: 'Performance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Readiness by capability, not course completion' })).toBeVisible();

  await page.getByRole('button', { name: 'Professor', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Natural voice. Persistent context. Independent evaluation.' })).toBeVisible();

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('Your learning command centre')).toBeVisible();
});

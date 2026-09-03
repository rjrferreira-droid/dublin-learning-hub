import { expect, test } from '@playwright/test';

test('V2 shell and British premium identity load', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Learning Hub V2/);
  await expect(page.getByText('Learning Hub', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Your learning command centre')).toBeVisible();
  await expect(page.getByText('Finance Ireland')).toBeVisible();
  await expect(page.getByText('Irish Payroll')).toBeVisible();
  await expect(page.getByText('English Academy')).toBeVisible();
});

test('Golden Lesson stays open while switching tabs', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Continue Finance/i }).click();
  await expect(page.getByTestId('lesson-shell')).toBeVisible();
  await expect(page.getByText('IFRS 18, Group Reporting & Irish Statutory Accounts')).toBeVisible();

  for (const tab of ['Audio', 'English', 'Practice', 'Case', 'Test', 'Professor']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.getByTestId('lesson-shell')).toBeVisible();
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true');
  }
});

test('English Academy is general plus professional, not business-only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Start English practice/i }).click();
  await expect(page.getByTestId('lesson-shell')).toBeVisible();
  await expect(page.getByText(/Tell a story naturally/i).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Professor', exact: true }).click();
  await expect(page.getByText(/Natural UK\/US conversation with Irish exposure/i)).toBeVisible();
});
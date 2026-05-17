import { test, expect } from '@playwright/test';

const TABS = ['Workouts', 'Meditate', 'Check-in', 'Settings'] as const;

test('renders all four tabs and switches between them', async ({ page }) => {
  await page.goto('/');

  for (const label of TABS) {
    await expect(page.getByRole('tab', { name: label })).toBeVisible();
  }

  for (const label of TABS) {
    await page.getByRole('tab', { name: label }).click();
    await expect(page.getByRole('tab', { name: label })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
  }
});

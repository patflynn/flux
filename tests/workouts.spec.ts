import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  // Clear IndexedDB before each test so we always start at day 1 with no log.
  await context.clearCookies();
});

test('renders current phase, week, day and exercises', async ({ page }) => {
  await page.goto('/');
  // Wipe any prior IDB state from previous test runs (shared browser context).
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('flux-db');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  await page.reload();

  await expect(page.getByTestId('day-counter')).toHaveText('1');
  await expect(page.getByTestId('phase-name')).toContainText('Structural Integrity');
  await expect(page.getByTestId('workout-name')).toBeVisible();
  await expect(page.getByTestId('exercises-list')).toBeVisible();
});

test('logs a set and persists it across reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('flux-db');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  await page.reload();

  // Day 1 workout A — exercise index 3 is the first weighted one (KB Gorilla Rows).
  await page.getByTestId('weight-3').fill('30');
  await page.getByTestId('done-3').click();

  await expect(page.getByTestId('done-3')).toContainText('Done');
  // Reload and verify state survives.
  await page.reload();

  await expect(page.getByTestId('weight-3')).toHaveValue('30');
  await expect(page.getByTestId('done-3')).toContainText('Done');
});

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Workouts tests need a program loaded. Since programs are runtime data
// (no bundled default), seed via the import flow with a fixture that
// references catalog ids and intentionally omits a state field so the
// importer leaves globalDay at the default.
const PROGRAM_FIXTURE = join(__dirname, 'fixtures', 'test-program.json');

async function resetAndSeedProgram(page: import('@playwright/test').Page) {
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
  await page.getByTestId('import-program-btn').waitFor();
  // Backup import lives in the Settings tab now — seed via Settings, then
  // switch back to Workouts so the tab re-mounts and reloads from IDB.
  await page.locator('[data-tab="settings"]').click();
  await page.getByTestId('import-input').setInputFiles(PROGRAM_FIXTURE);
  await expect(page.getByTestId('import-message')).toContainText('Imported');
  await page.locator('[data-tab="workouts"]').click();
  await expect(page.getByTestId('workout-name')).toBeVisible();
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('renders current phase, week, day and exercises', async ({ page }) => {
  await resetAndSeedProgram(page);

  await expect(page.getByTestId('day-counter')).toHaveText('1');
  await expect(page.getByTestId('phase-name')).toContainText('Structural Integrity');
  await expect(page.getByTestId('workout-name')).toBeVisible();
  await expect(page.getByTestId('exercises-list')).toBeVisible();
});

test('logs a set and persists it across reload', async ({ page }) => {
  await resetAndSeedProgram(page);

  // Day 1 workout A — exercise index 3 is the first weighted one (KB Gorilla Rows).
  await page.getByTestId('weight-3').fill('30');
  await page.getByTestId('done-3').click();

  await expect(page.getByTestId('done-3')).toContainText('Done');
  // Reload and verify state survives.
  await page.reload();

  await expect(page.getByTestId('weight-3')).toHaveValue('30');
  await expect(page.getByTestId('done-3')).toContainText('Done');
});

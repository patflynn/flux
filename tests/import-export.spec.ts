import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, 'fixtures', 'legacy-export.json');

test('imports a legacy export file and exposes history', async ({ page }) => {
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

  // Backup import lives on the Settings tab now.
  await page.locator('[data-tab="settings"]').click();
  await page.getByTestId('import-input').setInputFiles(FIXTURE_PATH);
  await expect(page.getByTestId('import-message')).toContainText('Imported');

  // Switch back to Workouts — re-mount reloads state/log/program from IDB.
  await page.locator('[data-tab="workouts"]').click();

  // The fixture's state.globalDay is 8. After import we should land there.
  await expect(page.getByTestId('day-counter')).toHaveText('8');

  // Day 8 in phase 1 maps to schedule index (8 - 1) % 7 = 0 → workout A.
  // The fixture logged KB Gorilla Rows at 30lbs on day 8. The weight input
  // for the corresponding exercise (index 3 in workout A) should show 30.
  await expect(page.getByTestId('weight-3')).toHaveValue('30');
});

test('exports a payload matching the legacy schema', async ({ page }) => {
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

  // Seed via the import flow first — both buttons live in Settings.
  await page.locator('[data-tab="settings"]').click();
  await page.getByTestId('import-input').setInputFiles(FIXTURE_PATH);
  await expect(page.getByTestId('import-message')).toContainText('Imported');

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-btn').click();
  const download = await downloadPromise;

  const path = await download.path();
  const contents = JSON.parse(readFileSync(path!, 'utf-8'));

  expect(contents).toHaveProperty('log');
  expect(contents).toHaveProperty('state');
  expect(contents.state).toHaveProperty('globalDay', 8);
  expect(contents.state).toHaveProperty('currentPhase', 'p1');
  expect(Object.keys(contents.log).length).toBeGreaterThanOrEqual(4);

  // Verify a known log entry survived the round trip with its legacy keys intact.
  const day1Row = contents.log['1_3'];
  expect(day1Row).toBeDefined();
  expect(day1Row.exercise).toBe('KB Gorilla Rows');
  expect(day1Row.weight).toBe(25);
  expect(day1Row.completed).toBe(true);
});

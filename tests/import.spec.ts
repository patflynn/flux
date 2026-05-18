import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

const BARE_PROGRAM = join(fixtures, 'program-bare.json');
const BACKUP_NO_PROGRAM = join(fixtures, 'backup-no-program.json');
const LEGACY_EXPORT = join(fixtures, 'legacy-export.json');

async function resetAndLoad(page: import('@playwright/test').Page) {
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
}

test('empty-state CTA accepts a bare program JSON', async ({ page }) => {
  await resetAndLoad(page);

  await page
    .getByTestId('import-program-input')
    .setInputFiles(BARE_PROGRAM);

  await expect(page.getByTestId('workout-name')).toBeVisible();
  await expect(page.getByTestId('phase-name')).toContainText('Phase 1: Bare');
  await expect(page.getByTestId('import-message')).toContainText(
    'Program loaded',
  );

  // The bare-program importer must not touch the log store.
  const logCount = await page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      const req = indexedDB.open('flux-db');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('log', 'readonly');
        const countReq = tx.objectStore('log').count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    });
  });
  expect(logCount).toBe(0);
});

test('empty-state CTA extracts program field from a backup envelope', async ({
  page,
}) => {
  await resetAndLoad(page);

  await page
    .getByTestId('import-program-input')
    .setInputFiles(LEGACY_EXPORT);

  await expect(page.getByTestId('workout-name')).toBeVisible();
  await expect(page.getByTestId('phase-name')).toContainText(
    'Structural Integrity',
  );
  // Day counter stays at the default — the program importer does not touch state.
  await expect(page.getByTestId('day-counter')).toHaveText('1');

  // No log entries either.
  const logCount = await page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      const req = indexedDB.open('flux-db');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('log', 'readonly');
        const countReq = tx.objectStore('log').count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(-1);
      };
      req.onerror = () => resolve(-1);
    });
  });
  expect(logCount).toBe(0);
});

test('empty-state CTA rejects a no-program envelope with a helpful message', async ({
  page,
}) => {
  await resetAndLoad(page);

  await page
    .getByTestId('import-program-input')
    .setInputFiles(BACKUP_NO_PROGRAM);

  await expect(page.getByTestId('import-message')).toContainText(
    'No program in this file',
  );
  await expect(page.getByTestId('import-message')).toContainText(
    'Import Backup button',
  );
  // Empty-state must still be showing — no program was loaded.
  await expect(page.getByTestId('no-program')).toBeVisible();
});

test('toolbar Import Backup label is visible and surfaces guidance for no-program backups', async ({
  page,
}) => {
  await resetAndLoad(page);

  await expect(page.getByTestId('import-backup-label')).toContainText(
    'Import Backup',
  );

  await page.getByTestId('import-input').setInputFiles(BACKUP_NO_PROGRAM);

  // imported > 0 (the fixture has log entries) and programApplied = false →
  // guidance message points the user at the per-tab Import Program File CTA.
  await expect(page.getByTestId('import-message')).toContainText('Imported');
  await expect(page.getByTestId('import-message')).toContainText(
    'still need to load a program',
  );
  // State was applied, so day counter reflects the fixture's globalDay.
  await expect(page.getByTestId('day-counter')).toHaveText('8');
  // No program loaded → empty state still visible.
  await expect(page.getByTestId('no-program')).toBeVisible();
});

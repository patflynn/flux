import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { EXERCISE_CATALOG } from '../src/data/exerciseCatalog';
import {
  allowedWeightsForExercise,
  isExerciseSupportedByInventory,
} from '../src/tabs/Workouts/logic/equipmentResolve';
import type { Inventory } from '../src/data/inventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
  await page.locator('[data-tab="settings"]').click();
  await page.getByTestId('import-input').setInputFiles(PROGRAM_FIXTURE);
  await expect(page.getByTestId('backup-import-message')).toContainText('Imported');
}

async function configureKettlebellWeights(
  page: import('@playwright/test').Page,
  weights: number[],
) {
  await page.locator('[data-tab="settings"]').click();
  await page.getByTestId('equipment-toggle-kettlebell').click();
  for (const w of weights) {
    await page.getByTestId('equipment-weight-input-kettlebell').fill(String(w));
    await page.getByTestId('equipment-weight-add-kettlebell').click();
  }
}

test.describe('inventory resolver unit tests', () => {
  test('allowedWeightsForExercise returns null when exercise has no weight', () => {
    const ex = EXERCISE_CATALOG['warmup-band-pull-aparts'];
    expect(allowedWeightsForExercise(ex, {})).toBeNull();
  });

  test('allowedWeightsForExercise returns [] when required equipment is missing', () => {
    const ex = EXERCISE_CATALOG['kettlebell-swings'];
    expect(allowedWeightsForExercise(ex, {})).toEqual([]);
  });

  test('allowedWeightsForExercise returns owned weights sorted ascending and deduped', () => {
    const ex = EXERCISE_CATALOG['kettlebell-swings'];
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [35, 25, 25, 45] },
    };
    expect(allowedWeightsForExercise(ex, inv)).toEqual([25, 35, 45]);
  });

  test('allowedWeightsForExercise unions primary + alternative owned weights', () => {
    // KB Gorilla Rows: required ['kettlebell'], alternatives [['dumbbell']].
    const ex = EXERCISE_CATALOG['kb-gorilla-rows'];
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [25, 35] },
      dumbbell: { kind: 'dumbbell', ownedWeights: [30, 35] },
    };
    expect(allowedWeightsForExercise(ex, inv)).toEqual([25, 30, 35]);
  });

  test('isExerciseSupportedByInventory honors equipmentAlternatives', () => {
    const ex = EXERCISE_CATALOG['kb-gorilla-rows'];
    expect(isExerciseSupportedByInventory(ex, {})).toBe(false);
    expect(
      isExerciseSupportedByInventory(ex, {
        dumbbell: { kind: 'dumbbell', ownedWeights: [30] },
      }),
    ).toBe(true);
  });

  test('isExerciseSupportedByInventory treats bodyweight as always owned', () => {
    const ex = EXERCISE_CATALOG['90-90-hip-switch'];
    expect(isExerciseSupportedByInventory(ex, {})).toBe(true);
  });

  test('allowedWeightsForExercise ignores hasWeightSelection=false equipment', () => {
    // hanging-knee-raises requires pullup-bar (hasWeightSelection=false) but
    // usesWeight=false anyway, so we get null. Force the test via swings.
    const ex = EXERCISE_CATALOG['kettlebell-swings'];
    const inv: Inventory = {
      kettlebell: { kind: 'kettlebell', ownedWeights: [25] },
      'pullup-bar': { kind: 'pullup-bar', ownedWeights: [] },
    };
    expect(allowedWeightsForExercise(ex, inv)).toEqual([25]);
  });
});

test.describe('inventory e2e', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('first-run fallback: empty inventory keeps free-input picker', async ({
    page,
  }) => {
    await resetAndSeedProgram(page);
    await page.locator('[data-tab="workouts"]').click();
    await expect(page.getByTestId('weight-3')).toBeVisible();
    // No drift banner with empty inventory.
    await expect(page.locator('[data-testid^="inventory-drift-"]')).toHaveCount(0);
  });

  test('configured inventory shows chip strip and constrains + / − stepping', async ({
    page,
  }) => {
    await resetAndSeedProgram(page);
    await configureKettlebellWeights(page, [25, 35, 45]);
    await page.locator('[data-tab="workouts"]').click();

    // Goblet squats is index 2 in workout A.
    await expect(page.getByTestId('weight-chips-2')).toBeVisible();
    await expect(page.getByTestId('weight-2')).toHaveCount(0);

    // Chips appear for each owned weight.
    await expect(page.getByTestId('weight-chip-2-25')).toBeVisible();
    await expect(page.getByTestId('weight-chip-2-35')).toBeVisible();
    await expect(page.getByTestId('weight-chip-2-45')).toBeVisible();

    // Pick 25, then step up twice (25 → 35 → 45) and one more step stays at 45.
    await page.getByTestId('weight-chip-2-25').click();
    await expect(
      page.getByTestId('weight-chip-2-25'),
    ).toHaveAttribute('aria-pressed', 'true');

    const inc = page.locator('[data-exercise-index="2"] button[aria-label="Increase weight"]');
    await inc.click();
    await expect(
      page.getByTestId('weight-chip-2-35'),
    ).toHaveAttribute('aria-pressed', 'true');
    await inc.click();
    await expect(
      page.getByTestId('weight-chip-2-45'),
    ).toHaveAttribute('aria-pressed', 'true');
    await inc.click();
    await expect(
      page.getByTestId('weight-chip-2-45'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('drift: removing an owned weight still renders the logged value', async ({
    page,
  }) => {
    await resetAndSeedProgram(page);
    await configureKettlebellWeights(page, [25, 35, 45]);

    // Log 25 on goblet squats.
    await page.locator('[data-tab="workouts"]').click();
    await page.getByTestId('weight-chip-2-25').click();

    // Back to Settings, remove the 25 chip.
    await page.locator('[data-tab="settings"]').click();
    await page.getByTestId('equipment-chip-remove-kettlebell-25').click();

    // Revisit Workouts — the 25 still renders for the drift entry.
    await page.locator('[data-tab="workouts"]').click();
    await expect(page.getByTestId('weight-chip-2-25')).toBeVisible();
    await expect(page.getByTestId('weight-chip-2-25')).toHaveAttribute(
      'data-drift',
      'true',
    );

    // Other owned weights remain.
    await expect(page.getByTestId('weight-chip-2-35')).toBeVisible();
    await expect(page.getByTestId('weight-chip-2-45')).toBeVisible();
  });

  test('drift banner shows when required equipment is missing', async ({ page }) => {
    await resetAndSeedProgram(page);

    // Configure a non-relevant kind (so inventoryConfigured is true) but no kettlebell.
    await page.locator('[data-tab="settings"]').click();
    await page.getByTestId('equipment-toggle-dumbbell').click();
    await page.getByTestId('equipment-weight-input-dumbbell').fill('30');
    await page.getByTestId('equipment-weight-add-dumbbell').click();

    // Now toggle dumbbell back off — but keep at least one kind configured.
    // Actually we want kettlebell missing but inventory configured: dumbbell with 30 satisfies kb-gorilla-rows (alt)
    // and goblet-squats (alt). So no drift banner expected for those.
    // Force a real drift: kettlebell-swings only allows kettlebell.
    await page.locator('[data-tab="workouts"]').click();

    // kettlebell-swings is index 4 in workout A.
    // Since we own dumbbell (30) but not kettlebell, and swings has no
    // alternative, the drift banner should render.
    await expect(page.getByTestId('inventory-drift-4')).toBeVisible();
    await expect(page.getByTestId('inventory-drift-4')).toContainText(
      'kettlebell',
    );
  });

  test('export/import round-trips inventory', async ({ page }) => {
    await resetAndSeedProgram(page);
    await configureKettlebellWeights(page, [25, 35, 45]);

    // Trigger export and capture file contents.
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-btn').click();
    const download = await downloadPromise;
    const path = await download.path();
    const contents = JSON.parse(readFileSync(path!, 'utf-8'));

    expect(contents.locations).toBeDefined();
    const inv =
      contents.locations.locations[contents.locations.activeLocationId].inventory;
    expect(inv.kettlebell.ownedWeights).toEqual([25, 35, 45]);

    // Wipe DB, reload, import the exported payload, verify chips restored.
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('flux-db');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.reload();
    await page.locator('[data-tab="settings"]').click();
    await page
      .getByTestId('import-input')
      .setInputFiles({ name: 'export.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(contents)) });
    await expect(page.getByTestId('backup-import-message')).toContainText(
      'Inventory restored',
    );

    // Settings reflects restored weights.
    await expect(page.getByTestId('equipment-chip-kettlebell-25')).toBeVisible();
    await expect(page.getByTestId('equipment-chip-kettlebell-35')).toBeVisible();
    await expect(page.getByTestId('equipment-chip-kettlebell-45')).toBeVisible();

    // Workouts uses the chips again.
    await page.locator('[data-tab="workouts"]').click();
    await expect(page.getByTestId('weight-chips-2')).toBeVisible();
  });
});

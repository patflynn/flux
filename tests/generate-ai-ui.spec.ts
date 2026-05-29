import { test, expect } from '@playwright/test';

// Helpers ---------------------------------------------------------------------

async function freshApp(page: import('@playwright/test').Page) {
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
  await page.locator('[data-tab="workouts"]').click();
  await page.getByTestId('no-program').waitFor();
}

// A program that uses only catalog ids (we use bodyweight ones so the
// empty inventory we ship with passes validation cleanly).
const FAKE_PROGRAM = {
  meta: {
    startDate: '2026-06-01',
    version: 'ui-fake-1',
    principles: [
      'injury_prevention',
      'mobility_every_phase',
      'form_over_load',
      'longevity_focus',
    ],
    constraints: { mobility_required: true, min_mobility_days_per_week: 1 },
  },
  phases: [
    {
      id: 'p1',
      name: 'Generated Phase',
      duration_weeks: 4,
      schedule_pattern: ['Mobility', 'Mobility', 'Mobility', 'Mobility', 'Mobility', 'Mobility', 'Rest'],
      workouts: {
        Mobility: {
          name: 'Mobility & Flow',
          focus: 'mobility',
          exercises: [
            {
              exercise_id: 'cat-cow-spinal-flow',
              sets: 2,
              reps: '10',
              rest: '30s',
            },
            {
              exercise_id: 'thread-the-needle',
              sets: 2,
              reps: '8 each side',
              rest: '30s',
            },
          ],
        },
      },
    },
  ],
};

async function installFakeProvider(
  page: import('@playwright/test').Page,
  responseJson: unknown,
) {
  await page.evaluate((payload) => {
    const fn = (window as unknown as {
      flux_test_configureLLM?: (p: {
        id: string;
        available: boolean;
        generate: (opts: unknown) => Promise<string>;
      }) => void;
    }).flux_test_configureLLM;
    if (!fn) throw new Error('flux_test_configureLLM not exposed');
    fn({
      id: 'fake-ui',
      available: true,
      async generate() {
        return JSON.stringify(payload);
      },
    });
  }, responseJson);
}

// Tests -----------------------------------------------------------------------

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('with no LLM available, generate button is disabled and tooltip points to Settings', async ({
  page,
}) => {
  await freshApp(page);
  const btn = page.getByTestId('generate-ai-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toBeDisabled();
  await expect(btn).toHaveAttribute(
    'title',
    /Configure an LLM provider in Settings/i,
  );
});

test('with a mocked provider, generate flow opens modal, generates, reviews, and saves', async ({
  page,
}) => {
  await freshApp(page);
  await installFakeProvider(page, FAKE_PROGRAM);

  const btn = page.getByTestId('generate-ai-btn');
  await expect(btn).toBeEnabled();
  await btn.click();

  await expect(page.getByTestId('generate-ai-modal')).toBeVisible();
  await page.getByTestId('generate-ai-request').fill('Mobility-only phase');

  await page.getByTestId('generate-ai-submit').click();
  await expect(page.getByTestId('generate-ai-review')).toBeVisible();

  // No warnings expected — the program uses bodyweight exercises only.
  await expect(
    page.locator('[data-testid^="generate-ai-warning-"]'),
  ).toHaveCount(0);

  await page.getByTestId('generate-ai-save').click();

  // Workouts tab transitions to the loaded-program state.
  await expect(page.getByTestId('no-program')).toHaveCount(0);
  await expect(page.getByTestId('workout-name')).toContainText('Mobility & Flow');
  await expect(page.getByTestId('phase-name')).toContainText('Generated Phase');
});

test('warnings render on the review screen when the program references unsupported equipment', async ({
  page,
}) => {
  await freshApp(page);

  // Program references kettlebell-swings but the user has no kettlebell.
  const driftProgram = {
    ...FAKE_PROGRAM,
    phases: [
      {
        ...FAKE_PROGRAM.phases[0],
        workouts: {
          ...FAKE_PROGRAM.phases[0].workouts,
          Strength: {
            name: 'Strength A',
            focus: 'lower',
            exercises: [
              {
                exercise_id: 'kettlebell-swings',
                sets: 3,
                reps: '15',
                rest: '60s',
              },
            ],
          },
        },
      },
    ],
  };

  await installFakeProvider(page, driftProgram);

  await page.getByTestId('generate-ai-btn').click();
  await page.getByTestId('generate-ai-request').fill('A phase, please');
  await page.getByTestId('generate-ai-submit').click();

  await expect(page.getByTestId('generate-ai-review')).toBeVisible();
  await expect(page.getByTestId('generate-ai-warning-0')).toBeVisible();
  await expect(page.getByTestId('generate-ai-warning-0')).toContainText(
    /kettlebell/i,
  );
});

test('non-JSON provider response shows the error screen with a retry option', async ({
  page,
}) => {
  await freshApp(page);
  await page.evaluate(() => {
    const fn = (window as unknown as {
      flux_test_configureLLM?: (p: {
        id: string;
        available: boolean;
        generate: (opts: unknown) => Promise<string>;
      }) => void;
    }).flux_test_configureLLM;
    if (!fn) throw new Error('flux_test_configureLLM not exposed');
    fn({
      id: 'fake-bad',
      available: true,
      async generate() {
        return 'not json';
      },
    });
  });

  await page.getByTestId('generate-ai-btn').click();
  await page.getByTestId('generate-ai-request').fill('anything');
  await page.getByTestId('generate-ai-submit').click();

  await expect(page.getByTestId('generate-ai-error')).toBeVisible();
  await expect(page.getByTestId('generate-ai-error')).toContainText(
    /non-JSON/i,
  );
  await expect(page.getByTestId('generate-ai-retry')).toBeVisible();
});

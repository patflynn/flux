// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Flux PWA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads without errors', async ({ page }) => {
    // Check no console errors
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('displays header with day counter', async ({ page }) => {
    await expect(page.locator('header h1')).toContainText('FLUX');
    await expect(page.locator('#day-counter')).toContainText('DAY');
    await expect(page.locator('#current-day')).toContainText('1');
  });

  test('shows workout card for Day 1', async ({ page }) => {
    await expect(page.locator('#workout-card')).toBeVisible();
    await expect(page.locator('#workout-name')).toContainText('Posterior Chain');
    await expect(page.locator('#rest-day')).toBeHidden();
  });

  test('displays exercises with required structure', async ({ page }) => {
    const exercises = page.locator('.exercise');

    // Should have at least one exercise
    const count = await exercises.count();
    expect(count).toBeGreaterThan(0);

    // Each exercise should have name, sets, and reps displayed
    for (let i = 0; i < count; i++) {
      const exercise = exercises.nth(i);
      await expect(exercise.locator('.exercise-name')).toBeVisible();
      await expect(exercise.locator('.exercise-details')).toContainText(/\d+\s*sets/i);
      await expect(exercise.locator('.exercise-details')).toContainText(/reps|mins|s\b/i);
    }
  });

  test('video button opens modal', async ({ page }) => {
    const videoBtn = page.locator('.video-btn').first();
    await expect(videoBtn).toBeEnabled();

    await videoBtn.click();

    await expect(page.locator('#video-modal')).toBeVisible();
    await expect(page.locator('#video-container iframe')).toBeVisible();
  });

  test('video modal closes on X button', async ({ page }) => {
    await page.locator('.video-btn').first().click();
    await expect(page.locator('#video-modal')).toBeVisible();

    await page.locator('#close-modal').click();
    await expect(page.locator('#video-modal')).toBeHidden();
  });

  test('weight input saves to localStorage', async ({ page }) => {
    const weightInput = page.locator('.weight-field').first();
    await weightInput.fill('35');

    // Check localStorage
    const log = await page.evaluate(() => localStorage.getItem('basement_lab_log'));
    expect(log).toContain('35');
  });

  test('complete button advances day', async ({ page }) => {
    await expect(page.locator('#current-day')).toContainText('1');

    await page.locator('#complete-btn').click();

    await expect(page.locator('#current-day')).toContainText('2');
  });

  test('state persists after reload', async ({ page }) => {
    // Advance to day 2
    await page.locator('#complete-btn').click();
    await expect(page.locator('#current-day')).toContainText('2');

    // Reload
    await page.reload();

    // Should still be day 2
    await expect(page.locator('#current-day')).toContainText('2');
  });

  test('reset button clears progress', async ({ page }) => {
    // Advance a few days
    await page.locator('#complete-btn').click();
    await page.locator('#complete-btn').click();
    await expect(page.locator('#current-day')).toContainText('3');

    // Handle confirm dialog
    page.on('dialog', dialog => dialog.accept());

    await page.locator('#reset-btn').click();

    await expect(page.locator('#current-day')).toContainText('1');
  });

  test('shows rest day on day 6', async ({ page }) => {
    // Advance to day 6 (schedule: A, B, A, B, C, Rest, Rest)
    for (let i = 0; i < 5; i++) {
      await page.locator('#complete-btn').click();
    }

    await expect(page.locator('#current-day')).toContainText('6');
    await expect(page.locator('#rest-day')).toBeVisible();
    await expect(page.locator('#workout-card')).toBeHidden();
  });

  test('applies dark mode background', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('basement_lab_mode', 'dark'));
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');

    // Whatever the exact color, dark mode should be visibly darker than light text.
    // Parse the rgb() and ensure the bg luminance is well below the text luminance.
    const { bg, fg } = await page.locator('body').evaluate(el => ({
      bg: getComputedStyle(el).backgroundColor,
      fg: getComputedStyle(el).color,
    }));
    const lum = s => {
      const m = s.match(/\d+/g);
      return m ? (parseInt(m[0]) + parseInt(m[1]) + parseInt(m[2])) / 3 : 0;
    };
    expect(lum(bg)).toBeLessThan(lum(fg));
    expect(lum(bg)).toBeLessThan(80);
  });

  test('done button marks exercise complete and expands feedback', async ({ page }) => {
    const doneBtn = page.locator('.done-btn').first();
    const feedbackContent = page.locator('.feedback-content').first();
    const exerciseCard = page.locator('.exercise').first();

    // Initially collapsed and not completed
    await expect(feedbackContent).toBeHidden();
    await expect(doneBtn).toContainText('DONE');

    // Click DONE to complete and expand feedback
    await doneBtn.click();
    await expect(feedbackContent).toBeVisible();
    await expect(doneBtn).toContainText(/✓ DONE/);
    await expect(exerciseCard).toHaveClass(/completed/);

    // Click again to undo completion
    await doneBtn.click();
    await expect(feedbackContent).toBeHidden();
    await expect(exerciseCard).not.toHaveClass(/completed/);
    await expect(doneBtn).not.toContainText(/✓/);
  });

  test('difficulty buttons can be selected', async ({ page }) => {
    // Mark exercise done to expand feedback section
    await page.locator('.done-btn').first().click();

    const difficultyButtons = page.locator('.difficulty-buttons').first();
    const hardBtn = difficultyButtons.locator('[data-difficulty="hard"]');
    const goodBtn = difficultyButtons.locator('[data-difficulty="good"]');

    // Good should be selected by default
    await expect(goodBtn).toHaveClass(/selected/);

    // Click hard
    await hardBtn.click();
    await expect(hardBtn).toHaveClass(/selected/);
    await expect(goodBtn).not.toHaveClass(/selected/);
  });

  test('difficulty saves to localStorage', async ({ page }) => {
    // Mark exercise done to expand feedback section
    await page.locator('.done-btn').first().click();

    // Select hard difficulty
    await page.locator('.difficulty-buttons').first().locator('[data-difficulty="hard"]').click();

    // Check localStorage
    const log = await page.evaluate(() => localStorage.getItem('basement_lab_log'));
    expect(log).toContain('"difficulty":"hard"');
  });

  test('failed button shows set/rep sliders', async ({ page }) => {
    // Mark exercise done to expand feedback section
    await page.locator('.done-btn').first().click();

    const failedDetails = page.locator('.failed-details').first();

    // Initially hidden
    await expect(failedDetails).toBeHidden();

    // Click failed button
    await page.locator('.difficulty-buttons').first().locator('[data-difficulty="failed"]').click();

    // Sliders should be visible
    await expect(failedDetails).toBeVisible();
    await expect(failedDetails.locator('.failed-set-slider')).toBeVisible();
    await expect(failedDetails.locator('.failed-rep-slider')).toBeVisible();
  });

  test('failed sliders save to localStorage', async ({ page }) => {
    // Mark exercise done and select failed
    await page.locator('.done-btn').first().click();
    await page.locator('.difficulty-buttons').first().locator('[data-difficulty="failed"]').click();

    // Adjust sliders
    const setSlider = page.locator('.failed-set-slider').first();
    const repSlider = page.locator('.failed-rep-slider').first();

    await setSlider.fill('2');
    await repSlider.fill('5');

    // Check localStorage
    const log = await page.evaluate(() => localStorage.getItem('basement_lab_log'));
    expect(log).toContain('"failedSet":2');
    expect(log).toContain('"failedRep":5');
  });

  test('notes textarea saves to localStorage', async ({ page }) => {
    // Mark exercise done to expand feedback section
    await page.locator('.done-btn').first().click();

    const notesField = page.locator('.notes-field').first();
    await notesField.fill('Felt strong today');

    // Check localStorage
    const log = await page.evaluate(() => localStorage.getItem('basement_lab_log'));
    expect(log).toContain('Felt strong today');
  });

  test('feedback persists after reload', async ({ page }) => {
    // Mark exercise done and set feedback values
    await page.locator('.done-btn').first().click();
    await page.locator('.difficulty-buttons').first().locator('[data-difficulty="hard"]').click();
    await page.locator('.notes-field').first().fill('Test note');

    // Reload
    await page.reload();

    // Exercise should still be completed
    const exerciseCard = page.locator('.exercise').first();
    await expect(exerciseCard).toHaveClass(/completed/);

    // Feedback section should be expanded (has custom feedback)
    const feedbackContent = page.locator('.feedback-content').first();
    await expect(feedbackContent).toBeVisible();

    // Values should persist
    const hardBtn = page.locator('.difficulty-buttons').first().locator('[data-difficulty="hard"]');
    await expect(hardBtn).toHaveClass(/selected/);
    await expect(page.locator('.notes-field').first()).toHaveValue('Test note');
  });

  // =============================================
  // Theme and Mode Tests
  // =============================================

  test('settings button opens settings modal', async ({ page }) => {
    const settingsBtn = page.locator('#settings-btn');
    const settingsModal = page.locator('#settings-modal');

    // Initially hidden
    await expect(settingsModal).toBeHidden();

    // Click to open
    await settingsBtn.click();
    await expect(settingsModal).toBeVisible();
  });

  test('settings modal closes on backdrop click', async ({ page }) => {
    // Open settings
    await page.locator('#settings-btn').click();
    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible();

    // Click backdrop (the modal itself, not the content)
    await settingsModal.click({ position: { x: 10, y: 10 } });
    await expect(settingsModal).toBeHidden();
  });

  test('theme picker is no longer present', async ({ page }) => {
    // The 4-theme picker was removed; the settings modal should not contain it.
    await page.locator('#settings-btn').click();
    await expect(page.locator('.theme-grid')).toHaveCount(0);
    await expect(page.locator('.theme-option')).toHaveCount(0);
  });

  test('legacy basement_lab_theme is cleaned up on load', async ({ page }) => {
    // Seed the legacy key, reload, verify it gets removed.
    await page.evaluate(() => localStorage.setItem('basement_lab_theme', 'cyberpunk'));
    await page.reload();
    const value = await page.evaluate(() => localStorage.getItem('basement_lab_theme'));
    expect(value).toBeNull();
  });

  test('mode toggle switches between light and dark', async ({ page }) => {
    const html = page.locator('html');

    // Ensure we start in dark mode
    await page.evaluate(() => localStorage.setItem('basement_lab_mode', 'dark'));
    await page.reload();

    // Open settings
    await page.locator('#settings-btn').click();

    // Should be in dark mode
    await expect(html).toHaveAttribute('data-mode', 'dark');

    // Click light mode button
    await page.locator('.mode-btn[data-mode="light"]').click();
    await expect(html).toHaveAttribute('data-mode', 'light');

    // Click dark mode button
    await page.locator('.mode-btn[data-mode="dark"]').click();
    await expect(html).toHaveAttribute('data-mode', 'dark');
  });

  test('mode toggle updates active state', async ({ page }) => {
    // Ensure dark mode
    await page.evaluate(() => localStorage.setItem('basement_lab_mode', 'dark'));
    await page.reload();

    // Open settings
    await page.locator('#settings-btn').click();

    const darkBtn = page.locator('.mode-btn[data-mode="dark"]');
    const lightBtn = page.locator('.mode-btn[data-mode="light"]');

    // Dark should be active
    await expect(darkBtn).toHaveClass(/active/);
    await expect(lightBtn).not.toHaveClass(/active/);

    // Click light
    await lightBtn.click();
    await expect(lightBtn).toHaveClass(/active/);
    await expect(darkBtn).not.toHaveClass(/active/);
  });

  test('mode persists after reload', async ({ page }) => {
    const html = page.locator('html');

    // Ensure dark mode start
    await page.evaluate(() => localStorage.setItem('basement_lab_mode', 'dark'));
    await page.reload();

    // Open settings and switch to light
    await page.locator('#settings-btn').click();
    await page.locator('.mode-btn[data-mode="light"]').click();
    await expect(html).toHaveAttribute('data-mode', 'light');

    // Reload
    await page.reload();

    // Should still be light mode
    await expect(html).toHaveAttribute('data-mode', 'light');
  });

  test('mode respects system preference on first load', async ({ page }) => {
    // Clear localStorage to simulate first visit
    await page.evaluate(() => {
      localStorage.removeItem('basement_lab_theme');
      localStorage.removeItem('basement_lab_mode');
    });

    // Emulate light color scheme preference
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-mode', 'light');
  });

  test('body uses sans-serif font', async ({ page }) => {
    const fontFamily = await page.locator('body').evaluate(el =>
      getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toMatch(/Inter|system-ui|sans-serif/i);
    expect(fontFamily).not.toMatch(/courier/i);
  });

  // =============================================
  // Timer Tests
  // =============================================

  test('timed exercise shows exercise timer widget', async ({ page }) => {
    // Day 1 Workout A has "Swedish Ladder Dead Hang" with reps "45s"
    const timerWidgets = page.locator('.timer-widget');
    const count = await timerWidgets.count();
    expect(count).toBeGreaterThan(0);

    // Find an exercise timer (labeled EXERCISE)
    const exerciseTimer = page.locator('.timer-widget .timer-label', { hasText: 'EXERCISE' }).first();
    await expect(exerciseTimer).toBeVisible();
  });

  test('rest timer widget appears for exercises with rest period', async ({ page }) => {
    // Most exercises have rest periods like "90s", "60s"
    const restTimer = page.locator('.timer-widget .timer-label', { hasText: 'REST' }).first();
    await expect(restTimer).toBeVisible();
  });

  test('timer displays correct initial duration', async ({ page }) => {
    // Swedish Ladder Dead Hang has reps "45s" — should show "45"
    const deadHangCard = page.locator('.exercise', { hasText: 'Dead Hang' });
    const exerciseDisplay = deadHangCard.locator('.timer-widget .timer-display').first();
    await expect(exerciseDisplay).toContainText('45');
  });

  test('timer start button begins countdown', async ({ page }) => {
    const deadHangCard = page.locator('.exercise', { hasText: 'Dead Hang' });
    await deadHangCard.scrollIntoViewIfNeeded();
    const timerWidget = deadHangCard.locator('.timer-widget').first();
    const display = timerWidget.locator('.timer-display');
    const startBtn = timerWidget.locator('.timer-start-pause');

    // Initial state
    await expect(startBtn).toContainText('START');
    const initialText = await display.textContent();

    // Click start via JS to avoid mobile pointer interception issues
    await startBtn.evaluate(el => el.click());
    await expect(startBtn).toContainText('PAUSE');

    // Wait for countdown to progress
    await expect(display).not.toHaveText(initialText, { timeout: 3000 });
  });

  test('timer pause button stops countdown', async ({ page }) => {
    const deadHangCard = page.locator('.exercise', { hasText: 'Dead Hang' });
    await deadHangCard.scrollIntoViewIfNeeded();
    const timerWidget = deadHangCard.locator('.timer-widget').first();
    const display = timerWidget.locator('.timer-display');
    const startPauseBtn = timerWidget.locator('.timer-start-pause');

    // Start timer and wait for countdown to progress
    const initialText = await display.textContent();
    await startPauseBtn.evaluate(el => el.click());
    await expect(display).not.toHaveText(initialText, { timeout: 3000 });

    // Pause
    await startPauseBtn.evaluate(el => el.click());
    await expect(startPauseBtn).toContainText('START');

    // Capture value, wait, verify it didn't change
    const pausedValue = await display.textContent();
    await expect(display).toHaveText(pausedValue, { timeout: 2000 });
  });

  test('timer reset button restores initial duration', async ({ page }) => {
    const deadHangCard = page.locator('.exercise', { hasText: 'Dead Hang' });
    await deadHangCard.scrollIntoViewIfNeeded();
    const timerWidget = deadHangCard.locator('.timer-widget').first();
    const display = timerWidget.locator('.timer-display');
    const startBtn = timerWidget.locator('.timer-start-pause');
    const resetBtn = timerWidget.locator('.timer-reset');

    const initialText = await display.textContent();

    // Start and let it count down
    await startBtn.evaluate(el => el.click());
    await expect(display).not.toHaveText(initialText, { timeout: 3000 });

    // Reset
    await resetBtn.evaluate(el => el.click());
    await expect(display).toContainText(initialText);
    await expect(startBtn).toContainText('START');
  });

  test('timer shows DONE when countdown reaches zero', async ({ page }) => {
    const deadHangCard = page.locator('.exercise', { hasText: 'Dead Hang' });
    // Scroll the card into view to avoid footer overlap
    await deadHangCard.scrollIntoViewIfNeeded();

    // Shorten the first timer to 2s for fast testing
    await page.evaluate(() => {
      const widget = document.querySelector('.exercise:nth-child(3) .timer-widget');
      if (widget) {
        widget.dataset.timerDuration = '2';
      }
    });
    await page.evaluate(() => ExerciseTimer.initAll());

    const timerWidget = deadHangCard.locator('.timer-widget').first();
    const display = timerWidget.locator('.timer-display');
    const startBtn = timerWidget.locator('.timer-start-pause');

    await expect(display).toContainText('2');
    await startBtn.evaluate(el => el.click());

    // Wait for the timer to reach 0
    await expect(startBtn).toContainText('DONE', { timeout: 5000 });
    await expect(display).toContainText('0');
  });

  test('timer reset works after countdown completes', async ({ page }) => {
    const deadHangCard = page.locator('.exercise', { hasText: 'Dead Hang' });
    await deadHangCard.scrollIntoViewIfNeeded();

    // Shorten the first timer to 1s for fast testing
    await page.evaluate(() => {
      const widget = document.querySelector('.exercise:nth-child(3) .timer-widget');
      if (widget) {
        widget.dataset.timerDuration = '1';
      }
    });
    await page.evaluate(() => ExerciseTimer.initAll());

    const timerWidget = deadHangCard.locator('.timer-widget').first();
    const startBtn = timerWidget.locator('.timer-start-pause');
    const resetBtn = timerWidget.locator('.timer-reset');
    const display = timerWidget.locator('.timer-display');

    // Run to completion
    await startBtn.evaluate(el => el.click());
    await expect(startBtn).toContainText('DONE', { timeout: 5000 });

    // Reset
    await resetBtn.evaluate(el => el.click());
    await expect(startBtn).toContainText('START');
    await expect(display).toContainText('1');
  });

  test('exercise without timed reps does not show exercise timer', async ({ page }) => {
    // "KB Gorilla Rows" has reps "12/side" — should NOT have an EXERCISE timer
    const gorillaCard = page.locator('.exercise', { hasText: 'Gorilla Rows' });
    const exerciseTimerLabel = gorillaCard.locator('.timer-label', { hasText: 'EXERCISE' });
    await expect(exerciseTimerLabel).toHaveCount(0);

    // But should still have a REST timer (rest: "90s")
    const restTimerLabel = gorillaCard.locator('.timer-label', { hasText: 'REST' });
    await expect(restTimerLabel).toHaveCount(1);
  });

  test('timer widgets do not overflow their container on small viewports', async ({ page }) => {
    const timerSection = page.locator('.timer-section').first();
    await timerSection.scrollIntoViewIfNeeded();

    // Each timer widget should fit within the exercise card (no horizontal overflow)
    const widgets = timerSection.locator('.timer-widget');
    const count = await widgets.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const widget = widgets.nth(i);
      const box = await widget.boundingBox();
      const sectionBox = await timerSection.boundingBox();
      // Widget should not extend beyond the timer section's right edge
      expect(box.x + box.width).toBeLessThanOrEqual(sectionBox.x + sectionBox.width + 1);
      // Widget should have reasonable width (at least 200px on a 375px screen)
      expect(box.width).toBeGreaterThan(200);
    }
  });

  test('suggested weight does not show NaN after saving difficulty without weight', async ({ page }) => {
    // Simulate a log entry with difficulty but no weight (the bug trigger)
    await page.evaluate(() => {
      const log = { '1_3': { exercise: 'KB Deadlift', difficulty: 'hard', day: 1, timestamp: Date.now() } };
      localStorage.setItem('basement_lab_log', JSON.stringify(log));
    });
    await page.reload();

    // Check that no suggested hint or weight field shows NaN
    const suggestedHints = page.locator('.suggested-hint');
    const count = await suggestedHints.count();
    for (let i = 0; i < count; i++) {
      const text = await suggestedHints.nth(i).textContent();
      expect(text).not.toContain('NaN');
    }

    const weightFields = page.locator('.weight-field');
    const fieldCount = await weightFields.count();
    for (let i = 0; i < fieldCount; i++) {
      const value = await weightFields.nth(i).getAttribute('value');
      const placeholder = await weightFields.nth(i).getAttribute('placeholder');
      expect(value || '').not.toContain('NaN');
      expect(placeholder || '').not.toContain('NaN');
    }
  });

  test('export button is visible in settings modal', async ({ page }) => {
    await page.click('#settings-btn');
    const exportBtn = page.locator('#export-btn');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toHaveText('EXPORT');
  });

  test('import button is visible in settings modal', async ({ page }) => {
    await page.click('#settings-btn');
    const importBtn = page.locator('#import-btn');
    await expect(importBtn).toBeVisible();
    await expect(importBtn).toHaveText('IMPORT');
  });

  test('export produces valid JSON with log and state', async ({ page }) => {
    // Seed some data
    await page.evaluate(() => {
      localStorage.setItem('basement_lab_log', JSON.stringify({
        '1_0': { exercise: 'Test', weight: 25, difficulty: 'good', completed: true, day: 1, timestamp: 1 }
      }));
      localStorage.setItem('basement_lab_state', JSON.stringify({ globalDay: 3, currentPhase: 'p1' }));
    });
    await page.reload();

    // Intercept the download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#settings-btn').then(() => page.click('#export-btn'))
    ]);

    expect(download.suggestedFilename()).toMatch(/^flux-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const content = JSON.parse(await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString()));
    expect(content).toHaveProperty('profile');
    expect(content).toHaveProperty('log');
    expect(content).toHaveProperty('state');
    expect(content.log['1_0'].exercise).toBe('Test');
    expect(content.state.globalDay).toBe(3);
  });

  test('profile is created on first load via migration', async ({ page }) => {
    // Clear any existing profile
    await page.evaluate(() => localStorage.removeItem('basement_lab_profile'));
    await page.reload();

    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('basement_lab_profile')));
    expect(profile).toBeTruthy();
    expect(typeof profile.injury_history).toBe('object'); // array
    expect(profile).toHaveProperty('name');
    expect(profile).toHaveProperty('goal');
  });

  test('profile editor fields are visible in settings', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#profile-name')).toBeVisible();
    await expect(page.locator('#profile-goal')).toBeVisible();
    await expect(page.locator('#profile-age')).toBeVisible();
    await expect(page.locator('#profile-equipment')).toBeVisible();
  });

  test('profile changes persist to localStorage', async ({ page }) => {
    await page.click('#settings-btn');

    const nameInput = page.locator('#profile-name');
    await nameInput.fill('Test User');
    await nameInput.dispatchEvent('change');

    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('basement_lab_profile')));
    expect(profile.name).toBe('Test User');
  });

  test('export includes profile data', async ({ page }) => {
    // Set a profile
    await page.evaluate(() => {
      localStorage.setItem('basement_lab_profile', JSON.stringify({ name: 'Exported User', goal: 'Test' }));
    });
    await page.reload();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#settings-btn').then(() => page.click('#export-btn'))
    ]);

    const content = JSON.parse(await (await download.createReadStream()).toArray().then(chunks => Buffer.concat(chunks).toString()));
    expect(content.profile.name).toBe('Exported User');
  });

  test('import with profile sets profile when none exists', async ({ page }) => {
    // Remove the profile after page load (migration already ran)
    // so the import will find no existing profile
    await page.evaluate(() => localStorage.removeItem('basement_lab_profile'));

    const importPayload = JSON.stringify({
      profile: { name: 'Imported User', goal: 'Imported Goal' },
      log: { '1_0': { exercise: 'Test', weight: 10, completed: true, day: 1, timestamp: 1 } },
      state: { globalDay: 1, currentPhase: 'p1' }
    });

    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });

    const fileInput = page.locator('#import-file');
    await fileInput.setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importPayload)
    });

    await page.waitForEvent('dialog');

    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('basement_lab_profile')));
    expect(profile.name).toBe('Imported User');
  });

  test('import without profile key still works (backwards compat)', async ({ page }) => {
    const importPayload = JSON.stringify({
      log: { '5_0': { exercise: 'Compat', weight: 15, completed: true, day: 5, timestamp: 1 } },
      state: { globalDay: 5, currentPhase: 'p1' }
    });

    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });

    const fileInput = page.locator('#import-file');
    await fileInput.setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importPayload)
    });

    await page.waitForEvent('dialog');

    const log = await page.evaluate(() => JSON.parse(localStorage.getItem('basement_lab_log')));
    expect(log['5_0'].exercise).toBe('Compat');
  });

  test('import merges log entries without overwriting existing data', async ({ page }) => {
    // Seed existing data
    await page.evaluate(() => {
      localStorage.setItem('basement_lab_log', JSON.stringify({
        '1_0': { exercise: 'Existing', weight: 30, completed: true, day: 1, timestamp: 2 }
      }));
      localStorage.setItem('basement_lab_state', JSON.stringify({ globalDay: 5, currentPhase: 'p1' }));
    });
    await page.reload();

    // Prepare import file with overlapping key (1_0) and new key (2_0)
    const importData = JSON.stringify({
      log: {
        '1_0': { exercise: 'Overwrite attempt', weight: 99, completed: true, day: 1, timestamp: 1 },
        '2_0': { exercise: 'New entry', weight: 20, completed: true, day: 2, timestamp: 3 }
      },
      state: { globalDay: 10, currentPhase: 'p2' }
    });

    // Accept the confirm dialog
    page.on('dialog', async dialog => {
      if (dialog.type() === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });

    // Trigger import via hidden file input
    const fileInput = page.locator('#import-file');
    await fileInput.setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(importData)
    });

    // Wait for the alert confirming import
    await page.waitForEvent('dialog');

    // Verify merge: existing key preserved, new key added
    const log = await page.evaluate(() => JSON.parse(localStorage.getItem('basement_lab_log')));
    expect(log['1_0'].exercise).toBe('Existing'); // Not overwritten
    expect(log['1_0'].weight).toBe(30);
    expect(log['2_0'].exercise).toBe('New entry'); // Merged in

    // Verify state was NOT overwritten
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('basement_lab_state')));
    expect(state.globalDay).toBe(5); // Still 5, not 10
  });
});

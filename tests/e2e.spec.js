// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Basement Lab PWA', () => {
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
    await expect(page.locator('header h1')).toContainText('BASEMENT LAB');
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

  test('has dark mode colors', async ({ page }) => {
    // Ensure dark mode for this test
    await page.evaluate(() => {
      localStorage.setItem('basement_lab_theme', 'cyberpunk');
      localStorage.setItem('basement_lab_mode', 'dark');
    });
    await page.reload();

    const body = page.locator('body');
    const bgColor = await body.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );

    // Should be dark (rgb values close to 0)
    expect(bgColor).toMatch(/rgb\(\s*10,\s*10,\s*10\s*\)/);
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

  test('theme selection changes data-theme attribute', async ({ page }) => {
    const html = page.locator('html');

    // Open settings
    await page.locator('#settings-btn').click();

    // Default should be cyberpunk
    await expect(html).toHaveAttribute('data-theme', 'cyberpunk');

    // Select material theme
    await page.locator('.theme-option[data-theme="material"]').click();
    await expect(html).toHaveAttribute('data-theme', 'material');

    // Select ocean theme
    await page.locator('.theme-option[data-theme="ocean"]').click();
    await expect(html).toHaveAttribute('data-theme', 'ocean');

    // Select ember theme
    await page.locator('.theme-option[data-theme="ember"]').click();
    await expect(html).toHaveAttribute('data-theme', 'ember');
  });

  test('theme selection updates active state', async ({ page }) => {
    // Open settings
    await page.locator('#settings-btn').click();

    const cyberpunkOption = page.locator('.theme-option[data-theme="cyberpunk"]');
    const materialOption = page.locator('.theme-option[data-theme="material"]');

    // Default cyberpunk should be active
    await expect(cyberpunkOption).toHaveClass(/active/);
    await expect(materialOption).not.toHaveClass(/active/);

    // Select material
    await materialOption.click();
    await expect(materialOption).toHaveClass(/active/);
    await expect(cyberpunkOption).not.toHaveClass(/active/);
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

  test('theme persists after reload', async ({ page }) => {
    const html = page.locator('html');

    // Open settings and select material theme
    await page.locator('#settings-btn').click();
    await page.locator('.theme-option[data-theme="material"]').click();
    await expect(html).toHaveAttribute('data-theme', 'material');

    // Reload
    await page.reload();

    // Should still be material theme
    await expect(html).toHaveAttribute('data-theme', 'material');
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

  test('theme and mode can be set independently', async ({ page }) => {
    const html = page.locator('html');

    // Open settings
    await page.locator('#settings-btn').click();

    // Set material theme + light mode
    await page.locator('.theme-option[data-theme="material"]').click();
    await page.locator('.mode-btn[data-mode="light"]').click();

    await expect(html).toHaveAttribute('data-theme', 'material');
    await expect(html).toHaveAttribute('data-mode', 'light');

    // Reload and verify
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'material');
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

  test('material theme uses system font', async ({ page }) => {
    // Set material theme
    await page.evaluate(() => localStorage.setItem('basement_lab_theme', 'material'));
    await page.reload();

    const body = page.locator('body');
    const fontFamily = await body.evaluate(el =>
      getComputedStyle(el).fontFamily
    );

    // Should contain system-ui or sans-serif, not monospace
    expect(fontFamily).toMatch(/system-ui|sans-serif/i);
    expect(fontFamily).not.toMatch(/courier|monospace/i);
  });

  test('cyberpunk theme uses monospace font', async ({ page }) => {
    // Ensure cyberpunk theme
    await page.evaluate(() => localStorage.setItem('basement_lab_theme', 'cyberpunk'));
    await page.reload();

    const body = page.locator('body');
    const fontFamily = await body.evaluate(el =>
      getComputedStyle(el).fontFamily
    );

    // Should contain Courier or monospace
    expect(fontFamily).toMatch(/courier|monospace/i);
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

  test('each theme has distinct accent color', async ({ page }) => {
    const getAccentColor = async () => {
      const header = page.locator('header h1');
      return header.evaluate(el => getComputedStyle(el).color);
    };

    // Get color for each theme
    await page.evaluate(() => localStorage.setItem('basement_lab_theme', 'cyberpunk'));
    await page.reload();
    const cyberpunkColor = await getAccentColor();

    await page.evaluate(() => localStorage.setItem('basement_lab_theme', 'material'));
    await page.reload();
    const materialColor = await getAccentColor();

    await page.evaluate(() => localStorage.setItem('basement_lab_theme', 'ocean'));
    await page.reload();
    const oceanColor = await getAccentColor();

    await page.evaluate(() => localStorage.setItem('basement_lab_theme', 'ember'));
    await page.reload();
    const emberColor = await getAccentColor();

    // All should be different
    const colors = [cyberpunkColor, materialColor, oceanColor, emberColor];
    const uniqueColors = [...new Set(colors)];
    expect(uniqueColors.length).toBe(4);
  });
});

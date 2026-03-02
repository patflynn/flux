/**
 * Basement Lab - Exercise Timer Module
 * Provides countdown timers for timed exercises and rest periods.
 * Uses Web Audio API for completion beep.
 */

const ExerciseTimer = (() => {
  // Track active timers by element id
  const timers = {};

  // Shared AudioContext (created on first user interaction)
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  /**
   * Play a short beep using Web Audio API.
   * Two-tone descending beep for a "done" feel.
   */
  function playBeep() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // First tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.value = 880;
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.value = 660;
      gain2.gain.setValueAtTime(0.15, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.35);
    } catch (e) {
      // Audio not available — fail silently
    }
  }

  /**
   * Parse a time string like '45s', '60s', '90s' into seconds.
   * Returns null if not a valid timer-compatible string.
   * Excludes patterns like '45 mins', '20 mins', 'N/A', '0s'.
   */
  function parseSeconds(str) {
    if (!str || str === 'N/A') return null;
    const match = String(str).match(/^(\d+)s$/);
    if (match) {
      const val = parseInt(match[1], 10);
      return val > 0 ? val : null;
    }
    return null;
  }

  /**
   * Format seconds as M:SS or just SS.
   */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
      return `${m}:${String(s).padStart(2, '0')}`;
    }
    return String(s);
  }

  /**
   * Create a timer instance for a given container element.
   * @param {string} id - Unique identifier for this timer
   * @param {number} duration - Duration in seconds
   * @param {HTMLElement} container - The .timer-widget element
   */
  function createTimer(id, duration, container) {
    // Clean up any existing timer with this id
    if (timers[id]) {
      clearInterval(timers[id].interval);
    }

    const state = {
      duration: duration,
      remaining: duration,
      running: false,
      finished: false,
      interval: null,
    };

    timers[id] = state;

    const display = container.querySelector('.timer-display');
    const startPauseBtn = container.querySelector('.timer-start-pause');
    const resetBtn = container.querySelector('.timer-reset');

    function updateUI() {
      display.textContent = formatTime(state.remaining);

      if (state.finished) {
        display.classList.add('timer-done');
        startPauseBtn.textContent = 'DONE';
        startPauseBtn.disabled = true;
      } else {
        display.classList.remove('timer-done');
        startPauseBtn.disabled = false;
        startPauseBtn.textContent = state.running ? 'PAUSE' : 'START';
      }
    }

    function tick() {
      if (state.remaining <= 0) {
        clearInterval(state.interval);
        state.interval = null;
        state.running = false;
        state.finished = true;
        playBeep();
        updateUI();
        return;
      }
      state.remaining--;
      updateUI();
    }

    function startPause() {
      if (state.finished) return;

      if (state.running) {
        // Pause
        clearInterval(state.interval);
        state.interval = null;
        state.running = false;
      } else {
        // Start
        state.running = true;
        state.interval = setInterval(tick, 1000);
      }
      updateUI();
    }

    function reset() {
      clearInterval(state.interval);
      state.interval = null;
      state.running = false;
      state.finished = false;
      state.remaining = state.duration;
      updateUI();
    }

    startPauseBtn.addEventListener('click', startPause);
    resetBtn.addEventListener('click', reset);

    updateUI();
  }

  /**
   * Generate the HTML for a timer widget.
   * @param {string} id - Unique id for this timer
   * @param {number} seconds - Duration in seconds
   * @param {string} label - Label like "EXERCISE" or "REST"
   * @returns {string} HTML string
   */
  function renderTimerHTML(id, seconds, label) {
    return `
      <div class="timer-widget" data-timer-id="${id}" data-timer-duration="${seconds}">
        <span class="timer-label">${label}</span>
        <span class="timer-display">${formatTime(seconds)}</span>
        <button class="timer-start-pause" type="button">START</button>
        <button class="timer-reset" type="button">RST</button>
      </div>
    `;
  }

  /**
   * Initialize all timer widgets currently in the DOM.
   * Call this after rendering exercise cards.
   */
  function initAll() {
    // Clean up old timers
    for (const id in timers) {
      clearInterval(timers[id].interval);
      delete timers[id];
    }

    document.querySelectorAll('.timer-widget').forEach(widget => {
      const id = widget.dataset.timerId;
      const duration = parseInt(widget.dataset.timerDuration, 10);
      if (id && duration > 0) {
        createTimer(id, duration, widget);
      }
    });
  }

  /**
   * Destroy all active timers (e.g., on day change).
   */
  function destroyAll() {
    for (const id in timers) {
      clearInterval(timers[id].interval);
      delete timers[id];
    }
  }

  return {
    parseSeconds,
    formatTime,
    renderTimerHTML,
    initAll,
    destroyAll,
    playBeep,
  };
})();

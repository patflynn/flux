/**
 * Basement Lab - Workout Tracker
 * State management and UI logic
 */

const STATE_KEY = 'basement_lab_state';
const LOG_KEY = 'basement_lab_log';
const THEME_KEY = 'basement_lab_theme';
const MODE_KEY = 'basement_lab_mode';

let programData = null;
let currentState = null;

// Initialize app
async function init() {
  loadState();
  initTheme();
  await loadProgram();
  render();
  bindEvents();
}

// Initialize theme and mode from localStorage or system preference
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'cyberpunk';
  const savedMode = localStorage.getItem(MODE_KEY) ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  setTheme(savedTheme);
  setMode(savedMode);
  updateSettingsUI();
}

// Set theme (cyberpunk, material, ocean, ember)
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  updateSettingsUI();
}

// Set mode (dark, light)
function setMode(mode) {
  document.documentElement.setAttribute('data-mode', mode);
  localStorage.setItem(MODE_KEY, mode);

  // Update meta theme-color based on mode
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', mode === 'light' ? '#f5f5f5' : '#0a0a0a');
  }

  updateSettingsUI();
}

// Update settings modal UI to reflect current theme/mode
function updateSettingsUI() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'cyberpunk';
  const currentMode = document.documentElement.getAttribute('data-mode') || 'dark';

  // Update theme options
  document.querySelectorAll('.theme-option').forEach(option => {
    if (option.dataset.theme === currentTheme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });

  // Update mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    if (btn.dataset.mode === currentMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Open settings modal
function openSettings() {
  updateSettingsUI();
  document.getElementById('settings-modal').classList.remove('hidden');
}

// Close settings modal
function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}

// Load state from localStorage
function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (saved) {
    currentState = JSON.parse(saved);
    // Validate globalDay: must be a positive integer
    const day = Number(currentState.globalDay);
    if (!Number.isInteger(day) || day < 1) {
      currentState.globalDay = 1;
    } else {
      currentState.globalDay = day;
    }
  } else {
    currentState = {
      globalDay: 1,
      currentPhase: 'p1'
    };
    saveState();
  }
}

// Save state to localStorage
function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(currentState));
}

// Load exercise log from localStorage
function loadLog() {
  const saved = localStorage.getItem(LOG_KEY);
  return saved ? JSON.parse(saved) : {};
}

// Save exercise log to localStorage
function saveLog(log) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

// Load program data from JSON
async function loadProgram() {
  try {
    const response = await fetch('data/program.json');
    programData = await response.json();
  } catch (error) {
    console.error('Failed to load program:', error);
    document.getElementById('workout-name').textContent = 'Error loading program';
  }
}

// Get current phase data
function getCurrentPhase() {
  if (!programData) return null;
  return programData.phases.find(p => p.id === currentState.currentPhase);
}

// Get workout type for current day
function getWorkoutType() {
  const phase = getCurrentPhase();
  if (!phase || !phase.schedule_pattern) return null;

  // Day 1 = index 0, so subtract 1
  const dayIndex = (currentState.globalDay - 1) % phase.schedule_pattern.length;
  return phase.schedule_pattern[dayIndex];
}

// Get workout data for current day
function getTodaysWorkout() {
  const phase = getCurrentPhase();
  const workoutType = getWorkoutType();

  if (!phase || !workoutType || workoutType === 'Rest') {
    return null;
  }

  return phase.workouts[workoutType];
}

// Render the UI
function render() {
  // Update day counter
  document.getElementById('current-day').textContent = currentState.globalDay;

  const workout = getTodaysWorkout();
  const workoutCard = document.getElementById('workout-card');
  const restDay = document.getElementById('rest-day');

  if (!workout) {
    // Rest day
    workoutCard.classList.add('hidden');
    restDay.classList.remove('hidden');
    document.getElementById('session-progress').style.display = 'none';
    return;
  }

  document.getElementById('session-progress').style.display = '';

  // Workout day
  workoutCard.classList.remove('hidden');
  restDay.classList.add('hidden');

  document.getElementById('workout-name').textContent = workout.name;
  document.getElementById('workout-focus').textContent = workout.focus;

  const exercisesList = document.getElementById('exercises-list');
  const log = loadLog();

  exercisesList.innerHTML = workout.exercises.map((ex, index) => {
    const exerciseKey = `${currentState.globalDay}_${index}`;
    const logEntry = log[exerciseKey] || {};
    const currentWeight = logEntry.weight || '';
    const currentDifficulty = logEntry.difficulty || '';
    const currentNotes = logEntry.notes || '';

    // Calculate suggested weight for weight-based exercises
    const suggestedWeight = ex.uses_weight
      ? getSuggestedWeight(ex.name, ex.starting_weight, ex.weight_increment || 5)
      : null;
    const increment = ex.weight_increment || 5;

    // Build weight input section
    let weightSection = '';
    if (ex.uses_weight) {
      weightSection = `
        <div class="weight-input">
          <label>Weight:</label>
          <div class="weight-controls">
            <button class="weight-btn" data-action="decrement" data-key="${exerciseKey}" data-increment="${increment}">-</button>
            <input type="number"
                   class="weight-field"
                   data-exercise="${ex.name}"
                   data-key="${exerciseKey}"
                   value="${currentWeight}"
                   placeholder="${suggestedWeight}">
            <button class="weight-btn" data-action="increment" data-key="${exerciseKey}" data-increment="${increment}">+</button>
          </div>
          <span class="unit">lbs</span>
          <span class="suggested-hint">suggested: ${suggestedWeight}</span>
        </div>
      `;
    } else if (ex.uses_weight !== false) {
      // Legacy exercises without uses_weight defined - show basic input
      const lastWeight = getLastWeight(ex.name);
      weightSection = `
        <div class="weight-input">
          <label>Weight:</label>
          <input type="number"
                 class="weight-field"
                 data-exercise="${ex.name}"
                 data-key="${exerciseKey}"
                 value="${currentWeight}"
                 placeholder="${lastWeight || '—'}">
          <span class="unit">lbs</span>
        </div>
      `;
    }

    // Build collapsible feedback section (difficulty + notes)
    const isCompleted = logEntry.completed || false;
    const hasCustomFeedback = currentDifficulty && currentDifficulty !== 'good' || currentNotes;
    const maxSets = ex.sets;
    const maxReps = parseReps(ex.reps);
    const failedSet = logEntry.failedSet || 1;
    const failedRep = logEntry.failedRep || 1;

    const feedbackSection = `
      <div class="feedback-section${isCompleted && hasCustomFeedback ? ' expanded' : ''}">
        <button class="done-btn${isCompleted ? ' is-done' : ''}" data-key="${exerciseKey}" data-exercise="${ex.name}" data-index="${index}">
          ${isCompleted ? '\u2713 DONE' : 'DONE'}
        </button>
        <div class="feedback-content">
          <div class="difficulty-input">
            <label>How was it?</label>
            <div class="difficulty-buttons">
              <button class="difficulty-btn${currentDifficulty === 'failed' ? ' selected' : ''}" data-difficulty="failed" data-key="${exerciseKey}" data-exercise="${ex.name}" data-sets="${maxSets}" data-reps="${maxReps}">FAILED</button>
              <button class="difficulty-btn${currentDifficulty === 'easy' ? ' selected' : ''}" data-difficulty="easy" data-key="${exerciseKey}" data-exercise="${ex.name}">EASY</button>
              <button class="difficulty-btn${currentDifficulty === 'good' || !currentDifficulty ? ' selected' : ''}" data-difficulty="good" data-key="${exerciseKey}" data-exercise="${ex.name}">GOOD</button>
              <button class="difficulty-btn${currentDifficulty === 'hard' ? ' selected' : ''}" data-difficulty="hard" data-key="${exerciseKey}" data-exercise="${ex.name}">HARD</button>
            </div>
          </div>
          <div class="failed-details${currentDifficulty === 'failed' ? ' visible' : ''}" data-key="${exerciseKey}">
            <div class="slider-group">
              <label>Failed on set: <span class="slider-value">${failedSet}</span> / ${maxSets}</label>
              <input type="range" class="failed-set-slider" data-key="${exerciseKey}" data-exercise="${ex.name}" min="1" max="${maxSets}" value="${failedSet}">
            </div>
            <div class="slider-group">
              <label>Failed on rep: <span class="slider-value">${failedRep}</span> / ${maxReps}</label>
              <input type="range" class="failed-rep-slider" data-key="${exerciseKey}" data-exercise="${ex.name}" min="1" max="${maxReps}" value="${failedRep}">
            </div>
          </div>
          <div class="notes-input">
            <textarea class="notes-field" data-key="${exerciseKey}" data-exercise="${ex.name}" placeholder="Notes (optional)">${currentNotes}</textarea>
          </div>
        </div>
      </div>
    `;

    // Build timer section
    let timerSection = '';
    const repSeconds = ExerciseTimer.parseSeconds(ex.reps);
    const restSeconds = ExerciseTimer.parseSeconds(ex.rest);
    if (repSeconds || restSeconds) {
      timerSection = '<div class="timer-section">';
      if (repSeconds) {
        timerSection += ExerciseTimer.renderTimerHTML(
          `timer_ex_${currentState.globalDay}_${index}`, repSeconds, 'EXERCISE'
        );
      }
      if (restSeconds) {
        timerSection += ExerciseTimer.renderTimerHTML(
          `timer_rest_${currentState.globalDay}_${index}`, restSeconds, 'REST'
        );
      }
      timerSection += '</div>';
    }

    return `
      <div class="exercise${isCompleted ? ' completed' : ''}" data-index="${index}">
        <div class="exercise-header">
          <span class="exercise-name">${ex.name}</span>
          ${ex.video_id ? `<button class="video-btn" data-video="${ex.video_id}" data-start="${ex.video_start || 0}">VIDEO</button>` : '<button class="video-btn" disabled>NO VIDEO</button>'}
        </div>
        <div class="exercise-details">
          <span><strong>${ex.sets}</strong> sets</span>
          <span><strong>${ex.reps}</strong> reps</span>
          <span><strong>${ex.rest}</strong> rest</span>
        </div>
        ${ex.note ? `<div class="exercise-note">${ex.note}</div>` : ''}
        ${timerSection}
        ${weightSection}
        ${feedbackSection}
      </div>
    `;
  }).join('');

  updateProgressBar();
  ExerciseTimer.initAll();
}

// Update session progress bar
function updateProgressBar() {
  const workout = getTodaysWorkout();
  const bar = document.getElementById('session-progress-bar');
  if (!workout || !bar) {
    if (bar) bar.style.width = '0%';
    return;
  }

  const log = loadLog();
  const total = workout.exercises.length;
  let completed = 0;

  workout.exercises.forEach((ex, index) => {
    const key = `${currentState.globalDay}_${index}`;
    if (log[key] && log[key].completed) {
      completed++;
    }
  });

  const percent = total > 0 ? (completed / total) * 100 : 0;
  bar.style.width = `${percent}%`;
}

// Parse reps string to extract numeric value (e.g., "10/direction" -> 10)
function parseReps(repsStr) {
  const match = String(repsStr).match(/\d+/);
  return match ? parseInt(match[0]) : 10;
}

// Get the last recorded weight for an exercise
function getLastWeight(exerciseName) {
  const log = loadLog();
  let lastWeight = null;
  let lastDay = 0;

  for (const key in log) {
    if (log[key].exercise === exerciseName && log[key].day > lastDay && typeof log[key].weight === 'number' && !isNaN(log[key].weight)) {
      lastWeight = log[key].weight;
      lastDay = log[key].day;
    }
  }

  return lastWeight;
}

// Get suggested weight with weekly progression logic
function getSuggestedWeight(exerciseName, startingWeight, increment = 5) {
  const log = loadLog();
  const currentWeek = Math.floor((currentState.globalDay - 1) / 7) + 1;

  // Find last logged weight for this exercise (must have a valid weight)
  let lastEntry = null;
  for (const key in log) {
    if (log[key].exercise === exerciseName && typeof log[key].weight === 'number' && !isNaN(log[key].weight)) {
      if (!lastEntry || log[key].timestamp > lastEntry.timestamp) {
        lastEntry = log[key];
      }
    }
  }

  if (!lastEntry) {
    return startingWeight; // First time or no valid weight - use starting weight
  }

  const lastWeek = Math.floor((lastEntry.day - 1) / 7) + 1;

  if (currentWeek > lastWeek) {
    // New week - suggest progression
    return Math.min(lastEntry.weight + increment, 80); // Cap at 80lbs
  }

  return lastEntry.weight; // Same week - same weight
}

// Increment weight for an exercise
function incrementWeight(exerciseKey, increment = 5) {
  const input = document.querySelector(`input[data-key="${exerciseKey}"]`);
  if (!input) return;

  let currentValue = parseFloat(input.value) || parseFloat(input.placeholder) || 5;
  const newValue = Math.min(currentValue + increment, 80); // Cap at 80lbs
  input.value = newValue;

  // Trigger save
  saveWeightInput(input);
}

// Decrement weight for an exercise
function decrementWeight(exerciseKey, increment = 5) {
  const input = document.querySelector(`input[data-key="${exerciseKey}"]`);
  if (!input) return;

  let currentValue = parseFloat(input.value) || parseFloat(input.placeholder) || 10;
  const newValue = Math.max(currentValue - increment, 5); // Min 5lbs
  input.value = newValue;

  // Trigger save
  saveWeightInput(input);
}

// Bind event listeners
function bindEvents() {
  // Settings button
  document.getElementById('settings-btn').addEventListener('click', openSettings);

  // Settings modal - close on backdrop click
  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') {
      closeSettings();
    }
  });

  // Theme selection
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      setTheme(option.dataset.theme);
    });
  });

  // Mode toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });

  // Back button
  document.getElementById('back-btn').addEventListener('click', goBack);

  // Complete & Advance button
  document.getElementById('complete-btn').addEventListener('click', completeWorkout);

  // Reset button
  document.getElementById('reset-btn').addEventListener('click', resetProgress);

  // Video buttons (delegated)
  document.getElementById('exercises-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('video-btn') && !e.target.disabled) {
      openVideo(e.target.dataset.video, e.target.dataset.start);
    }
  });

  // Close modal
  document.getElementById('close-modal').addEventListener('click', closeVideo);
  document.getElementById('video-modal').addEventListener('click', (e) => {
    if (e.target.id === 'video-modal') closeVideo();
  });

  // Weight inputs (delegated)
  document.getElementById('exercises-list').addEventListener('input', (e) => {
    if (e.target.classList.contains('weight-field')) {
      saveWeightInput(e.target);
    }
  });

  // Weight +/- buttons (delegated)
  document.getElementById('exercises-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('weight-btn')) {
      const action = e.target.dataset.action;
      const key = e.target.dataset.key;
      const increment = parseInt(e.target.dataset.increment) || 5;

      if (action === 'increment') {
        incrementWeight(key, increment);
      } else if (action === 'decrement') {
        decrementWeight(key, increment);
      }
    }
  });

  // Difficulty buttons (delegated)
  document.getElementById('exercises-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('difficulty-btn')) {
      const key = e.target.dataset.key;
      const difficulty = e.target.dataset.difficulty;
      const exercise = e.target.dataset.exercise;

      // Update visual selection
      const container = e.target.closest('.difficulty-buttons');
      container.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('selected'));
      e.target.classList.add('selected');

      // Show/hide failed details
      const failedDetails = document.querySelector(`.failed-details[data-key="${key}"]`);
      if (failedDetails) {
        if (difficulty === 'failed') {
          failedDetails.classList.add('visible');
        } else {
          failedDetails.classList.remove('visible');
        }
      }

      // Save to log
      saveDifficulty(key, exercise, difficulty);
    }
  });

  // Failed sliders (delegated)
  document.getElementById('exercises-list').addEventListener('input', (e) => {
    if (e.target.classList.contains('failed-set-slider') || e.target.classList.contains('failed-rep-slider')) {
      const slider = e.target;
      const key = slider.dataset.key;
      const exercise = slider.dataset.exercise;

      // Update display value
      const label = slider.previousElementSibling;
      label.querySelector('.slider-value').textContent = slider.value;

      // Save to log
      saveFailedDetails(key, exercise);
    }
  });

  // Notes field (delegated)
  document.getElementById('exercises-list').addEventListener('input', (e) => {
    if (e.target.classList.contains('notes-field')) {
      saveNotes(e.target);
    }
  });

  // Done button (delegated)
  document.getElementById('exercises-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('done-btn')) {
      const btn = e.target;
      const key = btn.dataset.key;
      const exercise = btn.dataset.exercise;
      const exerciseCard = btn.closest('.exercise');
      const section = btn.closest('.feedback-section');
      const log = loadLog();

      const wasCompleted = log[key] && log[key].completed;

      if (!wasCompleted) {
        // Mark as completed, expand feedback
        log[key] = {
          ...log[key],
          exercise: exercise,
          completed: true,
          day: currentState.globalDay,
          timestamp: Date.now()
        };
        btn.classList.add('is-done');
        btn.innerHTML = '\u2713 DONE';
        exerciseCard.classList.add('completed');
        section.classList.add('expanded');
      } else {
        // Undo completion
        delete log[key].completed;
        // If no meaningful data left, remove the entry
        if (!log[key].weight && !log[key].difficulty && !log[key].notes) {
          delete log[key];
        }
        btn.classList.remove('is-done');
        btn.innerHTML = 'DONE';
        exerciseCard.classList.remove('completed');
        section.classList.remove('expanded');
      }

      saveLog(log);
      updateProgressBar();
    }
  });
}

// Save weight input to log
function saveWeightInput(input) {
  const log = loadLog();
  const key = input.dataset.key;
  const weight = input.value;

  const parsedWeight = parseFloat(weight);
  if (weight && !isNaN(parsedWeight)) {
    // Preserve existing fields when updating weight
    log[key] = {
      ...log[key],
      exercise: input.dataset.exercise,
      weight: parsedWeight,
      day: currentState.globalDay,
      timestamp: Date.now()
    };
  } else if (log[key]) {
    // Remove weight but keep other fields if they exist
    delete log[key].weight;
    // If no meaningful data left, remove the entry
    if (!log[key].difficulty && !log[key].notes) {
      delete log[key];
    }
  }

  saveLog(log);
}

// Save difficulty to log
function saveDifficulty(key, exercise, difficulty) {
  const log = loadLog();

  log[key] = {
    ...log[key],
    exercise: exercise,
    difficulty: difficulty,
    day: currentState.globalDay,
    timestamp: Date.now()
  };

  // Clear failed details if not failed
  if (difficulty !== 'failed') {
    delete log[key].failedSet;
    delete log[key].failedRep;
  }

  saveLog(log);
}

// Save failed set/rep details to log
function saveFailedDetails(key, exercise) {
  const log = loadLog();
  const setSlider = document.querySelector(`.failed-set-slider[data-key="${key}"]`);
  const repSlider = document.querySelector(`.failed-rep-slider[data-key="${key}"]`);

  log[key] = {
    ...log[key],
    exercise: exercise,
    failedSet: parseInt(setSlider.value),
    failedRep: parseInt(repSlider.value),
    day: currentState.globalDay,
    timestamp: Date.now()
  };

  saveLog(log);
}

// Save notes to log
function saveNotes(textarea) {
  const log = loadLog();
  const key = textarea.dataset.key;
  const notes = textarea.value.trim();

  if (notes || log[key]) {
    log[key] = {
      ...log[key],
      exercise: textarea.dataset.exercise,
      notes: notes,
      day: currentState.globalDay,
      timestamp: Date.now()
    };

    // Clean up empty notes
    if (!notes) {
      delete log[key].notes;
    }

    // If no meaningful data left, remove the entry
    if (!log[key].weight && !log[key].difficulty && !log[key].notes) {
      delete log[key];
    }
  }

  saveLog(log);
}

// Complete workout and advance day
function completeWorkout() {
  if (currentState.globalDay >= 365) {
    alert('Congratulations! You completed the 365-day program!');
    return;
  }

  currentState.globalDay++;

  // Check for phase transition (simplified - would need more logic for real phases)
  const phase = getCurrentPhase();
  if (phase) {
    const daysInPhase = phase.duration_weeks * 7;
    if (currentState.globalDay > daysInPhase && programData.phases.length > 1) {
      const currentIndex = programData.phases.findIndex(p => p.id === currentState.currentPhase);
      if (currentIndex < programData.phases.length - 1) {
        currentState.currentPhase = programData.phases[currentIndex + 1].id;
      }
    }
  }

  saveState();
  render();

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go back one day
function goBack() {
  if (currentState.globalDay <= 1) return;

  currentState.globalDay--;

  // Check for phase transition in reverse
  const phase = getCurrentPhase();
  if (phase) {
    const currentIndex = programData.phases.findIndex(p => p.id === currentState.currentPhase);
    if (currentIndex > 0) {
      const prevPhase = programData.phases[currentIndex - 1];
      const prevPhaseDays = prevPhase.duration_weeks * 7;
      if (currentState.globalDay <= prevPhaseDays) {
        currentState.currentPhase = prevPhase.id;
      }
    }
  }

  saveState();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Reset all progress
function resetProgress() {
  if (confirm('Reset all progress? This will clear your day count and exercise log.')) {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(LOG_KEY);
    currentState = { globalDay: 1, currentPhase: 'p1' };
    saveState();
    render();
  }
}

// Open video modal
function openVideo(videoId, startTime) {
  const modal = document.getElementById('video-modal');
  const container = document.getElementById('video-container');
  const start = parseInt(startTime) || 0;
  const startParam = start > 0 ? `&start=${start}` : '';

  container.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0${startParam}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;

  modal.classList.remove('hidden');
}

// Close video modal
function closeVideo() {
  const modal = document.getElementById('video-modal');
  const container = document.getElementById('video-container');

  container.innerHTML = '';
  modal.classList.add('hidden');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);

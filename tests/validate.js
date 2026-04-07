#!/usr/bin/env node
/**
 * Validation script for Flux
 * - Validates program.json schema
 * - Checks HTML/JS/CSS syntax
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let hasErrors = false;

function error(msg) {
  console.error(`❌ ${msg}`);
  hasErrors = true;
}

function success(msg) {
  console.log(`✓ ${msg}`);
}

// Validate program.json schema
function validateProgramJson() {
  console.log('\n📋 Validating program.json...\n');

  const programPath = path.join(ROOT, 'data', 'program.json');

  if (!fs.existsSync(programPath)) {
    error('data/program.json not found');
    return;
  }

  let program;
  try {
    const content = fs.readFileSync(programPath, 'utf-8');
    program = JSON.parse(content);
    success('Valid JSON syntax');
  } catch (e) {
    error(`Invalid JSON: ${e.message}`);
    return;
  }

  // Check meta
  if (!program.meta) {
    error('Missing "meta" object');
  } else {
    if (!program.meta.startDate) error('Missing meta.startDate');
    if (!program.meta.version) error('Missing meta.version');
    success('meta object valid');
  }

  // Check phases
  if (!Array.isArray(program.phases)) {
    error('Missing "phases" array');
    return;
  }

  program.phases.forEach((phase, i) => {
    const prefix = `phases[${i}]`;

    if (!phase.id) error(`${prefix}: missing id`);
    if (!phase.name) error(`${prefix}: missing name`);
    if (typeof phase.duration_weeks !== 'number') {
      error(`${prefix}: duration_weeks must be a number`);
    }

    if (phase.schedule_pattern) {
      if (!Array.isArray(phase.schedule_pattern)) {
        error(`${prefix}: schedule_pattern must be an array`);
      } else if (phase.schedule_pattern.length !== 7) {
        error(`${prefix}: schedule_pattern should have 7 days`);
      }
    }

    if (phase.workouts && typeof phase.workouts === 'object') {
      Object.entries(phase.workouts).forEach(([key, workout]) => {
        if (!workout.name) error(`${prefix}.workouts.${key}: missing name`);
        if (!Array.isArray(workout.exercises)) {
          error(`${prefix}.workouts.${key}: exercises must be an array`);
        } else {
          workout.exercises.forEach((ex, j) => {
            const exPrefix = `${prefix}.workouts.${key}.exercises[${j}]`;
            if (!ex.name) error(`${exPrefix}: missing name`);
            if (typeof ex.sets !== 'number') error(`${exPrefix}: sets must be a number`);
            if (!ex.reps) error(`${exPrefix}: missing reps`);
          });
        }
      });
      success(`${prefix} workouts valid`);
    }
  });

  success(`Validated ${program.phases.length} phase(s)`);
}

// Validate program principles (injury prevention, mobility requirements)
function validatePrinciples() {
  console.log('\n🛡️ Validating program principles...\n');

  const programPath = path.join(ROOT, 'data', 'program.json');
  let program;

  try {
    program = JSON.parse(fs.readFileSync(programPath, 'utf-8'));
  } catch (e) {
    error('Cannot validate principles: program.json parse failed');
    return;
  }

  // Check required principles in meta
  const requiredPrinciples = [
    'injury_prevention',
    'mobility_every_phase',
    'form_over_load',
    'longevity_focus'
  ];

  if (!program.meta.principles) {
    error('Missing meta.principles array');
  } else {
    const missing = requiredPrinciples.filter(p => !program.meta.principles.includes(p));
    if (missing.length > 0) {
      error(`Missing required principles: ${missing.join(', ')}`);
    } else {
      success('All required principles declared');
    }
  }

  // Check each phase has mobility-focused workout
  const mobilityKeywords = ['mobility', 'flexibility', 'recovery', 'stretch', 'flow'];

  program.phases.forEach((phase, i) => {
    if (!phase.workouts || Object.keys(phase.workouts).length === 0) {
      // Skip placeholder phases
      return;
    }

    const workoutNames = Object.values(phase.workouts).map(w => w.name.toLowerCase());
    const hasMobility = workoutNames.some(name =>
      mobilityKeywords.some(keyword => name.includes(keyword))
    );

    if (!hasMobility) {
      error(`phases[${i}] (${phase.name}): No mobility-focused workout found`);
    } else {
      success(`phases[${i}] includes mobility work`);
    }
  });
}

// Check required files exist
function validateFileStructure() {
  console.log('\n📁 Validating file structure...\n');

  const required = ['index.html', 'style.css', 'app.js', 'data/program.json'];

  required.forEach(file => {
    const filePath = path.join(ROOT, file);
    if (fs.existsSync(filePath)) {
      success(`${file} exists`);
    } else {
      error(`${file} missing`);
    }
  });
}

// Basic syntax checks
function validateSyntax() {
  console.log('\n🔍 Validating syntax...\n');

  // Check HTML has required elements
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

  if (!html.includes('<!DOCTYPE html>')) error('index.html: missing DOCTYPE');
  if (!html.includes('<meta name="viewport"')) error('index.html: missing viewport meta');
  if (!html.includes('app.js')) error('index.html: missing app.js reference');
  if (!html.includes('style.css')) error('index.html: missing style.css reference');
  if (html.includes('<!DOCTYPE html>')) success('index.html structure valid');

  // Check JS for obvious issues
  const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf-8');

  if (!js.includes('localStorage')) error('app.js: missing localStorage usage');
  if (!js.includes('fetch')) error('app.js: missing fetch for loading JSON');
  if (js.includes('localStorage')) success('app.js uses localStorage');
  if (js.includes('fetch')) success('app.js uses fetch API');

  // Check CSS has dark theme colors
  const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf-8');

  if (!css.includes(':root')) error('style.css: missing :root variables');
  if (!css.includes('--bg-primary')) error('style.css: missing --bg-primary variable');
  if (css.includes(':root')) success('style.css uses CSS variables');
}

// Validate exercise naming (one exercise per entry)
function validateExerciseNaming() {
  console.log('\n🏷️ Validating exercise naming...\n');

  const programPath = path.join(ROOT, 'data', 'program.json');
  let program;

  try {
    program = JSON.parse(fs.readFileSync(programPath, 'utf-8'));
  } catch (e) {
    error('Cannot validate exercises: program.json parse failed');
    return;
  }

  // Patterns that suggest multiple exercises in one entry
  const multiExercisePatterns = [
    { pattern: /\s+&\s+/, desc: '"&" joining exercises' },
    { pattern: /\s+and\s+/i, desc: '"and" joining exercises' },
    { pattern: /\s+\+\s+/, desc: '"+" joining exercises' },
  ];

  let violations = 0;

  program.phases.forEach((phase, i) => {
    if (!phase.workouts) return;

    Object.entries(phase.workouts).forEach(([key, workout]) => {
      if (!workout.exercises) return;

      workout.exercises.forEach((ex, j) => {
        // Skip checking after colon (allows "Warmup: Exercise Name")
        const nameToCheck = ex.name.includes(':')
          ? ex.name.split(':')[1]
          : ex.name;

        for (const { pattern, desc } of multiExercisePatterns) {
          if (pattern.test(nameToCheck)) {
            error(`phases[${i}].workouts.${key}.exercises[${j}]: "${ex.name}" appears to contain multiple exercises (${desc}). Each entry should be one exercise.`);
            violations++;
            break;
          }
        }
      });
    });
  });

  if (violations === 0) {
    success('All exercises are single-movement entries');
  }
}

// Run all validations
console.log('🏋️ Flux Validation Suite\n');
console.log('='.repeat(40));

validateFileStructure();
validateProgramJson();
validatePrinciples();
validateExerciseNaming();
validateSyntax();

console.log('\n' + '='.repeat(40));

if (hasErrors) {
  console.error('\n❌ Validation failed with errors\n');
  process.exit(1);
} else {
  console.log('\n✅ All validations passed\n');
  process.exit(0);
}

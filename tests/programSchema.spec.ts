import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { EXERCISE_CATALOG } from '../src/data/exerciseCatalog';
import { EQUIPMENT_CATALOG } from '../src/data/equipmentCatalog';
import type { ExerciseCatalog } from '../src/data/types';
import {
  validatePrinciples,
  validateProgramSchema,
  type InventoryView,
} from '../src/db/programSchema';
import { validateExerciseCatalog } from '../scripts/validate-catalog';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(__dirname, 'fixtures');

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(fixtures, name), 'utf8'));
}

test.describe('program schema validators', () => {
  test('valid fixture passes both validators', () => {
    const program = loadFixture('program-valid.json');
    const schema = validateProgramSchema(program, EXERCISE_CATALOG);
    const principles = validatePrinciples(program);
    expect(schema.errors).toEqual([]);
    expect(schema.ok).toBe(true);
    expect(principles.errors).toEqual([]);
    expect(principles.ok).toBe(true);
  });

  test('missing-mobility fixture is flagged by principles, not schema', () => {
    const program = loadFixture('program-missing-mobility.json');
    const schema = validateProgramSchema(program, EXERCISE_CATALOG);
    const principles = validatePrinciples(program);
    expect(schema.ok).toBe(true);
    expect(principles.ok).toBe(false);
    expect(
      principles.errors.some((e) => e.message.includes('no mobility-focused workout')),
    ).toBe(true);
  });

  test('missing-principles fixture is flagged by principles', () => {
    const program = loadFixture('program-missing-principles.json');
    const principles = validatePrinciples(program);
    expect(principles.ok).toBe(false);
    expect(
      principles.errors.some((e) =>
        e.message.includes('mobility_every_phase'),
      ),
    ).toBe(true);
  });

  test('unknown-exercise fixture is flagged by schema cross-reference check', () => {
    const program = loadFixture('program-unknown-exercise.json');
    const schema = validateProgramSchema(program, EXERCISE_CATALOG);
    expect(schema.ok).toBe(false);
    expect(
      schema.errors.some((e) =>
        e.message.includes('phantom-exercise-not-in-catalog'),
      ),
    ).toBe(true);
  });

  test('omitting inventory leaves warnings undefined (backward compat)', () => {
    const program = loadFixture('program-valid.json');
    const schema = validateProgramSchema(program, EXERCISE_CATALOG);
    expect(schema.ok).toBe(true);
    expect(schema.warnings).toBeUndefined();
  });

  test('empty inventory warns for every non-bodyweight exercise', () => {
    const program = loadFixture('program-valid.json');
    const inventory: InventoryView = {};
    const schema = validateProgramSchema(program, EXERCISE_CATALOG, inventory);
    expect(schema.ok).toBe(true);
    expect(schema.warnings).toBeDefined();
    const warnings = schema.warnings ?? [];
    // program-valid references: warmup-band-pull-aparts (resistance-band),
    // goblet-squats (kettlebell, alt dumbbell), swedish-ladder-pushups
    // (swedish-ladder, alt bodyweight — SUPPORTED), trx-inverted-rows (trx).
    // Mobility entries are bodyweight only.
    const paths = warnings.map((w) => w.path).sort();
    expect(paths).toEqual(
      [
        'phases[0].workouts.A.exercises[0]',
        'phases[0].workouts.A.exercises[1]',
        'phases[1].workouts.B.exercises[1]',
      ].sort(),
    );
    warnings.forEach((w) => expect(w.message).toMatch(/not in inventory/));
  });

  test('inventory covering every kind produces zero warnings', () => {
    const program = loadFixture('program-valid.json');
    const inventory: InventoryView = {
      kettlebell: { ownedWeights: [25, 35] },
      'resistance-band': { ownedWeights: [] },
      trx: { ownedWeights: [] },
      'swedish-ladder': { ownedWeights: [] },
    };
    const schema = validateProgramSchema(program, EXERCISE_CATALOG, inventory);
    expect(schema.ok).toBe(true);
    expect(schema.warnings).toEqual([]);
  });

  test('equipmentAlternatives are honored when the alternative is owned', () => {
    // goblet-squats requires kettlebell, alternative dumbbell.
    // Inventory has dumbbell but not kettlebell — should be supported.
    const program = loadFixture('program-valid.json');
    const inventory: InventoryView = {
      dumbbell: { ownedWeights: [20] },
      'resistance-band': { ownedWeights: [] },
      trx: { ownedWeights: [] },
      'swedish-ladder': { ownedWeights: [] },
    };
    const schema = validateProgramSchema(program, EXERCISE_CATALOG, inventory);
    expect(schema.warnings).toEqual([]);
  });

  test('warnings never flip ok to false', () => {
    const program = loadFixture('program-valid.json');
    const inventory: InventoryView = {};
    const schema = validateProgramSchema(program, EXERCISE_CATALOG, inventory);
    expect(schema.warnings && schema.warnings.length > 0).toBe(true);
    expect(schema.ok).toBe(true);
  });

  test('bodyweight is always covered, even with an empty inventory', () => {
    // Build a tiny program referencing only mobility (bodyweight) exercises.
    const bodyweightOnly = {
      meta: {
        startDate: '2026-01-01',
        version: 'bw-only',
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
          name: 'Mobility Phase',
          duration_weeks: 1,
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
              ],
            },
          },
        },
      ],
    };
    const schema = validateProgramSchema(
      bodyweightOnly,
      EXERCISE_CATALOG,
      {},
    );
    expect(schema.ok).toBe(true);
    expect(schema.warnings).toEqual([]);
  });

});

test.describe('validateExerciseCatalog (from scripts/validate-catalog.ts)', () => {
  test('current catalog passes', () => {
    const findings = validateExerciseCatalog(EXERCISE_CATALOG, EQUIPMENT_CATALOG);
    expect(findings).toEqual([]);
  });

  test('flags an exercise referencing a non-existent equipment kind in equipmentRequired', () => {
    const broken: ExerciseCatalog = {
      ...EXERCISE_CATALOG,
      'broken-exercise': {
        id: 'broken-exercise',
        name: 'Broken Exercise',
        muscleGroups: ['back'],
        // @ts-expect-error — intentionally invalid kind for the test
        equipmentRequired: ['totally-fake-kind'],
        usesWeight: false,
      },
    };
    const findings = validateExerciseCatalog(broken, EQUIPMENT_CATALOG);
    expect(findings.length).toBeGreaterThan(0);
    expect(
      findings.some(
        (f) =>
          f.message.includes('broken-exercise') &&
          f.message.includes('totally-fake-kind'),
      ),
    ).toBe(true);
  });

  test('flags an exercise referencing a non-existent equipment kind inside equipmentAlternatives', () => {
    const broken: ExerciseCatalog = {
      ...EXERCISE_CATALOG,
      'broken-alt-exercise': {
        id: 'broken-alt-exercise',
        name: 'Broken Alt Exercise',
        muscleGroups: ['back'],
        equipmentRequired: ['kettlebell'],
        // @ts-expect-error — intentionally invalid kind for the test
        equipmentAlternatives: [['nonexistent-thing']],
        usesWeight: false,
      },
    };
    const findings = validateExerciseCatalog(broken, EQUIPMENT_CATALOG);
    expect(
      findings.some(
        (f) =>
          f.message.includes('broken-alt-exercise') &&
          f.message.includes('nonexistent-thing'),
      ),
    ).toBe(true);
  });
});

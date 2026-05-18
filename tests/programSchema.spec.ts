import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { EXERCISE_CATALOG } from '../src/data/exerciseCatalog';
import {
  validatePrinciples,
  validateProgramSchema,
} from '../src/db/programSchema';

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
});

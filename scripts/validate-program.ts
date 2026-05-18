#!/usr/bin/env tsx
// Loads the workout program data and runs both validators. Prints every
// finding and exits non-zero if either validator reports an error. Wired into
// the `Program Principles` CI job — see .github/workflows/test.yml.

import { program } from '../src/tabs/Workouts/data/program';
import {
  validatePrinciples,
  validateProgramSchema,
} from '../src/db/programSchema';

const schema = validateProgramSchema(program);
const principles = validatePrinciples(program);

function report(title: string, ok: boolean, errors: { path: string; message: string }[]) {
  const tag = ok ? 'OK' : 'FAIL';
  console.log(`[${tag}] ${title}`);
  for (const e of errors) {
    console.log(`  - ${e.path}: ${e.message}`);
  }
}

report('schema', schema.ok, schema.errors);
report('principles', principles.ok, principles.errors);

if (!schema.ok || !principles.ok) {
  console.error('\nProgram validation failed.');
  process.exit(1);
}

console.log('\nProgram validation passed.');

#!/usr/bin/env tsx
// Validates the static exercise catalog (src/data/exerciseCatalog.ts) which
// ships as the source of truth for every exercise Flux knows about. Wired
// into the `Catalog Validation` CI job — see .github/workflows/test.yml.

import { EXERCISE_CATALOG } from '../src/data/exerciseCatalog';

interface Finding {
  path: string;
  message: string;
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const findings: Finding[] = [];
const seenNames = new Map<string, string>();

for (const [key, entry] of Object.entries(EXERCISE_CATALOG)) {
  const path = `catalog["${key}"]`;

  if (!ID_PATTERN.test(key)) {
    findings.push({
      path,
      message: `key "${key}" must be kebab-case (lowercase letters/digits/hyphens, no leading/trailing hyphen)`,
    });
  }

  if (!entry || typeof entry !== 'object') {
    findings.push({ path, message: 'entry must be an object' });
    continue;
  }

  if (typeof entry.id !== 'string' || entry.id.length === 0) {
    findings.push({ path: `${path}.id`, message: 'must be a non-empty string' });
  } else {
    if (entry.id !== key) {
      findings.push({
        path: `${path}.id`,
        message: `id "${entry.id}" does not match object key "${key}"`,
      });
    }
    if (!ID_PATTERN.test(entry.id)) {
      findings.push({
        path: `${path}.id`,
        message: `id "${entry.id}" must be kebab-case (lowercase letters/digits/hyphens, no leading/trailing hyphen)`,
      });
    }
  }

  if (typeof entry.name !== 'string' || entry.name.length === 0) {
    findings.push({ path: `${path}.name`, message: 'must be a non-empty string' });
  } else {
    const prev = seenNames.get(entry.name);
    if (prev !== undefined) {
      findings.push({
        path: `${path}.name`,
        message: `duplicate name "${entry.name}" also used by "${prev}"`,
      });
    } else {
      seenNames.set(entry.name, key);
    }
  }

  if (!Array.isArray(entry.muscleGroups)) {
    findings.push({
      path: `${path}.muscleGroups`,
      message: 'must be an array',
    });
  } else if (entry.muscleGroups.length === 0) {
    findings.push({
      path: `${path}.muscleGroups`,
      message: 'must be non-empty',
    });
  } else {
    entry.muscleGroups.forEach((g, i) => {
      if (typeof g !== 'string' || g.length === 0) {
        findings.push({
          path: `${path}.muscleGroups[${i}]`,
          message: 'must be a non-empty string',
        });
      }
    });
  }
}

const tag = findings.length === 0 ? 'OK' : 'FAIL';
console.log(`[${tag}] exercise catalog (${Object.keys(EXERCISE_CATALOG).length} entries)`);
for (const f of findings) {
  console.log(`  - ${f.path}: ${f.message}`);
}

if (findings.length > 0) {
  console.error('\nCatalog validation failed.');
  process.exit(1);
}

console.log('\nCatalog validation passed.');

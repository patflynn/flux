#!/usr/bin/env tsx
// Validates the static exercise catalog (src/data/exerciseCatalog.ts) which
// ships as the source of truth for every exercise Flux knows about. Wired
// into the `Catalog Validation` CI job — see .github/workflows/test.yml.

import { EXERCISE_CATALOG } from '../src/data/exerciseCatalog';
import { EQUIPMENT_CATALOG } from '../src/data/equipmentCatalog';
import type { ExerciseCatalog } from '../src/data/types';
import type { EquipmentCatalog } from '../src/data/equipmentCatalog';

export interface Finding {
  path: string;
  message: string;
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateExerciseCatalog(
  catalog: ExerciseCatalog,
  equipmentCatalog: EquipmentCatalog,
): Finding[] {
  const findings: Finding[] = [];
  const seenNames = new Map<string, string>();

  for (const [key, entry] of Object.entries(catalog)) {
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

    if (!Array.isArray(entry.equipmentRequired)) {
      findings.push({
        path: `${path}.equipmentRequired`,
        message: 'must be an array',
      });
    } else if (entry.equipmentRequired.length === 0) {
      findings.push({
        path: `${path}.equipmentRequired`,
        message: 'must be non-empty (use ["bodyweight"] when no equipment is needed)',
      });
    } else {
      entry.equipmentRequired.forEach((kind, i) => {
        if (typeof kind !== 'string' || !(kind in equipmentCatalog)) {
          findings.push({
            path: `${path}.equipmentRequired[${i}]`,
            message: `exercise "${entry.id}" references unknown equipment kind "${String(kind)}" — not present in EQUIPMENT_CATALOG`,
          });
        }
      });
    }

    if (entry.equipmentAlternatives !== undefined) {
      if (!Array.isArray(entry.equipmentAlternatives)) {
        findings.push({
          path: `${path}.equipmentAlternatives`,
          message: 'must be an array of arrays',
        });
      } else {
        entry.equipmentAlternatives.forEach((group, gi) => {
          if (!Array.isArray(group) || group.length === 0) {
            findings.push({
              path: `${path}.equipmentAlternatives[${gi}]`,
              message: 'each alternative must be a non-empty array',
            });
            return;
          }
          group.forEach((kind, i) => {
            if (typeof kind !== 'string' || !(kind in equipmentCatalog)) {
              findings.push({
                path: `${path}.equipmentAlternatives[${gi}][${i}]`,
                message: `exercise "${entry.id}" references unknown equipment kind "${String(kind)}" — not present in EQUIPMENT_CATALOG`,
              });
            }
          });
        });
      }
    }
  }

  return findings;
}

// CLI entry point — only fires when this file is run directly, so the module
// stays importable from tests.
const invokedAsScript = (() => {
  if (typeof process === 'undefined' || !Array.isArray(process.argv)) return false;
  const arg = process.argv[1];
  if (typeof arg !== 'string') return false;
  return arg.endsWith('validate-catalog.ts') || arg.endsWith('validate-catalog.js');
})();

if (invokedAsScript) {
  const findings = validateExerciseCatalog(EXERCISE_CATALOG, EQUIPMENT_CATALOG);
  const tag = findings.length === 0 ? 'OK' : 'FAIL';
  console.log(
    `[${tag}] exercise catalog (${Object.keys(EXERCISE_CATALOG).length} entries)`,
  );
  for (const f of findings) {
    console.log(`  - ${f.path}: ${f.message}`);
  }
  if (findings.length > 0) {
    console.error('\nCatalog validation failed.');
    process.exit(1);
  }
  console.log('\nCatalog validation passed.');
}

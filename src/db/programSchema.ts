// Program-data validators. Cross-checks every workout exercise reference
// against the source-of-truth exercise catalog so a program cannot ship with
// unknown exercise_ids. Mobility / principles enforcement remains load-bearing
// for the workout app's safety philosophy (mobility-first, injury-prevention).

import type { Program } from '../tabs/Workouts/types';
import type { ExerciseCatalog } from '../data/types';
import type { EquipmentKind } from '../data/equipmentCatalog';

export interface Finding {
  path: string;
  message: string;
}

// User inventory shape — PR-B owns the actual storage; this is just the
// minimum shape needed for cross-check here.
export type InventoryView = Partial<Record<EquipmentKind, { ownedWeights: number[] }>>;

export interface ValidationResult {
  ok: boolean;
  errors: Finding[];
  warnings?: Finding[];
}

export const REQUIRED_PRINCIPLES = [
  'injury_prevention',
  'mobility_every_phase',
  'form_over_load',
  'longevity_focus',
] as const;

const MOBILITY_KEYWORDS = ['mobility', 'flexibility', 'recovery', 'stretch', 'flow'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function groupCoveredByInventory(
  group: EquipmentKind[],
  ownedKinds: ReadonlySet<EquipmentKind>,
): boolean {
  return group.every((k) => k === 'bodyweight' || ownedKinds.has(k));
}

export function validateProgramSchema(
  p: unknown,
  catalog: ExerciseCatalog,
  inventory?: InventoryView,
): ValidationResult {
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const ownedKinds: ReadonlySet<EquipmentKind> | null = inventory
    ? new Set(Object.keys(inventory) as EquipmentKind[])
    : null;

  if (!isObject(p)) {
    return { ok: false, errors: [{ path: '$', message: 'program must be an object' }] };
  }

  if (!isObject(p.meta)) {
    errors.push({ path: 'meta', message: 'missing meta object' });
  } else {
    if (typeof p.meta.startDate !== 'string') {
      errors.push({ path: 'meta.startDate', message: 'must be a string' });
    }
    if (typeof p.meta.version !== 'string') {
      errors.push({ path: 'meta.version', message: 'must be a string' });
    }
  }

  if (!Array.isArray(p.phases)) {
    errors.push({ path: 'phases', message: 'must be an array' });
    return ownedKinds
      ? { ok: errors.length === 0, errors, warnings }
      : { ok: errors.length === 0, errors };
  }

  p.phases.forEach((phase, i) => {
    const prefix = `phases[${i}]`;
    if (!isObject(phase)) {
      errors.push({ path: prefix, message: 'must be an object' });
      return;
    }
    if (typeof phase.id !== 'string') {
      errors.push({ path: `${prefix}.id`, message: 'missing id' });
    }
    if (typeof phase.name !== 'string') {
      errors.push({ path: `${prefix}.name`, message: 'missing name' });
    }
    if (typeof phase.duration_weeks !== 'number') {
      errors.push({
        path: `${prefix}.duration_weeks`,
        message: 'must be a number',
      });
    }
    if (phase.schedule_pattern !== undefined) {
      if (!Array.isArray(phase.schedule_pattern)) {
        errors.push({
          path: `${prefix}.schedule_pattern`,
          message: 'must be an array',
        });
      } else if (phase.schedule_pattern.length !== 7) {
        errors.push({
          path: `${prefix}.schedule_pattern`,
          message: 'should have 7 days',
        });
      }
    }
    if (isObject(phase.workouts)) {
      for (const [key, w] of Object.entries(phase.workouts)) {
        const wPath = `${prefix}.workouts.${key}`;
        if (!isObject(w)) {
          errors.push({ path: wPath, message: 'must be an object' });
          continue;
        }
        if (typeof w.name !== 'string') {
          errors.push({ path: `${wPath}.name`, message: 'missing name' });
        }
        if (!Array.isArray(w.exercises)) {
          errors.push({
            path: `${wPath}.exercises`,
            message: 'must be an array',
          });
          continue;
        }
        w.exercises.forEach((ex, j) => {
          const exPath = `${wPath}.exercises[${j}]`;
          if (!isObject(ex)) {
            errors.push({ path: exPath, message: 'must be an object' });
            return;
          }
          if (typeof ex.exercise_id !== 'string') {
            errors.push({
              path: `${exPath}.exercise_id`,
              message: 'must be a string',
            });
          } else if (!catalog[ex.exercise_id] && ex.from_legacy_import !== true) {
            errors.push({
              path: `${exPath}.exercise_id`,
              message: `unknown exercise_id "${ex.exercise_id}" not present in catalog`,
            });
          } else if (ownedKinds && typeof ex.exercise_id === 'string') {
            const cat = catalog[ex.exercise_id];
            if (cat) {
              const required = cat.equipmentRequired;
              const alts = cat.equipmentAlternatives ?? [];
              const supported =
                groupCoveredByInventory(required, ownedKinds) ||
                alts.some((g) => groupCoveredByInventory(g, ownedKinds));
              if (!supported) {
                const missing = required.filter(
                  (k) => k !== 'bodyweight' && !ownedKinds.has(k),
                );
                warnings.push({
                  path: exPath,
                  message: `requires ${missing.join(', ')}; not in inventory`,
                });
              }
            }
          }
          if (typeof ex.sets !== 'number') {
            errors.push({ path: `${exPath}.sets`, message: 'must be a number' });
          }
          if (!ex.reps) {
            errors.push({ path: `${exPath}.reps`, message: 'missing reps' });
          }
        });
      }
    }
  });

  return ownedKinds
    ? { ok: errors.length === 0, errors, warnings }
    : { ok: errors.length === 0, errors };
}

export function validatePrinciples(p: unknown): ValidationResult {
  const errors: Finding[] = [];

  if (!isObject(p) || !isObject(p.meta)) {
    return {
      ok: false,
      errors: [{ path: 'meta', message: 'cannot check principles without meta' }],
    };
  }

  const principles = p.meta.principles;
  if (!Array.isArray(principles)) {
    errors.push({ path: 'meta.principles', message: 'must be an array' });
  } else {
    const missing = REQUIRED_PRINCIPLES.filter(
      (req) => !(principles as unknown[]).includes(req),
    );
    if (missing.length > 0) {
      errors.push({
        path: 'meta.principles',
        message: `missing required principles: ${missing.join(', ')}`,
      });
    }
  }

  const constraints = p.meta.constraints;
  if (!isObject(constraints)) {
    errors.push({
      path: 'meta.constraints',
      message: 'must be an object (program principles enforcement)',
    });
  } else {
    if (constraints.mobility_required !== true) {
      errors.push({
        path: 'meta.constraints.mobility_required',
        message: 'must be true',
      });
    }
    if (
      typeof constraints.min_mobility_days_per_week !== 'number' ||
      constraints.min_mobility_days_per_week < 1
    ) {
      errors.push({
        path: 'meta.constraints.min_mobility_days_per_week',
        message: 'must be >= 1',
      });
    }
  }

  if (Array.isArray(p.phases)) {
    p.phases.forEach((phase, i) => {
      if (
        !isObject(phase) ||
        !isObject(phase.workouts) ||
        Object.keys(phase.workouts).length === 0
      ) {
        return;
      }
      const names = Object.values(phase.workouts).flatMap((w) =>
        isObject(w) && typeof w.name === 'string' ? [w.name.toLowerCase()] : [],
      );
      const hasMobility = names.some((n) =>
        MOBILITY_KEYWORDS.some((kw) => n.includes(kw)),
      );
      if (!hasMobility) {
        errors.push({
          path: `phases[${i}]`,
          message: `phase "${typeof phase.name === 'string' ? phase.name : '?'}" has no mobility-focused workout`,
        });
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

export function validateProgram(
  p: Program,
  catalog: ExerciseCatalog,
  inventory?: InventoryView,
): ValidationResult {
  const s = validateProgramSchema(p, catalog, inventory);
  const pr = validatePrinciples(p);
  const merged: ValidationResult = {
    ok: s.ok && pr.ok,
    errors: [...s.errors, ...pr.errors],
  };
  if (s.warnings !== undefined) {
    merged.warnings = s.warnings;
  }
  return merged;
}

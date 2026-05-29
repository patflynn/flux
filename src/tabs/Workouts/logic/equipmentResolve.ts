// Glue between an exercise's equipment requirements (catalog metadata) and
// the user's inventory (per-user state). The Workouts UI uses these helpers
// to constrain weight pickers and surface drift banners.

import { EQUIPMENT_CATALOG, type EquipmentKind } from '../../../data/equipmentCatalog';
import type { Inventory } from '../../../data/inventory';

// The helpers only need these fields from the catalog Exercise (or from a
// ResolvedExercise that forwarded them). Decoupling keeps them callable
// from the Workouts render without having to look the catalog up again.
export interface EquipmentResolvable {
  equipmentRequired?: EquipmentKind[];
  equipmentAlternatives?: EquipmentKind[][];
  usesWeight: boolean;
}

function isKindOwned(kind: EquipmentKind, inv: Inventory): boolean {
  if (kind === 'bodyweight') return true;
  return inv[kind] !== undefined;
}

function groupOwned(group: EquipmentKind[], inv: Inventory): boolean {
  return group.every((k) => isKindOwned(k, inv));
}

// Returns the EquipmentKind list that the user actually satisfies for this
// exercise: the primary requirement when fully owned, else the first
// alternatives group that's fully owned, else null. Used internally by both
// allowedWeightsForExercise and isExerciseSupportedByInventory.
function resolveSatisfiedGroup(
  ex: EquipmentResolvable,
  inv: Inventory,
): EquipmentKind[] | null {
  const required = ex.equipmentRequired ?? [];
  if (groupOwned(required, inv)) return required;
  for (const alt of ex.equipmentAlternatives ?? []) {
    if (groupOwned(alt, inv)) return alt;
  }
  return null;
}

// Returns the sorted-ascending list of weights the user can use for this
// exercise's equipment.
//   - null  → exercise doesn't use weight at all (no constraint)
//   - []    → exercise needs weight but user owns no compatible equipment
//   - [...] → owned weights, deduped, sorted ascending
export function allowedWeightsForExercise(
  ex: EquipmentResolvable,
  inv: Inventory,
): number[] | null {
  if (!ex.usesWeight) return null;

  const candidates: EquipmentKind[] = [];
  const required = ex.equipmentRequired ?? [];
  if (groupOwned(required, inv)) {
    candidates.push(...required);
  }
  for (const alt of ex.equipmentAlternatives ?? []) {
    if (groupOwned(alt, inv)) {
      candidates.push(...alt);
    }
  }

  if (candidates.length === 0) return [];

  const set = new Set<number>();
  for (const kind of candidates) {
    if (kind === 'bodyweight') continue;
    const meta = EQUIPMENT_CATALOG[kind];
    if (!meta || !meta.hasWeightSelection) continue;
    const item = inv[kind];
    if (!item) continue;
    for (const w of item.ownedWeights) {
      if (Number.isFinite(w) && w > 0) set.add(w);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

// Returns true when the user owns enough equipment (any of equipmentRequired
// OR any equipmentAlternatives group fully satisfied). 'bodyweight' is
// always considered owned.
export function isExerciseSupportedByInventory(
  ex: EquipmentResolvable,
  inv: Inventory,
): boolean {
  return resolveSatisfiedGroup(ex, inv) !== null;
}

// Returns the list of EquipmentKind values the user is missing relative to
// the exercise's primary requirement. Used by the drift banner to phrase
// "Requires kettlebell — not in your inventory."
export function missingKindsForExercise(
  ex: EquipmentResolvable,
  inv: Inventory,
): EquipmentKind[] {
  const required = ex.equipmentRequired ?? [];
  return required.filter((k) => !isKindOwned(k, inv));
}

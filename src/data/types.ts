// Exercise catalog types. The catalog is STATIC source-of-truth metadata
// about every exercise Flux supports. Workout programs (runtime data in
// IndexedDB) reference catalog entries by id.

import type { EquipmentKind } from './equipmentCatalog';

export interface Exercise {
  id: string;
  name: string;
  // Muscle groups primarily worked. Required; validated by scripts/validate-catalog.ts.
  muscleGroups: string[];
  // Equipment required to perform this exercise. AND semantics — the user
  // needs ALL listed kinds. Use ['bodyweight'] for unequipped exercises.
  equipmentRequired: EquipmentKind[];
  // Optional alternative equipment groups. Each inner array is one viable
  // substitution for equipmentRequired. Example: a kettlebell row could be
  // performed with a dumbbell, so equipmentAlternatives = [['dumbbell']].
  // Unused for most entries — reserved for PR-B / PR-C consumption.
  equipmentAlternatives?: EquipmentKind[][];
  // YouTube video id for a technique demo, if available.
  demoVideoId?: string;
  // Offset in seconds into the demo video where the technique starts.
  demoVideoStart?: number;
  // Short cueing / safety note that should be shown alongside the exercise.
  techniqueNote?: string;
  // Whether the exercise typically uses external weight (kettlebell, dumbbell,
  // barbell). Bodyweight / mobility entries set this false.
  usesWeight: boolean;
  // Defaults applied when a program entry omits them.
  defaultStartingWeight?: number;
  defaultWeightIncrement?: number;
}

export type ExerciseCatalog = Record<string, Exercise>;

// Exercise catalog types. The catalog is STATIC source-of-truth metadata
// about every exercise Flux supports. Workout programs (runtime data in
// IndexedDB) reference catalog entries by id.

export interface Exercise {
  id: string;
  name: string;
  // The muscle groups primarily worked. Empty means we don't have the data yet.
  // TODO: backfill muscleGroups for catalog entries that omit them.
  muscleGroups?: string[];
  // TODO: backfill equipment requirements (e.g., 'kettlebell', 'barbell', 'bodyweight').
  equipment?: string[];
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

import { EXERCISE_CATALOG } from '../../../data/exerciseCatalog';
import type { ResolvedExercise, WorkoutExercise } from '../types';

// Merge a workout's exercise prescription with the catalog metadata. When the
// catalog has no matching entry (legacy import that couldn't be mapped), fall
// back to the inlined exercise_name and flag the result as unmapped so the UI
// can show an indicator and skip demo/technique chrome.
export function resolveExercise(entry: WorkoutExercise): ResolvedExercise {
  const cat = EXERCISE_CATALOG[entry.exercise_id];
  if (cat) {
    return {
      id: cat.id,
      name: cat.name,
      unmapped: false,
      sets: entry.sets,
      reps: entry.reps,
      rest: entry.rest,
      demoVideoId: cat.demoVideoId,
      demoVideoStart: cat.demoVideoStart,
      techniqueNote: cat.techniqueNote,
      usesWeight: cat.usesWeight,
      startingWeight: entry.starting_weight ?? cat.defaultStartingWeight,
      weightIncrement: entry.weight_increment ?? cat.defaultWeightIncrement,
    };
  }
  return {
    id: entry.exercise_id,
    name: entry.exercise_name ?? entry.exercise_id,
    unmapped: true,
    sets: entry.sets,
    reps: entry.reps,
    rest: entry.rest,
    usesWeight: entry.starting_weight != null,
    startingWeight: entry.starting_weight,
    weightIncrement: entry.weight_increment,
  };
}

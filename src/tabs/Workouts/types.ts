import type { EquipmentKind } from '../../data/equipmentCatalog';
import type { LocationsState } from '../../data/inventory';

// Per-workout exercise prescription. References the exercise catalog by id;
// metadata (name, demo video, technique notes) lives in src/data/exerciseCatalog.ts.
export interface WorkoutExercise {
  exercise_id: string;
  sets: number;
  reps: string;
  rest: string;
  starting_weight?: number;
  weight_increment?: number;
  // Legacy-import fallback: when an imported program references an exercise
  // by name that does not map to a catalog entry, we keep the original name
  // here so the UI can still render it (without demos / technique cues).
  exercise_name?: string;
  from_legacy_import?: boolean;
}

// Catalog-resolved exercise prepared for rendering. Merges catalog metadata
// with the workout's per-entry prescription (sets/reps/rest/weight defaults).
export interface ResolvedExercise {
  id: string;
  name: string;
  unmapped: boolean;
  sets: number;
  reps: string;
  rest: string;
  demoVideoId?: string;
  demoVideoStart?: number;
  techniqueNote?: string;
  usesWeight: boolean;
  startingWeight?: number;
  weightIncrement?: number;
  // Forwarded from the catalog so callers can run inventory checks without
  // looking the entry up a second time.
  equipmentRequired?: EquipmentKind[];
  equipmentAlternatives?: EquipmentKind[][];
}

export interface Workout {
  name: string;
  focus: string;
  exercises: WorkoutExercise[];
}

export interface Phase {
  id: string;
  name: string;
  duration_weeks: number;
  description?: string;
  schedule_pattern?: string[];
  workouts: Record<string, Workout>;
}

export interface ProgramMeta {
  startDate: string;
  version: string;
  principles: string[];
  constraints: {
    mobility_required: boolean;
    min_mobility_days_per_week: number;
  };
}

export interface Program {
  meta: ProgramMeta;
  phases: Phase[];
}

export type Difficulty = 'easy' | 'good' | 'hard' | 'failed';

export interface LogEntry {
  exercise: string;
  weight?: number;
  difficulty?: Difficulty;
  notes?: string;
  completed?: boolean;
  day: number;
  timestamp: number;
  failedSet?: number;
  failedRep?: number;
}

export type LogMap = Record<string, LogEntry>;

export interface WorkoutState {
  globalDay: number;
  currentPhase: string;
}

export interface ExportPayload {
  log: LogMap;
  state: Partial<WorkoutState>;
  program?: Program;
  locations?: LocationsState;
}

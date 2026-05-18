export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  video_id?: string;
  video_start?: number;
  note?: string;
  uses_weight: boolean;
  starting_weight?: number;
  weight_increment?: number;
}

export interface Workout {
  name: string;
  focus: string;
  exercises: Exercise[];
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
}

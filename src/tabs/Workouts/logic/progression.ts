import type { LogEntry, LogMap, Phase } from '../types';

export const MAX_WEIGHT = 80;
export const MIN_WEIGHT = 5;

export function parseReps(repsStr: string): number {
  const match = String(repsStr).match(/\d+/);
  return match ? parseInt(match[0], 10) : 10;
}

function weekFromDay(day: number): number {
  return Math.floor((day - 1) / 7) + 1;
}

function isValidWeight(w: unknown): w is number {
  return typeof w === 'number' && Number.isFinite(w);
}

// Find the most recent log entry with a numeric weight for a given exercise.
function lastWeightedEntry(
  log: LogMap,
  exerciseName: string,
): LogEntry | null {
  let best: LogEntry | null = null;
  for (const entry of Object.values(log)) {
    if (entry.exercise === exerciseName && isValidWeight(entry.weight)) {
      if (!best || (entry.timestamp ?? 0) > (best.timestamp ?? 0)) {
        best = entry;
      }
    }
  }
  return best;
}

// Suggest the next weight for an exercise: increment from last logged weight
// when crossing a week boundary, otherwise hold last week's weight. Caps at
// MAX_WEIGHT — this preserves the old app's safety-first progression.
export function suggestWeight(
  log: LogMap,
  exerciseName: string,
  startingWeight: number | undefined,
  increment: number,
  currentDay: number,
): number {
  const last = lastWeightedEntry(log, exerciseName);
  if (!last || !isValidWeight(last.weight)) {
    return startingWeight ?? MIN_WEIGHT;
  }
  const lastWeek = weekFromDay(last.day);
  const currentWeek = weekFromDay(currentDay);
  if (currentWeek > lastWeek) {
    return Math.min(last.weight + increment, MAX_WEIGHT);
  }
  return last.weight;
}

export function getLastWeight(log: LogMap, exerciseName: string): number | null {
  const last = lastWeightedEntry(log, exerciseName);
  return last && isValidWeight(last.weight) ? last.weight : null;
}

// Pick today's workout key (e.g., 'A' / 'B' / 'C' / 'Rest') from the phase's
// 7-day schedule_pattern, indexed by globalDay.
export function workoutKeyForDay(phase: Phase, globalDay: number): string | null {
  if (!phase.schedule_pattern) return null;
  const i = (globalDay - 1) % phase.schedule_pattern.length;
  return phase.schedule_pattern[i] ?? null;
}

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

// Build a Map of exercise → most-recent weighted log entry in a single O(N)
// pass. Callers (e.g., the Workouts render) memoize this per-log and look
// each exercise up in O(1), avoiding the previous O(M*N) render cost.
export function buildLatestWeightedMap(log: LogMap): Map<string, LogEntry> {
  const map = new Map<string, LogEntry>();
  for (const entry of Object.values(log)) {
    if (!isValidWeight(entry.weight)) continue;
    const current = map.get(entry.exercise);
    if (!current || (entry.timestamp ?? 0) > (current.timestamp ?? 0)) {
      map.set(entry.exercise, entry);
    }
  }
  return map;
}

// Suggest the next weight given the last weighted entry: increment when
// crossing a week boundary, otherwise hold. Caps at MAX_WEIGHT — this
// preserves the old app's safety-first progression.
export function suggestWeight(
  last: LogEntry | null | undefined,
  startingWeight: number | undefined,
  increment: number,
  currentDay: number,
  allowedWeights?: number[] | null,
): number {
  let value: number;
  if (!last || !isValidWeight(last.weight)) {
    value = startingWeight ?? MIN_WEIGHT;
  } else {
    const lastWeek = weekFromDay(last.day);
    const currentWeek = weekFromDay(currentDay);
    value =
      currentWeek > lastWeek
        ? Math.min(last.weight + increment, MAX_WEIGHT)
        : last.weight;
  }
  if (allowedWeights && allowedWeights.length > 0) {
    // Snap DOWN to the highest owned weight ≤ value; if every owned weight is
    // heavier, return the smallest one (don't suggest something the user
    // doesn't own).
    let best: number | null = null;
    for (const w of allowedWeights) {
      if (w <= value && (best === null || w > best)) best = w;
    }
    if (best !== null) return best;
    return allowedWeights[0];
  }
  return value;
}

export function getLastWeight(last: LogEntry | null | undefined): number | null {
  return last && isValidWeight(last.weight) ? last.weight : null;
}

// Pick today's workout key (e.g., 'A' / 'B' / 'C' / 'Rest') from the phase's
// 7-day schedule_pattern, indexed by globalDay.
export function workoutKeyForDay(phase: Phase, globalDay: number): string | null {
  if (!phase.schedule_pattern) return null;
  const i = (globalDay - 1) % phase.schedule_pattern.length;
  return phase.schedule_pattern[i] ?? null;
}

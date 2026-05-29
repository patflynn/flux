// Export / import is the migration path from the old vanilla-JS app.
// The legacy backup schema is { log: { [key]: entry }, state: { globalDay, currentPhase } }
// where key is `${globalDay}_${exerciseIndex}` and entry is the LogEntry shape from
// types.ts. The new schema layers an optional `program` field on top — programs are
// runtime data, so an export now also bundles the program when one exists.

import { EXERCISE_CATALOG } from '../../../data/exerciseCatalog';
import {
  loadLocations,
  loadLog,
  loadProgram,
  loadState,
  putLogEntries,
  saveLocations,
  saveProgram,
  saveState,
  sanitizeLocationsState,
  sanitizeLogEntry,
} from '../state';
import { isInventoryConfigured } from '../../../data/inventory';
import type {
  ExportPayload,
  LogEntry,
  LogMap,
  Phase,
  Program,
  Workout,
  WorkoutExercise,
  WorkoutState,
} from '../types';

export async function exportPayload(): Promise<ExportPayload> {
  const [log, state, program, locations] = await Promise.all([
    loadLog(),
    loadState(),
    loadProgram(),
    loadLocations(),
  ]);
  const payload: ExportPayload = { log, state };
  if (program) payload.program = program;
  if (isInventoryConfigured(locations)) payload.locations = locations;
  return payload;
}

export function downloadExport(payload: ExportPayload, filename?: string): void {
  const today = new Date().toISOString().slice(0, 10);
  const name = filename ?? `flux-backup-${today}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  stateApplied: boolean;
  programApplied: boolean;
  inventoryApplied: boolean;
  // Populated when a program was imported. Reports how many of its exercises
  // resolved to a catalog entry by id, vs were kept by name as "unmapped".
  exerciseMapping?: {
    mapped: number;
    unmapped: number;
    total: number;
  };
}

export function formatImportMessage(result: ImportResult): string {
  const noun = result.total === 1 ? 'entry' : 'entries';
  const head =
    `Imported ${result.imported} of ${result.total} ${noun}` +
    (result.skipped ? ` (${result.skipped} skipped)` : '');
  const inv = result.inventoryApplied ? ' Inventory restored.' : '';
  if (!result.programApplied) {
    // Backup imported but no program inside. Old-app exports don't carry a
    // program — point the user at the per-tab importer.
    if (result.imported > 0) {
      return (
        `${head}. You still need to load a program — use "Import Program File" on the Workouts tab.${inv}`
      );
    }
    return head + inv;
  }
  const m = result.exerciseMapping;
  if (!m) return `${head}. Program loaded.${inv}`;
  if (m.unmapped === 0) {
    return `${head}. Program loaded; ${m.mapped} of ${m.total} exercises map to the Flux catalog.${inv}`;
  }
  return (
    `${head}. Imported. ${m.mapped} of ${m.total} exercises map to the Flux catalog.` +
    " Unmapped will still log correctly but won't show demos." +
    inv
  );
}

export interface ProgramImportResult {
  exerciseMapping: { mapped: number; unmapped: number; total: number };
}

export function formatProgramImportMessage(result: ProgramImportResult): string {
  const m = result.exerciseMapping;
  if (m.unmapped === 0) {
    return `Program loaded; ${m.mapped} of ${m.total} exercises map to the Flux catalog.`;
  }
  return (
    `Program loaded. ${m.mapped} of ${m.total} exercises map to the Flux catalog.` +
    " Unmapped will still log correctly but won't show demos."
  );
}

// Build a case-insensitive name → catalog id lookup once. The catalog is a
// module-level constant so this is computed at first call and reused.
let nameIndex: Map<string, string> | null = null;
function getNameIndex(): Map<string, string> {
  if (nameIndex) return nameIndex;
  const m = new Map<string, string>();
  for (const entry of Object.values(EXERCISE_CATALOG)) {
    m.set(entry.name.trim().toLowerCase(), entry.id);
  }
  nameIndex = m;
  return m;
}

// Look up a catalog entry by display name. Case-insensitive, whitespace
// trimmed. Returns the catalog id or null if no match. Used to migrate
// legacy program exports (which referenced exercises by name) into the
// id-based shape the catalog uses.
export function mapExerciseByName(name: string): string | null {
  if (typeof name !== 'string') return null;
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return getNameIndex().get(key) ?? null;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface MigrationStats {
  mapped: number;
  unmapped: number;
  total: number;
}

// Normalize a workout's exercises into the id-based shape. Detects format by
// sniffing keys: a legacy entry has a `name` field; the new shape has
// `exercise_id`. Returns the normalized list plus mapping stats so callers
// can surface a one-time toast about how many exercises matched the catalog.
function migrateWorkoutExercises(
  workout: Record<string, unknown>,
  stats: MigrationStats,
): WorkoutExercise[] {
  const raw = Array.isArray(workout.exercises) ? workout.exercises : [];
  const out: WorkoutExercise[] = [];
  for (const ex of raw) {
    if (!isObject(ex)) continue;
    const sets = typeof ex.sets === 'number' ? ex.sets : 0;
    const reps = typeof ex.reps === 'string' ? ex.reps : String(ex.reps ?? '');
    const rest = typeof ex.rest === 'string' ? ex.rest : '';
    const startingWeight =
      typeof ex.starting_weight === 'number' ? ex.starting_weight : undefined;
    const weightIncrement =
      typeof ex.weight_increment === 'number' ? ex.weight_increment : undefined;

    if (typeof ex.exercise_id === 'string' && ex.exercise_id.length > 0) {
      // Already in new format. Trust the export but still verify the id
      // exists in the catalog — unknown ids get the unmapped treatment.
      const id = ex.exercise_id;
      const mapped = id in EXERCISE_CATALOG;
      stats.total++;
      if (mapped) stats.mapped++;
      else stats.unmapped++;
      const entry: WorkoutExercise = { exercise_id: id, sets, reps, rest };
      if (startingWeight !== undefined) entry.starting_weight = startingWeight;
      if (weightIncrement !== undefined) entry.weight_increment = weightIncrement;
      if (!mapped) {
        entry.exercise_name =
          typeof ex.exercise_name === 'string' ? ex.exercise_name : id;
        entry.from_legacy_import = true;
      }
      out.push(entry);
      continue;
    }

    const name = typeof ex.name === 'string' ? ex.name : '';
    if (!name) continue;
    stats.total++;
    const matched = mapExerciseByName(name);
    const entry: WorkoutExercise = {
      exercise_id: matched ?? (slugify(name) || 'unknown'),
      sets,
      reps,
      rest,
    };
    if (startingWeight !== undefined) entry.starting_weight = startingWeight;
    if (weightIncrement !== undefined) entry.weight_increment = weightIncrement;
    if (matched) {
      stats.mapped++;
    } else {
      stats.unmapped++;
      entry.exercise_name = name;
      entry.from_legacy_import = true;
    }
    out.push(entry);
  }
  return out;
}

function migrateProgram(raw: unknown): { program: Program; stats: MigrationStats } | null {
  if (!isObject(raw)) return null;
  if (!isObject(raw.meta)) return null;
  if (!Array.isArray(raw.phases)) return null;

  const stats: MigrationStats = { mapped: 0, unmapped: 0, total: 0 };
  const phases: Phase[] = [];
  for (const ph of raw.phases) {
    if (!isObject(ph)) continue;
    const workouts: Record<string, Workout> = {};
    if (isObject(ph.workouts)) {
      for (const [key, w] of Object.entries(ph.workouts)) {
        if (!isObject(w)) continue;
        workouts[key] = {
          name: typeof w.name === 'string' ? w.name : key,
          focus: typeof w.focus === 'string' ? w.focus : '',
          exercises: migrateWorkoutExercises(w, stats),
        };
      }
    }
    phases.push({
      id: typeof ph.id === 'string' ? ph.id : '',
      name: typeof ph.name === 'string' ? ph.name : '',
      duration_weeks:
        typeof ph.duration_weeks === 'number' ? ph.duration_weeks : 0,
      description:
        typeof ph.description === 'string' ? ph.description : undefined,
      schedule_pattern: Array.isArray(ph.schedule_pattern)
        ? ph.schedule_pattern.filter((d): d is string => typeof d === 'string')
        : undefined,
      workouts,
    });
  }

  const meta = raw.meta as Record<string, unknown>;
  const constraints = isObject(meta.constraints) ? meta.constraints : {};
  const program: Program = {
    meta: {
      startDate: typeof meta.startDate === 'string' ? meta.startDate : '',
      version: typeof meta.version === 'string' ? meta.version : '',
      principles: Array.isArray(meta.principles)
        ? meta.principles.filter((p): p is string => typeof p === 'string')
        : [],
      constraints: {
        mobility_required: constraints.mobility_required === true,
        min_mobility_days_per_week:
          typeof constraints.min_mobility_days_per_week === 'number'
            ? constraints.min_mobility_days_per_week
            : 0,
      },
    },
    phases,
  };
  return { program, stats };
}

// Apply an export payload to the current IDB. Sanitizes every entry, merges
// (skips keys that already exist), and optionally restores state. Programs in
// the payload are migrated to the id-based catalog shape — legacy exports
// (with name-based exercises) get name → id mapping via the catalog. Throws
// on payloads that don't match the legacy schema so the UI can surface an
// error.
export async function applyImport(
  raw: unknown,
  opts: { applyState?: boolean } = {},
): Promise<ImportResult> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid backup: not an object');
  }
  const data = raw as Record<string, unknown>;
  if (!data.log || typeof data.log !== 'object' || Array.isArray(data.log)) {
    throw new Error('Invalid backup: missing or malformed log');
  }

  const incoming = data.log as Record<string, unknown>;
  const keys = Object.keys(incoming);
  const existing = await loadLog();

  let imported = 0;
  let skipped = 0;
  const toWrite: Array<{ key: string; entry: LogEntry }> = [];
  for (const key of keys) {
    if (existing[key]) {
      skipped++;
      continue;
    }
    const sanitized = sanitizeLogEntry(incoming[key]);
    if (!sanitized) {
      skipped++;
      continue;
    }
    const entry: LogEntry = {
      exercise: sanitized.exercise ?? '',
      day: sanitized.day ?? 0,
      timestamp: sanitized.timestamp ?? Date.now(),
      ...sanitized,
    };
    toWrite.push({ key, entry });
    imported++;
  }
  // Single readwrite transaction for the whole batch — avoids per-entry
  // transaction overhead on bulk imports.
  await putLogEntries(toWrite);

  let stateApplied = false;
  if (opts.applyState && isObject(data.state)) {
    const s = data.state as Record<string, unknown>;
    const next: WorkoutState = {
      globalDay:
        typeof s.globalDay === 'number' && Number.isInteger(s.globalDay) && s.globalDay >= 1
          ? s.globalDay
          : 1,
      currentPhase: typeof s.currentPhase === 'string' ? s.currentPhase : 'p1',
    };
    await saveState(next);
    stateApplied = true;
  }

  let programApplied = false;
  let exerciseMapping: ImportResult['exerciseMapping'];
  if (data.program !== undefined) {
    const migrated = migrateProgram(data.program);
    if (migrated) {
      await saveProgram(migrated.program);
      programApplied = true;
      exerciseMapping = migrated.stats;
    }
  }

  let inventoryApplied = false;
  if (data.locations !== undefined) {
    // Absence means "don't touch existing inventory"; presence means restore
    // the sanitized payload. Unknown EquipmentKind keys and bad weights get
    // dropped by sanitizeLocationsState.
    const sanitized = sanitizeLocationsState(data.locations);
    await saveLocations(sanitized);
    inventoryApplied = true;
  }

  return {
    imported,
    skipped,
    total: keys.length,
    stateApplied,
    programApplied,
    inventoryApplied,
    ...(exerciseMapping ? { exerciseMapping } : {}),
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Apply just a program to flux-db. Accepts either a bare program object
// (`{meta, phases}`) or a backup envelope where it pulls the `program`
// field out. Never touches the log or workout state stores. Throws on
// shapes we can't make sense of — the empty-state CTA surfaces these
// errors inline.
export async function applyProgramImport(raw: unknown): Promise<ProgramImportResult> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid program file: not an object');
  }
  const data = raw as Record<string, unknown>;

  // Envelope sniffing: a backup envelope has log/state at the top level.
  // If we see those without a program, the caller picked the wrong file
  // for this button — point them at the backup importer.
  const looksLikeEnvelope = 'log' in data || 'state' in data;
  let candidate: unknown;
  if ('program' in data) {
    candidate = data.program;
  } else if (looksLikeEnvelope) {
    throw new Error(
      'No program in this file. To restore a backup with log + state, use the Import Backup button in the toolbar.',
    );
  } else {
    candidate = data;
  }

  const migrated = migrateProgram(candidate);
  if (!migrated) {
    throw new Error('Invalid program file: missing meta or phases');
  }
  await saveProgram(migrated.program);
  return { exerciseMapping: migrated.stats };
}

// Convenience for tests: read a File and apply.
export async function applyImportFromFile(
  file: File,
  opts?: { applyState?: boolean },
): Promise<ImportResult> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  return applyImport(parsed, opts);
}

export async function applyProgramImportFromFile(
  file: File,
): Promise<ProgramImportResult> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  return applyProgramImport(parsed);
}

export type { LogMap, Program };

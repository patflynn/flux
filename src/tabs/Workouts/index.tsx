import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  workoutKeyForDay,
  suggestWeight,
  getLastWeight,
  buildLatestWeightedMap,
} from './logic/progression';
import { resolveExercise } from './logic/resolveExercise';
import {
  DEFAULT_STATE,
  deleteLogEntry,
  loadLocations,
  loadLog,
  loadProgram,
  loadState,
  putLogEntry,
  saveState,
} from './state';
import {
  activeInventory,
  cloneDefaultLocationsState,
  isInventoryConfigured,
  type LocationsState,
} from '../../data/inventory';
import { EQUIPMENT_CATALOG, type EquipmentKind } from '../../data/equipmentCatalog';
import {
  allowedWeightsForExercise,
  isExerciseSupportedByInventory,
  missingKindsForExercise,
} from './logic/equipmentResolve';
import {
  applyProgramImportFromFile,
  formatProgramImportMessage,
} from './logic/exportImport';
import type { LogEntry, LogMap, Phase, Program, WorkoutState } from './types';
import { ExerciseCard } from './components/ExerciseCard';
import { VideoModal } from './components/VideoModal';

function getCurrentPhase(program: Program | null, state: WorkoutState): Phase | null {
  if (!program) return null;
  return program.phases.find((p) => p.id === state.currentPhase) ?? null;
}

function formatDriftMessage(missing: EquipmentKind[]): string {
  const names = missing.map((k) => EQUIPMENT_CATALOG[k]?.name.toLowerCase() ?? k);
  let list: string;
  if (names.length === 1) list = names[0];
  else if (names.length === 2) list = `${names[0]} and ${names[1]}`;
  else list = `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  return `Requires ${list} — not in your inventory.`;
}

interface VideoState {
  videoId: string;
  start?: number;
}

export function Workouts() {
  const [state, setState] = useState<WorkoutState>(DEFAULT_STATE);
  const [log, setLog] = useState<LogMap>({});
  const [video, setVideo] = useState<VideoState | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Programs are runtime data: they arrive via import or (future) AI
  // generation, persisted to the 'program' store in flux-db. No bundled
  // default — the empty state below covers a fresh install.
  const [program, setProgram] = useState<Program | null>(null);
  const [locations, setLocations] = useState<LocationsState>(
    cloneDefaultLocationsState,
  );

  useEffect(() => {
    (async () => {
      const [s, l, p, loc] = await Promise.all([
        loadState(),
        loadLog(),
        loadProgram(),
        loadLocations(),
      ]);
      setState(s);
      setLog(l);
      setProgram(p);
      setLocations(loc);
      setLoaded(true);
    })();
  }, []);

  function triggerProgramImport() {
    document
      .querySelector<HTMLInputElement>('[data-testid="import-program-input"]')
      ?.click();
  }

  const phase = getCurrentPhase(program, state);
  const workoutKey = phase ? workoutKeyForDay(phase, state.globalDay) : null;
  const workout = phase && workoutKey && workoutKey !== 'Rest' ? phase.workouts[workoutKey] : null;
  const week = Math.floor((state.globalDay - 1) / 7) + 1;

  const resolvedExercises = useMemo(
    () => workout?.exercises.map(resolveExercise) ?? [],
    [workout],
  );

  const completedCount = useMemo(() => {
    if (!workout) return 0;
    return resolvedExercises.reduce((count, _ex, i) => {
      const key = `${state.globalDay}_${i}`;
      return count + (log[key]?.completed ? 1 : 0);
    }, 0);
  }, [log, state.globalDay, workout, resolvedExercises]);

  // Compute latest-weighted-entry-per-exercise once per log change so render
  // is O(M) instead of O(M*N) (scanning the full log for every exercise).
  const latestWeights = useMemo(() => buildLatestWeightedMap(log), [log]);

  const inventory = useMemo(() => activeInventory(locations), [locations]);
  const inventoryConfigured = useMemo(
    () => isInventoryConfigured(locations),
    [locations],
  );

  const onLog = useCallback(
    (key: string, partial: Partial<LogEntry>, options?: { remove?: boolean }) => {
      const existing = log[key];
      const merged: Partial<LogEntry> = { ...existing, ...partial };

      for (const k of Object.keys(merged) as (keyof LogEntry)[]) {
        if (merged[k] === undefined) delete merged[k];
      }

      const meaningless =
        options?.remove ||
        (!merged.weight &&
          !merged.difficulty &&
          !merged.notes &&
          !merged.completed);

      if (meaningless) {
        setLog((prev) => {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        deleteLogEntry(key).catch(() => {});
      } else {
        const entry: LogEntry = {
          exercise: merged.exercise ?? existing?.exercise ?? '',
          day: merged.day ?? existing?.day ?? state.globalDay,
          timestamp: merged.timestamp ?? Date.now(),
          ...merged,
        };
        setLog((prev) => ({ ...prev, [key]: entry }));
        putLogEntry(key, entry).catch(() => {});
      }
    },
    [log, state.globalDay],
  );

  function nextDay() {
    if (state.globalDay >= 365) return;
    let nextPhaseId = state.currentPhase;
    const day = state.globalDay + 1;
    if (phase && program) {
      const daysInPhase = phase.duration_weeks * 7;
      if (day > daysInPhase) {
        const idx = program.phases.findIndex((p) => p.id === phase.id);
        if (idx >= 0 && idx < program.phases.length - 1) {
          nextPhaseId = program.phases[idx + 1].id;
        }
      }
    }
    const ns: WorkoutState = { globalDay: day, currentPhase: nextPhaseId };
    setState(ns);
    saveState(ns).catch(() => {});
  }

  function prevDay() {
    if (state.globalDay <= 1) return;
    const day = state.globalDay - 1;
    let nextPhaseId = state.currentPhase;
    if (phase && program) {
      const idx = program.phases.findIndex((p) => p.id === phase.id);
      if (idx > 0) {
        const prev = program.phases[idx - 1];
        if (day <= prev.duration_weeks * 7) nextPhaseId = prev.id;
      }
    }
    const ns: WorkoutState = { globalDay: day, currentPhase: nextPhaseId };
    setState(ns);
    saveState(ns).catch(() => {});
  }

  async function handleProgramImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const result = await applyProgramImportFromFile(file);
      const p = await loadProgram();
      setProgram(p);
      setImportMessage(formatProgramImportMessage(result));
    } catch (err) {
      setImportMessage(
        'Import failed: ' + (err instanceof Error ? err.message : 'unknown error'),
      );
    }
  }

  if (!loaded) {
    return (
      <section class="flex h-full items-center justify-center">
        <p class="text-xs uppercase tracking-[0.2em] text-flux-text-tertiary">Loading workout…</p>
      </section>
    );
  }

  const totalExercises = resolvedExercises.length;
  const progressPercent = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  return (
    <section class="mx-auto max-w-2xl space-y-6" data-testid="workouts-root">
      <header class="flex flex-col items-center gap-2 pt-2 text-center">
        <h1 class="text-sm font-medium uppercase tracking-[0.28em] text-flux-text-primary">
          Workouts
        </h1>
        <div class="flex items-baseline gap-2 text-[10px] uppercase tracking-[0.2em] text-flux-text-tertiary">
          <span>
            Day <span class="text-flux-text-primary" data-testid="day-counter">{state.globalDay}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Week <span class="text-flux-text-primary">{week}</span>
          </span>
          {phase && (
            <>
              <span aria-hidden="true">·</span>
              <span data-testid="phase-name">{phase.name}</span>
            </>
          )}
        </div>
      </header>

      {!program ? (
        <div
          class="rounded-[2rem] bg-flux-card p-8 text-center shadow-flux-card"
          data-testid="no-program"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
            Empty
          </p>
          <h2 class="mt-3 text-lg font-medium text-flux-text-primary">No program loaded</h2>
          <p class="mt-2 text-sm text-flux-text-secondary">
            Programs are user-specific. Import one to begin, or generate with AI (coming soon).
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              class="rounded-full bg-flux-accent px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-accent-fg shadow-flux-soft transition-opacity hover:opacity-90"
              onClick={triggerProgramImport}
              data-testid="import-program-btn"
            >
              Import program file
            </button>
            <button
              type="button"
              class="cursor-not-allowed rounded-full bg-flux-soft px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-text-tertiary"
              disabled
              data-testid="generate-ai-btn"
              title="AI program generation is on the roadmap."
            >
              Generate with AI (soon)
            </button>
          </div>
          <input
            type="file"
            accept="application/json,.json"
            class="hidden"
            onChange={handleProgramImport}
            data-testid="import-program-input"
          />
        </div>
      ) : workout ? (
        <>
          <div
            class="overflow-hidden rounded-[2rem] bg-flux-card p-6 shadow-flux-card"
            data-testid="workout-card"
          >
            <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
              {workout.focus}
            </p>
            <h2
              class="mt-2 text-2xl font-medium leading-tight text-flux-text-primary"
              data-testid="workout-name"
            >
              {workout.name}
            </h2>
            <div class="mt-5 flex items-center gap-3">
              <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-flux-soft">
                <div
                  class="h-full rounded-full bg-flux-accent transition-all"
                  style={{ width: `${progressPercent}%` }}
                  data-testid="session-progress"
                />
              </div>
              <span class="text-[10px] font-medium uppercase tracking-[0.15em] tabular-nums text-flux-text-tertiary">
                {completedCount}/{totalExercises}
              </span>
            </div>
          </div>

          <div class="space-y-4" data-testid="exercises-list">
            {resolvedExercises.map((ex, i) => {
              const key = `${state.globalDay}_${i}`;
              const last = latestWeights.get(ex.name) ?? null;
              const hasEquipmentMeta = ex.equipmentRequired !== undefined;
              const allowedWeights = hasEquipmentMeta
                ? allowedWeightsForExercise(ex, inventory)
                : null;
              const supported = hasEquipmentMeta
                ? isExerciseSupportedByInventory(ex, inventory)
                : true;
              const missing =
                inventoryConfigured && !supported && hasEquipmentMeta
                  ? missingKindsForExercise(ex, inventory)
                  : [];
              const suggested = ex.usesWeight
                ? suggestWeight(
                    last,
                    ex.startingWeight,
                    ex.weightIncrement ?? 5,
                    state.globalDay,
                    allowedWeights,
                  )
                : null;
              return (
                <div key={key} class="space-y-2">
                  {inventoryConfigured && !supported && missing.length > 0 && (
                    <div
                      class="rounded-2xl bg-flux-soft px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-flux-text-tertiary"
                      data-testid={`inventory-drift-${i}`}
                    >
                      {formatDriftMessage(missing)}
                    </div>
                  )}
                  <ExerciseCard
                    exercise={ex}
                    index={i}
                    globalDay={state.globalDay}
                    entry={log[key]}
                    suggestedWeight={suggested}
                    lastWeight={ex.usesWeight ? null : getLastWeight(last)}
                    allowedWeights={allowedWeights}
                    inventoryConfigured={inventoryConfigured}
                    onLog={onLog}
                    onPlayVideo={(videoId, start) => setVideo({ videoId, start })}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div
          class="rounded-[2rem] bg-flux-card p-8 text-center shadow-flux-card"
          data-testid="rest-day"
        >
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
            Today
          </p>
          <h2 class="mt-3 text-2xl font-medium text-flux-text-primary">Rest day</h2>
          <p class="mt-2 text-sm text-flux-text-secondary">
            Recovery is part of the program. Mobility welcome.
          </p>
        </div>
      )}

      <div class="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="button"
          class="rounded-full bg-flux-card px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary shadow-flux-soft transition-opacity hover:text-flux-text-primary disabled:opacity-40"
          onClick={prevDay}
          disabled={state.globalDay <= 1}
          data-testid="prev-day"
        >
          ← Back
        </button>
        <button
          type="button"
          class="rounded-full bg-flux-accent px-5 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-accent-fg shadow-flux-soft transition-opacity hover:opacity-90"
          onClick={nextDay}
          data-testid="next-day"
        >
          Complete & Advance →
        </button>
      </div>

      {importMessage && (
        <div
          class="flex items-start justify-between gap-2 rounded-2xl bg-flux-card px-4 py-3 text-xs text-flux-text-secondary shadow-flux-soft"
          data-testid="program-import-message"
        >
          <span class="flex-1">{importMessage}</span>
          <button
            type="button"
            onClick={() => setImportMessage(null)}
            class="shrink-0 text-flux-text-tertiary hover:text-flux-text-primary"
            aria-label="Dismiss"
            data-testid="program-import-message-dismiss"
          >
            ×
          </button>
        </div>
      )}

      {video && (
        <VideoModal
          videoId={video.videoId}
          start={video.start}
          onClose={() => setVideo(null)}
        />
      )}
    </section>
  );
}

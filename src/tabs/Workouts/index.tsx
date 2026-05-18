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
  clearAll,
  deleteLogEntry,
  loadLog,
  loadProgram,
  loadState,
  putLogEntry,
  saveState,
} from './state';
import {
  applyImportFromFile,
  applyProgramImportFromFile,
  downloadExport,
  exportPayload,
  formatImportMessage,
  formatProgramImportMessage,
} from './logic/exportImport';
import type { LogEntry, LogMap, Phase, Program, WorkoutState } from './types';
import { ExerciseCard } from './components/ExerciseCard';
import { VideoModal } from './components/VideoModal';

function getCurrentPhase(program: Program | null, state: WorkoutState): Phase | null {
  if (!program) return null;
  return program.phases.find((p) => p.id === state.currentPhase) ?? null;
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

  useEffect(() => {
    (async () => {
      const [s, l, p] = await Promise.all([loadState(), loadLog(), loadProgram()]);
      setState(s);
      setLog(l);
      setProgram(p);
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

  async function handleExport() {
    const payload = await exportPayload();
    downloadExport(payload);
  }

  async function handleImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const result = await applyImportFromFile(file, { applyState: true });
      const [s, l, p] = await Promise.all([loadState(), loadLog(), loadProgram()]);
      setState(s);
      setLog(l);
      setProgram(p);
      setImportMessage(formatImportMessage(result));
    } catch (err) {
      setImportMessage(
        'Import failed: ' + (err instanceof Error ? err.message : 'unknown error'),
      );
    }
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

  async function handleReset() {
    if (!confirm('Reset all progress? This clears day count, exercise log, and loaded program.')) return;
    await clearAll();
    setState({ ...DEFAULT_STATE });
    setLog({});
    setProgram(null);
  }

  if (!loaded) {
    return (
      <section class="flex h-full items-center justify-center">
        <p class="text-sm text-flux-text-tertiary">Loading workout…</p>
      </section>
    );
  }

  const totalExercises = resolvedExercises.length;
  const progressPercent = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  return (
    <section class="mx-auto max-w-2xl space-y-4" data-testid="workouts-root">
      <header class="space-y-1">
        <h1 class="font-mono text-xs uppercase tracking-[0.2em] text-flux-text-tertiary">
          Workouts
        </h1>
        <div class="flex flex-wrap items-baseline gap-3">
          <p class="font-mono text-xs text-flux-text-tertiary">
            Day <span class="text-flux-text-primary" data-testid="day-counter">{state.globalDay}</span>
            <span class="mx-1.5">·</span>
            Week <span class="text-flux-text-primary">{week}</span>
          </p>
          {phase && (
            <p class="text-xs text-flux-text-secondary" data-testid="phase-name">
              {phase.name}
            </p>
          )}
        </div>
      </header>

      {!program ? (
        <div
          class="rounded-lg border border-flux-border bg-flux-card p-6 text-center"
          data-testid="no-program"
        >
          <h2 class="text-lg font-semibold text-flux-text-primary">No program loaded</h2>
          <p class="mt-1 text-sm text-flux-text-secondary">
            Programs are user-specific. Import one to begin, or generate with AI (coming soon).
          </p>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              class="rounded border border-flux-accent bg-flux-accent/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-flux-accent"
              onClick={triggerProgramImport}
              data-testid="import-program-btn"
            >
              Import program file
            </button>
            <button
              type="button"
              class="cursor-not-allowed rounded border border-flux-border bg-flux-soft px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-flux-text-tertiary"
              disabled
              data-testid="generate-ai-btn"
              title="AI program generation is on the roadmap."
            >
              Generate with AI (coming soon)
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
            class="overflow-hidden rounded-lg border border-flux-border bg-flux-card"
            data-testid="workout-card"
          >
            <div class="border-b border-flux-border p-4">
              <h2 class="text-lg font-semibold text-flux-text-primary" data-testid="workout-name">
                {workout.name}
              </h2>
              <p class="mt-0.5 text-xs uppercase tracking-wider text-flux-text-tertiary">
                {workout.focus}
              </p>
            </div>
            <div class="h-1 bg-flux-soft">
              <div
                class="h-full bg-flux-accent transition-all"
                style={{ width: `${progressPercent}%` }}
                data-testid="session-progress"
              />
            </div>
          </div>

          <div class="space-y-3" data-testid="exercises-list">
            {resolvedExercises.map((ex, i) => {
              const key = `${state.globalDay}_${i}`;
              const last = latestWeights.get(ex.name) ?? null;
              const suggested = ex.usesWeight
                ? suggestWeight(
                    last,
                    ex.startingWeight,
                    ex.weightIncrement ?? 5,
                    state.globalDay,
                  )
                : null;
              return (
                <ExerciseCard
                  key={key}
                  exercise={ex}
                  index={i}
                  globalDay={state.globalDay}
                  entry={log[key]}
                  suggestedWeight={suggested}
                  lastWeight={ex.usesWeight ? null : getLastWeight(last)}
                  onLog={onLog}
                  onPlayVideo={(videoId, start) => setVideo({ videoId, start })}
                />
              );
            })}
          </div>
        </>
      ) : (
        <div
          class="rounded-lg border border-flux-border bg-flux-card p-6 text-center"
          data-testid="rest-day"
        >
          <h2 class="text-lg font-semibold text-flux-text-primary">Rest day</h2>
          <p class="mt-1 text-sm text-flux-text-secondary">
            Recovery is part of the program. Mobility welcome.
          </p>
        </div>
      )}

      <div class="flex flex-wrap items-center gap-2 border-t border-flux-border pt-4">
        <button
          type="button"
          class="rounded border border-flux-border bg-flux-soft px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-flux-text-secondary hover:text-flux-text-primary"
          onClick={prevDay}
          disabled={state.globalDay <= 1}
          data-testid="prev-day"
        >
          ← Back
        </button>
        <button
          type="button"
          class="rounded border border-flux-accent bg-flux-accent/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-flux-accent"
          onClick={nextDay}
          data-testid="next-day"
        >
          Complete & Advance →
        </button>
        <span class="flex-1" />
        <button
          type="button"
          class="rounded border border-flux-border bg-flux-soft px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-flux-text-secondary hover:text-flux-text-primary"
          onClick={handleExport}
          data-testid="export-btn"
        >
          Export
        </button>
        <label
          class="cursor-pointer rounded border border-flux-border bg-flux-soft px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-flux-text-secondary hover:text-flux-text-primary"
          data-testid="import-backup-label"
        >
          Import Backup
          <input
            type="file"
            accept="application/json,.json"
            class="hidden"
            onChange={handleImport}
            data-testid="import-input"
          />
        </label>
        <button
          type="button"
          class="rounded border border-flux-border bg-flux-soft px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-flux-danger hover:opacity-80"
          onClick={handleReset}
          data-testid="reset-btn"
        >
          Reset
        </button>
      </div>

      {importMessage && (
        <p
          class="rounded border border-flux-border bg-flux-card px-3 py-2 text-xs text-flux-text-secondary"
          data-testid="import-message"
        >
          {importMessage}
        </p>
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

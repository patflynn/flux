import type { LogEntry, ResolvedExercise } from '../types';
import { MAX_WEIGHT, MIN_WEIGHT, parseReps } from '../logic/progression';
import { parseSeconds } from '../logic/timer';
import { Timer } from './Timer';

interface Props {
  exercise: ResolvedExercise;
  index: number;
  globalDay: number;
  entry: LogEntry | undefined;
  suggestedWeight: number | null;
  lastWeight: number | null;
  onLog: (key: string, partial: Partial<LogEntry>, options?: { remove?: boolean }) => void;
  onPlayVideo: (videoId: string, start?: number) => void;
}

export function ExerciseCard({
  exercise,
  index,
  globalDay,
  entry,
  suggestedWeight,
  lastWeight,
  onLog,
  onPlayVideo,
}: Props) {
  const key = `${globalDay}_${index}`;
  const completed = entry?.completed ?? false;
  const difficulty = entry?.difficulty;
  const notes = entry?.notes ?? '';
  const weight = entry?.weight;
  const increment = exercise.weightIncrement ?? 5;
  const maxSets = exercise.sets;
  const maxReps = parseReps(exercise.reps);
  const failedSet = entry?.failedSet ?? 1;
  const failedRep = entry?.failedRep ?? 1;
  const repSeconds = parseSeconds(exercise.reps);
  const restSeconds = parseSeconds(exercise.rest);

  function setWeight(next: number | null) {
    if (next == null || Number.isNaN(next)) {
      onLog(key, { weight: undefined }, { remove: !difficulty && !notes });
      return;
    }
    const clamped = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, next));
    onLog(key, {
      exercise: exercise.name,
      weight: clamped,
      day: globalDay,
      timestamp: Date.now(),
    });
  }

  function handleWeightInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    if (value === '') {
      setWeight(null);
      return;
    }
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) setWeight(parsed);
  }

  function setDifficulty(d: LogEntry['difficulty']) {
    onLog(key, {
      exercise: exercise.name,
      difficulty: d,
      day: globalDay,
      timestamp: Date.now(),
      ...(d !== 'failed' ? { failedSet: undefined, failedRep: undefined } : {}),
    });
  }

  function setNotes(value: string) {
    const trimmed = value.trim();
    onLog(
      key,
      {
        exercise: exercise.name,
        notes: trimmed || undefined,
        day: globalDay,
        timestamp: Date.now(),
      },
      { remove: !trimmed && !weight && !difficulty && !completed },
    );
  }

  function toggleDone() {
    if (completed) {
      onLog(
        key,
        { completed: undefined },
        { remove: !weight && !difficulty && !notes },
      );
    } else {
      onLog(key, {
        exercise: exercise.name,
        completed: true,
        day: globalDay,
        timestamp: Date.now(),
      });
    }
  }

  const placeholder = suggestedWeight != null ? String(suggestedWeight) : lastWeight != null ? String(lastWeight) : '—';

  return (
    <article
      class={
        'rounded-lg border p-4 transition-colors ' +
        (completed
          ? 'border-flux-accent/40 bg-flux-card'
          : 'border-flux-border bg-flux-card')
      }
      data-exercise-index={index}
      data-completed={completed ? 'true' : 'false'}
    >
      <header class="flex items-start justify-between gap-2">
        <div class="flex flex-1 flex-wrap items-center gap-2">
          <h3 class="text-base font-semibold leading-tight text-flux-text-primary">
            {exercise.name}
          </h3>
          {exercise.unmapped && (
            <span
              class="rounded border border-flux-border bg-flux-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-flux-text-tertiary"
              data-testid={`unmapped-${index}`}
              title="Imported from a legacy export. No demo or technique notes available."
            >
              Unmapped
            </span>
          )}
        </div>
        {exercise.demoVideoId ? (
          <button
            type="button"
            class="shrink-0 rounded border border-flux-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-flux-text-secondary hover:text-flux-text-primary"
            onClick={() => onPlayVideo(exercise.demoVideoId!, exercise.demoVideoStart)}
            data-testid={`video-${index}`}
          >
            Video
          </button>
        ) : (
          <span class="shrink-0 rounded border border-flux-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-flux-text-tertiary">
            No video
          </span>
        )}
      </header>

      <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-flux-text-secondary">
        <span><strong class="text-flux-text-primary">{exercise.sets}</strong> sets</span>
        <span><strong class="text-flux-text-primary">{exercise.reps}</strong> reps</span>
        <span><strong class="text-flux-text-primary">{exercise.rest}</strong> rest</span>
      </div>

      {exercise.techniqueNote && (
        <p class="mt-2 text-xs leading-snug text-flux-text-tertiary">{exercise.techniqueNote}</p>
      )}

      {(repSeconds || restSeconds) && (
        <div class="mt-3 flex flex-wrap gap-2">
          {repSeconds && (
            <Timer label="Exercise" seconds={repSeconds} testId={`timer-ex-${index}`} />
          )}
          {restSeconds && (
            <Timer label="Rest" seconds={restSeconds} testId={`timer-rest-${index}`} />
          )}
        </div>
      )}

      {exercise.usesWeight && (
        <div class="mt-3 flex items-center gap-2">
          <span class="text-xs uppercase tracking-wider text-flux-text-tertiary">Weight</span>
          <button
            type="button"
            class="h-7 w-7 rounded border border-flux-border text-flux-text-secondary hover:text-flux-text-primary"
            onClick={() => setWeight((weight ?? suggestedWeight ?? MIN_WEIGHT) - increment)}
            aria-label="Decrease weight"
          >
            −
          </button>
          <input
            type="number"
            class="w-20 rounded border border-flux-border bg-flux-soft px-2 py-1 font-mono text-sm text-flux-text-primary"
            value={weight ?? ''}
            placeholder={placeholder}
            onInput={handleWeightInput}
            data-testid={`weight-${index}`}
          />
          <button
            type="button"
            class="h-7 w-7 rounded border border-flux-border text-flux-text-secondary hover:text-flux-text-primary"
            onClick={() => setWeight((weight ?? suggestedWeight ?? MIN_WEIGHT) + increment)}
            aria-label="Increase weight"
          >
            +
          </button>
          <span class="text-xs text-flux-text-tertiary">lbs</span>
          {suggestedWeight != null && (
            <span class="ml-auto text-[10px] uppercase tracking-wider text-flux-text-tertiary">
              suggested {suggestedWeight}
            </span>
          )}
        </div>
      )}

      <div class="mt-3">
        <button
          type="button"
          class={
            'w-full rounded border px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ' +
            (completed
              ? 'border-flux-accent bg-flux-accent/15 text-flux-accent'
              : 'border-flux-border bg-flux-soft text-flux-text-secondary hover:text-flux-text-primary')
          }
          onClick={toggleDone}
          data-testid={`done-${index}`}
        >
          {completed ? '✓ Done' : 'Done'}
        </button>

        {completed && (
          <>
            <div class="mt-3 grid grid-cols-4 gap-1">
              {(['failed', 'easy', 'good', 'hard'] as const).map((d) => {
                const selected = difficulty === d || (!difficulty && d === 'good');
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={selected}
                    class={
                      'rounded border px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ' +
                      (selected
                        ? 'border-flux-accent bg-flux-accent/15 text-flux-accent'
                        : 'border-flux-border bg-flux-soft text-flux-text-secondary hover:text-flux-text-primary')
                    }
                    onClick={() => setDifficulty(d)}
                    data-testid={`difficulty-${index}-${d}`}
                  >
                    {d.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {difficulty === 'failed' && (
              <div class="mt-3 space-y-2 rounded border border-flux-border bg-flux-soft p-2">
                <label class="block text-[11px] uppercase tracking-wider text-flux-text-tertiary">
                  Failed on set: <span class="text-flux-text-primary">{failedSet}</span> / {maxSets}
                  <input
                    type="range"
                    min={1}
                    max={maxSets}
                    value={failedSet}
                    class="mt-1 block w-full"
                    onChange={(e) =>
                      onLog(key, {
                        exercise: exercise.name,
                        failedSet: Number((e.target as HTMLInputElement).value),
                        day: globalDay,
                        timestamp: Date.now(),
                      })
                    }
                  />
                </label>
                <label class="block text-[11px] uppercase tracking-wider text-flux-text-tertiary">
                  Failed on rep: <span class="text-flux-text-primary">{failedRep}</span> / {maxReps}
                  <input
                    type="range"
                    min={1}
                    max={maxReps}
                    value={failedRep}
                    class="mt-1 block w-full"
                    onChange={(e) =>
                      onLog(key, {
                        exercise: exercise.name,
                        failedRep: Number((e.target as HTMLInputElement).value),
                        day: globalDay,
                        timestamp: Date.now(),
                      })
                    }
                  />
                </label>
              </div>
            )}
          </>
        )}

        <textarea
          class="mt-3 block w-full rounded border border-flux-border bg-flux-soft px-2 py-1.5 font-mono text-xs text-flux-text-primary placeholder:text-flux-text-tertiary"
          rows={2}
          placeholder="Notes (optional)"
          value={notes}
          onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
          data-testid={`notes-${index}`}
        />
      </div>
    </article>
  );
}

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
        'rounded-[2rem] p-6 transition-all ' +
        (completed
          ? 'bg-flux-accent/15 shadow-flux-card'
          : 'bg-flux-card shadow-flux-card')
      }
      data-exercise-index={index}
      data-completed={completed ? 'true' : 'false'}
    >
      <header class="flex items-start justify-between gap-3">
        <div class="flex-1">
          <h3 class="text-lg font-medium leading-tight text-flux-text-primary">
            {exercise.name}
          </h3>
          {exercise.unmapped && (
            <span
              class="mt-1 inline-block rounded-full bg-flux-soft px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] text-flux-text-tertiary"
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
            class="shrink-0 rounded-full bg-flux-soft px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary transition-colors hover:text-flux-text-primary"
            onClick={() => onPlayVideo(exercise.demoVideoId!, exercise.demoVideoStart)}
            data-testid={`video-${index}`}
          >
            Video
          </button>
        ) : (
          <span class="shrink-0 rounded-full bg-flux-soft px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-flux-text-tertiary">
            No video
          </span>
        )}
      </header>

      <dl class="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-flux-soft px-4 py-3">
        <div class="flex flex-col items-center">
          <dt class="text-[9px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">Sets</dt>
          <dd class="mt-0.5 text-base font-medium text-flux-text-primary">{exercise.sets}</dd>
        </div>
        <div class="flex flex-col items-center border-x border-flux-border">
          <dt class="text-[9px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">Reps</dt>
          <dd class="mt-0.5 text-base font-medium text-flux-text-primary">{exercise.reps}</dd>
        </div>
        <div class="flex flex-col items-center">
          <dt class="text-[9px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">Rest</dt>
          <dd class="mt-0.5 text-base font-medium text-flux-text-primary">{exercise.rest}</dd>
        </div>
      </dl>

      {exercise.techniqueNote && (
        <p class="mt-3 text-xs leading-snug text-flux-text-tertiary">{exercise.techniqueNote}</p>
      )}

      {(repSeconds || restSeconds) && (
        <div class="mt-4 flex flex-wrap gap-2">
          {repSeconds && (
            <Timer label="Exercise" seconds={repSeconds} testId={`timer-ex-${index}`} />
          )}
          {restSeconds && (
            <Timer label="Rest" seconds={restSeconds} testId={`timer-rest-${index}`} />
          )}
        </div>
      )}

      {exercise.usesWeight && (
        <div class="mt-4 flex items-center gap-2">
          <span class="text-[10px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">
            Weight
          </span>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-flux-soft text-base text-flux-text-secondary transition-colors hover:text-flux-text-primary"
            onClick={() => setWeight((weight ?? suggestedWeight ?? MIN_WEIGHT) - increment)}
            aria-label="Decrease weight"
          >
            −
          </button>
          <input
            type="number"
            class="w-20 rounded-xl bg-flux-soft px-3 py-1.5 text-center text-sm font-medium tabular-nums text-flux-text-primary placeholder:text-flux-text-tertiary"
            value={weight ?? ''}
            placeholder={placeholder}
            onInput={handleWeightInput}
            data-testid={`weight-${index}`}
          />
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-flux-soft text-base text-flux-text-secondary transition-colors hover:text-flux-text-primary"
            onClick={() => setWeight((weight ?? suggestedWeight ?? MIN_WEIGHT) + increment)}
            aria-label="Increase weight"
          >
            +
          </button>
          <span class="text-[10px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">
            lbs
          </span>
          {suggestedWeight != null && (
            <span class="ml-auto text-[10px] uppercase tracking-[0.15em] text-flux-text-tertiary">
              ~{suggestedWeight}
            </span>
          )}
        </div>
      )}

      <div class="mt-5">
        <button
          type="button"
          class={
            'w-full rounded-2xl px-4 py-3 text-xs font-medium uppercase tracking-[0.2em] transition-all ' +
            (completed
              ? 'bg-flux-accent text-flux-accent-fg shadow-flux-soft'
              : 'bg-flux-soft text-flux-text-secondary hover:text-flux-text-primary')
          }
          onClick={toggleDone}
          data-testid={`done-${index}`}
        >
          {completed ? '✓ Done' : 'Mark Done'}
        </button>

        {completed && (
          <>
            <div class="mt-4 grid grid-cols-4 gap-1.5">
              {(['failed', 'easy', 'good', 'hard'] as const).map((d) => {
                const selected = difficulty === d || (!difficulty && d === 'good');
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={selected}
                    class={
                      'rounded-full px-2 py-2 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors ' +
                      (selected
                        ? 'bg-flux-accent text-flux-accent-fg'
                        : 'bg-flux-soft text-flux-text-secondary hover:text-flux-text-primary')
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
              <div class="mt-4 space-y-3 rounded-2xl bg-flux-soft p-4">
                <label class="block text-[10px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">
                  Failed on set: <span class="text-flux-text-primary">{failedSet}</span> / {maxSets}
                  <input
                    type="range"
                    min={1}
                    max={maxSets}
                    value={failedSet}
                    class="mt-2 block w-full accent-flux-accent"
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
                <label class="block text-[10px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">
                  Failed on rep: <span class="text-flux-text-primary">{failedRep}</span> / {maxReps}
                  <input
                    type="range"
                    min={1}
                    max={maxReps}
                    value={failedRep}
                    class="mt-2 block w-full accent-flux-accent"
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

            <textarea
              class="mt-4 block w-full rounded-2xl bg-flux-soft px-4 py-3 text-xs text-flux-text-primary placeholder:text-flux-text-tertiary"
              rows={2}
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              data-testid={`notes-${index}`}
            />
          </>
        )}
      </div>
    </article>
  );
}

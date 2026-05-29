import { useEffect, useState } from 'preact/hooks';
import { generateProgram } from '../../../llm/programGen';
import type { ProgramGenerationResult } from '../../../llm/programGen';
import type { Inventory } from '../../../data/inventory';
import type { Program } from '../types';

interface Props {
  inventory: Inventory;
  previousProgram?: Program | null;
  onClose: () => void;
  onSaved: (program: Program) => void;
}

type Phase = 'request' | 'generating' | 'review' | 'error';

const PLACEHOLDER = `e.g. "12-week recomposition phase for someone returning from a lower-back tweak. Three strength days and two mobility days a week. Build on Phase 1 — focus on hinge mechanics and posterior chain."`;

export function GenerateAIModal({
  inventory,
  previousProgram,
  onClose,
  onSaved,
}: Props) {
  const [phase, setPhase] = useState<Phase>('request');
  const [request, setRequest] = useState('');
  const [result, setResult] = useState<ProgramGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit() {
    setPhase('generating');
    setError(null);
    try {
      const r = await generateProgram({
        inventory,
        userRequest: request,
        previousProgram: previousProgram ?? undefined,
      });
      setResult(r);
      setPhase('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg);
      setPhase('error');
    }
  }

  function handleSave() {
    if (result) onSaved(result.program);
  }

  const program = result?.program;
  const phaseCount = program?.phases.length ?? 0;
  const exerciseCount =
    program?.phases.reduce(
      (sum, p) =>
        sum +
        Object.values(p.workouts).reduce(
          (s, w) => s + w.exercises.length,
          0,
        ),
      0,
    ) ?? 0;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      data-testid="generate-ai-modal"
    >
      <div
        class="w-full max-w-md rounded-[2rem] bg-flux-card p-6 shadow-flux-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
            Generate program
          </p>
          <button
            type="button"
            class="text-flux-text-tertiary hover:text-flux-text-primary"
            onClick={onClose}
            aria-label="Close"
            data-testid="generate-ai-close"
          >
            ×
          </button>
        </div>

        {phase === 'request' && (
          <div class="mt-4 space-y-4">
            <p class="text-sm text-flux-text-secondary">
              Describe the phase you want. Include goals, duration, schedule
              preferences, and anything the coach should know about your prior
              phase.
            </p>
            <textarea
              class="h-40 w-full resize-y rounded-2xl bg-flux-soft px-3 py-2 text-sm text-flux-text-primary placeholder:text-flux-text-tertiary focus:outline-none"
              placeholder={PLACEHOLDER}
              value={request}
              onInput={(e) => setRequest((e.target as HTMLTextAreaElement).value)}
              data-testid="generate-ai-request"
            />
            <button
              type="button"
              class="w-full rounded-full bg-flux-accent px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-accent-fg shadow-flux-soft transition-opacity hover:opacity-90 disabled:opacity-40"
              onClick={handleSubmit}
              disabled={request.trim().length === 0}
              data-testid="generate-ai-submit"
            >
              Generate
            </button>
          </div>
        )}

        {phase === 'generating' && (
          <div class="mt-6 space-y-2 text-center">
            <p
              class="text-sm text-flux-text-secondary"
              data-testid="generate-ai-loading"
            >
              Generating program…
            </p>
            <p class="text-[10px] uppercase tracking-[0.2em] text-flux-text-tertiary">
              This can take 20–60 seconds
            </p>
          </div>
        )}

        {phase === 'review' && program && (
          <div class="mt-4 space-y-4" data-testid="generate-ai-review">
            <div class="flex items-baseline gap-3 text-[10px] uppercase tracking-[0.2em] text-flux-text-tertiary">
              <span>
                Phases <span class="text-flux-text-primary">{phaseCount}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Exercises{' '}
                <span class="text-flux-text-primary">{exerciseCount}</span>
              </span>
            </div>
            {result && result.warnings.length > 0 && (
              <div class="space-y-1">
                <p class="text-[10px] uppercase tracking-[0.2em] text-flux-text-tertiary">
                  Inventory warnings
                </p>
                <ul class="space-y-1 text-xs text-flux-text-secondary">
                  {result.warnings.map((w, i) => (
                    <li
                      key={i}
                      class="rounded-2xl bg-flux-soft px-3 py-2"
                      data-testid={`generate-ai-warning-${i}`}
                    >
                      {friendlyWarning(w.message)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 rounded-full bg-flux-card px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary shadow-flux-soft hover:text-flux-text-primary"
                onClick={onClose}
                data-testid="generate-ai-discard"
              >
                Discard
              </button>
              <button
                type="button"
                class="flex-1 rounded-full bg-flux-accent px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-accent-fg shadow-flux-soft hover:opacity-90"
                onClick={handleSave}
                data-testid="generate-ai-save"
              >
                Save program
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div class="mt-4 space-y-3" data-testid="generate-ai-error">
            <p class="text-sm text-flux-text-secondary">
              {error ?? 'Generation failed.'}
            </p>
            <button
              type="button"
              class="w-full rounded-full bg-flux-accent px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-accent-fg shadow-flux-soft hover:opacity-90"
              onClick={() => setPhase('request')}
              data-testid="generate-ai-retry"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function friendlyWarning(raw: string): string {
  // validateProgramSchema yields messages like "requires kettlebell; not in inventory".
  const m = /requires (.+); not in inventory/.exec(raw);
  if (m) return `An exercise requires ${m[1]} — not in your inventory.`;
  return raw;
}

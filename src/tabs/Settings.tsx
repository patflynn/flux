import { useEffect, useState } from 'preact/hooks';
import { useLLM } from '../llm';
import {
  applyImportFromFile,
  downloadExport,
  exportPayload,
  formatImportMessage,
} from './Workouts/logic/exportImport';
import { clearAll } from './Workouts/state';

const MODE_STORAGE_KEY = 'flux_mode';
type Mode = 'dark' | 'light';

function detectInitialMode(): Mode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyMode(mode: Mode): void {
  document.documentElement.setAttribute('data-mode', mode);
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function Settings() {
  const { available } = useLLM();
  const [mode, setMode] = useState<Mode>(detectInitialMode);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

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
      setImportMessage(formatImportMessage(result));
    } catch (err) {
      setImportMessage(
        'Import failed: ' + (err instanceof Error ? err.message : 'unknown error'),
      );
    }
  }

  async function handleReset() {
    if (!confirm('Reset all progress? This clears day count, exercise log, and loaded program.')) return;
    try {
      await clearAll();
      setImportMessage('Reset complete.');
    } catch (err) {
      setImportMessage(
        'Reset failed: ' + (err instanceof Error ? err.message : 'unknown error'),
      );
    }
  }

  return (
    <section class="mx-auto max-w-md space-y-5">
      <header class="flex flex-col items-center gap-1 pt-2 text-center">
        <h1 class="text-sm font-medium uppercase tracking-[0.28em] text-flux-text-primary">
          Settings
        </h1>
        <p class="text-[10px] uppercase tracking-[0.2em] text-flux-text-tertiary">
          Preferences & data
        </p>
      </header>

      <div class="rounded-[2rem] bg-flux-card p-6 shadow-flux-card">
        <h2 class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
          Appearance
        </h2>
        <div class="mt-4 inline-flex rounded-full bg-flux-soft p-1">
          {(['dark', 'light'] as const).map((m) => (
            <button
              key={m}
              type="button"
              class={
                'rounded-full px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] transition-all ' +
                (mode === m
                  ? 'bg-flux-accent text-flux-card shadow-flux-soft'
                  : 'text-flux-text-secondary hover:text-flux-text-primary')
              }
              data-mode={m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div class="rounded-[2rem] bg-flux-card p-6 shadow-flux-card">
        <h2 class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
          LLM provider
        </h2>
        <p class="mt-3 text-sm text-flux-text-secondary">
          {available ? 'Configured' : 'Not configured'}
        </p>
      </div>

      <div class="rounded-[2rem] bg-flux-card p-6 shadow-flux-card">
        <h2 class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
          Data
        </h2>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-full bg-flux-soft px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary transition-colors hover:text-flux-text-primary"
            onClick={handleExport}
            data-testid="export-btn"
          >
            Export
          </button>
          <label
            class="cursor-pointer rounded-full bg-flux-soft px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary transition-colors hover:text-flux-text-primary"
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
        </div>
        {importMessage && (
          <div
            class="mt-4 flex items-start justify-between gap-2 rounded-2xl bg-flux-soft px-4 py-3 text-xs text-flux-text-secondary"
            data-testid="backup-import-message"
          >
            <span class="flex-1">{importMessage}</span>
            <button
              type="button"
              onClick={() => setImportMessage(null)}
              class="shrink-0 text-flux-text-tertiary hover:text-flux-text-primary"
              aria-label="Dismiss"
              data-testid="backup-import-message-dismiss"
            >
              ×
            </button>
          </div>
        )}

        <div class="mt-5 border-t border-flux-border pt-4">
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-danger">
            Danger zone
          </p>
          <button
            type="button"
            class="mt-3 rounded-full bg-flux-soft px-4 py-2 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-danger transition-opacity hover:opacity-80"
            onClick={handleReset}
            data-testid="reset-btn"
          >
            Reset all progress
          </button>
        </div>
      </div>
    </section>
  );
}

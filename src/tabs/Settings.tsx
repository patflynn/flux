import { useEffect, useState } from 'preact/hooks';
import { useLLM } from '../llm';
import {
  applyImportFromFile,
  downloadExport,
  exportPayload,
  formatImportMessage,
} from './Workouts/logic/exportImport';

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

  return (
    <section class="mx-auto max-w-md space-y-6">
      <h1 class="text-2xl font-semibold text-flux-text-primary">Settings</h1>

      <div class="rounded-lg border border-flux-border bg-flux-card p-4">
        <h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-flux-text-tertiary">
          Appearance
        </h2>
        <div class="mt-3 inline-flex overflow-hidden rounded border border-flux-border">
          {(['dark', 'light'] as const).map((m) => (
            <button
              key={m}
              type="button"
              class={
                'px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ' +
                (mode === m
                  ? 'bg-flux-accent/15 text-flux-accent'
                  : 'bg-flux-soft text-flux-text-secondary hover:text-flux-text-primary')
              }
              data-mode={m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div class="rounded-lg border border-flux-border bg-flux-card p-4">
        <h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-flux-text-tertiary">
          LLM provider
        </h2>
        <p class="mt-2 text-sm text-flux-text-secondary">
          {available ? 'Configured' : 'Not configured'}
        </p>
      </div>

      <div class="rounded-lg border border-flux-border bg-flux-card p-4">
        <h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-flux-text-tertiary">
          Data
        </h2>
        <div class="mt-3 flex flex-wrap items-center gap-2">
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
        </div>
        {importMessage && (
          <p
            class="mt-3 rounded border border-flux-border bg-flux-soft px-3 py-2 text-xs text-flux-text-secondary"
            data-testid="import-message"
          >
            {importMessage}
          </p>
        )}
      </div>
    </section>
  );
}

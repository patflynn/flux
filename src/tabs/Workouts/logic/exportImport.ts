// Export / import is the migration path from the old vanilla-JS app.
// Schema MUST match the old exporter exactly: { log: { [key]: entry }, state: { globalDay, currentPhase } }
// where key is `${globalDay}_${exerciseIndex}` and entry is the LogEntry shape from types.ts.
// This is the only contract the legacy app and the new app share — don't change it.

import {
  loadLog,
  loadState,
  putLogEntries,
  saveState,
  sanitizeLogEntry,
} from '../state';
import type { ExportPayload, LogEntry, LogMap, WorkoutState } from '../types';

export async function exportPayload(): Promise<ExportPayload> {
  const log = await loadLog();
  const state = await loadState();
  return { log, state };
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
}

// Apply an export payload to the current IDB. Sanitizes every entry, merges
// (skips keys that already exist), and optionally restores state. Throws on
// payloads that don't match the legacy schema so the UI can surface an error.
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

  return { imported, skipped, total: keys.length, stateApplied };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
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

export type { LogMap };

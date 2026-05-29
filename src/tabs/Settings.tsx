import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useLLM } from '../llm';
import {
  applyImportFromFile,
  downloadExport,
  exportPayload,
  formatImportMessage,
} from './Workouts/logic/exportImport';
import {
  clearAll,
  loadLocations,
  saveLocations,
} from './Workouts/state';
import {
  EQUIPMENT_CATALOG,
  type EquipmentItem,
  type EquipmentKind,
} from '../data/equipmentCatalog';
import {
  activeInventory,
  cloneDefaultLocationsState,
  type Inventory,
  type InventoryItem,
  type LocationsState,
} from '../data/inventory';

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

const CATEGORY_ORDER: EquipmentItem['category'][] = [
  'free-weight',
  'fixed',
  'cardio',
  'accessory',
];

const CATEGORY_LABEL: Record<EquipmentItem['category'], string> = {
  'free-weight': 'Free weight',
  fixed: 'Fixed',
  cardio: 'Cardio',
  accessory: 'Accessory',
  sentinel: 'Sentinel',
};

interface Preset {
  label: string;
  weights: number[];
}

const PRESETS: Partial<Record<EquipmentKind, Preset[]>> = {
  kettlebell: [
    { label: 'Common set (25/35/45)', weights: [25, 35, 45] },
    { label: 'Light (10/15/20)', weights: [10, 15, 20] },
    { label: 'Heavy (35/45/55/70)', weights: [35, 45, 55, 70] },
  ],
  dumbbell: [
    { label: 'Adjustable 5–50 by 5', weights: range(5, 50, 5) },
    { label: 'Adjustable 5–90 by 5', weights: range(5, 90, 5) },
  ],
  barbell: [
    { label: 'Olympic + plates', weights: [45, 65, 85, 95, 115, 135, 155, 185] },
  ],
};

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v += step) out.push(v);
  return out;
}

function normalizeWeights(arr: number[]): number[] {
  const seen = new Set<number>();
  for (const w of arr) if (Number.isFinite(w) && w > 0) seen.add(w);
  return Array.from(seen).sort((a, b) => a - b);
}

export function Settings() {
  const { available } = useLLM();
  const [mode, setMode] = useState<Mode>(detectInitialMode);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationsState>(
    cloneDefaultLocationsState,
  );
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  useEffect(() => {
    (async () => {
      const loc = await loadLocations();
      setLocations(loc);
      setLocationsLoaded(true);
    })();
  }, []);

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
      // Reload locations in case the import restored inventory.
      const loc = await loadLocations();
      setLocations(loc);
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
      setLocations(cloneDefaultLocationsState());
    } catch (err) {
      setImportMessage(
        'Reset failed: ' + (err instanceof Error ? err.message : 'unknown error'),
      );
    }
  }

  const inventory = useMemo(() => activeInventory(locations), [locations]);

  function persistLocations(next: LocationsState) {
    setLocations(next);
    saveLocations(next).catch(() => {});
  }

  function updateInventory(next: Inventory) {
    const activeId = locations.activeLocationId;
    const current = locations.locations[activeId];
    if (!current) return;
    const nextLocations: LocationsState = {
      ...locations,
      locations: {
        ...locations.locations,
        [activeId]: { ...current, inventory: next },
      },
    };
    persistLocations(nextLocations);
  }

  function toggleOwned(kind: EquipmentKind) {
    const cat = EQUIPMENT_CATALOG[kind];
    if (inventory[kind]) {
      const { [kind]: _removed, ...rest } = inventory;
      void _removed;
      updateInventory(rest);
    } else {
      updateInventory({
        ...inventory,
        [kind]: {
          kind,
          ownedWeights: cat.hasWeightSelection ? [] : [],
        },
      });
    }
  }

  function setWeights(kind: EquipmentKind, weights: number[]) {
    const current = inventory[kind];
    if (!current) return;
    updateInventory({
      ...inventory,
      [kind]: { ...current, ownedWeights: normalizeWeights(weights) },
    });
  }

  function setNote(kind: EquipmentKind, note: string) {
    const current = inventory[kind];
    if (!current) return;
    const trimmed = note.trim();
    updateInventory({
      ...inventory,
      [kind]: {
        ...current,
        note: trimmed ? trimmed : undefined,
      },
    });
  }

  const visibleKinds = useMemo(
    () =>
      (Object.values(EQUIPMENT_CATALOG) as EquipmentItem[])
        .filter((e) => e.id !== 'bodyweight')
        .sort((a, b) => {
          const ai = CATEGORY_ORDER.indexOf(a.category);
          const bi = CATEGORY_ORDER.indexOf(b.category);
          if (ai !== bi) return ai - bi;
          return a.name.localeCompare(b.name);
        }),
    [],
  );

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
                  ? 'bg-flux-accent text-flux-accent-fg shadow-flux-soft'
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

      <div
        class="rounded-[2rem] bg-flux-card p-6 shadow-flux-card"
        data-testid="equipment-section"
      >
        <h2 class="text-[10px] font-medium uppercase tracking-[0.2em] text-flux-text-tertiary">
          Equipment
        </h2>
        <p class="mt-2 text-xs text-flux-text-secondary">
          What you have available for workouts. Programs and weight pickers respect this.
        </p>
        {!locationsLoaded ? (
          <p class="mt-4 text-[11px] uppercase tracking-[0.18em] text-flux-text-tertiary">
            Loading…
          </p>
        ) : (
          <div class="mt-5 space-y-5">
            {CATEGORY_ORDER.map((cat) => {
              const inCat = visibleKinds.filter((k) => k.category === cat);
              if (inCat.length === 0) return null;
              return (
                <div key={cat} class="space-y-3">
                  <h3 class="text-[10px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">
                    {CATEGORY_LABEL[cat]}
                  </h3>
                  <div class="space-y-3">
                    {inCat.map((kind) => (
                      <EquipmentRow
                        key={kind.id}
                        item={kind}
                        owned={inventory[kind.id]}
                        onToggle={() => toggleOwned(kind.id)}
                        onSetWeights={(ws) => setWeights(kind.id, ws)}
                        onSetNote={(n) => setNote(kind.id, n)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

interface RowProps {
  item: EquipmentItem;
  owned: InventoryItem | undefined;
  onToggle: () => void;
  onSetWeights: (next: number[]) => void;
  onSetNote: (next: string) => void;
}

function EquipmentRow({ item, owned, onToggle, onSetWeights, onSetNote }: RowProps) {
  const ownedFlag = owned !== undefined;
  const weights = owned?.ownedWeights ?? [];
  const presets = PRESETS[item.id] ?? [];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState('');
  const [presetIdx, setPresetIdx] = useState('');

  function addWeight() {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft('');
      return;
    }
    onSetWeights([...weights, parsed]);
    setDraft('');
    inputRef.current?.focus();
  }

  function removeWeight(w: number) {
    onSetWeights(weights.filter((x) => x !== w));
  }

  function applyPreset(value: string) {
    const idx = Number(value);
    setPresetIdx('');
    if (!Number.isInteger(idx) || idx < 0 || idx >= presets.length) return;
    const merged = [...weights, ...presets[idx].weights];
    onSetWeights(merged);
  }

  return (
    <div
      class="rounded-2xl bg-flux-soft px-4 py-3"
      data-testid={`equipment-row-${item.id}`}
    >
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium text-flux-text-primary">{item.name}</span>
        <button
          type="button"
          role="switch"
          aria-checked={ownedFlag}
          onClick={onToggle}
          data-testid={`equipment-toggle-${item.id}`}
          class={
            'rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors ' +
            (ownedFlag
              ? 'bg-flux-accent text-flux-accent-fg shadow-flux-soft'
              : 'bg-flux-card text-flux-text-secondary hover:text-flux-text-primary')
          }
        >
          {ownedFlag ? 'Owned' : 'Off'}
        </button>
      </div>

      {ownedFlag && item.hasWeightSelection && (
        <div class="mt-3 space-y-3">
          <div
            class="flex flex-wrap gap-1.5"
            data-testid={`equipment-chips-${item.id}`}
          >
            {weights.length === 0 ? (
              <span class="text-[11px] uppercase tracking-[0.15em] text-flux-text-tertiary">
                No weights yet
              </span>
            ) : (
              weights.map((w) => (
                <span
                  key={w}
                  class="inline-flex items-center gap-1 rounded-full bg-flux-card px-2.5 py-1 text-[11px] font-medium tabular-nums text-flux-text-primary"
                  data-testid={`equipment-chip-${item.id}-${w}`}
                >
                  {w}
                  <button
                    type="button"
                    onClick={() => removeWeight(w)}
                    aria-label={`Remove ${w}`}
                    class="text-flux-text-tertiary hover:text-flux-danger"
                    data-testid={`equipment-chip-remove-${item.id}-${w}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="number"
              min={0}
              step="any"
              class="w-20 rounded-xl bg-flux-card px-3 py-1.5 text-center text-sm font-medium tabular-nums text-flux-text-primary placeholder:text-flux-text-tertiary"
              placeholder="lbs"
              value={draft}
              onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addWeight();
                }
              }}
              data-testid={`equipment-weight-input-${item.id}`}
            />
            <button
              type="button"
              onClick={addWeight}
              class="rounded-full bg-flux-card px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary transition-colors hover:text-flux-text-primary"
              data-testid={`equipment-weight-add-${item.id}`}
            >
              Add
            </button>
            {presets.length > 0 && (
              <select
                value={presetIdx}
                onChange={(e) =>
                  applyPreset((e.target as HTMLSelectElement).value)
                }
                class="rounded-full bg-flux-card px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary"
                data-testid={`equipment-preset-${item.id}`}
              >
                <option value="">+ preset…</option>
                {presets.map((p, i) => (
                  <option key={p.label} value={String(i)}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {ownedFlag && (
        <input
          type="text"
          value={owned?.note ?? ''}
          placeholder="Note (optional)"
          onChange={(e) => onSetNote((e.target as HTMLInputElement).value)}
          class="mt-3 w-full rounded-xl bg-flux-card px-3 py-1.5 text-xs text-flux-text-primary placeholder:text-flux-text-tertiary"
          data-testid={`equipment-note-${item.id}`}
        />
      )}
    </div>
  );
}

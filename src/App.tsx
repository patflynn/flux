import { useEffect, useState } from 'preact/hooks';
import { Workouts } from './tabs/Workouts';
import { Meditate } from './tabs/Meditate';
import { Checkin } from './tabs/Checkin';
import { Settings } from './tabs/Settings';

export type EntryTab = 'flux' | 'vibe' | 'balance';
export type TabKey = 'workouts' | 'meditate' | 'checkin' | 'settings';

const ENTRY_TO_TAB: Record<EntryTab, TabKey> = {
  flux: 'workouts',
  vibe: 'meditate',
  balance: 'checkin',
};

const VALID_ENTRIES: readonly EntryTab[] = ['flux', 'vibe', 'balance'];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'workouts', label: 'Workouts' },
  { key: 'meditate', label: 'Meditate' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'settings', label: 'Settings' },
];

export function App({ entry }: { entry: EntryTab }) {
  const [active, setActive] = useState<TabKey>(ENTRY_TO_TAB[entry]);

  // MainActivity.onNewIntent dispatches `app-entry-changed` when the user
  // re-launches a different alias while the app is already running.
  useEffect(() => {
    const onEntryChanged = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (typeof detail === 'string' && (VALID_ENTRIES as readonly string[]).includes(detail)) {
        setActive(ENTRY_TO_TAB[detail as EntryTab]);
      }
    };
    window.addEventListener('app-entry-changed', onEntryChanged);
    return () => window.removeEventListener('app-entry-changed', onEntryChanged);
  }, []);

  return (
    <div class="flex h-full flex-col bg-flux-bg text-flux-text-primary">
      <main class="flex-1 overflow-y-auto p-4" data-active-tab={active}>
        {active === 'workouts' && <Workouts />}
        {active === 'meditate' && <Meditate />}
        {active === 'checkin' && <Checkin />}
        {active === 'settings' && <Settings />}
      </main>

      <nav
        class="grid grid-cols-4 border-t border-flux-border bg-flux-card"
        role="tablist"
        aria-label="Primary"
      >
        {TABS.map((t) => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              data-tab={t.key}
              onClick={() => setActive(t.key)}
              class={
                'py-3 text-sm font-medium transition-colors ' +
                (selected
                  ? 'bg-flux-soft text-flux-text-primary'
                  : 'text-flux-text-tertiary hover:text-flux-text-secondary')
              }
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

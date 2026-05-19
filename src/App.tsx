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
      <main
        class="flex-1 overflow-y-auto px-4 pb-28 pt-6 sm:px-6"
        data-active-tab={active}
      >
        {active === 'workouts' && <Workouts />}
        {active === 'meditate' && <Meditate />}
        {active === 'checkin' && <Checkin />}
        {active === 'settings' && <Settings />}
      </main>

      <nav
        class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
        role="tablist"
        aria-label="Primary"
      >
        <div class="pointer-events-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-full bg-flux-card p-1.5 shadow-flux-nav">
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
                  'rounded-full px-2 py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] transition-all ' +
                  (selected
                    ? 'bg-flux-accent text-flux-card shadow-flux-soft'
                    : 'text-flux-text-tertiary hover:text-flux-text-secondary')
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

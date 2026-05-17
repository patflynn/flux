import { useState } from 'preact/hooks';
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

const TABS: { key: TabKey; label: string }[] = [
  { key: 'workouts', label: 'Workouts' },
  { key: 'meditate', label: 'Meditate' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'settings', label: 'Settings' },
];

export function App({ entry }: { entry: EntryTab }) {
  const [active, setActive] = useState<TabKey>(ENTRY_TO_TAB[entry]);

  return (
    <div class="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <main class="flex-1 overflow-y-auto p-4" data-active-tab={active}>
        {active === 'workouts' && <Workouts />}
        {active === 'meditate' && <Meditate />}
        {active === 'checkin' && <Checkin />}
        {active === 'settings' && <Settings />}
      </main>

      <nav
        class="grid grid-cols-4 border-t border-neutral-800 bg-neutral-900"
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
                  ? 'text-white bg-neutral-800'
                  : 'text-neutral-400 hover:text-neutral-200')
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

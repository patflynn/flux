import { render } from 'preact';
import { App } from './App';
import type { EntryTab } from './App';
import { configureProvider, type LLMProvider } from './llm';
import './index.css';

interface AppEntryBridge {
  getEntry: () => string | null | undefined;
}

declare global {
  interface Window {
    __entry?: EntryTab;
    AppEntry?: AppEntryBridge;
    // Test hook: Playwright e2e tests stub an LLM provider through this so
    // the program-generation flow can be exercised without a real backend.
    // Not used by app code. Stable string so tests can rely on the name.
    flux_test_configureLLM?: (provider: LLMProvider) => void;
  }
}

const VALID_ENTRIES: readonly EntryTab[] = ['flux', 'vibe', 'balance'];

function isEntryTab(value: unknown): value is EntryTab {
  return typeof value === 'string' && (VALID_ENTRIES as readonly string[]).includes(value);
}

function resolveEntry(): EntryTab {
  if (typeof window === 'undefined') return 'flux';
  // Prefer the synchronous Android bridge (MainActivity.AppEntryBridge) when
  // present — it is set before the bundle runs, so there is no race.
  try {
    const fromBridge = window.AppEntry?.getEntry?.();
    if (isEntryTab(fromBridge)) return fromBridge;
  } catch {
    // bridge call failed; fall through
  }
  if (isEntryTab(window.__entry)) return window.__entry;
  return 'flux';
}

const root = document.getElementById('app');
if (!root) {
  throw new Error('#app root element missing');
}

if (typeof window !== 'undefined') {
  window.flux_test_configureLLM = (provider: LLMProvider) => {
    configureProvider(provider);
  };
}

render(<App entry={resolveEntry()} />, root);

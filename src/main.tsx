import { render } from 'preact';
import { App } from './App';
import type { EntryTab } from './App';
import './index.css';

declare global {
  interface Window {
    __entry?: EntryTab;
  }
}

const VALID_ENTRIES: readonly EntryTab[] = ['flux', 'vibe', 'balance'];

function resolveEntry(): EntryTab {
  const fromWindow = typeof window !== 'undefined' ? window.__entry : undefined;
  if (fromWindow && (VALID_ENTRIES as readonly string[]).includes(fromWindow)) {
    return fromWindow;
  }
  return 'flux';
}

const root = document.getElementById('app');
if (!root) {
  throw new Error('#app root element missing');
}

render(<App entry={resolveEntry()} />, root);

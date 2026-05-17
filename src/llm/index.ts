// LLM provider interface.
//
// All feature modules route through `generate()` — never call providers directly.
// Real provider implementations (local, byok-anthropic, byok-openai, byok-google)
// land in later PRs. For PR 1, only the default "not configured" provider exists.
//
// See docs/UMBRELLA-PLAN.md ("LLM integration") for the full design.

import { useEffect, useState } from 'preact/hooks';

export type LLMCapability = 'text' | 'vision' | 'structured' | 'streaming';

export interface GenerateOptions {
  prompt: string;
  schema?: unknown;
  stream?: boolean;
  capabilities?: LLMCapability[];
}

export interface LLMProvider {
  id: string;
  available: boolean;
  generate(opts: GenerateOptions): Promise<string> | AsyncIterable<string>;
}

const NOT_CONFIGURED: LLMProvider = {
  id: 'not-configured',
  available: false,
  async generate() {
    throw new Error('LLM not configured');
  },
};

let activeProvider: LLMProvider = NOT_CONFIGURED;
const subscribers = new Set<(p: LLMProvider) => void>();

function setProvider(provider: LLMProvider): void {
  activeProvider = provider;
  for (const fn of subscribers) fn(provider);
}

function subscribe(fn: (p: LLMProvider) => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function generate(opts: GenerateOptions): Promise<string> | AsyncIterable<string> {
  return activeProvider.generate(opts);
}

export function configureProvider(provider: LLMProvider): void {
  setProvider(provider);
}

export interface LLMHandle {
  generate: typeof generate;
  available: boolean;
  configure: (provider: LLMProvider) => void;
}

export function useLLM(): LLMHandle {
  // Track the provider in component state and subscribe so that callers
  // re-render when `configure()` swaps the active provider (e.g. when the
  // user adds an API key in Settings).
  const [provider, setLocal] = useState<LLMProvider>(activeProvider);
  useEffect(() => {
    setLocal(activeProvider);
    return subscribe((p) => setLocal(p));
  }, []);

  return {
    generate,
    available: provider.available,
    configure: setProvider,
  };
}

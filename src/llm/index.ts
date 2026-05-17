// LLM provider interface.
//
// All feature modules route through `generate()` — never call providers directly.
// Real provider implementations (local, byok-anthropic, byok-openai, byok-google)
// land in later PRs. For PR 1, only the default "not configured" provider exists.
//
// See docs/UMBRELLA-PLAN.md ("LLM integration") for the full design.

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

export function generate(opts: GenerateOptions): Promise<string> | AsyncIterable<string> {
  return activeProvider.generate(opts);
}

export interface LLMHandle {
  generate: typeof generate;
  available: boolean;
  configure: (provider: LLMProvider) => void;
}

export function useLLM(): LLMHandle {
  return {
    generate,
    available: activeProvider.available,
    configure: (provider) => {
      activeProvider = provider;
    },
  };
}

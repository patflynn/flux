import { useLLM } from '../llm';

export function Settings() {
  const { available } = useLLM();
  return (
    <section class="mx-auto max-w-md space-y-6">
      <h1 class="text-2xl font-semibold">Settings</h1>

      <div class="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          LLM provider
        </h2>
        <p class="mt-2 text-sm text-neutral-300">
          {available ? 'Configured' : 'Not configured'}
        </p>
      </div>
    </section>
  );
}

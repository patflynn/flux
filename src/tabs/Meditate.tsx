export function Meditate() {
  return (
    <section class="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
      <div class="flex w-full flex-col items-center gap-6 rounded-[2rem] bg-flux-card px-8 py-16 shadow-flux-card">
        <span
          aria-hidden="true"
          class="block h-16 w-16 rounded-full bg-flux-accent/30"
          style={{ boxShadow: '0 0 0 8px var(--flux-soft)' }}
        />
        <h1 class="text-sm font-medium uppercase tracking-[0.28em] text-flux-text-primary">
          Meditate
        </h1>
        <p class="max-w-xs text-sm leading-relaxed text-flux-text-secondary">
          Stillness as practice. Guided sessions arrive in a later release.
        </p>
        <span class="text-[10px] uppercase tracking-[0.2em] text-flux-text-tertiary">
          Coming soon
        </span>
      </div>
    </section>
  );
}

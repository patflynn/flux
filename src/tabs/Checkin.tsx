export function Checkin() {
  return (
    <section class="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
      <div class="flex w-full flex-col items-center gap-6 rounded-[2rem] bg-flux-card px-8 py-16 shadow-flux-card">
        <div aria-hidden="true" class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-flux-accent" />
          <span class="h-2 w-12 rounded-full bg-flux-accent/40" />
          <span class="h-2 w-2 rounded-full bg-flux-accent/20" />
        </div>
        <h1 class="text-sm font-medium uppercase tracking-[0.28em] text-flux-text-primary">
          Check-in
        </h1>
        <p class="max-w-xs text-sm leading-relaxed text-flux-text-secondary">
          A daily pulse on mood, energy, and recovery. Coming after Meditate.
        </p>
        <span class="text-[10px] uppercase tracking-[0.2em] text-flux-text-tertiary">
          Coming soon
        </span>
      </div>
    </section>
  );
}

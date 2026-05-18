// Web Audio beep used at timer completion. Lazily-constructed shared context.
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, start);
  gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export function playBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    tone(ctx, 880, now, 0.15);
    tone(ctx, 660, now + 0.15, 0.2);
  } catch {
    // audio unavailable — fail silently
  }
}

// Parse '45s' / '60s' / '90s' to seconds. Excludes '20 mins', 'N/A', '0s'.
export function parseSeconds(str: string | null | undefined): number | null {
  if (!str || str === 'N/A') return null;
  const match = String(str).match(/^(\d+)s$/);
  if (!match) return null;
  const v = parseInt(match[1], 10);
  return v > 0 ? v : null;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
  return String(s);
}

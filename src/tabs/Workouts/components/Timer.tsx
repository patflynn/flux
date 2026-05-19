import { useEffect, useRef, useState } from 'preact/hooks';
import { formatTime, playBeep } from '../logic/timer';

interface Props {
  label: string;
  seconds: number;
  testId?: string;
}

export function Timer({ label, seconds, testId }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
    setFinished(false);
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current != null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setRunning(false);
          setFinished(true);
          playBeep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  function startPause() {
    if (finished) return;
    setRunning((r) => !r);
  }

  function reset() {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(seconds);
    setRunning(false);
    setFinished(false);
  }

  const active = running || finished;

  return (
    <div
      class={
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ' +
        (active ? 'bg-flux-accent/20' : 'bg-flux-soft')
      }
      data-testid={testId}
    >
      <span class="text-[9px] font-medium uppercase tracking-[0.18em] text-flux-text-tertiary">
        {label}
      </span>
      <span
        class={
          'text-sm font-medium tabular-nums ' +
          (finished ? 'text-flux-accent-dim' : 'text-flux-text-primary')
        }
      >
        {formatTime(remaining)}
      </span>
      <button
        type="button"
        class="rounded-full bg-flux-card px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary transition-colors hover:text-flux-text-primary disabled:opacity-40"
        onClick={startPause}
        disabled={finished}
      >
        {finished ? 'Done' : running ? 'Pause' : 'Start'}
      </button>
      <button
        type="button"
        class="rounded-full bg-flux-card px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-flux-text-secondary transition-colors hover:text-flux-text-primary"
        onClick={reset}
      >
        Rst
      </button>
    </div>
  );
}

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
    return clearInterval();

    function clearInterval() {
      return () => {
        if (intervalRef.current != null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
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

  return (
    <div
      class="inline-flex items-center gap-2 rounded-md border border-flux-border bg-flux-soft px-2 py-1 text-xs"
      data-testid={testId}
    >
      <span class="font-mono uppercase tracking-wider text-flux-text-tertiary">{label}</span>
      <span
        class={
          'font-mono text-sm tabular-nums ' +
          (finished ? 'text-flux-accent' : 'text-flux-text-primary')
        }
      >
        {formatTime(remaining)}
      </span>
      <button
        type="button"
        class="rounded border border-flux-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-flux-text-secondary hover:text-flux-text-primary disabled:opacity-40"
        onClick={startPause}
        disabled={finished}
      >
        {finished ? 'Done' : running ? 'Pause' : 'Start'}
      </button>
      <button
        type="button"
        class="rounded border border-flux-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-flux-text-secondary hover:text-flux-text-primary"
        onClick={reset}
      >
        Rst
      </button>
    </div>
  );
}

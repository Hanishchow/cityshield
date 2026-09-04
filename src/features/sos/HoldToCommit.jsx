import { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_MS = 2000;

/**
 * Press-and-hold to commit. See docs/PRD.md §9.1.
 *
 * Two deliberate design decisions:
 *  - The hold IS the confirmation. No second "are you sure?" dialog stands
 *    between a person in danger and help.
 *  - onPressStart fires on press-DOWN, so location acquisition gets a 2-second
 *    head start before the incident exists.
 *
 * Keyboard: Space/Enter held has the same effect - the emergency path must be
 * fully operable without a pointer.
 */
export default function HoldToCommit({ onPressStart, onPressEnd, onCommit, disabled }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const startRef = useRef(0);
  const activeRef = useRef(false);
  const committedRef = useRef(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timerRef.current);
    rafRef.current = 0;
    timerRef.current = 0;
    if (!committedRef.current) {
      setProgress(0);
      onPressEnd?.();
    }
  }, [onPressEnd]);

  /* Draws the ring only. It must never be the thing that decides the hold
     completed: requestAnimationFrame is throttled in background tabs, under
     low-power mode, and on some devices when the screen dims. A hold that
     silently fails to commit because frames stopped arriving is the worst
     possible failure on this control. */
  const tick = useCallback(() => {
    if (!activeRef.current) return;
    const elapsed = performance.now() - startRef.current;
    setProgress(Math.min(1, elapsed / HOLD_MS));
    if (elapsed < HOLD_MS) rafRef.current = requestAnimationFrame(tick);
  }, []);

  /* The authority on whether the hold completed. Timers keep running when
     frames do not. */
  const fire = useCallback(() => {
    if (!activeRef.current) return;
    committedRef.current = true;
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setProgress(1);
    onCommit?.();
  }, [onCommit]);

  const start = useCallback(() => {
    if (disabled || activeRef.current || committedRef.current) return;
    activeRef.current = true;
    startRef.current = performance.now();
    onPressStart?.();
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(fire, HOLD_MS);
  }, [disabled, onPressStart, tick, fire]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    },
    [],
  );

  const R = 96;
  const C = 2 * Math.PI * R;

  return (
    <div className="relative mx-auto h-56 w-56 select-none">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 224 224" aria-hidden="true">
        <circle cx="112" cy="112" r={R} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="112"
          cy="112"
          r={R}
          fill="none"
          stroke="var(--signal)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C - progress * C}
        />
      </svg>

      <button
        type="button"
        disabled={disabled}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') stop();
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold for two seconds to send an emergency alert"
        className="absolute inset-5 flex touch-none flex-col items-center justify-center gap-2 rounded-full bg-signal text-white transition-colors duration-state hover:bg-signal-hover disabled:opacity-60"
      >
        <span className="text-small font-bold uppercase tracking-wide">
          {progress > 0 ? 'Keep holding' : 'Hold'}
        </span>
        <span className="text-label opacity-90">2 seconds</span>
      </button>
    </div>
  );
}

import { cn } from '../../lib/utils/format.js';

/**
 * The text label is mandatory - colour is never the only carrier of meaning.
 * There is deliberately no pulsing dot: an animation that never stops drains
 * battery on a page that may sit open for an hour during an emergency.
 */
const TONES = {
  ok: 'border-ok/40 bg-ok-tint text-ok',
  warn: 'border-warn/40 bg-warn-tint text-warn',
  signal: 'border-signal/40 bg-signal-tint text-signal',
  accent: 'border-accent/40 bg-accent-tint text-accent',
  neutral: 'border-line-strong bg-sunken text-ink-2',
};

export default function StatusPill({ tone = 'neutral', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-xs border px-2 py-[3px]',
        'whitespace-nowrap text-micro font-semibold uppercase tracking-[0.09em]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

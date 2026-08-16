import { cn } from '../../lib/utils/format.js';

/**
 * Status indicator. The text label is MANDATORY — colour is never the sole
 * carrier of meaning (docs/FRONTEND-SPEC.md §2.4, cross-cutting invariant 6).
 *
 * Note there is no pulsing animation here. The old StatusDot animated forever,
 * which drains battery on a page that may sit open during a crisis.
 */
const TONES = {
  ok: 'bg-ok-tint text-ok border-ok/25',
  warn: 'bg-warn-tint text-warn border-warn/25',
  signal: 'bg-signal-tint text-signal border-signal/25',
  civic: 'bg-civic-tint text-civic border-civic/25',
  neutral: 'bg-sunken text-ink-2 border-line',
};

export default function StatusPill({ tone = 'neutral', children, dot = true, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-label font-semibold uppercase tracking-wide whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

import { cn } from '../../lib/utils/format.js';

/**
 * Labels simulated data as simulated. Cross-cutting invariant 1: no fabricated
 * state. If a value came from a mock adapter, the citizen is told so — an
 * emergency product must never present invented reassurance as fact.
 */
export default function MockNotice({ children, className, inline = false }) {
  if (inline) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-sm border border-warn/30 bg-warn-tint',
          'px-1.5 py-0.5 text-label font-semibold uppercase tracking-wide text-warn',
          className,
        )}
      >
        Simulated
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border border-warn/30 bg-warn-tint px-3.5 py-3',
        'text-small text-ink-2',
        className,
      )}
    >
      <span
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn"
        aria-hidden="true"
      />
      <p>{children}</p>
    </div>
  );
}

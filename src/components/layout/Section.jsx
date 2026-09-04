import { cn } from '../../lib/utils/format.js';

/**
 * Consistent page rhythm. Every section on every page uses this, so the
 * vertical cadence is identical site-wide instead of each page inventing its
 * own spacing.
 */
export default function Section({ as: Tag = 'section', className, children, ...rest }) {
  return (
    <Tag className={cn('mx-auto w-full max-w-shell px-5 py-8 md:px-8 md:py-10', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Numbered header used inside panels. */
export function PanelHead({ index, title, lead, serif = false, action, className }) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 border-b border-line/70 pb-5',
        className,
      )}
    >
      <div>
        <div className="flex items-baseline gap-3">
          {index && <span className="font-data text-micro text-ink-3">{index}</span>}
          <h2 className={cn('text-h2 text-ink', serif && 'font-semibold')}>{title}</h2>
        </div>
        {lead && <p className="mt-3 max-w-prose text-small text-ink-2">{lead}</p>}
      </div>
      {action}
    </header>
  );
}

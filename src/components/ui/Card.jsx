import { cn } from '../../lib/utils/format.js';

export default function Card({ as: Tag = 'div', interactive = false, className, children, ...rest }) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-line bg-surface',
        interactive && 'transition-colors duration-state ease-ease hover:border-line-strong hover:bg-sunken text-left w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardLabel({ children, className }) {
  return (
    <div className={cn('text-label font-semibold uppercase tracking-wide text-ink-3', className)}>
      {children}
    </div>
  );
}

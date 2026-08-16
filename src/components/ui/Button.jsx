import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils/format.js';

/**
 * Variants follow the colour discipline in docs/FRONTEND-SPEC.md §2.4:
 * `signal` is permitted ONLY for genuinely critical actions.
 */
const VARIANTS = {
  civic: 'bg-civic text-white hover:bg-civic-hover border border-transparent',
  signal: 'bg-signal text-white hover:bg-signal-hover border border-transparent',
  outline: 'bg-surface text-ink border border-line-strong hover:bg-sunken',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-sunken hover:text-ink',
  quiet: 'bg-sunken text-ink border border-transparent hover:bg-line',
};

const SIZES = {
  sm: 'h-9 px-3 text-small gap-1.5',
  md: 'h-11 px-4 text-small gap-2', // 44px — minimum touch target
  lg: 'h-13 px-6 text-body gap-2.5',
};

export default function Button({
  as,
  to,
  href,
  variant = 'civic',
  size = 'md',
  full = false,
  loading = false,
  disabled = false,
  className,
  children,
  ...rest
}) {
  const classes = cn(
    'inline-flex items-center justify-center rounded-md font-semibold',
    'transition-colors duration-state ease-ease',
    'disabled:opacity-50 disabled:pointer-events-none',
    VARIANTS[variant],
    SIZES[size],
    full && 'w-full',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  const Tag = as || 'button';
  return (
    <Tag className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {children}
    </Tag>
  );
}

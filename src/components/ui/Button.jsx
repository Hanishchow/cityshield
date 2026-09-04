import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils/format.js';

/**
 * `signal` is reserved for genuinely critical actions. Spending an alert colour
 * on ordinary emphasis is what makes it stop meaning anything.
 */
const VARIANTS = {
  primary: 'bg-accent text-accent-contrast border border-transparent hover:bg-accent-hover',
  signal: 'bg-signal text-white border border-transparent hover:bg-signal-hover',
  outline: 'bg-transparent text-ink border border-line-strong hover:bg-sunken hover:border-ink-3',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-sunken hover:text-ink',
  quiet: 'bg-sunken text-ink border border-transparent hover:bg-line',
};

/* Radii differ per size on purpose. md is the 44px minimum touch target. */
const SIZES = {
  sm: 'h-9 px-3.5 text-small gap-2 rounded-xs',
  md: 'h-11 px-5 text-small gap-2 rounded-sm',
  lg: 'h-[52px] px-7 text-body gap-2.5 rounded-sm',
};

/* The frame variant carries its own padding on the inner span, so the outer
   element only contributes height and the plate thickness. */
const FRAME_SIZES = {
  sm: { outer: 'h-9 min-w-[120px]', inner: 'px-3.5 text-small' },
  md: { outer: 'h-11 min-w-[140px]', inner: 'px-5 text-small' },
  lg: { outer: 'h-[52px] min-w-[160px]', inner: 'px-7 text-body' },
};

export default function Button({
  to,
  href,
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  disabled = false,
  className,
  children,
  ...rest
}) {
  const isFrame = variant === 'frame';

  const classes = isFrame
    ? cn(
        'btn-frame font-semibold tracking-[-0.005em]',
        'disabled:pointer-events-none disabled:opacity-50',
        FRAME_SIZES[size].outer,
        full && 'w-full',
        className,
      )
    : cn(
        'inline-flex items-center justify-center font-semibold tracking-[-0.005em]',
        'no-underline transition-colors duration-state ease-ease',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      );

  const body = isFrame ? <span className={FRAME_SIZES[size].inner}>{children}</span> : children;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {body}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {body}
      </a>
    );
  }
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {body}
    </button>
  );
}

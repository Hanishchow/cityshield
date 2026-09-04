import { cn } from '../../lib/utils/format.js';

/**
 * The CityShield mark.
 *
 * Sourced from the supplied brand render, background keyed to transparency by
 * scripts/brand/extract-logo.mjs. The mark ships as a raster because the
 * original is a 3D render - its metallic bevel and enamel gradients have no
 * vector equivalent.
 *
 * The wordmark is deliberately NOT the raster: it is live text in the theme's
 * ink colour, so it stays crisp at every size and readable on the dark theme,
 * where the navy rendered wordmark would nearly vanish.
 */

const BASE = import.meta.env.BASE_URL || '/';

export default function Logo({ size = 30, showWordmark = true, className }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src={`${BASE}brand/logo-mark-96.png`}
        alt=""
        width={size}
        height={Math.round(size * (381 / 350))}
        className="shrink-0 select-none"
        style={{ height: Math.round(size * (381 / 350)), width: size }}
        draggable="false"
      />
      {showWordmark && (
        <span className="text-[15px] font-bold uppercase tracking-[0.02em] text-ink">
          City<span className="text-accent">Shield</span>
        </span>
      )}
    </span>
  );
}

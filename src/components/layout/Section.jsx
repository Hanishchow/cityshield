import { cn } from '../../lib/utils/format.js';

/**
 * Page rhythm.
 *
 * Vertical cadence is declared here as named steps rather than left to each
 * page to pick a `py-*` value. The previous version exposed a single default
 * and every caller overrode it, which cancelled the responsive step and left
 * the whole site sitting at 32px between sections — under a 68px display
 * heading and a 30px h2, that reads as one undifferentiated column.
 */
const RHYTHM = {
  flush: 'py-0',
  tight: 'py-8 md:py-10', //  32 /  40 — two blocks that belong together
  base: 'py-14 md:py-24', //  56 /  96 — the default between sections
  loose: 'py-16 md:py-32', //  64 / 128 — major movements, the close
};

/**
 * Horizontal measure. Space around the content matters as much as space
 * between it: a 1240px text block on a 1440px screen has no margin to breathe
 * into, so long-form content gets a narrower column while objects that are
 * genuinely wide (the map, a table) keep the full shell.
 */
const WIDTH = {
  text: 'max-w-measure', //  880px — prose, headings, lists
  shell: 'max-w-shell', // 1240px — default: tables, grids
  wide: 'max-w-wide', // 1400px — the map, full-bleed
};

/* Side margin grows with the viewport rather than staying at a fixed gutter. */
const PAD = 'px-5 md:px-10 lg:px-16';

/**
 * A rule that belongs to the heading beneath it.
 *
 * Deliberately asymmetric: a little space below the rule, a lot above the next
 * one. Symmetric padding — the previous `py-8` + `border-t pt-8` — leaves the
 * rule floating equidistant between two blocks, so it separates nothing and
 * the page reads as a wall. This asymmetry is the actual fix; the larger
 * numbers alone would not have been.
 */
const DIVIDED = 'border-t border-line pt-10 pb-24 md:pt-12 md:pb-32';

export default function Section({
  as: Tag = 'section',
  space = 'base',
  width = 'shell',
  divided = false,
  className,
  children,
  ...rest
}) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full',
        WIDTH[width] ?? WIDTH.shell,
        PAD,
        divided ? DIVIDED : (RHYTHM[space] ?? RHYTHM.base),
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Numbered header used inside panels. */
export function PanelHead({ index, title, lead, serif = false, action, className }) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 border-b border-line/70 pb-7',
        className,
      )}
    >
      <div>
        <div className="flex items-baseline gap-3">
          {index && <span className="font-data text-micro text-ink-3">{index}</span>}
          <h2 className={cn('text-h2 text-ink', serif && 'font-semibold')}>{title}</h2>
        </div>
        {lead && <p className="mt-4 max-w-prose text-body text-ink-2">{lead}</p>}
      </div>
      {action}
    </header>
  );
}

import { cn } from '../../lib/utils/format.js';

/**
 * An instrument readout: caps label, monospaced value, optional unit.
 *
 * Used instead of the usual "large number centred in a bordered card", which is
 * one of the most recognisable generated-landing-page shapes.
 */
export default function Readout({ label, value, unit, note, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="label-caps">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-data text-h2 leading-none text-ink">{value}</span>
        {unit && <span className="font-data text-small text-ink-3">{unit}</span>}
      </div>
      {note && <p className="mt-2 text-small text-ink-3">{note}</p>}
    </div>
  );
}

import StatusPill from '../../components/ui/StatusPill.jsx';
import { accuracyBand, metres } from '../../lib/utils/format.js';

const SOURCE_LABEL = {
  gps: 'GPS',
  network: 'Network',
  fused: 'Fused',
  manual: 'Manually placed',
  last_known: 'Last known',
};

/**
 * Shows the location AND its uncertainty. PRD §10.2 — we never present a poor
 * fix as a precise one, and the source is always visible.
 */
export default function LocationBanner({ ping, locating, error }) {
  if (error) {
    return (
      <div className="rounded-md border-l-2 border-signal bg-signal-tint px-4 py-3">
        <div className="text-small">
          <p className="font-semibold text-ink">Location unavailable</p>
          <p className="text-ink-2">{error}</p>
          <p className="mt-1 text-ink-2">
            You can still report — describe a landmark, or{' '}
            <a href="tel:112" className="font-semibold">
              call 112
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  if (!ping) {
    return (
      <div className="rounded-md border border-line bg-surface px-4 py-3 text-small text-ink-2">
        {locating ? 'Acquiring your location…' : 'Location will be captured when you report.'}
      </div>
    );
  }

  const band = accuracyBand(ping.accuracy);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-surface px-4 py-3">
      <span className="font-mono text-small tabular-nums text-ink">
        {ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}
      </span>
      <StatusPill tone={band.tone}>
        {band.label} {metres(ping.accuracy)}
      </StatusPill>
      <span className="text-label uppercase tracking-wide text-ink-3">
        {SOURCE_LABEL[ping.source] ?? ping.source}
      </span>
    </div>
  );
}

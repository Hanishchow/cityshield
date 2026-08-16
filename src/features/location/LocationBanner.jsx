import { MapPin, AlertTriangle, LoaderCircle } from 'lucide-react';
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
      <div className="flex items-start gap-3 rounded-md border border-signal/30 bg-signal-tint px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
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
      <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-small text-ink-2">
        {locating ? (
          <>
            <LoaderCircle size={16} className="shrink-0 text-civic" aria-hidden="true" />
            Acquiring your location…
          </>
        ) : (
          <>
            <MapPin size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
            Location will be captured when you report.
          </>
        )}
      </div>
    );
  }

  const band = accuracyBand(ping.accuracy);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-surface px-4 py-3">
      <MapPin size={16} className="shrink-0 text-civic" aria-hidden="true" />
      <span className="font-mono text-small tabular-nums text-ink">
        {ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}
      </span>
      <StatusPill tone={band.tone} dot={false}>
        {band.label} {metres(ping.accuracy)}
      </StatusPill>
      <span className="text-label uppercase tracking-wide text-ink-3">
        {SOURCE_LABEL[ping.source] ?? ping.source}
      </span>
    </div>
  );
}

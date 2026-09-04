import StatusPill from '../../components/ui/StatusPill.jsx';
import { accuracyBand, metres } from '../../lib/utils/format.js';
import useReverseGeocode from './useReverseGeocode.js';

const SOURCE_LABEL = {
  gps: 'GPS',
  network: 'Network',
  fused: 'Fused',
  manual: 'Manually placed',
  last_known: 'Last known',
};

/**
 * Shows the location AND its uncertainty. We never present a poor fix as a
 * precise one, and the source is always visible.
 *
 * Ordering is deliberate: coordinates first, address second. An address is a
 * convenience; the coordinates are what a responder is actually dispatched to,
 * and they must never be pushed below a resolved street name that could be
 * stale or wrong.
 */
export default function LocationBanner({ ping, locating, error }) {
  const { place } = useReverseGeocode(ping);

  if (error) {
    return (
      <div className="rounded-md border-l-2 border-signal bg-signal-tint px-4 py-3">
        <div className="text-small">
          <p className="font-semibold text-ink">Location unavailable</p>
          <p className="text-ink-2">{error}</p>
          <p className="mt-1 text-ink-2">
            You can still report. Describe a landmark, or{' '}
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
      <div className="rounded-md border border-line/70 bg-ink/[0.035] px-4 py-3 text-small text-ink-2">
        {locating ? 'Acquiring your location...' : 'Location will be captured when you report.'}
      </div>
    );
  }

  const band = accuracyBand(ping.accuracy);

  return (
    <div className="rounded-md border border-line/70 bg-ink/[0.035] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-data text-small text-ink">
          {ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}
        </span>
        <StatusPill tone={band.tone}>
          {band.label} {metres(ping.accuracy)}
        </StatusPill>
        <span className="font-data text-micro uppercase tracking-[0.09em] text-ink-3">
          {SOURCE_LABEL[ping.source] ?? ping.source}
        </span>
      </div>

      {place && (
        <p className="mt-2 text-small text-ink-2">
          {place.formatted}
          {place.mocked && (
            <span className="ml-2 font-data text-micro uppercase tracking-[0.09em] text-warn">
              sample
            </span>
          )}
        </p>
      )}
    </div>
  );
}

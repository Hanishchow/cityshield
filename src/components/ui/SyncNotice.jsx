import { SYNC } from '../../app/providers/useIncidentSync.js';

/**
 * Says where the incident actually lives.
 *
 * This exists because the alternative is worse than useless: a report that only
 * reached this device, presented as though agencies had received it, is the one
 * failure this product cannot have. Someone would stop looking for another way
 * to get help.
 *
 * Silent while syncing. A status that flickers "sending... sent" during an
 * emergency is noise, and the outcome arrives within a second either way.
 */
export default function SyncNotice({ status, reference, className }) {
  if (status === SYNC.idle || status === SYNC.syncing) return null;

  if (status === SYNC.localOnly) {
    return (
      <div className={`surface-alert surface-signal py-3 pl-4 ${className ?? ''}`}>
        <p className="text-small font-semibold text-ink">Saved on this device only</p>
        <p className="mt-1 max-w-prose text-small text-ink-2">
          The service could not be reached, so no agency has this report yet. If you need help
          now,{' '}
          <a href="tel:112" className="font-semibold">
            call 112
          </a>
          . Your report is kept here and can be sent when you are back online.
        </p>
      </div>
    );
  }

  return (
    <p className={`text-small text-ink-3 ${className ?? ''}`}>
      Record created
      {reference ? (
        <>
          {' '}
          as <span className="font-data text-ink-2">{reference}</span>
        </>
      ) : null}
      . Quote this reference if you call 112.
    </p>
  );
}

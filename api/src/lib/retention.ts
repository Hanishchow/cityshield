import { config } from '../config.ts';
import { store } from '../store/index.ts';

/**
 * Retention sweeper.
 *
 * DPDP Act 2023 makes storage limitation an obligation, not a preference: data
 * may be kept only as long as the stated purpose needs it. Documenting a
 * retention period without a job that enforces it is a claim, not a control,
 * which is worse than having neither because it invites reliance.
 *
 * Runs on an interval rather than on a cron so the service has no external
 * scheduling dependency. `unref()` keeps it from holding the process open.
 */

const INTERVAL_MS = 60 * 60 * 1000;

export function startRetentionSweeper(log) {
  const sweep = async () => {
    try {
      const removed = await store.purge();
      if (removed.pings || removed.incidents) {
        log?.info(
          { ...removed, pingDays: config.retention.pingDays, incidentDays: config.retention.incidentDays },
          'retention sweep',
        );
      }
    } catch (err) {
      /* A failed sweep must never take the service down: people in an emergency
         matter more than a housekeeping job. It retries on the next interval. */
      log?.error({ err }, 'retention sweep failed');
    }
  };

  /* One pass at boot, so a service that restarts often still erases on time
     rather than resetting its clock every restart. */
  void sweep();

  const timer = setInterval(sweep, INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}

import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { PERMISSION, useLocationPermission } from './useLocationPermission.js';

/**
 * Location permission, asked for properly.
 *
 * Two rules this follows that most sites break:
 *
 * 1. It NEVER calls getCurrentPosition on page load. An unexplained browser
 *    permission prompt is the one most people reflexively dismiss, and a denied
 *    permission is far harder to recover than one that was never asked for.
 *    Explain first, then ask on a deliberate tap.
 *
 * 2. A refusal is not a dead end. The whole app stays usable without location:
 *    the person can describe a landmark, or call 112. Location makes dispatch
 *    faster, it is not the price of entry.
 */

/** The explain-then-ask card, shown until the question is settled either way. */
export default function LocationGate({ onSettled }) {
  const { state, fixError, request } = useLocationPermission();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state === PERMISSION.granted || state === PERMISSION.denied) onSettled?.(state);
  }, [state, onSettled]);

  /* Granted is granted. The card disappears on permission, not on a successful
     fix: a device that has not produced coordinates yet is normal, and asking
     again for access we already hold is what made this reappear in a loop. */
  if (state === PERMISSION.granted || state === PERMISSION.unknown) return null;

  const denied = state === PERMISSION.denied;
  const unsupported = state === PERMISSION.unsupported;

  return (
    <section className="glass surface-alert px-5 py-4" aria-labelledby="loc-gate-h">
      <h2 id="loc-gate-h" className="text-body font-semibold text-ink">
        {denied
          ? 'Location is blocked for this site'
          : unsupported
            ? 'This browser cannot share location'
            : 'Share your location for faster dispatch'}
      </h2>

      <p className="mt-2 max-w-prose text-small text-ink-2">
        {denied
          ? 'Responders will not receive your coordinates automatically. You can still report - describe a nearby landmark instead. To re-enable it, open the padlock in your address bar and allow Location for this site.'
          : unsupported
            ? 'You can still report an emergency. Describe a nearby landmark, or call 112 directly.'
            : fixError
              ? 'Your browser allowed it, but no position came back. That is common indoors or on a desktop without GPS. Try again near a window, or report anyway and describe a landmark.'
              : 'Your coordinates are sent only when you raise an incident, and only to the agencies handling it. Without them, dispatch depends on you describing where you are, which costs minutes.'}
      </p>

      {!denied && !unsupported && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button
            onClick={async () => {
              setBusy(true);
              await request();
              setBusy(false);
            }}
            disabled={busy}
          >
            {busy ? 'Waiting for your browser' : fixError ? 'Try again' : 'Allow location'}
          </Button>
          <a href="tel:112" className="text-small font-semibold">
            Or call 112 now
          </a>
        </div>
      )}
    </section>
  );
}

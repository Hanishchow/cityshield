import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Geolocation permission state, kept separate from the component that renders
 * it so other surfaces (SOS, Report) can read the same state without importing
 * a card they do not want to draw.
 *
 * The distinction this hook exists to hold: PERMISSION is not the same thing as
 * A FIX. Someone can grant location and still not get coordinates for a while,
 * or ever, indoors. Collapsing the two means a failed fix reads as a withdrawn
 * permission, and the app asks again for something it already has.
 */

export const PERMISSION = {
  unknown: 'unknown',
  prompt: 'prompt',
  granted: 'granted',
  denied: 'denied',
  unsupported: 'unsupported',
};

/** Why a fix failed, when permission itself is fine. */
export const FIX = {
  none: null,
  timeout: 'timeout',
  unavailable: 'unavailable',
};

export function useLocationPermission() {
  const [state, setState] = useState(PERMISSION.unknown);
  const [fixError, setFixError] = useState(FIX.none);
  const statusRef = useRef(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState(PERMISSION.unsupported);
      return undefined;
    }
    /* The Permissions API is not universal. Where it is missing we stay at
       `prompt` rather than guessing, because guessing `granted` would show
       someone a state they never agreed to. */
    if (!navigator.permissions?.query) {
      setState(PERMISSION.prompt);
      return undefined;
    }

    let cancelled = false;
    const sync = () => {
      if (!cancelled && statusRef.current) setState(statusRef.current.state);
    };

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((s) => {
        if (cancelled) return;
        statusRef.current = s;
        sync();
        s.addEventListener('change', sync);
      })
      .catch(() => {
        if (!cancelled) setState(PERMISSION.prompt);
      });

    return () => {
      cancelled = true;
      statusRef.current?.removeEventListener('change', sync);
    };
  }, []);

  const request = useCallback(
    () =>
      new Promise((resolve) => {
        if (!('geolocation' in navigator)) return resolve(PERMISSION.unsupported);

        navigator.geolocation.getCurrentPosition(
          () => {
            setFixError(FIX.none);
            setState(PERMISSION.granted);
            resolve(PERMISSION.granted);
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setState(PERMISSION.denied);
              return resolve(PERMISSION.denied);
            }

            /* TIMEOUT and POSITION_UNAVAILABLE say nothing about permission.
               They are ordinary on a desktop, indoors, or with a cold GPS.
               Recording them as a fix problem instead of a permission problem
               is what stops the app re-asking for access it already has. */
            setFixError(err.code === err.TIMEOUT ? FIX.timeout : FIX.unavailable);

            /* Trust the Permissions API over the failed attempt. If it says
               granted, we are granted, fix or no fix. */
            const known = statusRef.current?.state;
            const next = known ?? PERMISSION.prompt;
            setState(next);
            resolve(next);
          },
          /* A high-accuracy fix can take a long time to arrive, and the app does
             not need one to be useful. Ask for a coarse fix quickly, and let the
             continuous watch during an actual incident refine it. */
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 },
        );
      }),
    [],
  );

  return { state, fixError, request };
}

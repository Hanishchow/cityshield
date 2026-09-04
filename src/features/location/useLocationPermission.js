import { useCallback, useEffect, useState } from 'react';

/**
 * Geolocation permission state, kept separate from the component that renders
 * it so other surfaces (SOS, Report) can read the same state without importing
 * a card they do not want to draw.
 */
export const PERMISSION = {
  unknown: 'unknown',
  prompt: 'prompt',
  granted: 'granted',
  denied: 'denied',
  unsupported: 'unsupported',
};

export function useLocationPermission() {
  const [state, setState] = useState(PERMISSION.unknown);

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

    let status;
    const sync = () => setState(status.state);
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((s) => {
        status = s;
        sync();
        status.addEventListener('change', sync);
      })
      .catch(() => setState(PERMISSION.prompt));

    return () => status?.removeEventListener('change', sync);
  }, []);

  const request = useCallback(
    () =>
      new Promise((resolve) => {
        if (!('geolocation' in navigator)) return resolve(PERMISSION.unsupported);
        navigator.geolocation.getCurrentPosition(
          () => {
            setState(PERMISSION.granted);
            resolve(PERMISSION.granted);
          },
          (err) => {
            const next =
              err.code === err.PERMISSION_DENIED ? PERMISSION.denied : PERMISSION.prompt;
            setState(next);
            resolve(next);
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        );
      }),
    [],
  );

  return { state, request };
}

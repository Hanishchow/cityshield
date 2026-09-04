import { useEffect, useRef, useState } from 'react';
import { geocode } from '../../lib/services/index.js';
import { api } from '../../lib/api.js';

/**
 * Resolve a GPS fix to a street address.
 *
 * Two things this deliberately does NOT do:
 *  - refetch on every ping. Location streams every few seconds; the street name
 *    does not change every few seconds. It only refetches once the position has
 *    moved further than `thresholdM`.
 *  - block or replace the coordinates on failure. The raw lat/lng is the thing
 *    that actually matters in an emergency, so a failed lookup degrades to
 *    "no address" and leaves the numbers untouched.
 */
export default function useReverseGeocode(ping, { thresholdM = 60 } = {}) {
  const [place, setPlace] = useState(null);
  const [error, setError] = useState(null);
  const lastRef = useRef(null);

  useEffect(() => {
    if (!ping) return undefined;

    /* Rough metres-per-degree at Bengaluru's latitude. Precise enough to decide
       whether it is worth another network request. */
    const movedFar = (() => {
      const prev = lastRef.current;
      if (!prev) return true;
      const dLat = (ping.lat - prev.lat) * 111_320;
      const dLng = (ping.lng - prev.lng) * 108_000;
      return Math.hypot(dLat, dLng) > thresholdM;
    })();

    if (!movedFar) return undefined;

    let cancelled = false;
    lastRef.current = { lat: ping.lat, lng: ping.lng };

    /* Prefer the API: it holds the provider credentials, so the key is never
       shipped to the browser. The client-side adapter stays as the fallback for
       when the backend is unreachable, which must not blank the address. */
    api
      .reverseGeocode(ping)
      .then((r) => r.place)
      .catch(() => geocode.reverse(ping))
      .then((result) => {
        if (cancelled) return;
        setPlace(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep whatever address we already had rather than blanking the UI.
        setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [ping, thresholdM]);

  return { place, error };
}

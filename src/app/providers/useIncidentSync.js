import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';

/**
 * Mirrors a locally-raised incident to the API.
 *
 * The ordering here is the whole design: the incident is created LOCALLY first
 * and this runs afterwards. An emergency control that awaits a network round
 * trip before acknowledging the press is an emergency control that fails on the
 * exact connection it is most likely to meet. So the local record is
 * authoritative for the interface, and the server copy is a mirror that catches
 * up when it can.
 *
 * Consequences, accepted deliberately:
 *  - The UI never shows a spinner on the SOS path.
 *  - A failed sync degrades to "on this device only", stated plainly, rather
 *    than to a lost report.
 *  - The server, once it does receive the incident, remains the authority on
 *    routing and on which state transitions are legal. This mirrors, it does
 *    not negotiate.
 */

export const SYNC = {
  idle: 'idle',
  syncing: 'syncing',
  synced: 'synced',
  localOnly: 'local-only',
};

/* Enough movement to be worth a request. Location streams every few seconds;
   a responder does not need a fix every few metres. */
const PING_THRESHOLD_M = 40;

export default function useIncidentSync(incident) {
  const [status, setStatus] = useState(SYNC.idle);
  const [remote, setRemote] = useState(null);
  const attemptedRef = useRef(null);
  const lastPingRef = useRef(null);

  /* Create the server-side record once per local incident. */
  useEffect(() => {
    if (!incident?.id) return;
    if (attemptedRef.current === incident.id) return;
    attemptedRef.current = incident.id;

    let cancelled = false;
    setStatus(SYNC.syncing);

    const ping = incident.currentLocation;
    api
      .createIncident(
        {
          category: (incident.category ?? 'unknown').split('.')[0],
          severity: incident.severity ?? 'urgent',
          description: incident.description || undefined,
          sos: Boolean(incident.sos),
          ping: ping
            ? {
                lat: ping.lat,
                lng: ping.lng,
                accuracy: Math.round(ping.accuracy),
                source: ping.source,
              }
            : null,
        },
        /* Keyed on the LOCAL id so a retry, a remount, or a double-tap all
           resolve to the same server incident rather than three emergencies. */
        `incident-${incident.id}`,
      )
      .then((created) => {
        if (cancelled) return;
        setRemote(created);
        setStatus(SYNC.synced);
        if (ping) lastPingRef.current = ping;
      })
      .catch(() => {
        if (cancelled) return;
        /* No retry loop. A backend that is down stays down for the length of an
           emergency, and hammering it costs battery on the device that most
           needs it. The record is safe locally and 112 is one tap away. */
        setStatus(SYNC.localOnly);
      });

    return () => {
      cancelled = true;
    };
  }, [incident?.id, incident?.category, incident?.severity, incident?.description, incident?.sos, incident?.currentLocation]);

  /* Stream position updates to the server copy, distance-gated. */
  useEffect(() => {
    const id = remote?.id;
    const ping = incident?.currentLocation;
    if (!id || !ping) return;

    const prev = lastPingRef.current;
    if (prev) {
      const dLat = (ping.lat - prev.lat) * 111_320;
      const dLng = (ping.lng - prev.lng) * 108_000;
      if (Math.hypot(dLat, dLng) < PING_THRESHOLD_M) return;
    }
    lastPingRef.current = ping;

    api
      .addPing(id, {
        lat: ping.lat,
        lng: ping.lng,
        accuracy: Math.round(ping.accuracy),
        source: ping.source,
      })
      .catch(() => {
        /* A dropped position update is not worth surfacing: the next one
           supersedes it, and the incident already carries a recent fix. */
      });
  }, [remote?.id, incident?.currentLocation]);

  return { status, remote, reference: remote?.id ?? null, trackToken: remote?.trackToken ?? null };
}

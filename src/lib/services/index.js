/**
 * Service adapter selection. See docs/FRONTEND-SPEC.md §5.3.
 *
 * Every external capability sits behind an interface with a mock and a real
 * implementation. This is what makes PRD §11 Tier 2 a configuration change
 * rather than a rewrite.
 *
 * Hard invariant: the app runs fully with ZERO env vars set.
 */

import { geolocation } from './geolocation.js';
import { MOCK_FACILITIES, MOCK_WARD, distanceKm, delay } from './mockData.js';

const key = (name) => import.meta.env[name] || null;

export const config = {
  maps: key('VITE_MAPS_API_KEY'),
  places: key('VITE_PLACES_API_KEY') || key('VITE_MAPS_API_KEY'),
};

/** Which adapters are live vs mocked — surfaced in the UI so nothing pretends. */
export const adapterStatus = {
  geolocation: geolocation.name,
  geocode: config.maps ? 'live' : 'mock',
  facilities: config.places ? 'live' : 'mock',
  dispatch: 'mock', // Tier 2 — requires a government MoU (PRD §11)
  notify: 'mock', // needs a backend; an SMS key cannot live in a client bundle
};

export const isFullyMocked = Object.values(adapterStatus).every(
  (v) => v === 'mock' || v === 'browser',
);

/* ------------------------------------------------------------------ */
/* Geocode                                                             */
/* ------------------------------------------------------------------ */

export const geocode = {
  /** Reverse-geocode a ping to a human-readable place + BBMP ward. */
  async reverse(_pos) {
    if (!config.maps) {
      await delay(400);
      return {
        formatted: 'Near 100 Feet Road, Indiranagar, Bengaluru 560038',
        ward: MOCK_WARD,
        mocked: true,
      };
    }
    // Live implementation lands here once a maps key is configured.
    throw new Error('Live geocode adapter not yet implemented');
  },
};

/* ------------------------------------------------------------------ */
/* Facilities                                                          */
/* ------------------------------------------------------------------ */

export const facilities = {
  /** Nearest facilities of a kind, sorted by distance. */
  async nearest(pos, kind, limit = 3) {
    if (!config.places) {
      await delay(500);
      return MOCK_FACILITIES.filter((f) => f.kind === kind)
        .map((f) => ({ ...f, distanceKm: distanceKm(pos, f), mocked: true }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);
    }
    throw new Error('Live facilities adapter not yet implemented');
  },
};

/* ------------------------------------------------------------------ */
/* Dispatch — Tier 1 handoff + Tier 2 mock                             */
/* ------------------------------------------------------------------ */

export const dispatch = {
  /**
   * Tier 1, and genuinely real: build the structured handoff payload that
   * accompanies a 112 call. This is not mocked — it is what we can actually do
   * without a government integration.
   */
  buildHandoff(incident) {
    const p = incident.currentLocation;
    const lines = [
      'CITY SHIELD EMERGENCY',
      `Type: ${incident.category}`,
      p ? `Location: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)} (±${Math.round(p.accuracy)}m)` : 'Location: UNKNOWN',
      p ? `Map: https://maps.google.com/?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}` : null,
      incident.description ? `Details: ${incident.description}` : null,
      `Ref: ${incident.id}`,
    ].filter(Boolean);
    return { sms: lines.join('\n'), tel: 'tel:112' };
  },

  /**
   * Tier 2 simulation. Clearly mocked — the UI must label any state derived
   * from this as simulated, never present it as a real dispatch.
   */
  async notifyAgencies(tasks) {
    await delay(700);
    return tasks.map((t) => ({ ...t, state: 'notified', mocked: true }));
  },
};

/* ------------------------------------------------------------------ */
/* Notify                                                              */
/* ------------------------------------------------------------------ */

export const notify = {
  /**
   * Guardian fan-out. Permanently mocked in the client: an SMS provider key
   * cannot live in a Vite bundle (every VITE_* var ships as plaintext to the
   * browser). This requires a backend — see PRD §16 Q8.
   */
  async guardians(contacts) {
    await delay(400);
    return contacts.map((c) => ({ contact: c, state: 'queued', mocked: true }));
  },
};

export { geolocation };

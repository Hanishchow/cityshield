/**
 * Geolocation adapter. Real implementation uses the browser Geolocation API;
 * the mock simulates accuracy drift so degradation paths are testable.
 *
 * Location is a STREAM, not a field (PRD §10). Accuracy is always reported and
 * never hidden — a 60m accuracy shown as a 2m pin is actively dangerous (§10.2).
 */

import { makeId } from '../incident/model.js';
import { MOCK_ORIGIN, seeded } from './mockData.js';

/** Battery-aware cadence ladder. PRD §10.3. */
export function cadenceFor(battery) {
  if (battery == null) return 3000;
  if (battery > 0.4) return 3000;
  if (battery > 0.15) return 10000;
  if (battery > 0.05) return 30000;
  return 60000;
}

function ping(partial) {
  return {
    id: makeId('lp'),
    at: new Date().toISOString(),
    altitude: null,
    heading: null,
    speed: null,
    battery: null,
    stale: false,
    ...partial,
  };
}

/* ------------------------------------------------------------------ */
/* Browser adapter                                                     */
/* ------------------------------------------------------------------ */

const browserGeo = {
  name: 'browser',
  available: typeof navigator !== 'undefined' && 'geolocation' in navigator,

  /** @returns {Promise<import('../incident/model.js').LocationPing>} */
  getCurrent() {
    return new Promise((resolve, reject) => {
      if (!this.available) {
        reject(new Error('Geolocation is not available on this device'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve(
            ping({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              source: pos.coords.accuracy < 50 ? 'gps' : 'network',
            }),
          ),
        (err) => reject(new Error(err.message || 'Could not determine location')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });
  },

  /** @returns {() => void} unsubscribe */
  watch(onPing, onError) {
    if (!this.available) {
      onError?.(new Error('Geolocation is not available on this device'));
      return () => {};
    }
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        onPing(
          ping({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            source: pos.coords.accuracy < 50 ? 'gps' : 'network',
          }),
        ),
      (err) => onError?.(new Error(err.message || 'Lost location signal')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  },
};

/* ------------------------------------------------------------------ */
/* Mock adapter                                                        */
/* ------------------------------------------------------------------ */

const mockGeo = {
  name: 'mock',
  available: true,

  async getCurrent() {
    const rand = seeded(7);
    await new Promise((r) => setTimeout(r, 600));
    return ping({
      lat: MOCK_ORIGIN.lat + (rand() - 0.5) * 0.0006,
      lng: MOCK_ORIGIN.lng + (rand() - 0.5) * 0.0006,
      accuracy: 8 + rand() * 6,
      source: 'gps',
      battery: 0.62,
    });
  },

  watch(onPing) {
    const rand = seeded(11);
    let n = 0;
    // Simulated drift: accuracy oscillates the way a real fix does under cover.
    const id = setInterval(() => {
      n += 1;
      const drift = Math.sin(n / 6) * 0.0004;
      onPing(
        ping({
          lat: MOCK_ORIGIN.lat + drift + (rand() - 0.5) * 0.0002,
          lng: MOCK_ORIGIN.lng + drift * 0.7 + (rand() - 0.5) * 0.0002,
          accuracy: 6 + Math.abs(Math.sin(n / 4)) * 28,
          heading: (n * 11) % 360,
          speed: 0.4 + rand() * 0.8,
          source: n % 9 === 0 ? 'network' : 'gps',
          battery: Math.max(0.05, 0.62 - n * 0.004),
        }),
      );
    }, 3000);
    return () => clearInterval(id);
  },
};

export const geolocation = browserGeo.available ? browserGeo : mockGeo;
export { browserGeo, mockGeo };

/**
 * Mock fixtures. Realistic, not empty — see docs/FRONTEND-SPEC.md §5.3.
 *
 * Everything here is clearly labelled sample data. Nothing in the UI may present
 * a mock value as a real one (PRD §9.1 anti-requirement).
 */

/** Indiranagar, Bengaluru — the mock citizen origin. */
export const MOCK_ORIGIN = { lat: 12.9784, lng: 77.6408 };

export const MOCK_FACILITIES = [
  { id: 'f1', kind: 'police', name: 'Indiranagar Police Station', lat: 12.9719, lng: 77.6412 },
  { id: 'f2', kind: 'police', name: 'Ulsoor Police Station', lat: 12.9812, lng: 77.6215 },
  { id: 'f3', kind: 'hospital', name: 'Manipal Hospital, Old Airport Road', lat: 12.9583, lng: 77.6489 },
  { id: 'f4', kind: 'hospital', name: 'Chinmaya Mission Hospital', lat: 12.9756, lng: 77.6392 },
  { id: 'f5', kind: 'fire', name: 'Domlur Fire Station', lat: 12.9612, lng: 77.6387 },
  { id: 'f6', kind: 'fire', name: 'Yelahanka Fire Station', lat: 13.0995, lng: 77.5963 },
  { id: 'f7', kind: 'civic', name: 'BBMP Ward Office — Hoysala Nagar', lat: 12.9829, lng: 77.6461 },
];

export const MOCK_WARD = { number: 80, name: 'Hoysala Nagar', zone: 'Mahadevapura' };

/** Deterministic PRNG so mock runs are reproducible. */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Haversine distance in km. */
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Injectable latency, so loading states are exercised rather than skipped. */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { useEffect, useRef, useState } from 'react';
import { distanceKm } from './geo.js';

/**
 * Responder movement simulation, in real Bengaluru coordinates.
 *
 * This stands in for Tier 2 telemetry, which needs a government integration
 * that does not exist. It is a SIMULATION and every surface that shows it says
 * so: an emergency product must never present an invented position as a real
 * vehicle location.
 *
 * Routes are dog-legged rather than straight, because a vehicle follows
 * streets. Coordinates are real so they land correctly on real map tiles.
 */

/* Indiranagar, near 100 Feet Road. */
export const INCIDENT = { lat: 12.9784, lng: 77.6408 };

export const RESPONDERS = [
  {
    id: 'ambulance',
    agency: 'Ambulance',
    unit: '108-KA01-4521',
    station: 'Manipal Hospital, Old Airport Road',
    seconds: 240,
    route: [
      { lat: 12.9583, lng: 77.6489 },
      { lat: 12.9641, lng: 77.6489 },
      { lat: 12.9641, lng: 77.6431 },
      { lat: 12.9742, lng: 77.6431 },
      INCIDENT,
    ],
  },
  {
    id: 'police',
    agency: 'Police',
    unit: 'HOY-22',
    station: 'Indiranagar Police Station',
    seconds: 168,
    route: [
      { lat: 12.9719, lng: 77.6412 },
      { lat: 12.9719, lng: 77.6389 },
      { lat: 12.9769, lng: 77.6389 },
      INCIDENT,
    ],
  },
  {
    id: 'civic',
    agency: 'BBMP Civic',
    unit: 'BBMP-W80-3',
    station: 'Hoysala Nagar ward office',
    seconds: 402,
    route: [
      { lat: 12.9829, lng: 77.6461 },
      { lat: 12.9829, lng: 77.6425 },
      { lat: 12.9801, lng: 77.6425 },
      INCIDENT,
    ],
  },
];

function routeKm(route) {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += distanceKm(route[i - 1], route[i]);
  return total;
}

/** Position at `t` (0..1) along the route, measured by real distance. */
function pointAt(route, t) {
  const total = routeKm(route);
  let remaining = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < route.length; i++) {
    const seg = distanceKm(route[i - 1], route[i]);
    if (remaining <= seg || i === route.length - 1) {
      const k = seg === 0 ? 0 : Math.min(1, remaining / seg);
      return {
        lat: route[i - 1].lat + (route[i].lat - route[i - 1].lat) * k,
        lng: route[i - 1].lng + (route[i].lng - route[i - 1].lng) * k,
      };
    }
    remaining -= seg;
  }
  return route[route.length - 1];
}

export default function useResponderSim({ running = true } = {}) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!running) return undefined;
    /* Driven by a timestamp difference rather than a frame count, so the
       numbers stay correct when the tab is throttled or frames are dropped. */
    const tick = (now) => {
      if (startRef.current === null) startRef.current = now;
      setElapsed((now - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  const units = RESPONDERS.map((r) => {
    const t = Math.min(1, elapsed / r.seconds);
    const pos = pointAt(r.route, t);
    return {
      ...r,
      t,
      pos,
      remainingSeconds: Math.max(0, Math.round(r.seconds - elapsed)),
      remainingKm: routeKm(r.route) * (1 - t),
      arrived: t >= 1,
      state: t >= 1 ? 'on_scene' : t > 0.02 ? 'en_route' : 'accepted',
    };
  });

  const nearest = units.reduce((a, b) => (a.remainingSeconds <= b.remainingSeconds ? a : b));

  return { elapsed, units, nearest };
}

export function formatEta(seconds) {
  if (seconds <= 0) return 'Arrived';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

import type { Junction } from "./junctions.ts";

export const CORRIDOR_RADIUS_M = 2500;
export const MAX_CORRIDOR_JUNCTIONS = 4;
export const LEAD_S = 25;
export const CLEAR_S = 20;
export const AHEAD_CONE_DEG = 60;
export const DEFAULT_SPEED_MPS = 11;
export const MIN_SPEED_MPS = 5;
export const MAX_SPEED_MPS = 25;

const R_M = 6371000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const phi1 = a.lat * DEG_TO_RAD;
  const phi2 = b.lat * DEG_TO_RAD;
  const dPhi = (b.lat - a.lat) * DEG_TO_RAD;
  const dLambda = (b.lng - a.lng) * DEG_TO_RAD;

  const sinDPhi = Math.sin(dPhi / 2);
  const sinDLambda = Math.sin(dLambda / 2);

  const h =
    sinDPhi * sinDPhi + Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R_M * c;
}

export function bearingDeg(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const phi1 = from.lat * DEG_TO_RAD;
  const phi2 = to.lat * DEG_TO_RAD;
  const dLambda = (to.lng - from.lng) * DEG_TO_RAD;

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

  const theta = Math.atan2(y, x);
  // Normalise to 0..360 so it can be compared with vehicle heading directly.
  return (theta * RAD_TO_DEG + 360) % 360;
}

export function angleDiffDeg(a: number, b: number): number {
  // Smallest absolute difference on a circle; wraparound at 0/360 must fold
  // back, otherwise a heading of 350 deg and a bearing of 10 deg would appear
  // 340 deg apart instead of the true 20 deg.
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export type Vehicle = {
  lat: number;
  lng: number;
  headingDeg: number | null;
  speedMps: number;
};

export function estimateVehicle(
  pings: { lat: number; lng: number; at: string }[],
  nowMs: number = Date.now(),
): Vehicle | null {
  if (pings.length === 0) return null;

  const last = pings[pings.length - 1];
  const lastMs = Date.parse(last.at);
  const stale =
    Number.isNaN(lastMs) || nowMs - lastMs > 60_000;

  // With fewer than two fixes there is no segment to measure, and when the
  // last fix is stale the vehicle may have stopped or changed direction, so
  // any previously computed heading or speed would be misleading. Fall back to
  // a conservative default that still lets the corridor open ahead.
  if (pings.length < 2 || stale) {
    return {
      lat: last.lat,
      lng: last.lng,
      headingDeg: null,
      speedMps: DEFAULT_SPEED_MPS,
    };
  }

  // Heading from the fix 3 steps back (or earliest available) to the last.
  // Using a 3-step window smooths GPS jitter without needing a filter.
  const fromIdx = Math.max(0, pings.length - 4);
  const from = pings[fromIdx];
  const headingDeg = bearingDeg(from, last);

  const speeds: number[] = [];
  for (let i = 1; i < pings.length; i++) {
    const prev = pings[i - 1];
    const cur = pings[i];
    const dtS = (Date.parse(cur.at) - Date.parse(prev.at)) / 1000;
    // Guard against duplicate or out-of-order timestamps that would divide by
    // zero or produce a negative speed. Skipping the segment is safer than
    // synthesising a speed from bad time data.
    if (!Number.isFinite(dtS) || dtS <= 0) continue;
    const d = haversineM(prev, cur);
    speeds.push(d / dtS);
  }

  let speedMps: number;
  if (speeds.length === 0) {
    speedMps = DEFAULT_SPEED_MPS;
  } else {
    speeds.sort((x, y) => x - y);
    const mid = Math.floor(speeds.length / 2);
    const median =
      speeds.length % 2 === 1
        ? speeds[mid]
        : (speeds[mid - 1] + speeds[mid]) / 2;
    // Clamp to plausible emergency-vehicle speeds so a single noisy GPS jump
    // cannot produce an ETA of a few seconds or many minutes.
    speedMps = Math.min(MAX_SPEED_MPS, Math.max(MIN_SPEED_MPS, median));
  }

  return { lat: last.lat, lng: last.lng, headingDeg, speedMps };
}

export type PlannedJunction = {
  junctionId: number;
  name: string;
  distanceM: number;
  etaSeconds: number;
  validFrom: number;
  duration: number;
};

export function planCorridor(
  pings: { lat: number; lng: number; at: string }[],
  junctions: readonly Junction[],
  nowMs: number = Date.now(),
): PlannedJunction[] {
  const vehicle = estimateVehicle(pings, nowMs);
  if (vehicle === null) return [];

  // Straight-line (haversine) ETA is used instead of road-network routing.
  // Road routing needs a network fetch to a directions service, and that fetch
  // would fail in exactly the degraded-connectivity situation the radio
  // fallback exists for. A straight-line estimate is always computable locally
  // and degrades gracefully; the LEAD_S window absorbs the routing error.
  const candidates: PlannedJunction[] = [];

  for (const j of junctions) {
    const distanceM = haversineM(vehicle, j);

    if (distanceM > CORRIDOR_RADIUS_M) continue;

    if (vehicle.headingDeg !== null) {
      const brg = bearingDeg(vehicle, j);
      if (angleDiffDeg(vehicle.headingDeg, brg) > AHEAD_CONE_DEG) continue;
    }

    const etaSeconds = Math.round(distanceM / vehicle.speedMps);
    const validFrom =
      Math.floor(nowMs / 1000) + Math.max(0, etaSeconds - LEAD_S);
    const duration = LEAD_S + CLEAR_S;

    candidates.push({
      junctionId: j.id,
      name: j.name,
      distanceM,
      etaSeconds,
      validFrom,
      duration,
    });
  }

  candidates.sort((a, b) => a.etaSeconds - b.etaSeconds);
  return candidates.slice(0, MAX_CORRIDOR_JUNCTIONS);
}

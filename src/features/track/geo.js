/**
 * Web Mercator projection helpers.
 *
 * Enough to place raster tiles and markers without pulling in a map library.
 * MapLibre would add roughly 230KB gzipped to a route that sits next to the
 * emergency path, and a tracking view should stay locked on the incident
 * rather than let someone pan away from it mid-emergency.
 */

export const TILE_SIZE = 256;

/** Longitude to world-pixel X at a zoom level. */
export function lngToWorldX(lng, zoom) {
  return ((lng + 180) / 360) * Math.pow(2, zoom) * TILE_SIZE;
}

/** Latitude to world-pixel Y at a zoom level. */
export function latToWorldY(lat, zoom) {
  const s = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return y * Math.pow(2, zoom) * TILE_SIZE;
}

/**
 * Viewport for a map centred on `center` at `zoom`, sized `width` x `height`.
 * Returns the world-pixel origin plus a project() that maps lat/lng to
 * viewport pixels.
 */
export function createViewport({ center, zoom, width, height }) {
  const cx = lngToWorldX(center.lng, zoom);
  const cy = latToWorldY(center.lat, zoom);
  const originX = cx - width / 2;
  const originY = cy - height / 2;

  return {
    zoom,
    width,
    height,
    originX,
    originY,
    project(lat, lng) {
      return {
        x: lngToWorldX(lng, zoom) - originX,
        y: latToWorldY(lat, zoom) - originY,
      };
    },
    /** The tile grid covering this viewport. */
    tiles() {
      const n = Math.pow(2, zoom);
      const out = [];
      const x0 = Math.floor(originX / TILE_SIZE);
      const x1 = Math.floor((originX + width) / TILE_SIZE);
      const y0 = Math.floor(originY / TILE_SIZE);
      const y1 = Math.floor((originY + height) / TILE_SIZE);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          if (y < 0 || y >= n) continue; // no tiles past the poles
          out.push({
            x: ((x % n) + n) % n, // wrap around the antimeridian
            y,
            left: x * TILE_SIZE - originX,
            top: y * TILE_SIZE - originY,
          });
        }
      }
      return out;
    },
  };
}

/** Great-circle distance in kilometres. */
export function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** World-pixel Y back to latitude. Inverse of latToWorldY. */
export function worldYToLat(y, zoom) {
  const n = Math.PI - (2 * Math.PI * y) / (Math.pow(2, zoom) * TILE_SIZE);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/**
 * A viewport framed to contain EVERY point given, rather than centred on one.
 *
 * The responder origins sit up to 2.5km out, so a viewport centred on the
 * incident pushed the furthest unit past the bottom edge: the ambulance was
 * off-frame for the first half of its run and appeared to pop into existence
 * mid-route. Framing to the content means every unit is visible from the first
 * second, which is the entire point of the page.
 *
 * Zoom stays an integer. Raster tiles only exist at integer zoom levels, and a
 * fractional zoom would mean CSS-scaled tiles with resampled label text.
 */
export function fitViewport({ points, width, height, padding = 52, minZoom = 2, maxZoom = 17 }) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const [south, north] = [Math.min(...lats), Math.max(...lats)];
  const [west, east] = [Math.min(...lngs), Math.max(...lngs)];

  /* Padding is per-side, and must never exceed the box it pads. */
  const availW = Math.max(1, width - padding * 2);
  const availH = Math.max(1, height - padding * 2);

  let zoom = minZoom;
  for (let z = maxZoom; z >= minZoom; z--) {
    const spanX = lngToWorldX(east, z) - lngToWorldX(west, z);
    const spanY = latToWorldY(south, z) - latToWorldY(north, z);
    if (spanX <= availW && spanY <= availH) {
      zoom = z;
      break;
    }
  }

  /* The vertical centre is the midpoint in PROJECTED space, not the mean of
     the two latitudes — Mercator is non-linear in latitude, so averaging the
     degrees leaves the frame slightly off. */
  const center = {
    lat: worldYToLat((latToWorldY(south, zoom) + latToWorldY(north, zoom)) / 2, zoom),
    lng: (west + east) / 2,
  };

  return createViewport({ center, zoom, width, height });
}

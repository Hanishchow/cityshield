import type { LatLng, MapProvider, Place } from './types.ts';

/**
 * Ola Maps (Krutrim). Fallback provider.
 *
 * India-only with a generous free tier, so it stands in when Mappls is
 * unconfigured or has burned its quota mid-demo. Its response is Google-shaped
 * (address_components with `types`), which is why the shape below looks nothing
 * like the Mappls one — normalising that difference is the whole point of this
 * layer.
 */

const REVERSE_URL = 'https://api.olamaps.io/places/v1/reverse-geocode';

type Component = { long_name: string; short_name: string; types: string[] };

export function createOlaProvider({ apiKey }: { apiKey: string }): MapProvider {
  return {
    name: 'ola',
    async reverse(at: LatLng): Promise<Place> {
      const url = `${REVERSE_URL}?latlng=${at.lat.toFixed(6)},${at.lng.toFixed(6)}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Ola reverse geocode failed: ${res.status}`);

      const body = (await res.json()) as {
        results?: { formatted_address?: string; address_components?: Component[] }[];
      };
      const r = body.results?.[0];
      if (!r) throw new Error('Ola returned no match');

      const parts = r.address_components ?? [];
      const pick = (...types: string[]) =>
        parts.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? null;

      return {
        formatted: r.formatted_address ?? `${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`,
        street: pick('route', 'street_address'),
        locality: pick('sublocality_level_1', 'sublocality', 'locality'),
        district: pick('administrative_area_level_2'),
        state: pick('administrative_area_level_1'),
        postcode: pick('postal_code'),
        /* Ola does not return wards at all. */
        ward: null,
        wardSource: 'stand-in',
        provider: 'ola',
      };
    },
  };
}

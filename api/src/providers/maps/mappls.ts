import type { LatLng, MapProvider, Place } from './types.ts';

/**
 * Mappls (MapmyIndia).
 *
 * Chosen as primary because it is India's national mapping partner: boundaries
 * follow Survey of India, addressing goes to house level, and locality naming
 * matches what a Bengaluru caller would actually say out loud. For a service
 * pitched at government, rendering India's borders the way an OSM-derived tileset
 * does is a legal exposure, not a cosmetic difference.
 *
 * Auth is OAuth2 client-credentials; the token is cached until shortly before it
 * expires so a burst of pings does not mint a token per request.
 */

const TOKEN_URL = 'https://outpost.mappls.com/api/security/oauth/token';
const REVERSE_URL = 'https://apis.mappls.com/advancedmaps/v1/rev_geocode';

type Opts = { clientId: string; clientSecret: string };

export function createMapplsProvider({ clientId, clientSecret }: Opts): MapProvider {
  let token: string | null = null;
  let expiresAt = 0;

  async function accessToken(): Promise<string> {
    /* 60s of slack: a token that expires mid-flight fails the request it was
       fetched for, which in this service is someone's location lookup. */
    if (token && Date.now() < expiresAt - 60_000) return token;

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Mappls auth failed: ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    token = body.access_token;
    expiresAt = Date.now() + body.expires_in * 1000;
    return token;
  }

  return {
    name: 'mappls',
    async reverse(at: LatLng): Promise<Place> {
      const url = `${REVERSE_URL}?lat=${at.lat.toFixed(6)}&lng=${at.lng.toFixed(6)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${await accessToken()}` },
      });
      if (!res.ok) throw new Error(`Mappls reverse geocode failed: ${res.status}`);

      const body = (await res.json()) as { results?: Record<string, string>[] };
      const r = body.results?.[0];
      if (!r) throw new Error('Mappls returned no match');

      const nz = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

      return {
        formatted: nz(r.formatted_address) ?? `${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`,
        street: nz(r.street) ?? nz(r.poi),
        locality: nz(r.locality) ?? nz(r.subLocality) ?? nz(r.village),
        district: nz(r.district),
        state: nz(r.state),
        postcode: nz(r.pincode),
        /* Mappls exposes a ward field in some responses. When it is missing we
           say so rather than substituting a plausible-looking number. */
        ward: nz(r.ward),
        wardSource: nz(r.ward) ? 'provider' : 'stand-in',
        provider: 'mappls',
      };
    },
  };
}

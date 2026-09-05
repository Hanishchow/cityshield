import { config } from '../../config.ts';
import { createMapplsProvider } from './mappls.ts';
import { createOlaProvider } from './ola.ts';
import type { LatLng, MapProvider, Place } from './types.ts';

export type { LatLng, Place, MapProvider };

/**
 * Provider chain: Mappls first, Ola second, stand-in last.
 *
 * The fallback is per-REQUEST, not per-boot. A provider that is configured but
 * momentarily failing must not take the location lookup down with it — the
 * chain moves to the next one and records which provider actually answered, so
 * the client can tell the difference.
 */

const chain: MapProvider[] = [];

if (config.mapplsClientId && config.mapplsClientSecret) {
  chain.push(
    createMapplsProvider({
      clientId: config.mapplsClientId,
      clientSecret: config.mapplsClientSecret,
    }),
  );
}
if (config.olaKey) {
  chain.push(createOlaProvider({ apiKey: config.olaKey }));
}

/** Clearly-labelled stand-in, so the endpoint answers with zero keys configured. */
const standIn: MapProvider = {
  name: 'stand-in',
  async reverse(at: LatLng): Promise<Place> {
    return {
      formatted: `Near 100 Feet Road, Indiranagar, Bengaluru 560038`,
      street: '100 Feet Road',
      locality: 'Indiranagar',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      postcode: '560038',
      ward: '80 — Hoysala Nagar',
      wardSource: 'stand-in',
      provider: `stand-in (${at.lat.toFixed(4)}, ${at.lng.toFixed(4)})`,
    };
  },
};

export const providerNames = chain.map((p) => p.name);

export async function reverseGeocode(at: LatLng): Promise<{ place: Place; errors: string[] }> {
  const errors: string[] = [];
  for (const provider of chain) {
    try {
      return { place: await provider.reverse(at), errors };
    } catch (err) {
      errors.push(`${provider.name}: ${(err as Error).message}`);
    }
  }
  return { place: await standIn.reverse(at), errors };
}

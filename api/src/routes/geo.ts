import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { reverseGeocode, providerNames } from '../providers/maps/index.ts';

const query = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export default async function geoRoutes(app: FastifyInstance) {
  /**
   * Reverse geocode.
   *
   * This exists so the map credentials stay on the server. The previous
   * client-side call shipped the key to every visitor in plaintext, because
   * every VITE_* variable is inlined into the bundle at build time. Anyone who
   * viewed source had the key and could spend the quota.
   */
  app.get('/geo/reverse', async (req, reply) => {
    const at = query.parse(req.query);
    const { place, errors } = await reverseGeocode(at);

    /* Coordinates change slowly relative to how often a moving client asks. */
    reply.header('cache-control', 'private, max-age=60');

    if (errors.length) req.log.warn({ errors }, 'geocode provider fallback');
    return { place, providers: providerNames, degraded: errors.length > 0 };
  });
}

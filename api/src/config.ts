/**
 * Configuration.
 *
 * Hard invariant, carried over from the frontend: the service starts and serves
 * every route with ZERO environment variables set. Absent credentials degrade a
 * capability to a clearly-labelled stand-in; they never crash the process. An
 * emergency service that refuses to boot because a map key is missing is worse
 * than one that boots and says its geocoder is offline.
 */

const str = (name: string): string | null => process.env[name]?.trim() || null;

export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? '127.0.0.1',
  env: process.env.NODE_ENV ?? 'development',

  /** Postgres + PostGIS. Absent => in-memory store, so `npm run dev` needs no database. */
  databaseUrl: str('DATABASE_URL'),

  /**
   * Map provider keys live HERE, on the server, and never in the browser bundle.
   * Every VITE_* variable is shipped to the client as plaintext; that was
   * acceptable while there was no backend and is not acceptable now.
   */
  mapplsKey: str('MAPPLS_REST_KEY'),
  mapplsClientId: str('MAPPLS_CLIENT_ID'),
  mapplsClientSecret: str('MAPPLS_CLIENT_SECRET'),
  olaKey: str('OLA_MAPS_API_KEY'),

  /** Signing secret for incident capability tokens. */
  tokenSecret: str('TOKEN_SECRET') ?? 'dev-insecure-secret-do-not-ship',

  /** Browser origins allowed to call this API. */
  corsOrigins: (str('CORS_ORIGINS') ?? 'http://localhost:5178,http://127.0.0.1:5178')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  /**
   * DPDP Act 2023: personal data may be kept only as long as the stated purpose
   * requires. Location pings are the most sensitive thing this service holds, so
   * they carry their own, shorter clock than the incident record.
   */
  retention: {
    pingDays: Number(process.env.RETENTION_PING_DAYS ?? 30),
    incidentDays: Number(process.env.RETENTION_INCIDENT_DAYS ?? 365),
  },
} as const;

export const capabilities = () => ({
  store: config.databaseUrl ? 'postgres' : 'memory',
  geocode: config.mapplsKey || config.mapplsClientId ? 'mappls' : config.olaKey ? 'ola' : 'mock',
  dispatch: 'mock' as const, // Tier 2: needs a government MoU, not a key
  notify: 'mock' as const, // needs an SMS provider agreement
});

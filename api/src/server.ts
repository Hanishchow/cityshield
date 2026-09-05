import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { config, capabilities } from './config.ts';
import { store } from './store/index.ts';
import { topicCount } from './lib/events.ts';
import { startRetentionSweeper } from './lib/retention.ts';
import incidentRoutes, { auditRoutes } from './routes/incidents.ts';
import streamRoutes from './routes/stream.ts';
import geoRoutes from './routes/geo.ts';
import docsRoutes from './routes/docs.ts';
import idempotency from './lib/idempotency.ts';
import telemetry from './lib/telemetry.ts';

const app = Fastify({
  logger: { level: config.env === 'production' ? 'info' : 'debug' },
  /* Behind a proxy the client IP is only correct if we trust the forwarded
     header, and the rate limiter keys on client IP. */
  trustProxy: true,
});

await app.register(cors, { origin: config.corsOrigins, credentials: true });

/**
 * Rate limiting, with a deliberate carve-out.
 *
 * The SOS endpoint is NOT limited the same way as the rest: throttling someone
 * who is panic-tapping an emergency button is the wrong failure mode. Abuse of
 * that endpoint is a real concern, but the answer is verification downstream,
 * not a 429 in front of an emergency.
 */
await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
  allowList: () => false,
});

/**
 * Error handling.
 *
 * Registered BEFORE the route plugins on purpose. Fastify hands each
 * encapsulated context the error handler that exists at the moment the context
 * is created, so a handler installed after `register()` is silently ignored by
 * every route inside it — validation failures came back as 500s carrying raw
 * internal error text instead of a 400 describing the bad field.
 */
app.setErrorHandler((err, req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: 'Invalid request', issues: err.issues });
  }
  const status = (err as { status?: number }).status ?? err.statusCode ?? 500;
  if (status >= 500) req.log.error({ err }, 'unhandled error');
  return reply.code(status).send({ error: err.message });
});

/**
 * Called directly, NOT via app.register().
 *
 * `register` creates an encapsulated child context, and hooks added inside one
 * apply only to routes in that same context. Registering these as siblings of
 * the route plugins meant their hooks never ran for any route: two identical
 * SOS submissions with the same Idempotency-Key each created their own
 * incident, and /metrics reported zero requests forever. Applying them to the
 * root instance is what makes them global.
 */
await telemetry(app);
await idempotency(app);

app.get('/health', async () => ({
  ok: true,
  env: config.env,
  capabilities: capabilities(),
  store: store.kind,
  openStreams: topicCount(),
  uptimeSeconds: Math.round(process.uptime()),
}));

await app.register(incidentRoutes, { prefix: '/v1' });
await app.register(auditRoutes, { prefix: '/v1' });
await app.register(streamRoutes, { prefix: '/v1' });
await app.register(geoRoutes, { prefix: '/v1' });
await app.register(docsRoutes);

startRetentionSweeper(app.log);

await app.listen({ port: config.port, host: config.host });

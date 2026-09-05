/**
 * Idempotency middleware for idempotent HTTP methods.
 *
 * A person panic-tapping SOS on a flaky mobile connection will retry. Each
 * retry must NOT create another emergency incident, because double-booking
 * an ambulance to the same location wastes a finite resource and delays
 * the real response. This middleware deduplicates requests by a client-
 * supplied key so only the first submission reaches the handler.
 *
 * Design choices:
 * - 409 on in-flight duplicates, not queuing. A second emergency call for
 *   the same event should fail fast rather than silently stack behind the
 *   first. The caller can retry after a backoff.
 * - In-memory store only. Idempotency keys are short-lived (24h) and the
 *   service is single-process. A shared store would add operational
 *   complexity for a guarantee that, in this domain, only matters within
 *   one process's lifetime.
 */

import type { FastifyInstance } from 'fastify';

type CompletedEntry = { status: number; body: unknown; completedAt: number };

const TTL_MS = 24 * 60 * 60 * 1000;

export function createIdempotencyStore() {
  const completed = new Map<string, CompletedEntry>();
  const inFlight = new Set<string>();

  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of completed) {
      if (now - entry.completedAt > TTL_MS) completed.delete(key);
    }
  }, 60 * 60 * 1000);
  interval.unref();

  return { completed, inFlight };
}

export default async function idempotency(app: FastifyInstance) {
  const { completed, inFlight } = createIdempotencyStore();

  app.addHook('onRequest', async (req, reply) => {
    if (req.method !== 'POST' && req.method !== 'PATCH') return;

    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string' || key.length === 0) return;

    if (inFlight.has(key)) {
      reply.code(409).send({ error: 'Request already in progress' });
      return;
    }

    const cached = completed.get(key);
    if (cached) {
      reply.code(cached.status).send(cached.body);
      return;
    }

    inFlight.add(key);
    (req as unknown as Record<string, unknown>)._idempotencyKey = key;
  });

  app.addHook('onSend', async (req, reply, payload) => {
    const key = (req as unknown as Record<string, unknown>)._idempotencyKey as
      | string
      | undefined;
    if (!key) return payload;

    inFlight.delete(key);

    /* Only successful responses are replayable.
       Caching a 500 or a 400 would pin that failure to the key for 24 hours, so
       the retry that should have succeeded would keep being handed the cached
       error instead. On an SOS endpoint that turns one transient blip into a
       permanently unreportable emergency. Failures stay retryable. */
    if (reply.statusCode < 200 || reply.statusCode >= 300) return payload;

    /* Not every response is JSON: the SSE stream, the docs page and any empty
       body all reach this hook. An unguarded JSON.parse here throws INSIDE
       onSend, which converts a successful response into a 500. */
    if (typeof payload !== 'string') return payload;
    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      return payload;
    }

    completed.set(key, { status: reply.statusCode, body, completedAt: Date.now() });
    return payload;
  });

  app.addHook('onError', async (req) => {
    const key = (req as unknown as Record<string, unknown>)._idempotencyKey as
      | string
      | undefined;
    if (key) inFlight.delete(key);
  });
}

/**
 * Request telemetry and /metrics endpoint.
 *
 * Every request gets a stable ID threaded through logs and the response
 * header so a support engineer can trace a single SOS submission across
 * client retries, load balancer hops, and downstream service calls without
 * grepping by timestamp.
 *
 * The metrics snapshot is intentionally simple — plain counters and a
 * fixed-bucket histogram — because the consumer is an operator dashboard,
 * not a full Prometheus scrape. Keeping it in-process avoids the
 * operational overhead of an external metrics agent for a single-service
 * deployment.
 */

import type { FastifyInstance } from 'fastify';

interface Metrics {
  total: number;
  byStatus: Record<string, number>;
  durations: { bucket: string; count: number }[];
}

const BUCKETS = [5, 25, 100, 500, 2000] as const;

let total = 0;
const byStatus = new Map<string, number>();
const durationCounts = new Array<number>(BUCKETS.length + 1).fill(0);

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500) return '5xx';
  return `${Math.floor(status / 100)}xx`;
}

function histogramBucket(ms: number): number {
  for (let i = 0; i < BUCKETS.length; i++) {
    if (ms <= BUCKETS[i]) return i;
  }
  return BUCKETS.length;
}

export function metricsSnapshot(): Metrics {
  return {
    total,
    byStatus: Object.fromEntries(byStatus),
    durations: BUCKETS.map((b, i) => ({
      bucket: `<=${b}ms`,
      count: durationCounts[i],
    })).concat({ bucket: `>${BUCKETS[BUCKETS.length - 1]}ms`, count: durationCounts[BUCKETS.length] }),
  };
}

export default async function telemetry(app: FastifyInstance) {
  app.addHook('onRequest', async (req) => {
    const id = req.headers['x-request-id'];
    req.id = typeof id === 'string' && id.length > 0 ? id : crypto.randomUUID();
    (req as unknown as Record<string, unknown>)._telemetryStart = Date.now();
  });

  app.addHook('onResponse', async (req, reply) => {
    if (req.routeOptions.url === '/metrics') return;

    reply.header('x-request-id', req.id);

    const start = (req as unknown as Record<string, unknown>)._telemetryStart as number;
    const durationMs = Date.now() - start;

    req.log.info({
      requestId: req.id,
      method: req.method,
      url: req.url,
      status: reply.statusCode,
      durationMs,
    });

    total += 1;
    const cls = statusClass(reply.statusCode);
    byStatus.set(cls, (byStatus.get(cls) ?? 0) + 1);
    durationCounts[histogramBucket(durationMs)] += 1;
  });

  app.get('/metrics', async () => metricsSnapshot());
}

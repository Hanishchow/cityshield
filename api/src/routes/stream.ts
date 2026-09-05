import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { subscribe } from '../lib/events.ts';
import { store } from '../store/index.ts';

const idParam = z.object({ id: z.string().regex(/^CS-[0-9A-Z]{3}-[0-9A-Z]{3}$/) });

export default async function streamRoutes(app: FastifyInstance) {
  app.get('/incidents/:id/stream', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const incident = await store.get(id);
    if (!incident) return reply.code(404).send({ error: 'Incident not found' });

    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      /* Nginx and friends buffer by default, which turns a live stream into a
         batch delivered at the end. This is the header that stops that. */
      'x-accel-buffering': 'no',
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    /* Send current state immediately: a client that connects mid-incident must
       not sit blank until the next change happens. */
    send('incident', incident);

    const unsubscribe = subscribe(id, send);

    /* Comment frames keep intermediaries from reaping an idle connection. */
    const heartbeat = setInterval(() => reply.raw.write(': keep-alive\n\n'), 25_000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}

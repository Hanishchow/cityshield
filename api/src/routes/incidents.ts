import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createIncidentSchema, pingSchema, INCIDENT_STATES } from '../domain/incident.ts';
import { routeIncident } from '../domain/routing.ts';
import { store } from '../store/index.ts';
import { publish } from '../lib/events.ts';
import { audit } from '../audit/index.ts';
import { issueToken } from '../lib/token.ts';

const idParam = z.object({ id: z.string().regex(/^CS-[0-9A-Z]{3}-[0-9A-Z]{3}$/) });

export default async function incidentRoutes(app: FastifyInstance) {
  /** Raise an incident. This is the endpoint behind the SOS control. */
  app.post('/incidents', async (req, reply) => {
    const input = createIncidentSchema.parse(req.body);
    const incident = await store.create(input);

    /* Routing happens server-side and immediately: the citizen should never be
       the one deciding which agency owns their emergency. */
    const withTasks = await store.setTasks(
      incident.id,
      routeIncident(incident.category, incident.severity, incident.createdAt),
    );

    audit.append({
      incidentId: incident.id,
      action: 'incident.created',
      actor: input.sos ? 'citizen:sos' : 'citizen:report',
      detail: { category: incident.category, severity: incident.severity, hadFix: Boolean(input.ping) },
    });
    audit.append({
      incidentId: incident.id,
      action: 'incident.routed',
      actor: 'system',
      detail: { tasks: withTasks.tasks.map((t) => ({ agency: t.agency, role: t.role })) },
    });

    publish(incident.id, 'incident', withTasks);

    /* The tracking capability is handed back with the incident itself. It is
       what lets someone follow their emergency, and forward that link to a
       relative, without ever creating an account. */
    const { token } = issueToken(incident.id, 'track');
    return reply.code(201).send({ ...withTasks, trackToken: token });
  });

  app.get('/incidents/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const incident = await store.get(id);
    if (!incident) return reply.code(404).send({ error: 'Incident not found' });
    return incident;
  });

  /** Propose a state change. The server decides whether it is legal. */
  app.patch('/incidents/:id/state', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const { to } = z.object({ to: z.enum(INCIDENT_STATES) }).parse(req.body);
    const incident = await store.transition(id, to);
    audit.append({ incidentId: id, action: `incident.${to}`, actor: 'system', detail: { to } });
    publish(id, 'incident', incident);
    return incident;
  });

  /** Append a location fix. The most sensitive write this service accepts. */
  app.post('/incidents/:id/pings', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const ping = pingSchema.parse(req.body);
    const incident = await store.addPing(id, ping);
    /* The audit entry records THAT a fix arrived and how good it was, never the
       coordinates. The location lives in the incident record under its own
       retention clock; copying it into a permanent append-only log would put
       the most sensitive field this service holds somewhere it can never be
       erased, which is the opposite of what storage limitation requires. */
    audit.append({
      incidentId: id,
      action: 'location.updated',
      actor: 'citizen',
      detail: { accuracyM: Math.round(ping.accuracy), source: ping.source },
    });
    publish(id, 'incident', incident);
    return reply.code(202).send({ ok: true, pings: incident.pings.length });
  });
}

export async function auditRoutes(app: FastifyInstance) {
  /**
   * The audit trail for one incident, with the chain's own verdict on whether
   * it has been altered. Exposing the verification result rather than just the
   * entries is the point: a log nobody can check is a log nobody should trust.
   */
  app.get('/incidents/:id/audit', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const incident = await store.get(id);
    if (!incident) return reply.code(404).send({ error: 'Incident not found' });

    const { intact, brokenAt } = audit.verify();
    return { incidentId: id, entries: audit.forIncident(id), chain: { intact, brokenAt, head: audit.head() } };
  });
}

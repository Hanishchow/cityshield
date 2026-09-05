import { canTransition, newIncidentId } from '../domain/incident.ts';
import type { CreateIncident, Incident, IncidentState, Ping } from '../domain/incident.ts';
import type { Store } from './types.ts';
import { config } from '../config.ts';

/**
 * In-memory store.
 *
 * Not a toy: it is what makes `npm run dev` work with no database installed,
 * and it is the reference implementation the Postgres store must match. It is
 * explicitly NOT durable, and `capabilities().store` reports `memory` so no
 * surface can imply otherwise.
 */
export function createMemoryStore(): Store {
  const incidents = new Map<string, Incident>();

  const now = () => new Date().toISOString();

  return {
    kind: 'memory',
    async ready() {
      return true;
    },

    async create(input: CreateIncident): Promise<Incident> {
      /* Ids are short and human-readable, so collisions are possible rather
         than negligible. Retry rather than hand back a duplicate reference. */
      let id = newIncidentId();
      for (let i = 0; incidents.has(id) && i < 50; i++) id = newIncidentId();
      if (incidents.has(id)) throw new Error('Could not allocate a unique incident id');

      const at = now();
      const incident: Incident = {
        id,
        state: 'submitted',
        category: input.category,
        severity: input.severity,
        description: input.description ?? null,
        sos: input.sos,
        createdAt: at,
        updatedAt: at,
        pings: input.ping ? [{ ...input.ping, at: input.ping.at ?? at }] : [],
        tasks: [],
        timeline: [{ state: 'submitted', at }],
      };
      incidents.set(id, incident);
      return structuredClone(incident);
    },

    async get(id: string): Promise<Incident | null> {
      const found = incidents.get(id);
      return found ? structuredClone(found) : null;
    },

    async transition(id: string, to: IncidentState): Promise<Incident> {
      const incident = incidents.get(id);
      if (!incident) throw Object.assign(new Error('Incident not found'), { status: 404 });
      if (!canTransition(incident.state, to)) {
        throw Object.assign(new Error(`Illegal transition ${incident.state} -> ${to}`), {
          status: 409,
        });
      }
      const at = now();
      incident.state = to;
      incident.updatedAt = at;
      incident.timeline.push({ state: to, at });
      return structuredClone(incident);
    },

    async addPing(id: string, ping: Ping): Promise<Incident> {
      const incident = incidents.get(id);
      if (!incident) throw Object.assign(new Error('Incident not found'), { status: 404 });
      const at = ping.at ?? now();
      incident.pings.push({ ...ping, at });
      incident.updatedAt = now();
      return structuredClone(incident);
    },

    async purge(now = new Date()) {
      const cutoff = (days: number) => now.getTime() - days * 86_400_000;
      const pingCutoff = cutoff(config.retention.pingDays);
      const incidentCutoff = cutoff(config.retention.incidentDays);
      let pings = 0;
      let removed = 0;

      for (const [id, incident] of incidents) {
        if (new Date(incident.createdAt).getTime() < incidentCutoff) {
          incidents.delete(id);
          removed++;
          continue;
        }
        /* Pings expire on their own, shorter clock. They are the sharpest data
           this service holds and the first to stop being useful, so they go
           long before the incident record they belong to. */
        const before = incident.pings.length;
        incident.pings = incident.pings.filter(
          (ping) => new Date(ping.at).getTime() >= pingCutoff,
        );
        pings += before - incident.pings.length;
      }
      return { pings, incidents: removed };
    },

    async setTasks(id, tasks) {
      const incident = incidents.get(id);
      if (!incident) throw Object.assign(new Error('Incident not found'), { status: 404 });
      incident.tasks = tasks;
      incident.updatedAt = now();
      return structuredClone(incident);
    },
  };
}

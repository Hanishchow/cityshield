import postgres from 'postgres';
import type { Store } from './types.ts';
import {
  canTransition,
  newIncidentId,
} from '../domain/incident.ts';
import type {
  AgencyTask,
  CreateIncident,
  Incident,
  IncidentState,
  Ping,
} from '../domain/incident.ts';

export function createPostgresStore(url: string): Store {
  const sql = postgres(url);

  /**
   * postgres.js maps timestamptz to a JS Date, but Incident declares every
   * timestamp as an ISO string and the in-memory store produces one. Without
   * this the two implementations of the same interface disagree about the type
   * of `createdAt`, and only the Postgres path would break a caller doing
   * anything string-shaped with it. Normalise at the boundary rather than
   * trusting the driver's parser table.
   */
  const iso = (v: Date | string): string =>
    v instanceof Date ? v.toISOString() : new Date(v).toISOString();

  async function get(id: string): Promise<Incident | null> {
    const [incident] = await sql`
      SELECT id, state, category, severity, description, sos,
             created_at, updated_at
      FROM incidents WHERE id = ${id}
    `;
    if (!incident) return null;

    const pings = await sql`
      SELECT accuracy_m, source, at,
             ST_Y(geog::geometry) AS lat,
             ST_X(geog::geometry) AS lng
      FROM incident_pings
      WHERE incident_id = ${id}
      ORDER BY at ASC
    `;

    const timeline = await sql`
      SELECT state, at
      FROM incident_timeline
      WHERE incident_id = ${id}
      ORDER BY at ASC
    `;

    const tasks = await sql`
      SELECT agency, role, state, unit, updated_at, simulated
      FROM incident_tasks
      WHERE incident_id = ${id}
    `;

    return {
      id: incident.id,
      state: incident.state as IncidentState,
      category: incident.category,
      severity: incident.severity,
      description: incident.description,
      sos: incident.sos,
      createdAt: iso(incident.created_at),
      updatedAt: iso(incident.updated_at),
      pings: pings.map((p) => ({
        lat: Number(p.lat),
        lng: Number(p.lng),
        accuracy: p.accuracy_m,
        source: p.source,
        at: iso(p.at),
      })),
      tasks: tasks.map((t) => ({
        agency: t.agency,
        role: t.role,
        state: t.state,
        unit: t.unit,
        updatedAt: iso(t.updated_at),
        simulated: t.simulated,
      })),
      timeline: timeline.map((t) => ({
        state: t.state as IncidentState,
        at: iso(t.at),
      })),
    };
  }

  return {
    kind: 'postgres',

    async ready(): Promise<boolean> {
      try {
        await sql`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },

    async create(input: CreateIncident): Promise<Incident> {
      let lastError: unknown;
      for (let attempt = 0; attempt < 50; attempt++) {
        const id = newIncidentId();
        try {
          return await sql.begin(async (tx) => {
            const at = new Date().toISOString();
            await tx`
              INSERT INTO incidents (id, state, category, severity, description, sos, created_at, updated_at)
              VALUES (${id}, 'submitted', ${input.category}, ${input.severity},
                      ${input.description ?? null}, ${input.sos}, ${at}, ${at})
            `;

            const pingAt = input.ping?.at ?? at;
            if (input.ping) {
              await tx`
                INSERT INTO incident_pings (incident_id, geog, accuracy_m, source, at)
                VALUES (${id},
                        ST_SetSRID(ST_MakePoint(${input.ping.lng}, ${input.ping.lat}), 4326)::geography,
                        ${input.ping.accuracy}, ${input.ping.source}, ${pingAt})
              `;
            }

            await tx`
              INSERT INTO incident_timeline (incident_id, state, at)
              VALUES (${id}, 'submitted', ${at})
            `;

            return {
              id,
              state: 'submitted',
              category: input.category,
              severity: input.severity,
              description: input.description ?? null,
              sos: input.sos,
              createdAt: at,
              updatedAt: at,
              pings: input.ping
                ? [{ ...input.ping, at: pingAt }]
                : [],
              tasks: [],
              timeline: [{ state: 'submitted', at }],
            };
          });
        } catch (e) {
          // 23505 = unique_violation; retry with a fresh id
          if ((e as { code?: string }).code === '23505') {
            lastError = e;
            continue;
          }
          throw e;
        }
      }
      throw new Error(
        `Could not allocate a unique incident id after 50 attempts: ${String(lastError)}`,
      );
    },

    async transition(id: string, to: IncidentState): Promise<Incident> {
      await sql.begin(async (tx) => {
        const [row] = await tx`
          SELECT state FROM incidents WHERE id = ${id} FOR UPDATE
        `;
        if (!row) {
          throw Object.assign(new Error('Incident not found'), { status: 404 });
        }
        if (!canTransition(row.state, to)) {
          throw Object.assign(
            new Error(`Illegal transition ${row.state} -> ${to}`),
            { status: 409 },
          );
        }
        const at = new Date().toISOString();
        await tx`
          UPDATE incidents SET state = ${to}, updated_at = ${at} WHERE id = ${id}
        `;
        await tx`
          INSERT INTO incident_timeline (incident_id, state, at)
          VALUES (${id}, ${to}, ${at})
        `;
      });

      /* Read back AFTER the transaction commits, not inside it. `get` runs on a
         pooled connection of its own, so calling it within the transaction read
         a different session that could not yet see the uncommitted UPDATE — the
         call would succeed and then hand back the OLD state. */
      return (await get(id))!;
    },

    async addPing(id: string, ping: Ping): Promise<Incident> {
      await sql.begin(async (tx) => {
        const [row] = await tx`SELECT id FROM incidents WHERE id = ${id}`;
        if (!row) {
          throw Object.assign(new Error('Incident not found'), { status: 404 });
        }
        const at = ping.at ?? new Date().toISOString();
        // Longitude first in ST_MakePoint -- the standard PostGIS gotcha.
        await tx`
          INSERT INTO incident_pings (incident_id, geog, accuracy_m, source, at)
          VALUES (${id},
                  ST_SetSRID(ST_MakePoint(${ping.lng}, ${ping.lat}), 4326)::geography,
                  ${ping.accuracy}, ${ping.source}, ${at})
        `;
        await tx`
          UPDATE incidents SET updated_at = now() WHERE id = ${id}
        `;
      });
      return (await get(id))!;
    },

    async setTasks(id: string, tasks: AgencyTask[]): Promise<Incident> {
      await sql.begin(async (tx) => {
        const [row] = await tx`SELECT id FROM incidents WHERE id = ${id}`;
        if (!row) {
          throw Object.assign(new Error('Incident not found'), { status: 404 });
        }
        await tx`DELETE FROM incident_tasks WHERE incident_id = ${id}`;
        if (tasks.length > 0) {
          for (const t of tasks) {
            await tx`
              INSERT INTO incident_tasks (incident_id, agency, role, state, unit, updated_at, simulated)
              VALUES (${id}, ${t.agency}, ${t.role}, ${t.state}, ${t.unit}, ${t.updatedAt}, ${t.simulated})
            `;
          }
        }
        await tx`
          UPDATE incidents SET updated_at = now() WHERE id = ${id}
        `;
      });
      return (await get(id))!;
    },
  };
}

import { z } from 'zod';

/**
 * The incident model. This is the spine of the product: ONE record that every
 * agency attaches to, rather than one phone call per agency.
 *
 * It deliberately mirrors the frontend's model so the two cannot drift, and it
 * is the server that is authoritative — the client may propose a transition,
 * only this module decides whether it is legal.
 */

export const CATEGORIES = [
  'medical',
  'fire',
  'police',
  'accident',
  'civic',
  'disaster',
  'unknown',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEVERITIES = ['critical', 'urgent', 'standard'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const INCIDENT_STATES = [
  'draft',
  'submitted',
  'acknowledged',
  'responding',
  'on_scene',
  'resolved',
  'cancelled',
] as const;
export type IncidentState = (typeof INCIDENT_STATES)[number];

export const AGENCY_TASK_STATES = [
  'notified',
  'accepted',
  'declined',
  'en_route',
  'on_scene',
  'cleared',
] as const;
export type AgencyTaskState = (typeof AGENCY_TASK_STATES)[number];

/**
 * Legal transitions. Anything not listed is rejected — an emergency record must
 * never be able to go backwards from `resolved`, and must never skip
 * `acknowledged`, because those states are what a citizen is being shown as
 * evidence that a human has seen their report.
 */
const INCIDENT_TRANSITIONS: Record<IncidentState, readonly IncidentState[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['acknowledged', 'cancelled'],
  acknowledged: ['responding', 'resolved', 'cancelled'],
  responding: ['on_scene', 'resolved', 'cancelled'],
  on_scene: ['resolved'],
  resolved: [],
  cancelled: [],
};

export function canTransition(from: IncidentState, to: IncidentState): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}

export const pingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Metres. Required: a fix without its uncertainty is a fix that lies. */
  accuracy: z.number().nonnegative().max(100_000),
  source: z.enum(['gps', 'network', 'fused', 'manual', 'last_known']),
  at: z.iso.datetime().optional(),
});
export type Ping = z.infer<typeof pingSchema>;

export const createIncidentSchema = z.object({
  category: z.enum(CATEGORIES).default('unknown'),
  severity: z.enum(SEVERITIES).default('urgent'),
  description: z.string().max(2000).optional(),
  ping: pingSchema.nullable().optional(),
  /** True when raised from the SOS control rather than the report form. */
  sos: z.boolean().default(false),
});
export type CreateIncident = z.infer<typeof createIncidentSchema>;

export type AgencyTask = {
  agency: string;
  role: 'primary' | 'secondary';
  state: AgencyTaskState;
  unit: string | null;
  updatedAt: string;
  /** Every task derived from simulation is flagged at the source, not in the UI. */
  simulated: boolean;
};

export type Incident = {
  id: string;
  state: IncidentState;
  category: Category;
  severity: Severity;
  description: string | null;
  sos: boolean;
  createdAt: string;
  updatedAt: string;
  /** Ordered oldest-first. The last entry is the current position. */
  pings: (Ping & { at: string })[];
  tasks: AgencyTask[];
  timeline: { state: IncidentState; at: string }[];
};

/**
 * Human-readable, phone-friendly reference. Deliberately NOT a UUID: this is a
 * number someone reads aloud to an operator under stress, so it avoids the
 * characters that get misheard or misread (0/O, 1/I/L, 5/S, 8/B).
 */
const ALPHABET = '234679ACDEFGHJKMNPQRTUVWXY';
export function newIncidentId(rand: () => number = Math.random): string {
  let body = '';
  for (let i = 0; i < 6; i++) body += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return `CS-${body.slice(0, 3)}-${body.slice(3)}`;
}

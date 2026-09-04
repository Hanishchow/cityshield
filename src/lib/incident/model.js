/**
 * Incident data contracts. See docs/PRD.md §6.
 *
 * The Incident is the shared spine: one object, N AgencyTasks. Agencies attach
 * to the same record rather than each receiving a private copy — that is the
 * whole product thesis, expressed as a data structure.
 */

/**
 * @typedef {'app'|'sms'|'ivr'|'web'} Channel
 * @typedef {'critical'|'urgent'|'standard'|'civic'} Severity
 * @typedef {'police'|'ambulance'|'fire'|'civic'|'disaster'|'utility'} Agency
 * @typedef {'primary'|'secondary'|'observer'} AgencyRole
 * @typedef {'gps'|'network'|'fused'|'manual'|'last_known'} PingSource
 */

/**
 * @typedef {Object} LocationPing
 * @property {string} id
 * @property {string} at            ISO timestamp
 * @property {number} lat
 * @property {number} lng
 * @property {number} accuracy      metres — always surfaced, never hidden (PRD §10.2)
 * @property {number|null} altitude
 * @property {number|null} heading
 * @property {number|null} speed
 * @property {PingSource} source
 * @property {number|null} battery  0..1 — drives cadence degradation (PRD §10.3)
 * @property {boolean} stale
 */

/**
 * @typedef {Object} AgencyTask
 * @property {string} id
 * @property {Agency} agency
 * @property {AgencyRole} role
 * @property {string} attachedBy
 * @property {string} attachedAt
 * @property {'notified'|'accepted'|'en_route'|'on_scene'|'cleared'|'declined'} state
 * @property {{id:string,type:string,contact:string}|null} unit
 * @property {string|null} eta      ISO timestamp, or null when genuinely unknown
 * @property {string[]} notes
 */

/**
 * @typedef {Object} Incident
 * @property {string} id
 * @property {string} createdAt
 * @property {string|null} reportedBy
 * @property {Channel} channel
 * @property {string} category
 * @property {Severity} severity
 * @property {boolean} silent
 * @property {string} description
 * @property {string[]} media
 * @property {LocationPing|null} origin
 * @property {LocationPing|null} currentLocation
 * @property {LocationPing[]} locationTrack
 * @property {AgencyTask[]} agencies
 * @property {string[]} guardiansNotified
 * @property {string} state
 * @property {{state:string,at:string,actor:string}[]} stateHistory
 * @property {string|null} resolvedAt
 * @property {string|null} resolution
 */

let counter = 0;

/** Monotonic, sortable-ish id. Not a real ULID — sufficient for a client-side model. */
export function makeId(prefix) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(3, '0')}`;
}

/** @returns {Incident} */
export function createIncident({
  category = 'unknown',
  severity = 'critical',
  silent = false,
  description = '',
  channel = 'app',
  reportedBy = null,
  origin = null,
  sos = false,
} = {}) {
  const now = new Date().toISOString();
  return {
    id: makeId('inc'),
    createdAt: now,
    reportedBy,
    channel,
    category,
    severity,
    silent,
    /* Raised from the hold control rather than the report form. Carried
       explicitly because the server routes and prioritises the two
       differently, and inferring it from `channel` downstream would be a
       guess. */
    sos,
    description,
    media: [],
    origin,
    currentLocation: origin,
    locationTrack: origin ? [origin] : [],
    agencies: [],
    guardiansNotified: [],
    state: 'reported',
    stateHistory: [{ state: 'reported', at: now, actor: 'citizen' }],
    resolvedAt: null,
    resolution: null,
  };
}

/** @returns {AgencyTask} */
export function createAgencyTask({ agency, role = 'secondary', attachedBy = 'system' }) {
  return {
    id: makeId('at'),
    agency,
    role,
    attachedBy,
    attachedAt: new Date().toISOString(),
    state: 'notified',
    unit: null,
    eta: null,
    notes: [],
  };
}

export const AGENCY_LABEL = {
  police: 'Police',
  ambulance: 'Ambulance',
  fire: 'Fire & Rescue',
  civic: 'BBMP Civic',
  disaster: 'Disaster Response',
  utility: 'Utility',
};

export const AGENCY_TASK_LABEL = {
  notified: 'Notified',
  accepted: 'Accepted',
  en_route: 'En route',
  on_scene: 'On scene',
  cleared: 'Cleared',
  declined: 'Declined',
};

export const SEVERITY_LABEL = {
  critical: 'Critical',
  urgent: 'Urgent',
  standard: 'Standard',
  civic: 'Civic',
};

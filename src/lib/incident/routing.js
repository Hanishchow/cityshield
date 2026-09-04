/**
 * Agency routing table. See docs/PRD.md §8.
 *
 * This table is the system's answer to "which number do I call?" — it exists so
 * the citizen never has to know. They state what is happening; routing is our job.
 *
 * Secondaries are NOTIFIED, not dispatched: they attach as observers and
 * self-promote if they choose to respond.
 */

/**
 * @typedef {Object} CategoryDef
 * @property {string} id
 * @property {string} label
 * @property {string} blurb
 * @property {import('./model.js').Agency} primary
 * @property {import('./model.js').Agency[]} secondary
 * @property {import('./model.js').Severity} severity
 * @property {string} group
 */

/** @type {CategoryDef[]} */
export const CATEGORIES = [
  {
    id: 'medical',
    label: 'Medical emergency',
    blurb: 'Injury, collapse, breathing difficulty, cardiac event.',
    primary: 'ambulance',
    secondary: [],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'medical.road_accident',
    label: 'Road accident',
    blurb: 'Collision with injury. Routes to ambulance, police and civic together.',
    primary: 'ambulance',
    secondary: ['police', 'civic'],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'crime.in_progress',
    label: 'Crime in progress',
    blurb: 'Assault, break-in, robbery happening now.',
    primary: 'police',
    secondary: [],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'personal_safety',
    label: 'Personal safety',
    blurb: 'Being followed, threatened, or unsafe. Alerts police and your guardians.',
    primary: 'police',
    secondary: [],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'fire.structure',
    label: 'Building fire',
    blurb: 'Fire in a home, office or structure.',
    primary: 'fire',
    secondary: ['police', 'ambulance'],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'fire.vehicle',
    label: 'Vehicle fire',
    blurb: 'Vehicle alight.',
    primary: 'fire',
    secondary: ['police'],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'rescue.trapped',
    label: 'Person trapped',
    blurb: 'Trapped in a lift, collapse, or water.',
    primary: 'fire',
    secondary: ['ambulance'],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'utility.live_wire',
    label: 'Live wire / electrical hazard',
    blurb: 'Exposed or fallen electrical cable.',
    primary: 'utility',
    secondary: ['fire', 'civic'],
    severity: 'critical',
    group: 'Emergency',
  },
  {
    id: 'disaster.flooding',
    label: 'Flooding',
    blurb: 'Water logging, flash flood, drain overflow.',
    primary: 'disaster',
    secondary: ['civic', 'fire'],
    severity: 'urgent',
    group: 'Disaster',
  },
  {
    id: 'disaster.tree_fall',
    label: 'Tree fall',
    blurb: 'Fallen tree or branch blocking access.',
    primary: 'civic',
    secondary: ['fire'],
    severity: 'urgent',
    group: 'Disaster',
  },
  {
    id: 'crime.report',
    label: 'Report a crime',
    blurb: 'Theft, cybercrime, or missing person, not currently in progress.',
    primary: 'police',
    secondary: [],
    severity: 'urgent',
    group: 'Non-urgent',
  },
  {
    id: 'civic.road_damage',
    label: 'Road damage',
    blurb: 'Potholes, broken surface, damaged divider.',
    primary: 'civic',
    secondary: [],
    severity: 'civic',
    group: 'Civic',
  },
  {
    id: 'civic.water',
    label: 'Water supply or leak',
    blurb: 'Leakage, contamination, or no supply.',
    primary: 'civic',
    secondary: [],
    severity: 'civic',
    group: 'Civic',
  },
  {
    id: 'civic.garbage',
    label: 'Garbage',
    blurb: 'Uncollected waste, illegal dumping.',
    primary: 'civic',
    secondary: [],
    severity: 'civic',
    group: 'Civic',
  },
  {
    id: 'civic.streetlight',
    label: 'Streetlight',
    blurb: 'Unlit or damaged street lighting.',
    primary: 'civic',
    secondary: [],
    severity: 'civic',
    group: 'Civic',
  },
  {
    id: 'civic.drainage',
    label: 'Drainage',
    blurb: 'Blocked or overflowing drain.',
    primary: 'civic',
    secondary: [],
    severity: 'civic',
    group: 'Civic',
  },
];

/** Fallback when the citizen does not classify within 10s (PRD §9.1 step 3). */
export const UNKNOWN_ROUTE = {
  id: 'unknown',
  label: 'Unclassified emergency',
  blurb: 'Routed to police with ambulance notified; a dispatcher disambiguates.',
  primary: 'police',
  secondary: ['ambulance'],
  severity: 'critical',
  group: 'Emergency',
};

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** @returns {CategoryDef} */
export function route(categoryId) {
  return BY_ID.get(categoryId) ?? UNKNOWN_ROUTE;
}

export function categoriesByGroup(group) {
  return CATEGORIES.filter((c) => c.group === group);
}

export const EMERGENCY_CATEGORIES = CATEGORIES.filter((c) => c.severity !== 'civic');
export const CIVIC_CATEGORIES = CATEGORIES.filter((c) => c.severity === 'civic');

/**
 * Severity is user-overridable UPWARD ONLY — a citizen may escalate their own
 * report but cannot downgrade a system-critical classification. (PRD §8)
 */
const RANK = { civic: 0, standard: 1, urgent: 2, critical: 3 };
export function reconcileSeverity(systemSeverity, requested) {
  if (!requested) return systemSeverity;
  return RANK[requested] > RANK[systemSeverity] ? requested : systemSeverity;
}

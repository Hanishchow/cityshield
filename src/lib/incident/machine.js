/**
 * Incident state machine. See docs/PRD.md §7.
 *
 * Hard rule: an incident is never silently dropped. Every terminal state is
 * explicit and recorded. A citizen must never be left believing help is coming
 * when it is not.
 */

export const STATES = {
  draft: { label: 'Not yet sent', terminal: false },
  reported: { label: 'Reported', terminal: false },
  routed: { label: 'Agencies notified', terminal: false },
  acknowledged: { label: 'Acknowledged', terminal: false },
  responding: { label: 'Responder en route', terminal: false },
  on_scene: { label: 'Responder on scene', terminal: false },
  resolved: { label: 'Resolved', terminal: true },
  escalated: { label: 'Escalated', terminal: false },
  cancelled: { label: 'Cancelled', terminal: true },
  failed_routing: { label: 'Could not reach agencies', terminal: false },
  manual_fallback: { label: 'Call 112 directly', terminal: true },
  abandoned: { label: 'Abandoned', terminal: true },
};

/** Legal transitions. Anything not listed here throws in dev. */
const TRANSITIONS = {
  draft: ['reported', 'abandoned'],
  reported: ['routed', 'failed_routing', 'cancelled'],
  routed: ['acknowledged', 'escalated', 'failed_routing', 'cancelled'],
  acknowledged: ['responding', 'escalated', 'cancelled'],
  responding: ['on_scene', 'escalated', 'cancelled'],
  on_scene: ['resolved', 'escalated'],
  escalated: ['acknowledged', 'responding', 'on_scene', 'resolved', 'manual_fallback'],
  failed_routing: ['manual_fallback', 'routed'],
  resolved: [],
  cancelled: [],
  manual_fallback: [],
  abandoned: [],
};

/** The ordered spine shown to the citizen. Escalation/failure render out-of-band. */
export const PROGRESS_STATES = [
  'reported',
  'routed',
  'acknowledged',
  'responding',
  'on_scene',
  'resolved',
];

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function isTerminal(state) {
  return Boolean(STATES[state]?.terminal);
}

/**
 * Apply a transition, appending to stateHistory.
 * Throws on an illegal transition in dev so bad flows surface immediately
 * rather than silently showing a citizen the wrong status.
 */
export function transition(incident, to, actor = 'system') {
  if (!STATES[to]) throw new Error(`Unknown incident state: ${to}`);

  if (!canTransition(incident.state, to)) {
    const message = `Illegal incident transition: ${incident.state} -> ${to}`;
    // Optional chaining so the module is importable outside Vite (tests, node).
    if (import.meta.env?.DEV !== false) throw new Error(message);
    console.error(message);
    return incident;
  }

  const at = new Date().toISOString();
  return {
    ...incident,
    state: to,
    stateHistory: [...incident.stateHistory, { state: to, at, actor }],
    resolvedAt: to === 'resolved' ? at : incident.resolvedAt,
  };
}

/** Index of a state on the citizen-facing progress spine, or -1 if off-spine. */
export function progressIndex(state) {
  return PROGRESS_STATES.indexOf(state);
}

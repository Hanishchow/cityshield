/**
 * Core logic tests — incident state machine and agency routing.
 * See docs/CHECKLIST.md Stage 4.
 *
 *   npm test
 *
 * No test framework: these are the two pieces where a silent bug would show a
 * citizen the wrong status, so they get checked directly with no dependencies.
 */

import assert from 'node:assert/strict';
import { createIncident, createAgencyTask } from '../src/lib/incident/model.js';
import {
  transition,
  canTransition,
  isTerminal,
  progressIndex,
  PROGRESS_STATES,
  STATES,
} from '../src/lib/incident/machine.js';
import { route, reconcileSeverity, CATEGORIES } from '../src/lib/incident/routing.js';

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}\n        ${err.message}`);
    process.exitCode = 1;
  }
};

console.log('\nincident state machine');

test('happy path walks the full progress spine', () => {
  let inc = createIncident({ category: 'medical' });
  assert.equal(inc.state, 'reported');
  for (const next of ['routed', 'acknowledged', 'responding', 'on_scene', 'resolved']) {
    inc = transition(inc, next, 'test');
    assert.equal(inc.state, next);
  }
  assert.ok(inc.resolvedAt, 'resolvedAt is stamped on resolve');
  assert.equal(inc.stateHistory.length, 6, 'every transition is recorded');
});

test('illegal transitions throw rather than silently mislead', () => {
  const inc = createIncident();
  assert.throws(() => transition(inc, 'resolved'), /Illegal incident transition/);
  assert.throws(() => transition(inc, 'on_scene'), /Illegal incident transition/);
});

test('unknown states are rejected', () => {
  const inc = createIncident();
  assert.throws(() => transition(inc, 'nonsense'), /Unknown incident state/);
});

test('terminal states have no exits', () => {
  for (const [name, def] of Object.entries(STATES)) {
    if (!def.terminal) continue;
    const anyExit = Object.keys(STATES).some((to) => canTransition(name, to));
    assert.equal(anyExit, false, `${name} should be terminal but has an exit`);
  }
});

test('cancelled is reachable from every pre-arrival state', () => {
  for (const s of ['reported', 'routed', 'acknowledged', 'responding']) {
    assert.ok(canTransition(s, 'cancelled'), `${s} must be cancellable`);
  }
});

test('failed routing always has a manual fallback', () => {
  assert.ok(canTransition('failed_routing', 'manual_fallback'));
  assert.ok(isTerminal('manual_fallback'));
});

test('escalation is one-way and never auto-de-escalates', () => {
  for (const s of ['routed', 'acknowledged', 'responding', 'on_scene']) {
    assert.ok(canTransition(s, 'escalated'), `${s} must be escalatable`);
  }
  assert.equal(canTransition('escalated', 'reported'), false);
  assert.equal(canTransition('escalated', 'routed'), false);
});

test('progressIndex maps the spine and rejects off-spine states', () => {
  PROGRESS_STATES.forEach((s, i) => assert.equal(progressIndex(s), i));
  assert.equal(progressIndex('cancelled'), -1);
  assert.equal(progressIndex('escalated'), -1);
});

console.log('\nagency routing');

test('road accident pulls in three agencies together', () => {
  const r = route('medical.road_accident');
  assert.equal(r.primary, 'ambulance');
  assert.deepEqual(r.secondary, ['police', 'civic']);
  assert.equal(r.severity, 'critical');
});

test('unclassified reports still route somewhere', () => {
  const r = route('does-not-exist');
  assert.equal(r.primary, 'police');
  assert.ok(r.secondary.includes('ambulance'));
  assert.equal(r.severity, 'critical');
});

test('civic categories never carry emergency severity', () => {
  for (const c of CATEGORIES.filter((c) => c.group === 'Civic')) {
    assert.equal(c.severity, 'civic', `${c.id} must not page an emergency channel`);
  }
});

test('every category names a primary agency and no self-referencing secondary', () => {
  for (const c of CATEGORIES) {
    assert.ok(c.primary, `${c.id} has no primary`);
    assert.ok(!c.secondary.includes(c.primary), `${c.id} lists its primary as secondary`);
    assert.equal(new Set(c.secondary).size, c.secondary.length, `${c.id} has duplicate secondaries`);
  }
});

test('severity is overridable upward only', () => {
  assert.equal(reconcileSeverity('urgent', 'critical'), 'critical', 'citizen may escalate');
  assert.equal(reconcileSeverity('critical', 'standard'), 'critical', 'may not downgrade');
  assert.equal(reconcileSeverity('civic', 'urgent'), 'urgent');
  assert.equal(reconcileSeverity('critical', null), 'critical');
});

console.log('\nincident model');

test('a fresh incident records its own creation', () => {
  const inc = createIncident({ category: 'fire.structure' });
  assert.equal(inc.stateHistory[0].state, 'reported');
  assert.equal(inc.stateHistory[0].actor, 'citizen');
  assert.equal(inc.agencies.length, 0);
  assert.equal(inc.resolvedAt, null);
});

test('origin ping seeds the location track', () => {
  const ping = { id: 'lp_1', lat: 12.97, lng: 77.64, accuracy: 9 };
  const inc = createIncident({ origin: ping });
  assert.equal(inc.locationTrack.length, 1);
  assert.equal(inc.currentLocation, ping);
});

test('agency tasks start notified with no unit and no invented ETA', () => {
  const t = createAgencyTask({ agency: 'ambulance', role: 'primary' });
  assert.equal(t.state, 'notified');
  assert.equal(t.unit, null);
  assert.equal(t.eta, null, 'ETA must be null when genuinely unknown, never a guess');
});

test('ids are unique across rapid creation', () => {
  const ids = new Set(Array.from({ length: 500 }, () => createIncident().id));
  assert.equal(ids.size, 500);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ''}\n`);

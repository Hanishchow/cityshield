import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { canTransition, newIncidentId, pingSchema, createIncidentSchema } from '../src/domain/incident.ts';
import type { IncidentState } from '../src/domain/incident.ts';

describe('canTransition', () => {
  const legal: [IncidentState, IncidentState][] = [
    ['draft', 'submitted'],
    ['draft', 'cancelled'],
    ['submitted', 'acknowledged'],
    ['submitted', 'cancelled'],
    ['acknowledged', 'responding'],
    ['acknowledged', 'resolved'],
    ['acknowledged', 'cancelled'],
    ['responding', 'on_scene'],
    ['responding', 'resolved'],
    ['responding', 'cancelled'],
    ['on_scene', 'resolved'],
  ];

  for (const [from, to] of legal) {
    it(`allows ${from} -> ${to}`, () => {
      assert.equal(canTransition(from, to), true);
    });
  }

  it('rejects resolved -> anything (terminal state)', () => {
    assert.equal(canTransition('resolved', 'draft'), false);
    assert.equal(canTransition('resolved', 'submitted'), false);
    assert.equal(canTransition('resolved', 'acknowledged'), false);
    assert.equal(canTransition('resolved', 'responding'), false);
    assert.equal(canTransition('resolved', 'on_scene'), false);
    assert.equal(canTransition('resolved', 'cancelled'), false);
  });

  it('rejects cancelled -> anything (terminal state)', () => {
    assert.equal(canTransition('cancelled', 'draft'), false);
    assert.equal(canTransition('cancelled', 'submitted'), false);
    assert.equal(canTransition('cancelled', 'acknowledged'), false);
    assert.equal(canTransition('cancelled', 'responding'), false);
    assert.equal(canTransition('cancelled', 'on_scene'), false);
    assert.equal(canTransition('cancelled', 'resolved'), false);
  });

  it('rejects submitted -> draft (no going backwards)', () => {
    assert.equal(canTransition('submitted', 'draft'), false);
  });

  it('rejects draft -> responding (cannot skip acknowledged)', () => {
    // A citizen seeing "responding" without "acknowledged" would have no
    // proof a human actually saw their report.
    assert.equal(canTransition('draft', 'responding'), false);
  });

  it('rejects on_scene -> acknowledged (no going backwards)', () => {
    assert.equal(canTransition('on_scene', 'acknowledged'), false);
  });
});

describe('newIncidentId', () => {
  const AMBIGUOUS = /[0O1IL5SB8]/;

  it('matches the expected format CS-XXX-XXX', () => {
    const id = newIncidentId();
    assert.match(id, /^CS-[234679ACDEFGHJKMNPQRTUVWXY]{3}-[234679ACDEFGHJKMNPQRTUVWXY]{3}$/);
  });

  it('never contains ambiguous characters in the random body (hard to read aloud under stress)', () => {
    const bodyRegex = /[0O1IL5SB8]/;
    for (let i = 0; i < 200; i++) {
      const id = newIncidentId();
      const body = id.slice(3); // strip "CS-"
      assert.equal(bodyRegex.test(body), false, `ambiguous char found in ${id}`);
    }
  });

  it('is deterministic when given a seeded random function', () => {
    let seed = 0;
    const fakeRand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    const first = newIncidentId(fakeRand);
    seed = 0; // reset
    const second = newIncidentId(fakeRand);
    assert.equal(first, second);
  });

  it('produces different values with different seeds', () => {
    let seedA = 1;
    let seedB = 999;
    const randA = () => { seedA = (seedA * 1103515245 + 12345) % 2147483648; return seedA / 2147483648; };
    const randB = () => { seedB = (seedB * 1103515245 + 12345) % 2147483648; return seedB / 2147483648; };
    assert.notEqual(newIncidentId(randA), newIncidentId(randB));
  });
});

describe('pingSchema', () => {
  const validGps = { lat: 12.9716, lng: 77.5946, accuracy: 15, source: 'gps' as const };

  it('accepts a valid gps fix', () => {
    assert.doesNotThrow(() => pingSchema.parse(validGps));
  });

  it('rejects latitude above 90', () => {
    assert.throws(() => pingSchema.parse({ ...validGps, lat: 91 }));
  });

  it('rejects latitude below -90', () => {
    assert.throws(() => pingSchema.parse({ ...validGps, lat: -91 }));
  });

  it('rejects longitude above 180', () => {
    assert.throws(() => pingSchema.parse({ ...validGps, lng: 181 }));
  });

  it('rejects negative accuracy', () => {
    assert.throws(() => pingSchema.parse({ ...validGps, accuracy: -1 }));
  });

  it('rejects an unknown source value', () => {
    assert.throws(() => pingSchema.parse({ ...validGps, source: 'satellite' }));
  });
});

describe('createIncidentSchema', () => {
  it('applies default category, severity, and sos when given an empty object', () => {
    const result = createIncidentSchema.parse({});
    assert.equal(result.category, 'unknown');
    assert.equal(result.severity, 'urgent');
    assert.equal(result.sos, false);
  });

  it('preserves explicitly provided values over defaults', () => {
    const result = createIncidentSchema.parse({
      category: 'fire',
      severity: 'critical',
      sos: true,
    });
    assert.equal(result.category, 'fire');
    assert.equal(result.severity, 'critical');
    assert.equal(result.sos, true);
  });
});

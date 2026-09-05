import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { routeIncident } from '../src/domain/routing.ts';
import { CATEGORIES, SEVERITIES } from '../src/domain/incident.ts';
import type { Category, Severity } from '../src/domain/incident.ts';

const EXPECTED_PRIMARY: Record<Category, string> = {
  medical: 'Ambulance (108)',
  fire: 'Fire & Rescue (101)',
  police: 'Police (100)',
  accident: 'Police (100)',
  civic: 'BBMP Civic',
  disaster: 'Disaster Response',
  unknown: 'Police (100)',
};

const EXPECTED_SECONDARIES: Record<Category, string[]> = {
  medical: ['Police (100)'],
  fire: ['Ambulance (108)', 'Police (100)'],
  police: [],
  accident: ['Ambulance (108)', 'BBMP Civic'],
  civic: [],
  disaster: ['Fire & Rescue (101)', 'Ambulance (108)', 'Police (100)'],
  unknown: ['Ambulance (108)'],
};

describe('routeIncident - exactly one primary per category and severity', () => {
  for (const category of CATEGORIES) {
    for (const severity of SEVERITIES) {
      it(`produces exactly one primary task for ${category}/${severity}`, () => {
        const tasks = routeIncident(category, severity);
        const primaries = tasks.filter((t) => t.role === 'primary');
        assert.equal(primaries.length, 1, `expected exactly 1 primary, got ${primaries.length}`);
      });
    }
  }
});

describe('routeIncident - correct primary agency per category', () => {
  for (const category of CATEGORIES) {
    it(`routes ${category} to ${EXPECTED_PRIMARY[category]}`, () => {
      const tasks = routeIncident(category, 'urgent');
      const primary = tasks.find((t) => t.role === 'primary');
      assert.equal(primary!.agency, EXPECTED_PRIMARY[category]);
    });
  }
});

describe('routeIncident - medical/critical is owned by Ambulance', () => {
  it('has Ambulance as primary and Police as secondary', () => {
    const tasks = routeIncident('medical', 'critical');
    const primary = tasks.find((t) => t.role === 'primary');
    const secondary = tasks.find((t) => t.role === 'secondary');
    assert.equal(primary!.agency, 'Ambulance (108)');
    assert.equal(secondary!.agency, 'Police (100)');
  });
});

describe('routeIncident - accident/urgent routes Police as primary with expected secondaries', () => {
  it('has Police as primary, Ambulance and BBMP Civic as secondaries', () => {
    const tasks = routeIncident('accident', 'urgent');
    const primary = tasks.find((t) => t.role === 'primary');
    const secondaries = tasks.filter((t) => t.role === 'secondary');
    assert.equal(primary!.agency, 'Police (100)');
    assert.equal(secondaries.length, 2);
    assert.equal(secondaries[0].agency, 'Ambulance (108)');
    assert.equal(secondaries[1].agency, 'BBMP Civic');
  });
});

describe('routeIncident - standard severity produces no secondary tasks', () => {
  for (const category of CATEGORIES) {
    it(`produces zero secondaries for ${category}/standard`, () => {
      const tasks = routeIncident(category, 'standard');
      const secondaries = tasks.filter((t) => t.role === 'secondary');
      assert.equal(secondaries.length, 0);
    });
  }
});

describe('routeIncident - critical and urgent produce secondaries where configured', () => {
  for (const severity of ['critical', 'urgent'] as Severity[]) {
    for (const category of CATEGORIES) {
      const expected = EXPECTED_SECONDARIES[category].length;
      it(`produces ${expected} secondaries for ${category}/${severity}`, () => {
        const tasks = routeIncident(category, severity);
        const secondaries = tasks.filter((t) => t.role === 'secondary');
        assert.equal(secondaries.length, expected);
      });
    }
  }
});

describe('routeIncident - unknown (SOS case)', () => {
  it('routes to Police as primary with Ambulance as secondary', () => {
    const tasks = routeIncident('unknown', 'critical');
    const primary = tasks.find((t) => t.role === 'primary');
    const secondary = tasks.find((t) => t.role === 'secondary');
    assert.equal(primary!.agency, 'Police (100)');
    assert.equal(secondary!.agency, 'Ambulance (108)');
  });
});

describe('routeIncident - all tasks start in notified state and are simulated', () => {
  for (const category of CATEGORIES) {
    for (const severity of SEVERITIES) {
      it(`all tasks for ${category}/${severity} start as notified and simulated`, () => {
        const tasks = routeIncident(category, severity);
        for (const task of tasks) {
          assert.equal(task.state, 'notified');
          assert.equal(task.simulated, true);
        }
      });
    }
  }
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../src/store/memory.ts';
import { config } from '../src/config.ts';

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/**
 * Retention is a legal obligation under DPDP, so it is tested like one: the
 * assertions are about what is GONE, not about the sweeper running without
 * throwing.
 */
describe('retention', () => {
  const seed = async () => {
    const s = createMemoryStore();
    const inc = await s.create({
      category: 'medical',
      severity: 'critical',
      sos: true,
      ping: { lat: 12.9784, lng: 77.6408, accuracy: 10, source: 'gps', at: ago(40) },
    });
    await s.addPing(inc.id, {
      lat: 12.979,
      lng: 77.641,
      accuracy: 8,
      source: 'gps',
      at: ago(2),
    });
    return { store: s, id: inc.id };
  };

  it('erases pings past the ping window but keeps the incident', async () => {
    const { store, id } = await seed();
    const removed = await store.purge();
    assert.equal(removed.pings, 1, 'the 40-day-old fix should be gone');
    assert.equal(removed.incidents, 0);

    const after = await store.get(id);
    assert.ok(after, 'the incident itself is still inside its own window');
    assert.equal(after.pings.length, 1);
    assert.ok(new Date(after.pings[0].at).getTime() > Date.now() - 3 * DAY);
  });

  it('keeps location for a shorter time than the incident record', () => {
    /* The ordering IS the policy: the sharpest data expires first. If these
       ever invert, location outlives the report that justified collecting it. */
    assert.ok(config.retention.pingDays < config.retention.incidentDays);
  });

  it('erases the whole incident once it passes the incident window', async () => {
    const { store } = await seed();
    const future = new Date(Date.now() + (config.retention.incidentDays + 1) * DAY);
    const removed = await store.purge(future);
    assert.equal(removed.incidents, 1);
  });

  it('removes nothing when everything is inside its window', async () => {
    const s = createMemoryStore();
    await s.create({ category: 'civic', severity: 'standard', sos: false, ping: null });
    assert.deepEqual(await s.purge(), { pings: 0, incidents: 0 });
  });
});

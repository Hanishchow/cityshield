import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSimRadio } from '../src/preempt/bench/radio.ts';
import { createSimClock } from '../src/preempt/bench/clock.ts';
import { createSimNode } from '../src/preempt/bench/node.ts';
import { createKeyRegistry } from '../src/preempt/keys.ts';
import { JUNCTION_IDS } from '../src/preempt/junctions.ts';
import {
  FRAME_VERSION,
  FrameType,
  encodeUnsigned,
  macInput,
  setTag,
} from '../src/preempt/frame.ts';
import { COUNTER_EPOCH_S, encodeCounter } from '../src/preempt/counter.ts';

/**
 * Mesh behaviour, exercised through the real verifier and the real frame codec.
 *
 * These are the claims that will be made in front of a traffic authority, so
 * they are asserted rather than demonstrated once by hand: a grant crosses two
 * hops, a replay dies at the first hop, and a flood terminates.
 */

const NOW = COUNTER_EPOCH_S + 1_000;

/** Chain: gateway(0) - J11 - J12 - J13. Not a broadcast bus. */
const CHAIN = new Map<number, number[]>([
  [0, [11]],
  [11, [0, 12]],
  [12, [11, 13]],
  [13, [12]],
]);

function harness(topology: Map<number, number[]>, ids: number[], opts: { lossRate?: number; duplicateRate?: number; seed?: number } = {}) {
  const keys = createKeyRegistry(JUNCTION_IDS);
  const clock = createSimClock({ startEpochSeconds: NOW });
  const radio = createSimRadio({ topology, latencyMs: 5, seed: opts.seed ?? 7, ...opts });
  const nodes = new Map(ids.map((id) => [id, createSimNode({ junctionId: id, keys, radio, clock })]));

  const grantFor = (junctionId: number, over: { counter?: number; duration?: number; hopsRemaining?: number } = {}) => {
    const frame = encodeUnsigned({
      hopsRemaining: over.hopsRemaining ?? 3,
      version: FRAME_VERSION,
      type: FrameType.GRANT,
      keyGen: 0,
      priority: 1,
      junctionId,
      counter: over.counter ?? encodeCounter(NOW, 0),
      validFrom: NOW,
      duration: over.duration ?? 45,
      approach: 0,
    });
    return setTag(frame, keys.mac(junctionId, 0, macInput(frame)));
  };

  const kinds = (id: number) => nodes.get(id)!.events.map((e) => e.kind);
  return { keys, clock, radio, nodes, grantFor, kinds };
}

describe('mesh: delivery across hops', () => {
  it('carries a grant two hops to the junction it names', async () => {
    const h = harness(CHAIN, [11, 12, 13]);
    h.radio.transmit(0, h.grantFor(13));
    await h.radio.drain();

    assert.equal(h.nodes.get(13)!.relayClosed(), true, 'J13 relay should be closed');
    assert.ok(h.kinds(13).includes('acted'));
  });

  it('does not let intermediate junctions act on a grant addressed elsewhere', async () => {
    /* The relays forward it, but only the named junction changes its signal.
       If this ever fails, one ambulance greens an entire corridor at once. */
    const h = harness(CHAIN, [11, 12, 13]);
    h.radio.transmit(0, h.grantFor(13));
    await h.radio.drain();

    assert.equal(h.kinds(11).includes('acted'), false);
    assert.equal(h.kinds(12).includes('acted'), false);
    assert.equal(h.nodes.get(11)!.relayClosed(), false);
    assert.ok(h.kinds(11).includes('relayed'), 'J11 should still forward it');
  });
});

describe('mesh: replay', () => {
  it('kills a replayed frame at the FIRST hop, so it never reaches the target', async () => {
    /* Worth stating precisely: the dedupe cache stops the replay before it
       propagates, so the target junction never even has to fall back on its
       counter check. Both defences exist; this asserts the cheaper one fires
       first and bounds the airtime a replay can consume. */
    const h = harness(CHAIN, [11, 12, 13]);

    h.radio.transmit(0, h.grantFor(13));
    await h.radio.drain();
    const j13First = h.kinds(13).join(',');

    h.radio.transmit(0, h.grantFor(13));
    await h.radio.drain();

    assert.ok(h.kinds(11).filter((k) => k === 'deduped').length >= 2, 'J11 should dedupe the replay');
    assert.equal(h.kinds(13).join(','), j13First, 'the replay must never reach J13');
    assert.equal(h.kinds(13).filter((k) => k === 'acted').length, 1, 'J13 acted exactly once');
  });
});

describe('mesh: the flood terminates', () => {
  it('bounds transmissions in a fully connected mesh', async () => {
    /* Three nodes that can all hear each other is the worst case for a flood:
       without dedupe this rebroadcasts forever, and the radio would throw its
       delivery-bound error rather than hang. */
    const full = new Map<number, number[]>([
      [0, [11, 12, 13]],
      [11, [12, 13]],
      [12, [11, 13]],
      [13, [11, 12]],
    ]);
    const h = harness(full, [11, 12, 13]);

    h.radio.transmit(0, h.grantFor(13));
    await assert.doesNotReject(() => h.radio.drain());

    for (const id of [11, 12, 13]) {
      const relays = h.kinds(id).filter((k) => k === 'relayed').length;
      assert.ok(relays <= 1, `J${id} rebroadcast ${relays} times; dedupe should cap it at 1`);
    }
  });

  it('still terminates with heavy duplication, proving dedupe not luck', async () => {
    const full = new Map<number, number[]>([
      [0, [11, 12, 13]],
      [11, [12, 13]],
      [12, [11, 13]],
      [13, [11, 12]],
    ]);
    const h = harness(full, [11, 12, 13], { duplicateRate: 0.5, seed: 99 });

    h.radio.transmit(0, h.grantFor(13));
    await assert.doesNotReject(() => h.radio.drain());
    assert.ok(h.radio.stats().duplicated > 0, 'the test should actually have duplicated frames');
    assert.equal(h.kinds(13).filter((k) => k === 'acted').length, 1);
  });
});

describe('mesh: degraded radio', () => {
  it('still delivers through a lossy link when a second path exists', async () => {
    /* 40% loss on a fully connected trio. The flood is what makes this survive:
       a single star topology would simply fail. */
    const full = new Map<number, number[]>([
      [0, [11, 12]],
      [11, [12, 13]],
      [12, [11, 13]],
      [13, [11, 12]],
    ]);
    const h = harness(full, [11, 12, 13], { lossRate: 0.4, seed: 5 });

    for (let i = 0; i < 6; i++) {
      h.radio.transmit(0, h.grantFor(13, { counter: encodeCounter(NOW, i) }));
      await h.radio.drain();
    }
    assert.ok(h.kinds(13).includes('acted'), 'J13 should be reached at least once at 40% loss');
  });

  it('never acts on a grant when the clock is unhealthy', async () => {
    const h = harness(CHAIN, [11, 12, 13]);
    h.clock.setHealthy(false);
    h.radio.transmit(0, h.grantFor(13));
    await h.radio.drain();

    assert.equal(h.nodes.get(13)!.relayClosed(), false);
    assert.ok(h.kinds(13).includes('rejected'));
  });

  it('refuses an over-long grant even though it is validly signed', async () => {
    const h = harness(CHAIN, [11, 12, 13]);
    h.radio.transmit(0, h.grantFor(13, { duration: 250 }));
    await h.radio.drain();

    assert.equal(h.nodes.get(13)!.relayClosed(), false);
  });
});

describe('mesh: the relay opens again', () => {
  it('releases after the granted duration elapses', async () => {
    const h = harness(CHAIN, [11, 12, 13]);
    h.radio.transmit(0, h.grantFor(13, { duration: 45 }));
    await h.radio.drain();
    assert.equal(h.nodes.get(13)!.relayClosed(), true);

    h.clock.advance(46);
    h.nodes.get(13)!.tick();

    assert.equal(h.nodes.get(13)!.relayClosed(), false);
    assert.ok(h.kinds(13).includes('released'));
  });
});

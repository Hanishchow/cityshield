import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FrameType,
  FRAME_VERSION,
  MAC_LEN,
  TAG_OFFSET,
  encodeUnsigned,
  macInput,
  setTag,
} from '../src/preempt/frame.ts';
import { nodeHmac, truncate } from '../src/preempt/mac.ts';
import {
  MAX_DURATION_S,
  SKEW_S,
  applyGrant,
  verifyFrame,
} from '../src/preempt/verify.ts';
import type { Clock, NodeState } from '../src/preempt/verify.ts';
import { encodeCounter, createSeqSource, COUNTER_EPOCH_S } from '../src/preempt/counter.ts';

/**
 * The verifier is the security boundary of the whole subsystem: it is the last
 * thing standing between a radio packet and a traffic signal changing. These
 * tests are written adversarially on purpose - each one describes an attack or
 * a plausible-but-wrong implementation, not a happy path.
 */

const KEY = new Uint8Array(32).fill(0x5a);
const OTHER_KEY = new Uint8Array(32).fill(0x5b);
const JUNCTION = 11;
const NOW = COUNTER_EPOCH_S + 10_000_000;

const clockAt = (now: number, healthy = true): Clock => ({
  nowEpochSeconds: () => now,
  healthy: () => healthy,
});

const freshState = (over: Partial<NodeState> = {}): NodeState => ({
  junctionId: JUNCTION,
  gens: [0],
  lastCounter: 0,
  relayOpenUntil: 0,
  ...over,
});

function makeFrame(
  over: Partial<Parameters<typeof encodeUnsigned>[0]> = {},
  key: Uint8Array = KEY,
): Uint8Array {
  const validFrom = (over.validFrom as number | undefined) ?? NOW;
  const frame = encodeUnsigned({
    hopsRemaining: 3,
    version: FRAME_VERSION,
    type: FrameType.GRANT,
    keyGen: 0,
    priority: 1,
    junctionId: JUNCTION,
    counter: encodeCounter(validFrom, 0),
    validFrom,
    duration: 45,
    approach: 0,
    ...over,
  });
  return setTag(frame, truncate(nodeHmac(key, macInput(frame))));
}

const verify = (frame: Uint8Array, state = freshState(), now = NOW, healthy = true) =>
  verifyFrame(frame, state, KEY, nodeHmac, clockAt(now, healthy));

describe('verifier: the happy path exists, but only just', () => {
  it('accepts a well-formed, in-window, correctly signed grant', () => {
    const r = verify(makeFrame());
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.grant.junctionId, JUNCTION);
  });
});

describe('verifier: replay', () => {
  it('rejects the same frame twice', () => {
    const frame = makeFrame();
    const first = verify(frame);
    assert.equal(first.ok, true);

    const after = applyGrant(freshState(), first.ok ? first.grant : ({} as never), NOW);
    assert.deepEqual(verify(frame, after), { ok: false, reason: 'stale-counter' });
  });

  it('still rejects it after a power cycle, because lastCounter is persisted', () => {
    /* The attack this blocks: capture a frame, cut power to the box, replay.
       If lastCounter lived only in RAM the replay would succeed. */
    const frame = makeFrame();
    const accepted = verify(frame);
    const persisted = applyGrant(freshState(), accepted.ok ? accepted.grant : ({} as never), NOW);

    const rebooted = freshState({ lastCounter: persisted.lastCounter, relayOpenUntil: 0 });
    assert.deepEqual(verify(frame, rebooted), { ok: false, reason: 'stale-counter' });
  });

  it('drops an older out-of-order copy, which is correct and not a bug', () => {
    /* A flood delivers a 2-hop copy of an older grant after a 1-hop copy of a
       newer one. The newer grant supersedes it. */
    const older = makeFrame({ validFrom: NOW });
    const newer = makeFrame({ validFrom: NOW + 5 });

    const r = verify(newer, freshState(), NOW + 5);
    assert.equal(r.ok, true);
    const state = applyGrant(freshState(), r.ok ? r.grant : ({} as never), NOW + 5);

    assert.deepEqual(verify(older, state, NOW + 5), { ok: false, reason: 'stale-counter' });
  });
});

describe('verifier: identity binding', () => {
  it('rejects a frame addressed to another junction', () => {
    assert.deepEqual(verify(makeFrame({ junctionId: JUNCTION + 1 })), {
      ok: false,
      reason: 'wrong-junction',
    });
  });

  it('rejects another junction frame even when handed that junction key', () => {
    /* The sharper case. If the id check were incidental to key separation, a
       misconfigured box holding a neighbour's key would act on its traffic. */
    const foreign = makeFrame({ junctionId: JUNCTION + 1 });
    const r = verifyFrame(foreign, freshState(), KEY, nodeHmac, clockAt(NOW));
    assert.deepEqual(r, { ok: false, reason: 'wrong-junction' });
  });

  it('rejects a frame signed with the wrong key', () => {
    assert.deepEqual(verify(makeFrame({}, OTHER_KEY)), { ok: false, reason: 'bad-mac' });
  });

  it('rejects an unknown key generation before ever touching the MAC', () => {
    assert.deepEqual(verify(makeFrame({ keyGen: 2 })), { ok: false, reason: 'unknown-gen' });
  });

  it('accepts the previous generation during a rotation grace window', () => {
    /* Server and a box on a pole get rotated on different days. If the node
       accepted only the current generation, that gap would be an outage. */
    const state = freshState({ gens: [1, 0] });
    const r = verifyFrame(makeFrame({ keyGen: 0 }), state, KEY, nodeHmac, clockAt(NOW));
    assert.equal(r.ok, true);
  });
});

describe('verifier: the node has its own ceilings', () => {
  it('rejects an over-long grant even though the MAC is valid', () => {
    /* The point of this test: a correct signature is NOT sufficient. Even a
       fully compromised server holding every key cannot hold a junction green
       beyond MAX_DURATION_S, because the box refuses. */
    const r = verify(makeFrame({ duration: 250 }));
    assert.deepEqual(r, { ok: false, reason: 'too-long' });
    assert.ok(250 > MAX_DURATION_S);
  });

  it('rejects everything when the clock is unhealthy', () => {
    /* A signal acting on an unknown clock is worse than one that does not act:
       without trustworthy time, expiry is unenforceable and replay is free. */
    assert.deepEqual(verify(makeFrame(), freshState(), NOW, false), {
      ok: false,
      reason: 'clock-unhealthy',
    });
  });
});

describe('verifier: the validity window', () => {
  it('rejects a grant that is not yet valid', () => {
    const frame = makeFrame({ validFrom: NOW + 600 });
    assert.deepEqual(verify(frame, freshState(), NOW), { ok: false, reason: 'not-yet-valid' });
  });

  it('rejects an expired grant', () => {
    const frame = makeFrame({ validFrom: NOW, duration: 45 });
    assert.deepEqual(verify(frame, freshState(), NOW + 45 + SKEW_S + 1), {
      ok: false,
      reason: 'expired',
    });
  });

  it('absorbs RTC drift inside the skew window, on both sides', () => {
    const frame = makeFrame({ validFrom: NOW, duration: 45 });
    assert.equal(verify(frame, freshState(), NOW - SKEW_S + 1).ok, true, 'early within skew');
    assert.equal(verify(frame, freshState(), NOW + 45 + SKEW_S - 1).ok, true, 'late within skew');
  });

  it('rejects just outside the skew window', () => {
    const frame = makeFrame({ validFrom: NOW, duration: 45 });
    assert.equal(verify(frame, freshState(), NOW - SKEW_S - 1).ok, false);
  });
});

describe('verifier: malformed input', () => {
  it('rejects a short frame without reading past the end', () => {
    assert.deepEqual(verify(makeFrame().subarray(0, 20)), { ok: false, reason: 'short' });
    assert.deepEqual(verify(new Uint8Array(0)), { ok: false, reason: 'short' });
  });

  it('rejects an unknown protocol version before anything else', () => {
    assert.deepEqual(verify(makeFrame({ version: 2 })), { ok: false, reason: 'version' });
  });

  it('rejects a REPORT frame arriving where a grant is expected', () => {
    /* Type is inside the MAC, so a validly-signed report cannot be re-presented
       as a grant. */
    assert.deepEqual(verify(makeFrame({ type: FrameType.REPORT })), {
      ok: false,
      reason: 'version',
    });
  });

  it('never throws, for any input', () => {
    /* A C++ port has no exceptions to mirror, so a throw here would be a
       behaviour that cannot survive the port. */
    const inputs = [
      new Uint8Array(0),
      new Uint8Array(24),
      new Uint8Array(24).fill(0xff),
      makeFrame().subarray(0, 1),
    ];
    for (const input of inputs) {
      assert.doesNotThrow(() => verify(input));
    }
  });
});

describe('verifier: tamper resistance across the whole authenticated region', () => {
  it('rejects every single-bit flip', () => {
    let flips = 0;
    for (let byte = 1; byte < TAG_OFFSET; byte++) {
      for (let bit = 0; bit < 8; bit++) {
        const f = makeFrame();
        f[byte] ^= 1 << bit;
        const r = verify(f);
        assert.equal(r.ok, false, `byte ${byte} bit ${bit} was accepted`);
        flips++;
      }
    }
    assert.equal(flips, 104);
  });

  it('rejects every single-bit flip of the tag itself', () => {
    for (let i = 0; i < MAC_LEN; i++) {
      for (let bit = 0; bit < 8; bit++) {
        const f = makeFrame();
        f[TAG_OFFSET + i] ^= 1 << bit;
        assert.deepEqual(verify(f), { ok: false, reason: 'bad-mac' });
      }
    }
  });

  it('is unaffected by the mutable hop byte, so a relay can forward it', () => {
    const f = makeFrame();
    f[0] = (f[0] & ~0b111) | 1;
    assert.equal(verify(f).ok, true);
  });
});

describe('grant application', () => {
  it('holds the relay for exactly the granted duration', () => {
    const r = verify(makeFrame({ validFrom: NOW, duration: 45 }));
    assert.equal(r.ok, true);
    const s = applyGrant(freshState(), r.ok ? r.grant : ({} as never), NOW);
    assert.equal(s.relayOpenUntil, NOW + 45);
  });

  it('opens the relay immediately on a CANCEL', () => {
    const held = freshState({ relayOpenUntil: NOW + 40 });
    const r = verify(makeFrame({ type: FrameType.CANCEL, validFrom: NOW + 1 }), held, NOW);
    assert.equal(r.ok, true);
    const s = applyGrant(held, r.ok ? r.grant : ({} as never), NOW);
    assert.equal(s.relayOpenUntil, 0);
  });
});

describe('counter', () => {
  it('is monotonic across a server restart', () => {
    /* The failure this prevents: an in-memory sequence resets to 0 while the
       node holds lastCounter = 500, and every grant reads as stale until the
       counter climbs back. */
    const before = encodeCounter(NOW, 0);
    const afterRestart = encodeCounter(NOW + 1, 0);
    assert.ok(afterRestart > before);
  });

  it('breaks ties within one second and refuses to wrap silently', () => {
    const seq = createSeqSource();
    const seen = new Set<number>();
    for (let i = 0; i < 16; i++) seen.add(encodeCounter(NOW, seq.next(JUNCTION, NOW)));
    assert.equal(seen.size, 16);
    assert.throws(() => seq.next(JUNCTION, NOW), RangeError);
  });

  it('resets the tiebreaker when the second advances', () => {
    const seq = createSeqSource();
    seq.next(JUNCTION, NOW);
    assert.equal(seq.next(JUNCTION, NOW + 1), 0);
  });
});

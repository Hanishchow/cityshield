import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRAME_LEN,
  MAC_LEN,
  TAG_OFFSET,
  FrameType,
  FRAME_VERSION,
  encodeUnsigned,
  decodeHeader,
  macInput,
  setTag,
  getTag,
  dedupeKey,
  decrementHop,
  toHex,
} from '../src/preempt/frame.ts';
import { nodeHmac, truncate, tagsEqual } from '../src/preempt/mac.ts';
import { createKeyRegistry } from '../src/preempt/keys.ts';
import { JUNCTION_IDS } from '../src/preempt/junctions.ts';

/**
 * These tests pin the wire format. A frame is the contract between a Node
 * server and C++ firmware that cannot be redeployed from a laptop, so anything
 * that could drift silently between the two targets is asserted explicitly.
 */

const FIELDS = {
  hopsRemaining: 3,
  version: FRAME_VERSION,
  type: FrameType.GRANT,
  keyGen: 0,
  priority: 1,
  junctionId: 0x0102,
  counter: 0xdeadbeef,
  validFrom: 0x65a0_0000,
  duration: 45,
  approach: 2,
} as const;

describe('frame codec', () => {
  it('is always exactly 24 bytes', () => {
    for (const junctionId of [0, 1, 0xffff]) {
      for (const counter of [0, 1, 0xffffffff]) {
        const f = encodeUnsigned({ ...FIELDS, junctionId, counter });
        assert.equal(f.length, FRAME_LEN);
      }
    }
  });

  it('round-trips every field', () => {
    const back = decodeHeader(encodeUnsigned(FIELDS));
    for (const k of Object.keys(FIELDS) as (keyof typeof FIELDS)[]) {
      assert.equal(back[k], FIELDS[k], `field ${k}`);
    }
  });

  it('writes multi-byte fields big-endian', () => {
    /* The ESP32 is little-endian. If anyone ports this with an implicit cast,
       this assertion is what catches it. */
    const f = encodeUnsigned({ ...FIELDS, junctionId: 0x0102 });
    assert.equal(f[2], 0x01);
    assert.equal(f[3], 0x02);
  });

  it('reads a counter with the high bit set as unsigned', () => {
    /* Without >>> 0 this comes back negative and every counter comparison
       downstream is wrong, which would silently disable replay protection. */
    const f = encodeUnsigned({ ...FIELDS, counter: 0xfffffff0 });
    assert.equal(decodeHeader(f).counter, 0xfffffff0);
    assert.ok(decodeHeader(f).counter > 0);
  });

  it('rejects out-of-range fields rather than truncating them silently', () => {
    assert.throws(() => encodeUnsigned({ ...FIELDS, junctionId: 0x1_0000 }), RangeError);
    assert.throws(() => encodeUnsigned({ ...FIELDS, duration: 256 }), RangeError);
    assert.throws(() => encodeUnsigned({ ...FIELDS, hopsRemaining: 8 }), RangeError);
  });

  it('produces a stable golden frame', () => {
    /* Pins field order, endianness and MAC_LEN in one assertion. If this
       changes, deployed firmware stops accepting anything the server sends. */
    const key = new Uint8Array(32).fill(0x2a);
    const frame = encodeUnsigned(FIELDS);
    setTag(frame, truncate(nodeHmac(key, macInput(frame))));
    const hex = toHex(frame);

    assert.equal(hex.length, FRAME_LEN * 2);
    /* Byte 1 is 0x42, worth spelling out because it is easy to get wrong by
       hand: ver(1)<<6 | type(GRANT=0)<<4 | keyGen(0)<<2 | prio(1)<<1
       = 0x40 | 0x00 | 0x00 | 0x02. */
    assert.equal(hex.slice(0, 28), '03420102deadbeef65a000002d02');
    assert.equal(getTag(frame).length, MAC_LEN);
  });
});

describe('frame MAC coverage', () => {
  const key = new Uint8Array(32).fill(0x11);
  const signed = () => {
    const f = encodeUnsigned(FIELDS);
    return setTag(f, truncate(nodeHmac(key, macInput(f))));
  };

  it('accepts an untouched frame', () => {
    const f = signed();
    assert.ok(tagsEqual(truncate(nodeHmac(key, macInput(f))), getTag(f)));
  });

  it('rejects every single-bit flip in the authenticated region', () => {
    /* 13 bytes x 8 bits. Exhaustive and cheap, and it catches a MAC that
       accidentally covers only a prefix of the frame. */
    let checked = 0;
    for (let byte = 1; byte < TAG_OFFSET; byte++) {
      for (let bit = 0; bit < 8; bit++) {
        const f = signed();
        f[byte] ^= 1 << bit;
        assert.ok(
          !tagsEqual(truncate(nodeHmac(key, macInput(f))), getTag(f)),
          `flip byte ${byte} bit ${bit} was not detected`,
        );
        checked++;
      }
    }
    assert.equal(checked, 104);
  });

  it('does NOT cover the mutable flood header', () => {
    /* The mirror of the test above. A repeater decrements the hop count, so a
       MAC covering byte 0 would break the frame on every hop. */
    const f = signed();
    const before = truncate(nodeHmac(key, macInput(f)));
    f[0] = (f[0] & ~0b111) | 1;
    assert.ok(tagsEqual(before, truncate(nodeHmac(key, macInput(f)))));
    assert.ok(tagsEqual(truncate(nodeHmac(key, macInput(f))), getTag(f)));
  });

  it('binds the tag to the junction id', () => {
    const f = signed();
    const other = encodeUnsigned({ ...FIELDS, junctionId: FIELDS.junctionId + 1 });
    assert.ok(!tagsEqual(truncate(nodeHmac(key, macInput(other))), getTag(f)));
  });

  it('binds the tag to the frame type, so a report cannot be replayed as a grant', () => {
    const g = encodeUnsigned({ ...FIELDS, type: FrameType.GRANT });
    const r = encodeUnsigned({ ...FIELDS, type: FrameType.REPORT });
    assert.ok(
      !tagsEqual(truncate(nodeHmac(key, macInput(g))), truncate(nodeHmac(key, macInput(r)))),
    );
  });
});

describe('flood behaviour', () => {
  it('includes tag bytes in the dedupe key, so a forgery cannot poison the cache', () => {
    /* Repeaters cannot verify. Without the tag bytes an attacker transmits a
       forged (junctionId, counter) to occupy the slot, and the genuine grant
       with that counter is then suppressed at that hop. */
    const real = encodeUnsigned(FIELDS);
    setTag(real, truncate(nodeHmac(new Uint8Array(32).fill(1), macInput(real))));

    const forged = encodeUnsigned(FIELDS);
    setTag(forged, new Uint8Array(MAC_LEN).fill(0xff));

    assert.notEqual(dedupeKey(real), dedupeKey(forged));
  });

  it('stops a frame travelling once hops are exhausted', () => {
    const f = encodeUnsigned({ ...FIELDS, hopsRemaining: 1 });
    assert.equal(decrementHop(f), true);
    assert.equal(decodeHeader(f).hopsRemaining, 0);
    assert.equal(decrementHop(f), false);
  });
});

describe('key registry', () => {
  it('gives every junction a different key', () => {
    const reg = createKeyRegistry(JUNCTION_IDS);
    const msg = new Uint8Array([1, 2, 3]);
    const tags = JUNCTION_IDS.map((id) => toHex(reg.mac(id, 0, msg)));
    assert.equal(new Set(tags).size, JUNCTION_IDS.length);
  });

  it('rejects a tag made with another junction key', () => {
    const reg = createKeyRegistry(JUNCTION_IDS);
    const msg = new Uint8Array([9, 9, 9]);
    const [a, b] = JUNCTION_IDS;
    assert.ok(reg.verify(a, 0, msg, reg.mac(a, 0, msg)));
    assert.ok(!reg.verify(b, 0, msg, reg.mac(a, 0, msg)));
  });

  it('never exposes key material', () => {
    /* There is deliberately no getKey(). This asserts the closure actually
       holds: a registry that serialises its keys could leak them into a log or
       an audit entry by accident. */
    const reg = createKeyRegistry(JUNCTION_IDS);
    const serialised = JSON.stringify(reg);
    assert.ok(!/[0-9a-f]{64}/i.test(serialised), 'a 32-byte key appeared in JSON');
    assert.equal(Object.prototype.hasOwnProperty.call(reg, 'getKey'), false);
    assert.equal(reg.source, 'dev-derived');
  });

  it('reports no key for an unknown junction rather than throwing on verify', () => {
    const reg = createKeyRegistry(JUNCTION_IDS);
    assert.equal(reg.has(9999), false);
    assert.equal(reg.verify(9999, 0, new Uint8Array([1]), new Uint8Array(MAC_LEN)), false);
  });
});

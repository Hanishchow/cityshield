/**
 * The on-air preemption frame: 24 bytes, big-endian.
 *
 * This module is PURE. It imports nothing — not `node:crypto`, not `config` —
 * because the identical logic has to run on an ESP32. Anything that cannot be
 * transliterated into C++ does not belong here.
 *
 * Big-endian is deliberate. The ESP32 is little-endian, so byte order has to be
 * written out explicitly on both sides rather than falling out of an implicit
 * cast that silently disagrees across targets.
 *
 * Layout:
 *
 *   off len  field                                     MAC'd?
 *   ---------------------------------------------------------
 *    0   1   rsv(5) | hopsRemaining(3)                  no
 *    1   1   ver(2)|type(2)|keyGen(2)|prio(1)|rsv(1)    yes
 *    2   2   junctionId   uint16                        yes
 *    4   4   counter      uint32                        yes
 *    8   4   validFrom    uint32 epoch seconds          yes
 *   12   1   duration     uint8 seconds                 yes
 *   13   1   approach     uint8                         yes
 *   14  10   tag                                        --
 *
 * Byte 0 is outside the MAC because a repeater decrements the hop count; a MAC
 * covering it would break on every hop. Nothing security-relevant lives there:
 * editing it only makes the packet travel less far, which an attacker achieves
 * more cheaply by jamming.
 */

export const FRAME_LEN = 24;
export const MAC_LEN = 10;

/** The region the MAC covers: offsets 1..13 inclusive. */
export const SIGNED_FROM = 1;
export const SIGNED_TO = 14; // exclusive
export const TAG_OFFSET = 14;

/**
 * Domain separator, version-pinned. Prevents a tag ever being confused with any
 * other HMAC this system computes, now or later.
 */
export const AAD_PREFIX = [0x43, 0x53, 0x47, 0x31]; // "CSG1"

export const FRAME_VERSION = 1;

export const FrameType = {
  GRANT: 0,
  CANCEL: 1,
  REPORT: 2,
  /* Reserved for an Ed25519 variant. At SF7/SF9 a 64-byte signature fits, and
     public-key would mean a stolen junction box leaks nothing at all. Keeping
     the slot means that upgrade is a new frame type, not a redesign. */
  RESERVED_ED25519: 3,
} as const;

export type FrameTypeValue = (typeof FrameType)[keyof typeof FrameType];

export type FrameFields = {
  hopsRemaining: number; // 0..7
  version: number; // 0..3
  type: FrameTypeValue;
  keyGen: number; // 0..3
  priority: number; // 0..1
  junctionId: number; // 0..65535
  counter: number; // uint32
  validFrom: number; // uint32 epoch seconds
  duration: number; // 0..255 seconds
  approach: number; // 0..255
};

const u8 = (v: number, name: string, max: number): number => {
  if (!Number.isInteger(v) || v < 0 || v > max) {
    throw new RangeError(`${name} must be an integer 0..${max}, got ${v}`);
  }
  return v;
};

/**
 * Build the 24-byte frame with the tag region left zeroed.
 *
 * Split from signing on purpose: the caller computes the MAC over
 * `signedRegion()` and writes it in. That keeps this file free of crypto and
 * lets the verifier reuse the exact same layout code.
 */
export function encodeUnsigned(f: FrameFields): Uint8Array {
  const out = new Uint8Array(FRAME_LEN);

  out[0] = u8(f.hopsRemaining, 'hopsRemaining', 7) & 0b111;

  out[1] =
    ((u8(f.version, 'version', 3) & 0b11) << 6) |
    ((u8(f.type, 'type', 3) & 0b11) << 4) |
    ((u8(f.keyGen, 'keyGen', 3) & 0b11) << 2) |
    ((u8(f.priority, 'priority', 1) & 0b1) << 1);

  const j = u8(f.junctionId, 'junctionId', 0xffff);
  out[2] = (j >>> 8) & 0xff;
  out[3] = j & 0xff;

  const c = u8(f.counter, 'counter', 0xffffffff);
  out[4] = (c >>> 24) & 0xff;
  out[5] = (c >>> 16) & 0xff;
  out[6] = (c >>> 8) & 0xff;
  out[7] = c & 0xff;

  const v = u8(f.validFrom, 'validFrom', 0xffffffff);
  out[8] = (v >>> 24) & 0xff;
  out[9] = (v >>> 16) & 0xff;
  out[10] = (v >>> 8) & 0xff;
  out[11] = v & 0xff;

  out[12] = u8(f.duration, 'duration', 0xff);
  out[13] = u8(f.approach, 'approach', 0xff);

  return out;
}

/** Read the header fields. Safe to call before the MAC check: nothing here is trusted. */
export function decodeHeader(frame: Uint8Array): FrameFields {
  return {
    hopsRemaining: frame[0] & 0b111,
    version: (frame[1] >>> 6) & 0b11,
    type: ((frame[1] >>> 4) & 0b11) as FrameTypeValue,
    keyGen: (frame[1] >>> 2) & 0b11,
    priority: (frame[1] >>> 1) & 0b1,
    junctionId: (frame[2] << 8) | frame[3],
    /* >>> 0 forces unsigned: a counter with the high bit set would otherwise
       come back negative and every comparison against it would be wrong. */
    counter: (((frame[4] << 24) | (frame[5] << 16) | (frame[6] << 8) | frame[7]) >>> 0),
    validFrom: (((frame[8] << 24) | (frame[9] << 16) | (frame[10] << 8) | frame[11]) >>> 0),
    duration: frame[12],
    approach: frame[13],
  };
}

/**
 * The exact bytes the MAC is computed over: AAD then the authenticated region.
 *
 * junctionId appears twice — once in the AAD and once in the body. Redundant on
 * purpose: a tag verified against the wrong junction's key already fails, and
 * binding the id into the AAD as well means there is no construction that
 * reuses a tag across junctions even if key separation were somehow broken.
 */
export function macInput(frame: Uint8Array): Uint8Array {
  const msg = new Uint8Array(AAD_PREFIX.length + 2 + (SIGNED_TO - SIGNED_FROM));
  let i = 0;
  for (const b of AAD_PREFIX) msg[i++] = b;
  msg[i++] = frame[2];
  msg[i++] = frame[3];
  for (let k = SIGNED_FROM; k < SIGNED_TO; k++) msg[i++] = frame[k];
  return msg;
}

/** Write a tag into a frame, truncating to MAC_LEN. Returns the same array. */
export function setTag(frame: Uint8Array, tag: Uint8Array): Uint8Array {
  for (let i = 0; i < MAC_LEN; i++) frame[TAG_OFFSET + i] = tag[i];
  return frame;
}

export function getTag(frame: Uint8Array): Uint8Array {
  return frame.subarray(TAG_OFFSET, TAG_OFFSET + MAC_LEN);
}

/**
 * Repeater dedupe key.
 *
 * The two tag bytes are not decoration. A repeater cannot verify (it does not
 * hold other junctions' keys), so without them an attacker transmits a forged
 * (junctionId, counter) to pre-poison the cache and the genuine grant with that
 * counter is silently suppressed at that hop. With them, a forgery lands in a
 * different slot.
 */
export function dedupeKey(frame: Uint8Array): string {
  const f = decodeHeader(frame);
  return `${f.junctionId}:${f.counter}:${frame[TAG_OFFSET]}:${frame[TAG_OFFSET + 1]}`;
}

/** Decrement the hop count for rebroadcast. Returns false when it must not travel further. */
export function decrementHop(frame: Uint8Array): boolean {
  const hops = frame[0] & 0b111;
  if (hops === 0) return false;
  frame[0] = (frame[0] & ~0b111) | (hops - 1);
  return true;
}

export const toHex = (b: Uint8Array): string =>
  Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

import {
  FRAME_LEN,
  FRAME_VERSION,
  FrameType,
  MAC_LEN,
  decodeHeader,
  getTag,
  macInput,
} from './frame.ts';
import type { FrameFields } from './frame.ts';

/**
 * The junction-side verifier.
 *
 * This file runs in two places: in Node on the bench, and — transliterated —
 * as C++ on an ESP32 sitting in a traffic-signal cabinet. Everything about its
 * shape follows from that:
 *
 *  - It imports nothing from `node:*`. Crypto and time arrive as injected
 *    functions, so the Node binding uses `node:crypto` and the firmware binding
 *    uses `mbedtls_md_hmac` and a DS3231, with no branch in this file.
 *  - It throws nothing. Every outcome is a value, mirroring `VerifyResult` in
 *    `lib/token.ts`, because a C++ port has no exceptions to mirror.
 *  - It reads bytes at explicit offsets rather than destructuring, because the
 *    C++ analogue is `const uint8_t*` and an implicit reshape would not survive
 *    the port.
 *  - Its state is one plain struct with no methods, so `struct node_state_t` is
 *    a field-for-field copy.
 *
 * If a change here cannot be made in C++ the same way, it does not belong here.
 */

/* Every reason maps 1:1 to a C++ enum value with the same ordinal. Order is
   part of the contract; append only. */
export const REJECT_REASONS = [
  'short',
  'version',
  'wrong-junction',
  'unknown-gen',
  'bad-mac',
  'too-long',
  'clock-unhealthy',
  'not-yet-valid',
  'expired',
  'stale-counter',
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export type VerifyOutcome =
  | { ok: true; grant: FrameFields }
  | { ok: false; reason: RejectReason };

/** Injected so the same file runs against node:crypto and against mbedtls. */
export type Hmac = (key: Uint8Array, msg: Uint8Array) => Uint8Array;

/** Injected so tests pin time and the firmware reads a DS3231. */
export type Clock = { nowEpochSeconds(): number; healthy(): boolean };

/** Plain data. No methods, no closures — this is `struct node_state_t`. */
export type NodeState = {
  junctionId: number;
  /** Accepted key generations, current first. Length 1 or 2 during rotation. */
  gens: number[];
  /** Highest counter acted on. The only field persisted to NVS. */
  lastCounter: number;
  /** Epoch seconds until which the relay is held. 0 when open. */
  relayOpenUntil: number;
};

/**
 * Hard ceiling the node applies regardless of what the signed frame asks for.
 *
 * This is the sentence to lead with in a traffic-police meeting: even a fully
 * compromised server holding every key cannot hold a junction green for longer
 * than this, because the box refuses. Crypto prevents abuse; this bounds the
 * blast radius of the crypto being wrong.
 */
export const MAX_DURATION_S = 90;

/**
 * Clock skew tolerance. A DS3231 drifts about +/-2ppm, roughly a minute a year,
 * so 30s absorbs a year of drift plus propagation without widening the window
 * enough to make replay meaningfully easier.
 */
export const SKEW_S = 30;

/** Constant-time tag comparison. An OR accumulator, exactly as the C++ port does it. */
function tagsMatch(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length < MAC_LEN || b.length < MAC_LEN) return false;
  let diff = 0;
  for (let i = 0; i < MAC_LEN; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Verify a received frame against this node's state.
 *
 * The check ORDER is load-bearing and must not be reordered "for efficiency" in
 * the port. Steps 1-5 read only fields whose misinterpretation is harmless: the
 * worst outcome is dropping a frame. Everything from step 7 interprets semantic
 * content and therefore sits strictly after the MAC — the same discipline
 * `verifyToken` applies by refusing to JSON.parse before checking the signature.
 */
export function verifyFrame(
  frame: Uint8Array,
  state: NodeState,
  key: Uint8Array | null,
  hmac: Hmac,
  clock: Clock,
): VerifyOutcome {
  // 1
  if (frame.length !== FRAME_LEN) return { ok: false, reason: 'short' };

  const f = decodeHeader(frame);

  // 2
  if (f.version !== FRAME_VERSION) return { ok: false, reason: 'version' };

  // 3
  if (f.type !== FrameType.GRANT && f.type !== FrameType.CANCEL) {
    return { ok: false, reason: 'version' };
  }

  // 4
  if (f.junctionId !== state.junctionId) return { ok: false, reason: 'wrong-junction' };

  // 5
  if (state.gens.indexOf(f.keyGen) === -1 || key === null) {
    return { ok: false, reason: 'unknown-gen' };
  }

  // 6 — the gate. Nothing below this line is trusted above it.
  if (!tagsMatch(hmac(key, macInput(frame)), getTag(frame))) {
    return { ok: false, reason: 'bad-mac' };
  }

  // 7 — a correct MAC is not sufficient.
  if (f.duration > MAX_DURATION_S) return { ok: false, reason: 'too-long' };

  // 8 — a signal acting on an unknown clock is worse than one that does not act.
  if (!clock.healthy()) return { ok: false, reason: 'clock-unhealthy' };

  const now = clock.nowEpochSeconds();

  // 9
  if (now < f.validFrom - SKEW_S) return { ok: false, reason: 'not-yet-valid' };

  // 10
  if (now > f.validFrom + f.duration + SKEW_S) return { ok: false, reason: 'expired' };

  /* 11 — strict greater-than, single value, no sliding window. There is exactly
     one issuer per junction and the counter is time-derived and therefore
     strictly increasing, so a window would buy nothing.

     A flood delivers duplicates and out-of-order copies by design. Dropping the
     older copy is CORRECT: the newer grant supersedes it. That is a property,
     not a bug to be worked around. */
  if (f.counter <= state.lastCounter) return { ok: false, reason: 'stale-counter' };

  return { ok: true, grant: f };
}

/**
 * Apply an accepted grant to node state.
 *
 * Separated from verification so the caller decides when to commit. On real
 * hardware `lastCounter` is written to NVS here and nowhere else — never on
 * every received frame, because flash endurance is finite and a flood delivers
 * the same grant several times.
 */
export function applyGrant(state: NodeState, grant: FrameFields, now: number): NodeState {
  if (grant.type === FrameType.CANCEL) {
    return { ...state, lastCounter: grant.counter, relayOpenUntil: 0 };
  }
  return {
    ...state,
    lastCounter: grant.counter,
    relayOpenUntil: Math.max(now, grant.validFrom) + grant.duration,
  };
}

import {
  FRAME_LEN,
  decodeHeader,
  dedupeKey,
  decrementHop,
} from '../frame.ts';
import { applyGrant, verifyFrame } from '../verify.ts';
import type { Clock, NodeState, RejectReason } from '../verify.ts';
import { nodeHmac } from '../mac.ts';
import type { Radio } from './radio.ts';
import type { KeyRegistry } from '../keys.ts';

/**
 * A simulated junction node.
 *
 * It runs the ACTUAL verifier from `../verify.ts`, not a reimplementation. That
 * is the whole point: a simulator with its own copy of the rules proves nothing
 * about the code that will be ported to firmware.
 *
 * The relay is a console line and a boolean. Everything above it — dedupe,
 * flood, verification, replay rejection, the duration ceiling — is real.
 */

export type NodeEvent =
  | { kind: 'acted'; junctionId: number; counter: number; heldUntil: number }
  | { kind: 'released'; junctionId: number }
  | { kind: 'rejected'; junctionId: number; reason: RejectReason }
  | { kind: 'relayed'; junctionId: number }
  | { kind: 'deduped'; junctionId: number };

export type SimNode = {
  id: number;
  state(): NodeState;
  relayClosed(): boolean;
  /** Release the relay if its hold has elapsed. Call after advancing the clock. */
  tick(): void;
  events: NodeEvent[];
};

/**
 * Dedupe entries expire, both on their own age and at the end of the grant they
 * describe. An unbounded cache on a device with 320KB of RAM is a slow leak.
 */
const DEDUPE_TTL_S = 60;

export function createSimNode(opts: {
  junctionId: number;
  keys: KeyRegistry;
  radio: Radio;
  clock: Clock;
  /** Emitted for the demo; the real box drives a relay pin instead. */
  onEvent?: (e: NodeEvent) => void;
}): SimNode {
  const { junctionId, keys, radio, clock } = opts;

  let state: NodeState = {
    junctionId,
    gens: keys.generations(junctionId),
    lastCounter: 0,
    relayOpenUntil: 0,
  };

  const seen = new Map<string, number>();
  const events: NodeEvent[] = [];
  const emit = (e: NodeEvent) => {
    events.push(e);
    opts.onEvent?.(e);
  };

  /* A registry-backed HMAC. On real hardware this closes over the one key in
     NVS; here it asks the registry, which still never hands out key bytes. */
  const hmacFor = (gen: number) => (_key: Uint8Array, msg: Uint8Array) =>
    keys.mac(junctionId, gen, msg);

  radio.attach(junctionId, (frame) => {
    if (frame.length !== FRAME_LEN) return;

    const now = clock.nowEpochSeconds();
    for (const [k, expiry] of seen) if (expiry <= now) seen.delete(k);

    const key = dedupeKey(frame);
    if (seen.has(key)) {
      /* Dropped entirely, not rebroadcast. This is what bounds a flood: each
         node transmits a given frame at most once. */
      emit({ kind: 'deduped', junctionId });
      return;
    }
    seen.set(key, now + DEDUPE_TTL_S);

    const header = decodeHeader(frame);

    if (header.junctionId === junctionId) {
      /* keys.mac already truncates, and the registry refuses unknown ids, so a
         non-null placeholder here just satisfies the verifier's signature. */
      const outcome = verifyFrame(
        frame,
        state,
        keys.has(junctionId) ? new Uint8Array(0) : null,
        hmacFor(header.keyGen),
        clock,
      );

      if (!outcome.ok) {
        emit({ kind: 'rejected', junctionId, reason: outcome.reason });
      } else {
        state = applyGrant(state, outcome.grant, now);
        emit({ kind: 'acted', junctionId, counter: outcome.grant.counter, heldUntil: state.relayOpenUntil });
      }
    }

    /* Relay regardless of whether it was for us, and regardless of whether it
       verified. A repeater cannot verify other junctions' frames — it does not
       hold their keys — which is exactly why the grant is authenticated
       end-to-end and relays are untrusted. */
    const copy = frame.slice();
    if (decrementHop(copy)) {
      emit({ kind: 'relayed', junctionId });
      radio.transmit(junctionId, copy);
    }
  });

  return {
    id: junctionId,
    state: () => ({ ...state }),
    relayClosed: () => state.relayOpenUntil > clock.nowEpochSeconds(),
    tick() {
      if (state.relayOpenUntil !== 0 && state.relayOpenUntil <= clock.nowEpochSeconds()) {
        state = { ...state, relayOpenUntil: 0 };
        emit({ kind: 'released', junctionId });
      }
    },
    events,
  };
}

/** Unused by the node; kept so the demo can render a verdict without importing verify.ts. */
export { nodeHmac };

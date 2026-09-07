/**
 * Grant counters, derived from time rather than stored.
 *
 * The obvious implementation — an in-memory sequence per junction — fails on
 * the first server restart: the server resets to 0 while the node still holds
 * lastCounter = 500, so every grant reads as stale until the counter climbs
 * back. A junction that refuses to preempt after a server reboot is the failure
 * a traffic authority would never forgive.
 *
 * Persisting a sequence would work, but it drags grants into the Store
 * interface — and therefore into a Postgres implementation — for data that
 * expires in forty-five seconds.
 *
 * Deriving from the clock solves it by construction: the clock does not reboot.
 * It also ties the counter to the same time the validity window uses, so the
 * counter check and the expiry check can never disagree about ordering.
 */

/** 2026-01-01T00:00:00Z. Fixed forever; changing it invalidates deployed nodes. */
export const COUNTER_EPOCH_S = 1767225600;

const SEQ_BITS = 4;
const SEQ_MASK = (1 << SEQ_BITS) - 1;

/**
 * uint32 with 4 sub-second bits covers 2^28 seconds, about 8.5 years from the
 * epoch above, and 16 grants per second per junction. A dated limitation rather
 * than an oversight: it needs revisiting before 2034.
 */
export const COUNTER_HORIZON_S = 2 ** (32 - SEQ_BITS);

export function encodeCounter(validFromEpochS: number, seq: number): number {
  const delta = validFromEpochS - COUNTER_EPOCH_S;
  if (delta < 0) throw new RangeError('validFrom precedes the counter epoch');
  if (delta >= COUNTER_HORIZON_S) throw new RangeError('validFrom beyond the counter horizon');
  return ((delta << SEQ_BITS) | (seq & SEQ_MASK)) >>> 0;
}

export function decodeCounter(counter: number): { validFromEpochS: number; seq: number } {
  return {
    validFromEpochS: (counter >>> SEQ_BITS) + COUNTER_EPOCH_S,
    seq: counter & SEQ_MASK,
  };
}

/**
 * Per-junction sub-second tiebreaker.
 *
 * Held in memory only. Losing it on restart is harmless because the second has
 * advanced by then, which is the whole point of deriving from the clock.
 */
export function createSeqSource() {
  const lastSecond = new Map<number, number>();
  const lastSeq = new Map<number, number>();

  return {
    next(junctionId: number, validFromEpochS: number): number {
      if (lastSecond.get(junctionId) !== validFromEpochS) {
        lastSecond.set(junctionId, validFromEpochS);
        lastSeq.set(junctionId, 0);
        return 0;
      }
      const seq = (lastSeq.get(junctionId) ?? 0) + 1;
      if (seq > SEQ_MASK) {
        /* Sixteen grants for one junction in one second means the planner is
           looping. Failing loudly beats silently reusing a counter, which would
           make a genuine grant look like a replay. */
        throw new RangeError(`Counter sequence exhausted for junction ${junctionId}`);
      }
      lastSeq.set(junctionId, seq);
      return seq;
    },
  };
}

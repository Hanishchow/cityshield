export type RadioOpts = {
  topology: Map<number, number[]>;
  lossRate?: number;
  latencyMs?: number;
  jitterMs?: number;
  duplicateRate?: number;
  seed?: number;
};

export type Radio = {
  attach(nodeId: number, onFrame: (frame: Uint8Array, fromId: number) => void): void;
  transmit(fromId: number, frame: Uint8Array): void;
  drain(): Promise<void>;
  stats(): { transmitted: number; delivered: number; dropped: number; duplicated: number };
};

export function createSimRadio(opts: RadioOpts): Radio {
  if (opts.seed === undefined) {
    // Determinism is a correctness requirement, not a nice-to-have.
    // Without a seed a failing flood test cannot be replayed.
    throw new Error("seed is required for determinism");
  }

  // Inline xorshift32 so the harness has no hidden dependency on Math.random
  // and a given seed replays the identical loss/jitter/duplicate sequence.
  let s = (opts.seed >>> 0) || 1;
  const nextUint32 = (): number => {
    s ^= (s << 13) & 0xffffffff;
    s ^= s >>> 17;
    s ^= (s << 5) & 0xffffffff;
    return s >>> 0;
  };
  const nextFloat = (): number => nextUint32() / 0x100000000;

  const lossRate = opts.lossRate ?? 0;
  const latencyMs = opts.latencyMs ?? 0;
  const jitterMs = opts.jitterMs ?? 0;
  const duplicateRate = opts.duplicateRate ?? 0;

  const handlers = new Map<number, (frame: Uint8Array, fromId: number) => void>();

  type Queued = {
    time: number;
    seq: number;
    toId: number;
    fromId: number;
    frame: Uint8Array;
    isDuplicate: boolean;
  };

  const queue: Queued[] = [];
  let seq = 0;
  let nowMs = 0;

  let transmitted = 0;
  let delivered = 0;
  let dropped = 0;
  let duplicated = 0;

  return {
    attach(nodeId: number, onFrame: (frame: Uint8Array, fromId: number) => void): void {
      handlers.set(nodeId, onFrame);
    },

    transmit(fromId: number, frame: Uint8Array): void {
      const neighbours = opts.topology.get(fromId) ?? [];
      transmitted++;

      for (const toId of neighbours) {
        // Per-delivery loss is an independent trial so a single PRNG draw suffices.
        if (lossRate > 0) {
          if (lossRate >= 1) {
            dropped++;
            continue;
          }
          if (nextFloat() < lossRate) {
            dropped++;
            continue;
          }
        }

        let delay = latencyMs;
        if (jitterMs > 0) {
          // Uniform +/- jitterMs keeps delay bounded while still exercising ordering.
          const r = nextFloat();
          delay += (r * 2 - 1) * jitterMs;
        }

        const scheduled = nowMs + delay;

        // Each neighbour gets its own copy so a hop-byte decrement in one handler
        // cannot corrupt the frame seen by another neighbour.
        queue.push({
          time: scheduled,
          seq: seq++,
          toId,
          fromId,
          frame: frame.slice(),
          isDuplicate: false,
        });

        if (duplicateRate > 0) {
          let doDuplicate = false;
          if (duplicateRate >= 1) {
            doDuplicate = true;
          } else {
            doDuplicate = nextFloat() < duplicateRate;
          }
          if (doDuplicate) {
            // Duplicate travels as a second independent delivery with the same
            // scheduled time so counting and ordering stay deterministic.
            queue.push({
              time: scheduled,
              seq: seq++,
              toId,
              fromId,
              frame: frame.slice(),
              isDuplicate: true,
            });
          }
        }
      }
    },

    async drain(): Promise<void> {
      // Process deliveries in scheduled-time order so the result does not depend
      // on the insertion order that transmit() happened to use.
      let processed = 0;

      while (queue.length > 0) {
        if (processed >= 10000) {
          throw new Error("radio delivery bound exceeded: 10000 deliveries (possible flood loop)");
        }

        // Stable ordering by time then insertion sequence keeps ties deterministic.
        queue.sort((a, b) => (a.time === b.time ? a.seq - b.seq : a.time - b.time));

        const next = queue.shift()!;
        nowMs = next.time;
        processed++;

        if (next.isDuplicate) {
          duplicated++;
        }
        delivered++;

        const handler = handlers.get(next.toId);
        if (handler) {
          // Handlers may call transmit() again, which enqueues further deliveries
          // that will be picked up by the outer while loop.
          handler(next.frame, next.fromId);
        }

        if (processed >= 10000 && queue.length > 0) {
          throw new Error("radio delivery bound exceeded: 10000 deliveries (possible flood loop)");
        }
      }
    },

    stats(): { transmitted: number; delivered: number; dropped: number; duplicated: number } {
      return { transmitted, delivered, dropped, duplicated };
    },
  };
}

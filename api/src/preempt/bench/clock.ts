export type Clock = { nowEpochSeconds(): number; healthy(): boolean };

export function createSimClock(opts?: {
  startEpochSeconds?: number;
  driftSeconds?: number;
  healthy?: boolean;
}): Clock & {
  advance(seconds: number): void;
  setHealthy(v: boolean): void;
  setDrift(seconds: number): void;
} {
  let base = opts?.startEpochSeconds ?? 0;
  let drift = opts?.driftSeconds ?? 0;
  let isHealthy = opts?.healthy ?? true;
  let elapsed = 0;

  return {
    nowEpochSeconds(): number {
      // floor matches the frame's uint32 epoch-second encoding
      // and keeps the drift addition visible as whole seconds.
      return Math.floor(base + elapsed + drift);
    },

    healthy(): boolean {
      return isHealthy;
    },

    advance(seconds: number): void {
      elapsed += seconds;
    },

    setHealthy(v: boolean): void {
      isHealthy = v;
    },

    setDrift(seconds: number): void {
      drift = seconds;
    },
  };
}

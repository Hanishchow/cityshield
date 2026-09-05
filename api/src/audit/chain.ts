import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Tamper-evident audit log.
 *
 * For a service that government agencies act on, the defensible question is not
 * "what does the record say now" but "can anyone prove it was not edited after
 * the fact". Each entry commits to its predecessor's digest, so altering or
 * removing any historical entry invalidates every digest after it. That turns
 * silent edits into detectable ones.
 *
 * This is tamper-EVIDENT, not tamper-PROOF: someone with write access to the
 * whole chain can recompute it end to end. Making it tamper-proof needs the
 * head digest anchored somewhere the operator does not control (a countersigning
 * service, or a witness feed). The chain is the part that makes that anchoring
 * cheap later, because only one value has to leave the building.
 */

export type AuditEntry = {
  seq: number;
  at: string;
  incidentId: string;
  action: string;
  /** Who caused it: a citizen token, an agency id, or 'system'. */
  actor: string;
  detail: Record<string, unknown>;
  prevHash: string;
  hash: string;
};

/** Genesis digest. Never produced by hashing, so it cannot be forged as a link. */
export const GENESIS = '0'.repeat(64);

/**
 * Canonical JSON: object keys sorted at every depth.
 *
 * Without this the digest depends on key insertion order, so the same entry
 * hashed on two machines could disagree and a valid chain would read as
 * tampered.
 */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}

export function digest(entry: Omit<AuditEntry, 'hash'>): string {
  return createHash('sha256').update(canonical(entry)).digest('hex');
}

export function createAuditChain() {
  const entries: AuditEntry[] = [];

  return {
    append(input: {
      incidentId: string;
      action: string;
      actor: string;
      detail?: Record<string, unknown>;
      at?: string;
    }): AuditEntry {
      const prev = entries.at(-1);
      const body = {
        seq: entries.length,
        at: input.at ?? new Date().toISOString(),
        incidentId: input.incidentId,
        action: input.action,
        actor: input.actor,
        detail: input.detail ?? {},
        prevHash: prev ? prev.hash : GENESIS,
      };
      /* Frozen on the way in. `all()` and `forIncident()` hand out references to
         these objects, and an audit log a caller can quietly mutate is not an
         audit log — the chain would go on verifying its own altered contents
         until someone happened to re-derive a digest. */
      const entry: AuditEntry = Object.freeze({
        ...body,
        detail: Object.freeze({ ...body.detail }),
        hash: digest(body),
      }) as AuditEntry;
      entries.push(entry);
      return entry;
    },

    /**
     * Recompute the whole chain. Returns the first index that fails, or -1 when
     * intact. Comparison is constant-time so a caller that exposes verification
     * cannot be used to discover a valid digest byte by byte.
     */
    verify(): { intact: boolean; brokenAt: number } {
      let expectedPrev = GENESIS;
      for (let i = 0; i < entries.length; i++) {
        const { hash, ...body } = entries[i];
        if (body.seq !== i || body.prevHash !== expectedPrev) return { intact: false, brokenAt: i };

        const recomputed = Buffer.from(digest(body), 'hex');
        const stored = Buffer.from(hash, 'hex');
        if (recomputed.length !== stored.length || !timingSafeEqual(recomputed, stored)) {
          return { intact: false, brokenAt: i };
        }
        expectedPrev = hash;
      }
      return { intact: true, brokenAt: -1 };
    },

    /** The single value worth anchoring externally. */
    head: () => entries.at(-1)?.hash ?? GENESIS,
    all: () => entries.slice(),
    forIncident: (id: string) => entries.filter((e) => e.incidentId === id),
  };
}

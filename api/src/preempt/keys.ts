import { hkdfSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { config } from '../config.ts';
import { nodeHmac, tagsEqual, truncate } from './mac.ts';

/**
 * Per-junction key registry.
 *
 * `config.tokenSecret` is deliberately NOT used as an on-air key. It is a single
 * process-wide secret, which is correct for capability tokens (one issuer, one
 * verifier, both on the server) and wrong for junctions: a box on a pole is
 * reachable by anyone with a ladder, and one shared secret would mean one stolen
 * box owns every signal in the city.
 *
 * There is deliberately no getKey(). The registry exposes only `mac` and
 * `verify`, so key bytes never leave this closure and cannot be logged,
 * serialised into an audit entry, or leaked by /health by accident.
 */

const KEY_LEN = 32;
const HKDF_SALT = 'city-shield/junction-key/v1';

export type KeySource = 'dev-derived' | 'provisioned';

export type KeyRegistry = {
  readonly source: KeySource;
  has(junctionId: number): boolean;
  /** Accepted generations for a junction, current first. */
  generations(junctionId: number): number[];
  mac(junctionId: number, gen: number, msg: Uint8Array): Uint8Array;
  verify(junctionId: number, gen: number, msg: Uint8Array, tag: Uint8Array): boolean;
  count(): number;
};

type Entry = { current: number; keys: Map<number, Uint8Array> };

/**
 * Derive a distinct key per junction and generation from the dev root.
 *
 * This is what lets `npm run dev` and the bench demo work with zero
 * configuration, matching the service-wide invariant that a missing credential
 * degrades a capability to a labelled stand-in rather than crashing.
 *
 * Honest limitation: every dev-derived key shares one root, so this isolates
 * junctions against a box thief but NOT against someone holding the server
 * secret. That is exactly why the mode reports itself as 'dev-derived'.
 */
function deriveDevKey(junctionId: number, gen: number): Uint8Array {
  return new Uint8Array(
    hkdfSync('sha256', config.tokenSecret, HKDF_SALT, `j:${junctionId}:g:${gen}`, KEY_LEN),
  );
}

type ProvisionedFile = {
  junctions: { id: number; gen: number; key: string; prevKey?: string | null }[];
};

export function createKeyRegistry(junctionIds: readonly number[]): KeyRegistry {
  const table = new Map<number, Entry>();
  let source: KeySource = 'dev-derived';

  if (config.junctionKeysFile) {
    const parsed = JSON.parse(readFileSync(config.junctionKeysFile, 'utf8')) as ProvisionedFile;
    for (const j of parsed.junctions) {
      const keys = new Map<number, Uint8Array>();
      keys.set(j.gen, new Uint8Array(Buffer.from(j.key, 'base64')));
      if (j.prevKey) {
        /* The previous generation stays accepted through the rotation grace
           window, so the server and a box on a pole can be rotated on different
           days without an outage. */
        keys.set((j.gen + 3) % 4, new Uint8Array(Buffer.from(j.prevKey, 'base64')));
      }
      table.set(j.id, { current: j.gen, keys });
    }
    source = 'provisioned';
  } else {
    for (const id of junctionIds) {
      const keys = new Map<number, Uint8Array>();
      keys.set(0, deriveDevKey(id, 0));
      table.set(id, { current: 0, keys });
    }
  }

  const keyFor = (junctionId: number, gen: number): Uint8Array | null =>
    table.get(junctionId)?.keys.get(gen) ?? null;

  return {
    source,
    has: (id) => table.has(id),
    generations(id) {
      const e = table.get(id);
      if (!e) return [];
      return [e.current, ...[...e.keys.keys()].filter((g) => g !== e.current)];
    },
    mac(junctionId, gen, msg) {
      const key = keyFor(junctionId, gen);
      if (!key) throw new Error(`No key for junction ${junctionId} gen ${gen}`);
      return truncate(nodeHmac(key, msg));
    },
    verify(junctionId, gen, msg, tag) {
      const key = keyFor(junctionId, gen);
      if (!key) return false;
      return tagsEqual(truncate(nodeHmac(key, msg)), tag);
    },
    count: () => table.size,
  };
}

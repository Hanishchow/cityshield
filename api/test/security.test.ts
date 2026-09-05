import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuditChain, digest, GENESIS } from '../src/audit/chain.ts';
import { issueToken, verifyToken } from '../src/lib/token.ts';

/**
 * These two modules were deliberately not delegated. They are the parts where a
 * plausible-looking implementation and a correct one are indistinguishable
 * without adversarial tests, so the tests are adversarial.
 */

describe('audit chain', () => {
  const seed = () => {
    const c = createAuditChain();
    c.append({ incidentId: 'CS-AAA-BBB', action: 'created', actor: 'citizen' });
    c.append({ incidentId: 'CS-AAA-BBB', action: 'routed', actor: 'system', detail: { p: 'Police' } });
    c.append({ incidentId: 'CS-AAA-BBB', action: 'acknowledged', actor: 'agency:police' });
    return c;
  };

  it('verifies an untouched chain', () => {
    assert.deepEqual(seed().verify(), { intact: true, brokenAt: -1 });
  });

  it('links the first entry to the genesis digest, which is never a real hash', () => {
    const c = seed();
    assert.equal(c.all()[0].prevHash, GENESIS);
    assert.notEqual(digest({ ...c.all()[0] } as never), GENESIS);
  });

  it('each entry commits to its predecessor', () => {
    const e = seed().all();
    assert.equal(e[1].prevHash, e[0].hash);
    assert.equal(e[2].prevHash, e[1].hash);
  });

  it('refuses to let a caller mutate history through the returned array', () => {
    const c = seed();
    assert.throws(() => {
      (c.all()[1] as { actor: string }).actor = 'forged';
    });
    assert.equal(c.verify().intact, true);
  });

  it('detects an edit to a historical entry', () => {
    /* The freeze blocks the easy mutation, so this exercises the mechanism that
       catches an attacker who got past it: an edited body no longer digests to
       the hash stored beside it, which is exactly what verify() compares. */
    const entry = seed().all()[1];
    const { hash, ...body } = entry;
    assert.equal(digest(body), hash);
    assert.notEqual(digest({ ...body, actor: 'forged' }), hash);
  });

  it('detects a removed entry, because the sequence and back-link both break', () => {
    const c = seed();
    const [a, , third] = c.all();
    assert.notEqual(third.prevHash, a.hash);
    assert.equal(third.seq, 2);
  });

  it('hashes independently of key order, so the same entry digests the same twice', () => {
    const a = digest({ seq: 0, at: 'T', incidentId: 'X', action: 'a', actor: 'b', detail: { x: 1, y: 2 }, prevHash: GENESIS });
    const b = digest({ prevHash: GENESIS, actor: 'b', action: 'a', incidentId: 'X', at: 'T', seq: 0, detail: { y: 2, x: 1 } });
    assert.equal(a, b);
  });

  it('reports the genesis digest as the head of an empty chain', () => {
    assert.equal(createAuditChain().head(), GENESIS);
  });
});

describe('capability tokens', () => {
  const ID = 'CS-GN4-9YX';

  it('round-trips a valid token', () => {
    const { token } = issueToken(ID, 'track');
    const r = verifyToken(token);
    assert.equal(r.ok, true);
    assert.equal(r.ok && r.claims.incidentId, ID);
    assert.equal(r.ok && r.claims.scope, 'track');
  });

  it('rejects a token whose payload was edited', () => {
    const { token } = issueToken(ID, 'track');
    const [payload, sig] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ incidentId: 'CS-ZZZ-ZZZ', scope: 'agency', exp: 2 ** 31, jti: 'x' }),
    ).toString('base64url');
    assert.notEqual(forged, payload);
    assert.deepEqual(verifyToken(`${forged}.${sig}`), { ok: false, reason: 'bad-signature' });
  });

  it('rejects a truncated signature without throwing', () => {
    const { token } = issueToken(ID, 'track');
    assert.deepEqual(verifyToken(token.slice(0, -4)), { ok: false, reason: 'bad-signature' });
  });

  it('rejects an expired token', () => {
    const { token } = issueToken(ID, 'agency', Date.now() - 2 * 60 * 60 * 1000);
    assert.deepEqual(verifyToken(token), { ok: false, reason: 'expired' });
  });

  it('treats a token with no separator as malformed', () => {
    assert.deepEqual(verifyToken('not-a-token'), { ok: false, reason: 'malformed' });
    assert.deepEqual(verifyToken(''), { ok: false, reason: 'malformed' });
  });

  it('gives agency scope the shortest life and track scope the longest', () => {
    const now = Date.now();
    const exp = (s: 'track' | 'update' | 'agency') => issueToken(ID, s, now).claims.exp;
    assert.ok(exp('agency') < exp('update'));
    assert.ok(exp('update') < exp('track'));
  });

  it('issues distinct tokens for the same incident and scope', () => {
    assert.notEqual(issueToken(ID, 'track').token, issueToken(ID, 'track').token);
  });
});

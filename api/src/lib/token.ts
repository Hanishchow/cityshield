import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../config.ts';

/**
 * Incident capability tokens.
 *
 * The access rule this encodes: someone in an emergency must be able to track
 * their incident, and share that tracking with a relative, WITHOUT creating an
 * account first. Nothing may sit between a person in danger and the record of
 * their emergency — not a signup form, not an OTP, not a password.
 *
 * So the token IS the capability. Holding it grants exactly one scope on
 * exactly one incident until it expires. It carries no identity and no
 * permissions beyond that, which is what makes it safe to paste into a
 * WhatsApp message to a family member.
 */

export type Scope = 'track' | 'update' | 'agency';

export type TokenClaims = {
  incidentId: string;
  scope: Scope;
  /** Seconds since epoch. */
  exp: number;
  /** Random, so two tokens for the same incident and scope are distinguishable. */
  jti: string;
};

const b64url = (b: Buffer) => b.toString('base64url');

function sign(payload: string): string {
  return b64url(createHmac('sha256', config.tokenSecret).update(payload).digest());
}

const TTL_SECONDS: Record<Scope, number> = {
  /* Long enough to outlast an incident and the hours after it, short enough
     that a link forwarded once does not stay live indefinitely. */
  track: 7 * 24 * 60 * 60,
  /* The citizen's own write capability lives only as long as an active
     incident plausibly does. */
  update: 12 * 60 * 60,
  /* Agency sessions are re-issued from a real agency credential, so this is
     deliberately the shortest. */
  agency: 60 * 60,
};

export function issueToken(
  incidentId: string,
  scope: Scope,
  now: number = Date.now(),
): { token: string; claims: TokenClaims } {
  const claims: TokenClaims = {
    incidentId,
    scope,
    exp: Math.floor(now / 1000) + TTL_SECONDS[scope],
    jti: randomBytes(9).toString('base64url'),
  };
  const payload = b64url(Buffer.from(JSON.stringify(claims), 'utf8'));
  return { token: `${payload}.${sign(payload)}`, claims };
}

export type VerifyResult =
  | { ok: true; claims: TokenClaims }
  | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' };

export function verifyToken(token: string, now: number = Date.now()): VerifyResult {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return { ok: false, reason: 'malformed' };

  const payload = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1), 'base64url');
  const expected = Buffer.from(sign(payload), 'base64url');

  /* Length must be compared before timingSafeEqual, which throws on a mismatch
     rather than returning false. Both branches return the same reason, so the
     difference is not observable to a caller. */
  if (provided.length !== expected.length) return { ok: false, reason: 'bad-signature' };
  if (!timingSafeEqual(provided, expected)) return { ok: false, reason: 'bad-signature' };

  /* Parsed only AFTER the signature check. Parsing attacker-controlled JSON
     before authenticating it is how you end up with a parser as your attack
     surface. */
  let claims: TokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, claims };
}

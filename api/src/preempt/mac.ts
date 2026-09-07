import { createHmac, timingSafeEqual } from 'node:crypto';
import { MAC_LEN } from './frame.ts';

/**
 * The Node binding for the frame MAC.
 *
 * `verify.ts` takes an `Hmac` function rather than importing this, so the same
 * verifier runs unchanged on the bench and ports honestly to `mbedtls_md_hmac`
 * on the ESP32. This file is the Node half of that seam.
 */

export type Hmac = (key: Uint8Array, msg: Uint8Array) => Uint8Array;

export const nodeHmac: Hmac = (key, msg) =>
  new Uint8Array(createHmac('sha256', key).update(msg).digest());

/**
 * Truncate to the leftmost MAC_LEN bytes, per RFC 2104 section 5.
 *
 * 80 bits is adequate here because forgery is ONLINE only: there is no offline
 * oracle, so an attacker must transmit and observe whether a signal actually
 * changed. At SF7 one attempt costs about 62ms of airtime, so roughly 16
 * attempts a second; 2^80 divided by that is still on the order of 10^15 years.
 *
 * MAC_LEN is pinned in frame.ts and covered by a frozen test vector so nobody
 * "optimises" it to 8 in firmware and desyncs the fleet.
 */
export const truncate = (tag: Uint8Array): Uint8Array => tag.subarray(0, MAC_LEN);

/**
 * Constant-time comparison.
 *
 * Length is checked first because `timingSafeEqual` throws on a mismatch rather
 * than returning false — the same discipline `lib/token.ts` already applies.
 */
export function tagsEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

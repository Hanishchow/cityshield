/**
 * One-shot guard for the reload that recovers a stale code-split chunk.
 *
 * Separate from the boundary component so the module exports only helpers,
 * and so any other surface that needs to reason about the guard can read it
 * without importing a component.
 */

export const FLAG = 'cs:chunk-reload';

/** True when a recovery reload has already been attempted this session. */
export function alreadyReloaded() {
  try {
    return sessionStorage.getItem(FLAG) === '1';
  } catch {
    /* Storage throws in some private modes. Report "already tried" so a browser
       that cannot remember the attempt can never end up in a reload loop. */
    return true;
  }
}

export function markReloaded() {
  try {
    sessionStorage.setItem(FLAG, '1');
  } catch {
    /* nothing to remember; alreadyReloaded() already fails safe */
  }
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    /* nothing to clear */
  }
}

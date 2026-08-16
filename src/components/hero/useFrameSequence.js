import { useEffect, useRef, useState } from 'react';

/**
 * Loads a hero frame sequence described by /hero/frames.json.
 * See docs/FRONTEND-SPEC.md §6.3–6.4.
 *
 * Progressive: the hero becomes usable as soon as frame 0 decodes, and scrubbing
 * falls back to the nearest already-loaded frame while the rest stream in.
 */

const CONCURRENCY = 6;

function shouldSkipSequence() {
  if (typeof window === 'undefined') return true;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return true;

  // Respect Save-Data and slow connections — never spend a user's data on decor
  const conn = navigator.connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType && /2g/.test(conn.effectiveType)) return true;

  return false;
}

function pickSet() {
  return window.matchMedia?.('(max-width: 768px)').matches ? 'mobile' : 'desktop';
}

/** Manifest paths are base-relative so the app can be served from a sub-path. */
const BASE = import.meta.env.BASE_URL || '/';
const withBase = (p) => `${BASE}${String(p).replace(/^\//, '')}`;

function framePath(set, index, pad) {
  return withBase(set.path.replace('{i}', String(index).padStart(pad, '0')));
}

export default function useFrameSequence(manifestUrl = withBase('hero/frames.json')) {
  const [state, setState] = useState({
    status: 'loading', // loading | static | ready | failed
    meta: null,
    loadedCount: 0,
  });
  const framesRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    const frames = [];
    framesRef.current = frames;

    async function load() {
      let manifest;
      try {
        const res = await fetch(manifestUrl);
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        manifest = await res.json();
      } catch {
        // No manifest — the page must still work. Hero degrades to nothing.
        if (!cancelled) setState({ status: 'failed', meta: null, loadedCount: 0 });
        return;
      }

      const setName = pickSet();
      const set = manifest.sets[setName];
      const meta = { ...manifest, set, setName, poster: withBase(manifest.poster) };

      // Static path: reduced motion, Save-Data, or slow link → poster only.
      if (shouldSkipSequence()) {
        if (!cancelled) setState({ status: 'static', meta, loadedCount: 0 });
        return;
      }

      const loadOne = (i) =>
        new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';

          const settle = (ok) => {
            if (ok) frames[i] = img;
            resolve(ok);
          };

          // `load` is the source of truth. decode() is a best-effort warm-up —
          // it rejects on hidden documents and for images not yet in the render
          // tree, which must NOT be treated as a load failure or the hero drops
          // to the poster permanently on a backgrounded tab.
          img.onload = () => {
            if (typeof img.decode === 'function') {
              img.decode().then(
                () => settle(true),
                () => settle(true),
              );
            } else {
              settle(true);
            }
          };
          img.onerror = () => settle(false);
          img.src = framePath(set, i, manifest.indexPad);
        });

      // Frame 0 first so something is on screen immediately.
      const first = await loadOne(0);
      if (cancelled) return;
      if (!first) {
        setState({ status: 'static', meta, loadedCount: 0 });
        return;
      }
      setState({ status: 'ready', meta, loadedCount: 1 });

      // Bounded decode queue for the remainder.
      let next = 1;
      let done = 1;
      const worker = async () => {
        while (!cancelled && next < manifest.frameCount) {
          const i = next++;
          await loadOne(i);
          done += 1;
          if (!cancelled && (done % 8 === 0 || done === manifest.frameCount)) {
            setState((s) => (s.status === 'ready' ? { ...s, loadedCount: done } : s));
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [manifestUrl]);

  /** Nearest loaded frame at or before `index`, so scrubbing never blanks. */
  const frameAt = (index) => {
    const frames = framesRef.current;
    if (frames[index]) return frames[index];
    for (let i = index; i >= 0; i--) if (frames[i]) return frames[i];
    return null;
  };

  return { ...state, frameAt };
}

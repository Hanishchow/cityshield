import { useEffect, useRef } from 'react';
import useFrameSequence from './useFrameSequence.js';

/**
 * Scroll-scrubbed frame sequence. See docs/FRONTEND-SPEC.md §6.4–6.5.
 *
 * Hard constraints:
 *  - The hero is decorative. It must never delay or obstruct access to SOS.
 *  - prefers-reduced-motion / Save-Data / decode failure → static poster, and
 *    the scroll track collapses so there is no dead space to scroll past.
 */

const DESCRIPTION =
  'An aerial view of a city. A single emergency is reported, three government ' +
  'agencies acknowledge it, and their response routes converge on the same ' +
  'location - ending connected to each other as well as to the incident.';

export default function ScrollHero({ children }) {
  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const barRef = useRef(null);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(-1);

  const { status, meta, loadedCount, frameAt } = useFrameSequence();

  const scrubbing = status === 'ready';

  /* Draw loop - one draw per animation frame, never inside the scroll handler. */
  useEffect(() => {
    if (!scrubbing || !meta) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    // Deliberately NOT { alpha: false }: an opaque canvas composites as solid
    // black until something is drawn, and draw() bails early while frames are
    // still loading. Transparent lets the poster underneath show through.
    const ctx = canvas.getContext('2d');

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        lastFrameRef.current = -1;
      }
    };

    // Size up front so the element is never left at its 300x150 default.
    size();

    const draw = () => {
      rafRef.current = 0;
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const p = distance > 0 ? Math.min(1, Math.max(0, -rect.top / distance)) : 0;

      // Written straight to the DOM, NOT through state. Calling setState on every
      // scroll event re-renders, which tears down and re-creates this effect -
      // removing the scroll listener mid-scroll and making scrubbing stutter.
      if (barRef.current) barRef.current.style.width = `${(p * 100).toFixed(2)}%`;

      const index = Math.round(p * (meta.frameCount - 1));
      if (index === lastFrameRef.current && canvas.width) return;

      const img = frameAt(index);
      if (!img) return;
      lastFrameRef.current = index;

      size();

      // cover-fit
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / img.width, ch / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    const schedule = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
    };

    let observing = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !observing) {
          observing = true;
          window.addEventListener('scroll', schedule, { passive: true });
          schedule();
        } else if (!entry.isIntersecting && observing) {
          observing = false;
          window.removeEventListener('scroll', schedule);
        }
      },
      { rootMargin: '100px' },
    );
    if (trackRef.current) io.observe(trackRef.current);

    window.addEventListener('resize', schedule, { passive: true });
    schedule();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // loadedCount re-runs the effect as frames arrive so the first paint sharpens
  }, [scrubbing, meta, frameAt, loadedCount]);

  const poster = meta?.poster ?? `${import.meta.env.BASE_URL || '/'}hero/poster.webp`;

  return (
    <section
      ref={trackRef}
      className={scrubbing ? 'relative h-[300vh]' : 'relative'}
      aria-label="How City Shield coordinates a response"
    >
      <div
        className={
          scrubbing
            ? 'sticky top-0 flex h-screen items-center overflow-hidden'
            : 'relative flex min-h-[70vh] items-center overflow-hidden'
        }
      >
        <div className="absolute inset-0 bg-ground" role="img" aria-label={DESCRIPTION}>
          {/* The poster is ALWAYS rendered as the base layer, so the stage is
              never empty - while frames load, if decoding fails, under reduced
              motion, or on a slow link. The canvas draws opaque frames on top. */}
          {status !== 'failed' && (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />
          )}
          {scrubbing && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}
          {/* Legibility scrim - the frames are pale, the copy sits on top */}
          <div className="hero-scrim pointer-events-none absolute inset-0" />
        </div>

        <div className="relative mx-auto w-full max-w-shell px-5 md:px-8">{children}</div>

        {scrubbing && (
          <div
            className="pointer-events-none absolute bottom-6 left-1/2 h-0.5 w-24 -translate-x-1/2 overflow-hidden rounded-full bg-line"
            aria-hidden="true"
          >
            <div ref={barRef} className="h-full w-0 bg-civic" />
          </div>
        )}
      </div>
    </section>
  );
}

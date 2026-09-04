import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/utils/format.js';

/**
 * A 3D rotating ring of cards.
 *
 * Mechanism adapted from a Uiverse element by ilkhoeri (MIT). Changes:
 *  - the original's mirrored radial-gradient faces carry real content
 *  - `image` is optional per item; without one the card renders a designed face
 *  - the spin is pausable, which WCAG 2.2.2 requires of any motion that starts
 *    automatically and runs longer than five seconds
 *  - it does not run at all under prefers-reduced-motion
 *
 * items: [{ id, label, title, note, image? }]
 */
export default function OrbitRing({
  items,
  duration = 44,
  width = 158,
  height = 206,
  radius = 330,
  className,
  label = 'Rotating gallery',
}) {
  /* Two independent reasons to stop: a transient hover, and an explicit
     request. Collapsing them into one flag means moving the mouse away
     silently cancels a pause the user asked for. */
  const [hovering, setHovering] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [reduced, setReduced] = useState(false);
  const paused = stopped || hovering;
  const ringRef = useRef(null);
  const id = useId();

  // If the user prefers reduced motion the ring is static, so the pause
  // control would be a lie. Hide it rather than offer a no-op.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const quantity = items.length;

  return (
    <div className={cn('orbit-stage relative', className)}>
      <div
        className="mx-auto flex items-center justify-center"
        style={{ height: `${height + 150}px` }}
      >
        <ul
          ref={ringRef}
          id={id}
          className="orbit-ring list-none p-0"
          data-paused={paused ? 'true' : 'false'}
          aria-label={label}
          style={{
            '--orbit-w': `${width}px`,
            '--orbit-h': `${height}px`,
            '--orbit-z': `${radius}px`,
            '--orbit-duration': `${duration}s`,
            '--quantity': quantity,
          }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {items.map((item, i) => (
            <li
              key={item.id}
              className="orbit-card"
              style={{ '--index': i }}
              // Only the front-facing card is reachable visually at any moment,
              // so the ring is decorative; the same content is in the table
              // below it. Keeping it out of the a11y tree avoids duplicate
              // announcements of information the page already states.
              aria-hidden="true"
            >
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="orbit-content flex h-full flex-col justify-between p-4">
                <div className="flex items-center justify-between">
                  <span className="font-data text-micro text-metal-light">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-data text-micro uppercase tracking-[0.09em] text-metal-light">
                    {item.label}
                  </span>
                </div>
                <div>
                  <div className="text-h3 font-semibold leading-tight text-white">
                    {item.title}
                  </div>
                  {item.note && (
                    <div className="mt-1.5 text-small text-metal-light">{item.note}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {!reduced && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setStopped((v) => !v)}
            aria-pressed={stopped}
            aria-controls={id}
            className="rounded-xs border border-line-strong px-3 py-1.5 text-micro font-semibold uppercase tracking-[0.09em] text-ink-2 transition-colors duration-state hover:bg-sunken hover:text-ink"
          >
            {stopped ? 'Resume rotation' : 'Pause rotation'}
          </button>
        </div>
      )}
    </div>
  );
}

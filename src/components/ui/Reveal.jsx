import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils/format.js';

/**
 * Fade-and-lift on entry, via IntersectionObserver.
 *
 * Not a scroll listener: a scroll handler fires continuously and forces
 * reflow, which is exactly the thing that kills frame rate on mid-range
 * Android - the devices this product most needs to work on.
 *
 * Fully disabled under prefers-reduced-motion by the CSS, and the element is
 * visible by default if the observer never fires, so content can never be
 * stranded invisible.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect(); // one-shot: re-animating on scroll-back is nauseating
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn('reveal', className)}
      data-shown={shown ? 'true' : 'false'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

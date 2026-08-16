import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils/format.js';

const ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/services', label: 'Services' },
  { to: '/sos', label: 'SOS', emphasis: true },
  { to: '/report', label: 'Report' },
];

/**
 * Text-only. Generic pictograms read as template decoration, and a label alone
 * is unambiguous — an icon would add nothing here but noise.
 */
export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-line bg-ground/95 backdrop-blur-sm md:hidden"
      aria-label="Primary"
    >
      {ITEMS.map(({ to, label, end, emphasis }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex min-h-[52px] flex-1 items-center justify-center px-2 py-3 text-small no-underline',
              'border-t-2 transition-colors duration-state',
              emphasis
                ? 'font-bold text-signal border-transparent'
                : isActive
                  ? 'font-semibold text-ink border-civic'
                  : 'font-medium text-ink-3 border-transparent',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

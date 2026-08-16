import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Siren, FileText } from 'lucide-react';
import { cn } from '../../lib/utils/format.js';

const ITEMS = [
  { to: '/', label: 'Overview', icon: Home, end: true },
  { to: '/services', label: 'Services', icon: LayoutGrid },
  { to: '/sos', label: 'SOS', icon: Siren, emphasis: true },
  { to: '/report', label: 'Report', icon: FileText },
];

export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-line bg-ground/95 backdrop-blur-sm md:hidden"
      aria-label="Primary"
    >
      {ITEMS.map(({ to, label, icon: Icon, end, emphasis }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 no-underline',
              emphasis ? 'text-signal' : isActive ? 'text-ink' : 'text-ink-3',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full',
                  emphasis ? 'bg-signal text-white' : isActive ? 'bg-sunken' : '',
                )}
              >
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="text-[11px] font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

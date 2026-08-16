import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils/format.js';
import Button from '../ui/Button.jsx';
import ShieldMark from './ShieldMark.jsx';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/services', label: 'Services' },
  { to: '/report', label: 'Report an issue' },
  { to: '/about', label: 'How it works' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-4 px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 rounded-sm" aria-label="City Shield home">
          <ShieldMark className="h-7 w-7 text-civic" />
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            City&nbsp;Shield
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-small font-medium no-underline transition-colors duration-state ease-ease',
                  isActive ? 'bg-sunken text-ink' : 'text-ink-2 hover:text-ink',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Always one tap from the real emergency number. PRD §12.2 — hard requirement. */}
          <a
            href="tel:112"
            className="hidden rounded-md px-3 py-2 text-small font-semibold text-ink-2 no-underline hover:text-ink sm:block"
          >
            Call 112
          </a>
          <Button to="/sos" variant="signal" size="sm" className="font-bold">
            Emergency SOS
          </Button>
          <button
            className="rounded-md p-2 text-ink md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line px-5 pb-4 pt-2 md:hidden" aria-label="Primary mobile">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-3 text-small font-medium no-underline',
                  isActive ? 'bg-sunken text-ink' : 'text-ink-2',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
          <a href="tel:112" className="block px-3 py-3 text-small font-semibold text-ink no-underline">
            Call 112 directly
          </a>
        </nav>
      )}
    </header>
  );
}

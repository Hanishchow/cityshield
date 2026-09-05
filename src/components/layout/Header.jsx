import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils/format.js';
import Button from '../ui/Button.jsx';
import Logo from './Logo.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

const NAV = [{ to: '/report', label: 'Report' }];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 px-5 pt-4 md:px-8">
      {/* A glass bar floating on the deck rather than a flat strip glued to the
          viewport edge - one surface language across the whole site. */}
      <div className="glass mx-auto flex h-16 max-w-shell items-center justify-between gap-4 rounded-xl px-4 md:px-5">
        <Link to="/" className="rounded-sm no-underline" aria-label="City Shield home">
          <Logo size={28} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'rounded-sm px-3 py-2 text-small font-medium no-underline transition-colors duration-state ease-ease',
                  isActive ? 'bg-ink/[0.06] text-ink' : 'text-ink-2 hover:text-ink',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <a
            href="tel:112"
            className="hidden rounded-sm px-3 py-2 text-small font-semibold text-ink-2 no-underline hover:text-ink sm:block"
          >
            112
          </a>
          <Button to="/sos" variant="signal" size="sm" className="font-bold">
            SOS
          </Button>
          <button
            className="rounded-sm p-2 text-ink lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="panel mx-auto mt-2 max-w-shell p-3 lg:hidden" aria-label="Primary mobile">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block rounded-sm px-3 py-3 text-small font-medium no-underline',
                  isActive ? 'bg-ink/[0.06] text-ink' : 'text-ink-2',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
          <a
            href="tel:112"
            className="block px-3 py-3 text-small font-semibold text-ink no-underline"
          >
            Call 112 directly
          </a>
          <div className="mt-1 flex items-center justify-between border-t border-line/70 px-3 pt-3">
            <span className="text-small font-medium text-ink-2">Appearance</span>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}

import { useTheme } from '../../app/providers/themeContext.js';

/**
 * Light/dark switch.
 *
 * react.dev uses a plain sun/moon icon *button*; this is a true switch, which
 * is the correct pattern for a binary on/off with a persistent state:
 *   - role="switch" + aria-checked, so screen readers announce "on/off"
 *     rather than leaving the user to infer state from an icon
 *   - the label travels with it via aria-label, not a tooltip
 *   - it is a real <button>, so Space and Enter work with no key handling
 *
 * The knob transition is disabled globally under prefers-reduced-motion.
 */

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="2.6"
          x2="12"
          y2="5.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Dark theme, switch to light' : 'Light theme, switch to dark'}
      onClick={toggleTheme}
      title={isDark ? 'Switch to light' : 'Switch to dark'}
      className={
        'group relative inline-flex h-8 w-[54px] shrink-0 items-center rounded-full border ' +
        'border-line-strong bg-sunken px-[3px] transition-colors duration-move ease-ease ' +
        'hover:border-accent ' +
        className
      }
    >
      {/* Rail icons: the destination is always visible behind the knob */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-[7px]">
        <SunIcon
          className={
            'h-3.5 w-3.5 transition-opacity duration-move ' +
            (isDark ? 'text-ink-3 opacity-100' : 'opacity-0')
          }
        />
        <MoonIcon
          className={
            'h-3.5 w-3.5 transition-opacity duration-move ' +
            (isDark ? 'opacity-0' : 'text-ink-3 opacity-100')
          }
        />
      </span>

      {/* Knob */}
      <span
        className={
          'relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full ' +
          'bg-surface shadow-sm ring-1 ring-line transition-transform duration-move ease-out ' +
          (isDark ? 'translate-x-[22px]' : 'translate-x-0')
        }
      >
        {isDark ? (
          <MoonIcon className="h-3.5 w-3.5 text-accent" />
        ) : (
          <SunIcon className="h-3.5 w-3.5 text-accent" />
        )}
      </span>
    </button>
  );
}

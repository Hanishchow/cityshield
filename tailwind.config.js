/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        ground: 'var(--ground)',
        surface: 'var(--surface)',
        sunken: 'var(--sunken)',
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          tint: 'var(--accent-tint)',
          contrast: 'var(--accent-contrast)',
        },
        deep: 'var(--deep)',
        metal: { DEFAULT: 'var(--metal)', light: 'var(--metal-light)' },
        signal: {
          DEFAULT: 'var(--signal)',
          hover: 'var(--signal-hover)',
          tint: 'var(--signal-tint)',
        },
        ok: { DEFAULT: 'var(--ok)', tint: 'var(--ok-tint)' },
        warn: { DEFAULT: 'var(--warn)', tint: 'var(--warn-tint)' },
      },
      borderColor: { DEFAULT: 'var(--line)' },
      fontFamily: {
        sans: ["'Public Sans Variable'", "'Public Sans'", 'system-ui', 'sans-serif'],
        serif: ["'Source Serif 4 Variable'", "'Source Serif 4'", 'Georgia', 'serif'],
        mono: ["'JetBrains Mono Variable'", "'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
      /* Type scale: 1.25 major third, but the display sizes break the ratio
         deliberately so the hero is not just "one more step up". */
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.09em' }],
        small: ['0.8125rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.62' }],
        lead: ['1.1875rem', { lineHeight: '1.55' }],
        h3: ['1.375rem', { lineHeight: '1.3' }],
        h2: ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.012em' }],
        h1: ['2.625rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        display: ['4.25rem', { lineHeight: '0.98', letterSpacing: '-0.032em' }],
      },
      /* Non-uniform by design — see tokens.css */
      borderRadius: {
        hair: 'var(--r-hair)',
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },
      boxShadow: {
        hair: 'var(--shadow-hair)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        glass: 'var(--glass-shadow)',
        none: 'none',
      },
      maxWidth: { prose: '68ch', shell: '1240px', narrow: '820px' },
      transitionTimingFunction: {
        ease: 'var(--ease)',
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        state: '120ms',
        move: '220ms',
        enter: '420ms',
      },
      backdropBlur: { glass: 'var(--glass-blur)' },
    },
  },
  plugins: [],
};

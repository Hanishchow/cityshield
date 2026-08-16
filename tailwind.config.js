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
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        signal: {
          DEFAULT: 'var(--signal)',
          hover: 'var(--signal-hover)',
          tint: 'var(--signal-tint)',
        },
        civic: {
          DEFAULT: 'var(--civic)',
          hover: 'var(--civic-hover)',
          tint: 'var(--civic-tint)',
        },
        ok: { DEFAULT: 'var(--ok)', tint: 'var(--ok-tint)' },
        warn: { DEFAULT: 'var(--warn)', tint: 'var(--warn-tint)' },
      },
      borderColor: { DEFAULT: 'var(--line)' },
      fontFamily: {
        sans: ["'Inter Variable'", "'Inter'", 'system-ui', 'sans-serif'],
        serif: ["'Instrument Serif'", 'Georgia', 'serif'],
      },
      fontSize: {
        label: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.04em' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        body: ['1rem', { lineHeight: '1.6' }],
        h3: ['1.25rem', { lineHeight: '1.35' }],
        h2: ['1.6875rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        h1: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      borderRadius: { sm: '4px', md: '8px', lg: '12px' },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        none: 'none',
      },
      maxWidth: { prose: '70ch', shell: '1200px' },
      transitionTimingFunction: { ease: 'var(--ease)' },
      transitionDuration: {
        state: '120ms',
        transition: '200ms',
        entrance: '400ms',
      },
    },
  },
  plugins: [],
};

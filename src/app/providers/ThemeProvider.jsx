import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeContext } from './themeContext.js';

const KEY_PALETTE = 'cs.palette';
const KEY_THEME = 'cs.theme';

/** localStorage throws in some contexts (private mode, blocked site data). */
function read(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* non-fatal - the attribute is still applied for this session */
  }
}

export function ThemeProvider({ children }) {
  const [palette, setPaletteState] = useState(() => read(KEY_PALETTE, 'civic'));
  const [theme, setThemeState] = useState(() => read(KEY_THEME, 'light'));

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-theme', theme);
    // Keep the browser UI (address bar, form controls) in step with the page
    root.style.colorScheme = theme;
  }, [palette, theme]);

  /* Refs mirror the current values so a toggle never reads a stale closure.
     Without this, two clicks landing in the same render both compute their
     "next" value from the same starting point and the second is a no-op. */
  const themeRef = useRef(theme);
  const paletteRef = useRef(palette);

  /* Attributes are applied SYNCHRONOUSLY here, not only in the effect above.
     React runs child effects before parent effects, so a child that measures
     resolved CSS variables on [palette] would otherwise read the previous
     palette's values on every switch. Applying it in the handler means the DOM
     is already correct by the time any effect runs. */
  const setPalette = useCallback((p) => {
    paletteRef.current = p;
    document.documentElement.setAttribute('data-palette', p);
    setPaletteState(p);
    write(KEY_PALETTE, p);
  }, []);

  const setTheme = useCallback((t) => {
    themeRef.current = t;
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
    setThemeState(t);
    write(KEY_THEME, t);
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(themeRef.current === 'dark' ? 'light' : 'dark'),
    [setTheme],
  );

  const value = useMemo(
    () => ({
      palette,
      theme,
      setPalette,
      setTheme,
      toggleTheme,
    }),
    [palette, theme, setPalette, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

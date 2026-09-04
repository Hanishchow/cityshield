import { createContext, useContext } from 'react';

/** Separate from the provider component so Fast Refresh keeps working. */
export const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export const PALETTES = [
  { id: 'civic', name: 'Civic Chrome', note: 'Derived from the CityShield logo' },
  { id: 'ordnance', name: 'Ordnance', note: 'Bottle green and brass' },
];

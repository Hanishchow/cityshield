import { createContext, useContext } from 'react';

/**
 * Kept separate from IncidentProvider.jsx so that file exports only components —
 * mixing components and non-component exports breaks React Fast Refresh.
 */
export const IncidentContext = createContext(null);

export function useIncident() {
  const ctx = useContext(IncidentContext);
  if (!ctx) throw new Error('useIncident must be used inside IncidentProvider');
  return ctx;
}

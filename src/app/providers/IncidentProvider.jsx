import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createIncident, createAgencyTask } from '../../lib/incident/model.js';
import { transition, isTerminal } from '../../lib/incident/machine.js';
import { route, reconcileSeverity } from '../../lib/incident/routing.js';
import { geolocation, dispatch } from '../../lib/services/index.js';
import { IncidentContext } from './incidentContext.js';
import useIncidentSync from './useIncidentSync.js';

const initial = {
  incident: null,
  locating: false,
  locationError: null,
  lastPing: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'locating':
      return { ...state, locating: true, locationError: null };

    case 'ping': {
      const ping = action.ping;
      const incident = state.incident
        ? {
            ...state.incident,
            currentLocation: ping,
            // Bounded track - this is a client prototype, not a telemetry store
            locationTrack: [...state.incident.locationTrack, ping].slice(-120),
          }
        : null;
      return { ...state, locating: false, lastPing: ping, incident };
    }

    case 'locationError':
      return { ...state, locating: false, locationError: action.error.message };

    case 'commit': {
      const incident = createIncident({
        category: action.category ?? 'unknown',
        severity: action.severity ?? 'critical',
        silent: action.silent ?? false,
        sos: action.sos ?? false,
        origin: state.lastPing,
      });
      return { ...state, incident };
    }

    case 'classify': {
      if (!state.incident) return state;
      const def = route(action.categoryId);
      return {
        ...state,
        incident: {
          ...state.incident,
          category: def.id,
          severity: reconcileSeverity(def.severity, state.incident.severity),
        },
      };
    }

    case 'attach': {
      if (!state.incident) return state;
      const def = route(state.incident.category);
      const agencies = [
        createAgencyTask({ agency: def.primary, role: 'primary' }),
        ...def.secondary.map((a) => createAgencyTask({ agency: a, role: 'secondary' })),
      ];
      return {
        ...state,
        incident: transition({ ...state.incident, agencies }, 'routed', 'system'),
      };
    }

    case 'agencyState': {
      if (!state.incident) return state;
      return {
        ...state,
        incident: {
          ...state.incident,
          agencies: state.incident.agencies.map((t) =>
            t.id === action.taskId ? { ...t, ...action.patch } : t,
          ),
        },
      };
    }

    case 'transition':
      if (!state.incident) return state;
      return { ...state, incident: transition(state.incident, action.to, action.actor) };

    case 'reset':
      return { ...initial, lastPing: state.lastPing };

    default:
      return state;
  }
}

export function IncidentProvider({ children }) {
  const [state, dispatchAction] = useReducer(reducer, initial);
  const unwatchRef = useRef(null);

  /* Mirrors the local incident to the API. Deliberately does not gate anything:
     the interface reads from local state whether or not this succeeds. */
  const sync = useIncidentSync(state.incident);

  /** Begin acquiring location. Called on SOS press-DOWN, before commit (PRD §9.1). */
  const startLocating = useCallback(() => {
    if (unwatchRef.current) return;
    dispatchAction({ type: 'locating' });
    unwatchRef.current = geolocation.watch(
      (ping) => dispatchAction({ type: 'ping', ping }),
      (error) => dispatchAction({ type: 'locationError', error }),
    );
  }, []);

  const stopLocating = useCallback(() => {
    unwatchRef.current?.();
    unwatchRef.current = null;
  }, []);

  // Location streams only while an incident is active. PRD §14 - the core
  // privacy promise. Stop the moment the incident reaches a terminal state.
  useEffect(() => {
    if (state.incident && isTerminal(state.incident.state)) stopLocating();
  }, [state.incident, stopLocating]);

  useEffect(() => stopLocating, [stopLocating]);

  const commit = useCallback((opts) => dispatchAction({ type: 'commit', ...opts }), []);
  const classify = useCallback(
    (categoryId) => dispatchAction({ type: 'classify', categoryId }),
    [],
  );
  const cancel = useCallback(() => {
    dispatchAction({ type: 'transition', to: 'cancelled', actor: 'citizen' });
    stopLocating();
  }, [stopLocating]);
  const reset = useCallback(() => {
    stopLocating();
    dispatchAction({ type: 'reset' });
  }, [stopLocating]);

  /** Notify agencies via the dispatch adapter (mocked - Tier 2, PRD §11). */
  const notifyAgencies = useCallback(async () => {
    dispatchAction({ type: 'attach' });
    await dispatch.notifyAgencies([]);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      sync,
      startLocating,
      stopLocating,
      commit,
      classify,
      cancel,
      reset,
      notifyAgencies,
      setAgencyState: (taskId, patch) =>
        dispatchAction({ type: 'agencyState', taskId, patch }),
      advance: (to, actor) => dispatchAction({ type: 'transition', to, actor }),
    }),
    [state, sync, startLocating, stopLocating, commit, classify, cancel, reset, notifyAgencies],
  );

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

import type { AgencyTask, Category, Severity } from './incident.ts';

/**
 * Which agencies attach to one incident, and which of them owns it.
 *
 * This is the product thesis expressed as a table: a road accident is not "call
 * the ambulance, then call the police, then call the civic body" — it is one
 * record with a primary owner and secondaries who can see the same thing.
 *
 * Server-side because it is a POLICY decision. A client that could choose its
 * own primary agency could route a cardiac arrest to a pothole desk.
 */

const AGENCIES = {
  ambulance: 'Ambulance (108)',
  police: 'Police (100)',
  fire: 'Fire & Rescue (101)',
  civic: 'BBMP Civic',
  disaster: 'Disaster Response',
} as const;

type AgencyKey = keyof typeof AGENCIES;

const ROUTES: Record<Category, { primary: AgencyKey; secondary: AgencyKey[] }> = {
  medical: { primary: 'ambulance', secondary: ['police'] },
  fire: { primary: 'fire', secondary: ['ambulance', 'police'] },
  police: { primary: 'police', secondary: [] },
  accident: { primary: 'police', secondary: ['ambulance', 'civic'] },
  civic: { primary: 'civic', secondary: [] },
  disaster: { primary: 'disaster', secondary: ['fire', 'ambulance', 'police'] },
  /* Unknown is the SOS case: the person could not or did not classify it. We
     send police as owner because they are the only service that can assess an
     unclassified scene, and pull in an ambulance rather than wait to be asked. */
  unknown: { primary: 'police', secondary: ['ambulance'] },
};

export function routeIncident(
  category: Category,
  severity: Severity,
  at: string = new Date().toISOString(),
): AgencyTask[] {
  const plan = ROUTES[category];
  const tasks: AgencyTask[] = [
    {
      agency: AGENCIES[plan.primary],
      role: 'primary',
      state: 'notified',
      unit: null,
      updatedAt: at,
      simulated: true,
    },
  ];

  /* A standard-severity civic report does not need to wake three agencies.
     Secondaries attach only when the severity actually warrants them. */
  const includeSecondaries = severity !== 'standard';
  if (includeSecondaries) {
    for (const key of plan.secondary) {
      tasks.push({
        agency: AGENCIES[key],
        role: 'secondary',
        state: 'notified',
        unit: null,
        updatedAt: at,
        simulated: true,
      });
    }
  }
  return tasks;
}

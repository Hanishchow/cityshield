import type {
  AgencyTask,
  CreateIncident,
  Incident,
  IncidentState,
  Ping,
} from '../domain/incident.ts';

export type Store = {
  readonly kind: 'memory' | 'postgres';
  ready(): Promise<boolean>;
  create(input: CreateIncident): Promise<Incident>;
  get(id: string): Promise<Incident | null>;
  transition(id: string, to: IncidentState): Promise<Incident>;
  addPing(id: string, ping: Ping): Promise<Incident>;
  setTasks(id: string, tasks: AgencyTask[]): Promise<Incident>;
  /**
   * Erase data past its retention window. Returns what was removed, because a
   * retention job that cannot say what it deleted is not auditable, and under
   * DPDP the erasure itself is the obligation being discharged.
   */
  purge(now?: Date): Promise<{ pings: number; incidents: number }>;
};

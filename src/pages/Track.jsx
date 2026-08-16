import { useEffect, useState } from 'react';
import Card, { CardLabel } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import MockNotice from '../components/ui/MockNotice.jsx';
import LocationBanner from '../features/location/LocationBanner.jsx';
import { useIncident } from '../app/providers/incidentContext.js';
import { AGENCY_LABEL, AGENCY_TASK_LABEL, SEVERITY_LABEL } from '../lib/incident/model.js';
import { STATES, PROGRESS_STATES, progressIndex } from '../lib/incident/machine.js';
import { clockTime, elapsed } from '../lib/utils/format.js';

const TASK_TONE = {
  notified: 'neutral',
  accepted: 'civic',
  en_route: 'warn',
  on_scene: 'ok',
  cleared: 'ok',
  declined: 'signal',
};

export default function Track() {
  const { incident, lastPing, locating, locationError, cancel, reset, setAgencyState, advance } =
    useIncident();
  const [, forceTick] = useState(0);

  // Ticking clock for elapsed times
  useEffect(() => {
    const iv = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  /**
   * SIMULATED agency progression. This stands in for the Tier 2 dispatch
   * integration that requires a government MoU (PRD §11). It is labelled as
   * simulated everywhere it surfaces — cross-cutting invariant 1 forbids
   * presenting invented state as real.
   */
  useEffect(() => {
    if (!incident || incident.state !== 'routed') return undefined;
    const timers = [];
    incident.agencies.forEach((task, i) => {
      timers.push(
        setTimeout(() => setAgencyState(task.id, { state: 'accepted' }), 2000 + i * 900),
        setTimeout(
          () =>
            setAgencyState(task.id, {
              state: 'en_route',
              unit: { id: `Unit ${100 + i}`, type: task.agency, contact: '' },
            }),
          5000 + i * 1200,
        ),
      );
    });
    timers.push(setTimeout(() => advance('acknowledged', 'agency'), 2200));
    timers.push(setTimeout(() => advance('responding', 'agency'), 5400));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id, incident?.state]);

  if (!incident) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center md:px-8">
        <h1 className="text-h1 text-ink">No active report</h1>
        <p className="mt-3 text-body text-ink-2">
          This tracking link has no incident attached in this session. In the real
          product a guardian link would load the incident from the server.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button to="/sos" variant="signal">
            Start an emergency report
          </Button>
          <Button href="tel:112" variant="outline">
            Call 112
          </Button>
        </div>
      </div>
    );
  }

  const current = progressIndex(incident.state);

  return (
    <div className="mx-auto max-w-shell px-5 py-10 md:px-8">
      <div aria-live="polite" className="sr-only">
        Incident status: {STATES[incident.state]?.label}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardLabel>Incident {incident.id}</CardLabel>
          <h1 className="mt-2 text-h1 text-ink">{STATES[incident.state]?.label}</h1>
          <p className="mt-1 text-small text-ink-2">
            Reported {clockTime(incident.createdAt)} · running{' '}
            <span className="tabular-nums">{elapsed(incident.createdAt)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={incident.severity === 'critical' ? 'signal' : 'warn'}>
            {SEVERITY_LABEL[incident.severity]}
          </StatusPill>
        </div>
      </div>

      <MockNotice className="mt-6">
        Agency responses below are <strong>simulated</strong>. Direct dispatch requires a
        government integration that does not exist yet — see the PRD. Your location is
        real if you granted permission.
      </MockNotice>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Agencies — the interconnection made visible */}
        <div className="space-y-6">
          <Card className="p-6">
            <CardLabel>Agencies on this incident</CardLabel>
            <p className="mt-2 max-w-prose text-small text-ink-2">
              All of these are attached to the same record. Each can see the others&apos;
              status — that is the point.
            </p>

            <ul className="mt-5 space-y-3">
              {incident.agencies.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-sunken px-4 py-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-small font-semibold text-ink">
                        {AGENCY_LABEL[task.agency]}
                      </span>
                      <span className="text-label uppercase tracking-wide text-ink-3">
                        {task.role}
                      </span>
                    </div>
                    <div className="mt-0.5 text-small text-ink-2">
                      {task.unit ? task.unit.id : 'No unit assigned yet'}
                    </div>
                  </div>
                  <StatusPill tone={TASK_TONE[task.state]}>
                    {AGENCY_TASK_LABEL[task.state]}
                  </StatusPill>
                </li>
              ))}
            </ul>

            {incident.agencies.length === 0 && (
              <p className="mt-4 text-small text-ink-3">No agencies attached yet.</p>
            )}
          </Card>

          <Card className="p-6">
            <CardLabel>Your location</CardLabel>
            <div className="mt-3">
              <LocationBanner ping={lastPing} locating={locating} error={locationError} />
            </div>
            <p className="mt-3 text-small text-ink-3">
              {incident.locationTrack.length} position update
              {incident.locationTrack.length === 1 ? '' : 's'} recorded since reporting.
              Streaming stops when this incident closes.
            </p>
          </Card>
        </div>

        {/* Timeline — every entry backed by a real state transition */}
        <div className="space-y-6">
          <Card className="p-6">
            <CardLabel>Status</CardLabel>
            <ol className="mt-4">
              {PROGRESS_STATES.map((s, i) => {
                const entry = incident.stateHistory.find((h) => h.state === s);
                const done = current >= i && current !== -1;
                const isLast = i === PROGRESS_STATES.length - 1;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                          done ? 'border-civic bg-civic' : 'border-line-strong bg-surface'
                        }`}
                        aria-hidden="true"
                      />
                      {!isLast && (
                        <span
                          className={`w-px flex-1 ${done ? 'bg-civic' : 'bg-line'}`}
                          style={{ minHeight: 26 }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="pb-5">
                      <div
                        className={`text-small font-medium ${done ? 'text-ink' : 'text-ink-3'}`}
                      >
                        {STATES[s].label}
                      </div>
                      {entry ? (
                        <div className="text-label tabular-nums text-ink-3">
                          {clockTime(entry.at)}
                        </div>
                      ) : (
                        <div className="text-label text-ink-3">Not yet</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="p-6">
            <CardLabel>Actions</CardLabel>
            <div className="mt-4 space-y-2">
              <Button href="tel:112" variant="signal" full>
                Call 112
              </Button>
              <Button variant="outline" full onClick={() => navigator.share?.({ url: window.location.href })}>
                Share tracking link
              </Button>
              <Button variant="ghost" full onClick={cancel}>
                Cancel emergency
              </Button>
              <Button variant="ghost" full onClick={reset} to="/">
                Close and start over
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

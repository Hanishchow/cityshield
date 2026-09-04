import { useEffect, useState } from 'react';
import Button from '../components/ui/Button.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import Panel from '../components/ui/Panel.jsx';
import Section from '../components/layout/Section.jsx';
import MockNotice from '../components/ui/MockNotice.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import LocationBanner from '../features/location/LocationBanner.jsx';
import { useIncident } from '../app/providers/incidentContext.js';
import { AGENCY_LABEL, AGENCY_TASK_LABEL, SEVERITY_LABEL } from '../lib/incident/model.js';
import { STATES, PROGRESS_STATES, progressIndex } from '../lib/incident/machine.js';
import { clockTime, elapsed } from '../lib/utils/format.js';

/** Emergency path: opaque surfaces only, no glass, no entrance animation. */

const TASK_TONE = {
  notified: 'neutral',
  accepted: 'accent',
  en_route: 'warn',
  on_scene: 'ok',
  cleared: 'ok',
  declined: 'signal',
};

export default function Track() {
  const { incident, lastPing, locating, locationError, cancel, reset, setAgencyState, advance } =
    useIncident();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  /* SIMULATED agency progression, standing in for the Tier 2 dispatch
     integration that requires a government MoU. Labelled as simulated
     everywhere it surfaces. */
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
      <Section className="pt-6"><Panel read className="p-6 md:p-10">
        <StatusPill tone="neutral">No active report</StatusPill>
        <h1 className="mt-4 text-h1 text-ink">Nothing to track here</h1>
        <p className="mt-3 max-w-prose text-lead text-ink-2">
          This link has no incident attached in this session. In the finished product a
          guardian link would load the incident from the server.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/sos" variant="signal" size="lg">
            Start an emergency report
          </Button>
          <Button href="tel:112" variant="outline" size="lg">
            Call 112
          </Button>
        </div>
      </Panel></Section>
    );
  }

  const current = progressIndex(incident.state);

  return (
    <Section className="pt-6">
      <div aria-live="polite" className="sr-only">
        Incident status: {STATES[incident.state]?.label}
      </div>

      {/* Header rail */}
      <Panel read className="flex flex-wrap items-start justify-between gap-5 p-6 md:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone={incident.severity === 'critical' ? 'signal' : 'warn'}>
              {SEVERITY_LABEL[incident.severity]}
            </StatusPill>
            <span className="font-data text-small text-ink-3">{incident.id}</span>
          </div>
          <h1 className="mt-3 text-h1 text-ink">{STATES[incident.state]?.label}</h1>
          <p className="mt-2 text-small text-ink-2">
            Reported <time>{clockTime(incident.createdAt)}</time> &middot; running{' '}
            <span className="font-data">{elapsed(incident.createdAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button to={`/live/${incident.id}`} variant="frame" size="lg">
            Track live
          </Button>
          <Button href="tel:112" variant="signal" size="lg">
            Call 112
          </Button>
        </div>
      </Panel>

      <MockNotice className="mt-6">
        Agency responses below are <strong>simulated</strong>. Direct dispatch requires a
        government integration that does not exist yet. Your location is real if you granted
        permission.
      </MockNotice>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* Agencies - the interconnection, made visible */}
        <Panel read className="p-6 md:p-8 lg:col-span-7">
          <h2 className="text-h2 text-ink">Agencies on this incident</h2>
          <p className="mt-2 max-w-prose text-small text-ink-2">
            All of these are attached to the same record. Each can see the others&apos;
            status - that is the point of the product.
          </p>

          <div className="mt-6">
            <DataTable
              rowKey="id"
              columns={[
                { key: 'agency', header: 'Agency', strong: true },
                { key: 'role', header: 'Role' },
                { key: 'unit', header: 'Unit', mono: true },
                { key: 'state', header: 'Status', align: 'right' },
              ]}
              rows={incident.agencies.map((t) => ({
                id: t.id,
                agency: AGENCY_LABEL[t.agency],
                role: t.role,
                unit: t.unit ? t.unit.id : '-',
                state: (
                  <StatusPill tone={TASK_TONE[t.state]}>{AGENCY_TASK_LABEL[t.state]}</StatusPill>
                ),
              }))}
            />
          </div>

          <div className="mt-8 rounded-md border border-line/70 bg-ink/[0.035] p-5">
            <h3 className="text-h3 text-ink">Your location</h3>
            <div className="mt-3">
              <LocationBanner ping={lastPing} locating={locating} error={locationError} />
            </div>
            <p className="mt-3 text-small text-ink-3">
              {incident.locationTrack.length} position update
              {incident.locationTrack.length === 1 ? '' : 's'} since reporting. Streaming stops
              when this incident closes.
            </p>
          </div>
        </Panel>

        {/* Timeline - every entry backed by a real state transition */}
        <div className="lg:col-span-5">
          <Panel read className="p-6">
            <h2 className="text-h3 text-ink">Status</h2>
            <ol className="mt-5">
              {PROGRESS_STATES.map((s, i) => {
                const entry = incident.stateHistory.find((h) => h.state === s);
                const done = current >= i && current !== -1;
                const isLast = i === PROGRESS_STATES.length - 1;
                return (
                  <li key={s} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                          done ? 'border-accent bg-accent' : 'border-line-strong bg-surface'
                        }`}
                        aria-hidden="true"
                      />
                      {!isLast && (
                        <span
                          className={`w-px flex-1 ${done ? 'bg-accent' : 'bg-line'}`}
                          style={{ minHeight: 30 }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <div className={`text-small font-medium ${done ? 'text-ink' : 'text-ink-3'}`}>
                        {STATES[s].label}
                      </div>
                      <div className="font-data text-micro text-ink-3">
                        {entry ? clockTime(entry.at) : 'Not yet'}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-2 space-y-2 border-t border-line pt-5">
              <Button
                variant="outline"
                full
                onClick={() => navigator.share?.({ url: window.location.href })}
              >
                Share tracking link
              </Button>
              <Button variant="ghost" full onClick={cancel}>
                Cancel emergency
              </Button>
              <Button variant="ghost" full onClick={reset} to="/">
                Close and start over
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </Section>
  );
}

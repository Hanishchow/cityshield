import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Panel from '../components/ui/Panel.jsx';
import Section from '../components/layout/Section.jsx';
import Button from '../components/ui/Button.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import MockNotice from '../components/ui/MockNotice.jsx';
import LiveMap from '../features/track/LiveMap.jsx';
import useResponderSim, { formatEta } from '../features/track/useResponderSim.js';
import { AGENCY_TASK_LABEL } from '../lib/incident/model.js';
import Seo from '../components/seo/Seo.jsx';

const STATE_TONE = { accepted: 'accent', en_route: 'warn', on_scene: 'ok' };

/**
 * Live responder tracking.
 *
 * The familiar delivery-tracking pattern shows one courier and a countdown.
 * This shows THREE agencies converging on one incident at once, which is the
 * thing this product does that a delivery app does not, and the reason the
 * page is worth having at all.
 */
export default function Live() {
  const { incidentId } = useParams();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const { units, nearest } = useResponderSim();
  const allArrived = units.every((u) => u.arrived);

  return (
    <>
      <Seo
        title="Live tracking"
        description="Watch responding units converge on your incident in real time."
        noindex
      />
      <Section className="pt-6">
      {/* Status is announced politely: a screen reader user must not be
          interrupted every second by a ticking countdown. */}
      <div aria-live="polite" className="sr-only">
        {allArrived
          ? 'All responders on scene.'
          : `Nearest unit ${nearest.agency}, ${formatEta(nearest.remainingSeconds)} away.`}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Map */}
        <Panel className="overflow-hidden lg:col-span-7">
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/11]">
            <LiveMap units={units} reduced={reduced} />
          </div>
        </Panel>

        {/* Live rail */}
        <div className="lg:col-span-5">
          <Panel read className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone={allArrived ? 'ok' : 'signal'}>
                {allArrived ? 'On scene' : 'Responding'}
              </StatusPill>
              <span className="font-data text-small text-ink-3">{incidentId}</span>
            </div>

            <h1 className="mt-5 text-h2 text-ink">
              {allArrived ? 'All units on scene' : 'Help is on the way'}
            </h1>
            <p className="mt-4 text-small text-ink-2">
              {allArrived ? 'Every unit has arrived' : `Nearest unit, ${nearest.agency}`}
            </p>
            <p className="font-data text-[3.25rem] font-light leading-none tracking-tight text-ink">
              {formatEta(nearest.remainingSeconds)}
            </p>
            <p className="mt-2 text-small text-ink-3">
              {allArrived
                ? 'Stay where you are if it is safe to do so.'
                : `${nearest.remainingKm.toFixed(1)} km away, travelling to you`}
            </p>

            <div className="mt-6 space-y-2">
              <Button href="tel:112" variant="signal" size="lg" full>
                Call 112
              </Button>
              <Button to={`/track/${incidentId}`} variant="outline" full>
                Full incident record
              </Button>
            </div>
          </Panel>

          <Panel read className="mt-5 p-6 md:p-7">
            <h2 className="text-h3 text-ink">Units en route</h2>
            <p className="mt-2 text-small text-ink-2">
              Three agencies, one incident. Each sees the others&apos; position.
            </p>

            <ul className="mt-5 divide-y divide-line/70">
              {units.map((u) => (
                <li key={u.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-body font-medium text-ink">{u.agency}</span>
                    <StatusPill tone={STATE_TONE[u.state]}>
                      {AGENCY_TASK_LABEL[u.state]}
                    </StatusPill>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-data text-small text-ink-3">{u.unit}</span>
                    <span className="font-data text-small text-ink">
                      {u.arrived ? 'Arrived' : `${formatEta(u.remainingSeconds)} · ${u.remainingKm.toFixed(1)} km`}
                    </span>
                  </div>
                  <p className="mt-1 text-small text-ink-3">From {u.station}</p>

                  {/* Progress is a bare rule, not a filled dashboard track */}
                  <div className="mt-3 h-px w-full bg-line" aria-hidden="true">
                    <div
                      className="h-px bg-accent"
                      style={{
                        width: `${Math.round(u.t * 100)}%`,
                        transition: reduced ? 'none' : 'width 220ms linear',
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <MockNotice className="mt-5">
        The map, the routes and the distances are real. The <strong>responder positions are
        simulated</strong>: live vehicle telemetry needs a dispatch integration that requires a
        government agreement, so the units you see moving are stand-in data on a real map.
      </MockNotice>

      <p className="mt-4 text-small text-ink-3">
        Looking for the full record?{' '}
        <Link to={`/track/${incidentId}`} className="font-semibold">
          Incident {incidentId}
        </Link>
      </p>
    </Section>
    </>

  );
}

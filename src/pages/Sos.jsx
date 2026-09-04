import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HoldToCommit from '../features/sos/HoldToCommit.jsx';
import LocationBanner from '../features/location/LocationBanner.jsx';
import Button from '../components/ui/Button.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import Panel from '../components/ui/Panel.jsx';
import Section from '../components/layout/Section.jsx';
import MockNotice from '../components/ui/MockNotice.jsx';
import { useIncident } from '../app/providers/incidentContext.js';
import { EMERGENCY_CATEGORIES } from '../lib/incident/routing.js';
import { AGENCY_LABEL } from '../lib/incident/model.js';
import Seo from '../components/seo/Seo.jsx';
import Breadcrumbs from '../components/seo/Breadcrumbs.jsx';
import SyncNotice from '../components/ui/SyncNotice.jsx';

/**
 * The emergency path.
 *
 * No glass, no scroll reveals, no bezels, no entrance animation. Every surface
 * here is opaque with guaranteed contrast, and nothing is hidden until it
 * animates in. Decoration that is fine on a marketing page becomes a hazard
 * between a person in danger and the control they need.
 */

const AUTO_ROUTE_MS = 10000;

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Emergency SOS', path: '/sos' },
];

export default function Sos() {
  const navigate = useNavigate();
  const {
    incident,
    lastPing,
    locating,
    locationError,
    startLocating,
    commit,
    classify,
    cancel,
    reset,
    notifyAgencies,
    sync,
  } = useIncident();

  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!incident || incident.category !== 'unknown' || incident.state !== 'reported') {
      setCountdown(null);
      return undefined;
    }
    setCountdown(Math.ceil(AUTO_ROUTE_MS / 1000));
    const started = Date.now();
    const iv = setInterval(() => {
      const left = Math.ceil((AUTO_ROUTE_MS - (Date.now() - started)) / 1000);
      setCountdown(left);
      if (left <= 0) {
        clearInterval(iv);
        notifyAgencies();
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id, incident?.category, incident?.state]);

  useEffect(() => {
    if (incident?.state === 'routed') navigate(`/track/${incident.id}`);
  }, [incident?.state, incident?.id, navigate]);

  function chooseCategory(id) {
    classify(id);
    setTimeout(notifyAgencies, 0);
  }

  /* ---------- cancelled ---------- */
  if (incident?.state === 'cancelled') {
    return (
      <Section className="pt-6">
        <Panel read className="p-6 md:p-10">
        <StatusPill tone="neutral">Cancelled</StatusPill>
        <h1 className="mt-4 text-h1 text-ink">Emergency cancelled</h1>
        <p className="mt-3 max-w-prose text-lead text-ink-2">
          No agencies were dispatched. If this was a mistake, report again - cancelling
          costs you nothing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset} variant="signal" size="lg">
            Report again
          </Button>
          <Button href="tel:112" variant="outline" size="lg">
            Call 112
          </Button>
        </div>
        </Panel>
      </Section>
    );
  }

  /* ---------- committed: choose what is happening ---------- */
  if (incident) {
    return (
      <Section className="pt-6">
        <div aria-live="assertive" className="sr-only">
          Emergency report created. Choose what is happening.
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <Panel read className="p-6 md:p-8 lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone="signal">Report open</StatusPill>
              <span className="font-data text-small text-ink-3">{incident.id}</span>
            </div>

            {/* Placed directly under the reference, before the question. Whether
                an agency actually has this report outranks anything below it. */}
            <SyncNotice
              status={sync?.status}
              reference={sync?.reference}
              className="mt-4"
            />

            <h1 className="mt-4 text-h1 text-ink">What is happening?</h1>
            <p className="mt-3 max-w-prose text-lead text-ink-2">
              {countdown != null ? (
                <>
                  If you don&apos;t choose, this routes to Police with Ambulance notified in{' '}
                  <span className="font-data font-semibold text-signal">
                    {Math.max(0, countdown)}s
                  </span>
                  , and a dispatcher works it out.
                </>
              ) : (
                'Choosing lets the right agencies be notified together.'
              )}
            </p>

            <ul className="mt-8 divide-y divide-line border-y border-line">
              {EMERGENCY_CATEGORIES.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => chooseCategory(c.id)}
                    className="grid w-full gap-2 py-4 text-left transition-colors duration-state hover:bg-sunken md:grid-cols-12 md:items-center md:gap-6"
                  >
                    <span className="text-h3 text-ink md:col-span-4">{c.label}</span>
                    <span className="text-small text-ink-2 md:col-span-5">{c.blurb}</span>
                    <span className="text-small text-ink-3 md:col-span-3 md:text-right">
                      {AGENCY_LABEL[c.primary]}
                      {c.secondary.length > 0 &&
                        ` + ${c.secondary.map((a) => AGENCY_LABEL[a]).join(' + ')}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Sticky action rail - 112 never scrolls away mid-emergency */}
          <aside className="lg:col-span-4">
            <Panel read className="p-5 lg:sticky lg:top-24">
              <LocationBanner ping={lastPing} locating={locating} error={locationError} />
              <div className="mt-4 space-y-2">
                <Button href="tel:112" variant="signal" size="lg" full>
                  Call 112 now
                </Button>
                <Button onClick={cancel} variant="outline" full>
                  Cancel emergency
                </Button>
              </div>
              <MockNotice className="mt-5">
                Agency responses are simulated in this prototype.
              </MockNotice>
            </Panel>
          </aside>
        </div>
      </Section>
    );
  }

  /* ---------- idle ---------- */
  return (
    <>
      <Seo
        title="Emergency SOS"
        description="Hold to raise an emergency immediately. Your location and its accuracy are sent to the agencies that need it, and 112 stays one tap away."
        breadcrumbs={CRUMBS}
      />
      <Section className="pt-6">
        <Breadcrumbs trail={CRUMBS} />
      <div className="grid items-center gap-5 lg:grid-cols-12">
        <Panel read className="p-6 md:p-9 lg:col-span-5">
          <StatusPill tone="signal">Emergency</StatusPill>
          <h1 className="mt-4 text-h1 leading-[1.06] text-ink">Hold to send an alert.</h1>
          <p className="mt-4 max-w-prose text-lead text-ink-2">
            Hold for two seconds. Your location starts being captured the moment you press
            down, so nothing is lost while you decide.
          </p>

          <div className="mt-8">
            <LocationBanner ping={lastPing} locating={locating} error={locationError} />
          </div>

          <div className="mt-5">
            <Button href="tel:112" variant="outline" size="lg" full>
              Or call 112 directly
            </Button>
          </div>
        </Panel>

        <div className="lg:col-span-7">
          <Panel read className="p-8 md:p-12">
            <HoldToCommit
              onPressStart={startLocating}
              onPressEnd={() => {}}
              onCommit={() => commit({ category: 'unknown', severity: 'critical', sos: true })}
            />
            <MockNotice className="mt-8">
              This is a prototype. No emergency service is contacted by this button, and the
              agency responses on the next screen are simulated. In a real emergency, call 112.
            </MockNotice>
          </Panel>
        </div>
      </div>
    </Section>
    </>

  );
}

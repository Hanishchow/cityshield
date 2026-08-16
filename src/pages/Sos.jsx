import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, X } from 'lucide-react';
import HoldToCommit from '../features/sos/HoldToCommit.jsx';
import LocationBanner from '../features/location/LocationBanner.jsx';
import Button from '../components/ui/Button.jsx';
import Card, { CardLabel } from '../components/ui/Card.jsx';
import MockNotice from '../components/ui/MockNotice.jsx';
import { useIncident } from '../app/providers/incidentContext.js';
import { EMERGENCY_CATEGORIES } from '../lib/incident/routing.js';
import { AGENCY_LABEL } from '../lib/incident/model.js';

const AUTO_ROUTE_MS = 10000;

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
  } = useIncident();

  const [countdown, setCountdown] = useState(null);

  // Committed but unclassified: a dispatcher disambiguates if the citizen
  // doesn't choose within 10s. PRD §9.1 step 3 — never leave it hanging.
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
        handleRoute();
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id, incident?.category, incident?.state]);

  async function handleRoute() {
    await notifyAgencies();
  }

  function chooseCategory(id) {
    classify(id);
    setTimeout(handleRoute, 0);
  }

  // Once routed, the live view is the tracking page.
  useEffect(() => {
    if (incident?.state === 'routed') navigate(`/track/${incident.id}`);
  }, [incident?.state, incident?.id, navigate]);

  const committed = Boolean(incident) && incident.state !== 'cancelled';

  /* ---------- cancelled ---------- */
  if (incident?.state === 'cancelled') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center md:px-8">
        <h1 className="text-h1 text-ink">Emergency cancelled</h1>
        <p className="mt-3 text-body text-ink-2">
          No agencies were dispatched. If this was a mistake, you can report again.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset} variant="civic">
            Report again
          </Button>
          <Button href="tel:112" variant="outline">
            <PhoneCall size={16} aria-hidden="true" /> Call 112
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- committed, choosing category ---------- */
  if (committed) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <div aria-live="assertive" className="sr-only">
          Emergency report created. Choose what is happening.
        </div>

        <CardLabel>Report created · {incident.id}</CardLabel>
        <h1 className="mt-3 text-h1 text-ink">What is happening?</h1>
        <p className="mt-2 max-w-prose text-body text-ink-2">
          {countdown != null ? (
            <>
              If you don&apos;t choose, this routes to Police with Ambulance notified in{' '}
              <span className="font-semibold tabular-nums text-ink">{Math.max(0, countdown)}s</span>
              , and a dispatcher will work it out.
            </>
          ) : (
            'Choosing helps us notify the right agencies together.'
          )}
        </p>

        <div className="mt-6">
          <LocationBanner ping={lastPing} locating={locating} error={locationError} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {EMERGENCY_CATEGORIES.map((c) => (
            <Card
              as="button"
              interactive
              key={c.id}
              onClick={() => chooseCategory(c.id)}
              className="p-4"
            >
              <span className="text-small font-semibold text-ink">{c.label}</span>
              <span className="mt-1 block text-small text-ink-2">{c.blurb}</span>
              <span className="mt-2 block text-label uppercase tracking-wide text-civic">
                {AGENCY_LABEL[c.primary]}
                {c.secondary.length > 0 &&
                  ` + ${c.secondary.map((a) => AGENCY_LABEL[a]).join(' + ')}`}
              </span>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="tel:112" variant="signal">
            <PhoneCall size={16} aria-hidden="true" /> Call 112 now
          </Button>
          <Button onClick={cancel} variant="ghost">
            <X size={16} aria-hidden="true" /> Cancel emergency
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- idle ---------- */
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 text-center md:px-8">
      <h1 className="text-h1 text-ink">Emergency SOS</h1>
      <p className="mx-auto mt-3 max-w-prose text-body text-ink-2">
        Hold the button for two seconds. Your location starts being captured the moment
        you press down, so no time is lost.
      </p>

      <div className="mt-10">
        <HoldToCommit
          onPressStart={startLocating}
          onPressEnd={() => {}}
          onCommit={() => commit({ category: 'unknown', severity: 'critical' })}
        />
      </div>

      <div className="mt-10 text-left">
        <LocationBanner ping={lastPing} locating={locating} error={locationError} />
      </div>

      <div className="mt-6">
        <Button href="tel:112" variant="outline" full size="lg">
          <PhoneCall size={16} aria-hidden="true" /> Or call 112 directly
        </Button>
      </div>

      <MockNotice className="mt-8 text-left">
        This is a prototype. No emergency service will be contacted by this button —
        agency responses on the next screen are simulated. In a real emergency, call 112.
      </MockNotice>
    </div>
  );
}

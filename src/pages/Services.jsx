import { Link } from 'react-router-dom';
import Card, { CardLabel } from '../components/ui/Card.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import Button from '../components/ui/Button.jsx';
import { CATEGORIES } from '../lib/incident/routing.js';
import { AGENCY_LABEL } from '../lib/incident/model.js';

const GROUPS = ['Emergency', 'Disaster', 'Non-urgent', 'Civic'];

const GROUP_BLURB = {
  Emergency: 'Immediate risk to life or safety. Routed the moment you report.',
  Disaster: 'Weather, flooding and city-wide events. Urgent but coordinated, not instant.',
  'Non-urgent': 'Things that need a formal record rather than a dispatch.',
  Civic: 'Municipal issues. These go into a queue — they are never treated as emergencies.',
};

export default function Services() {
  return (
    <div className="mx-auto max-w-shell px-5 py-14 md:px-8">
      <div className="max-w-xl">
        <CardLabel>Coverage</CardLabel>
        <h1 className="mt-3 text-h1 text-ink">What City Shield connects you to.</h1>
        <p className="mt-3 text-body text-ink-2">
          You pick what is happening. The routing table decides which agency leads and
          which are brought in alongside — you never choose a department.
        </p>
      </div>

      {GROUPS.map((group) => {
        const items = CATEGORIES.filter((c) => c.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 className="text-h2 text-ink">{group}</h2>
              <p className="max-w-md text-small text-ink-2">{GROUP_BLURB[group]}</p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <Card key={c.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-h3 text-ink">{c.label}</h3>
                    {c.severity === 'critical' && <StatusPill tone="signal">Critical</StatusPill>}
                  </div>
                  <p className="mt-2 flex-1 text-small text-ink-2">{c.blurb}</p>

                  <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-small">
                    <div className="flex gap-2">
                      <dt className="text-ink-3">Leads</dt>
                      <dd className="font-medium text-ink">{AGENCY_LABEL[c.primary]}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-ink-3">Also notified</dt>
                      <dd className="text-ink-2">
                        {c.secondary.length
                          ? c.secondary.map((a) => AGENCY_LABEL[a]).join(', ')
                          : 'None'}
                      </dd>
                    </div>
                  </dl>

                  <Button
                    to={c.severity === 'civic' ? '/report' : '/sos'}
                    variant="quiet"
                    size="sm"
                    className="mt-4"
                    full
                  >
                    {c.severity === 'civic' ? 'Report this' : 'Emergency SOS'}
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <div className="mt-16 rounded-lg border border-line bg-sunken p-6">
        <h2 className="text-h3 text-ink">Not sure which applies?</h2>
        <p className="mt-2 max-w-prose text-small text-ink-2">
          Use the SOS button without choosing. It routes to Police with Ambulance
          notified, and a dispatcher works out the rest. Guessing wrong costs you nothing.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button to="/sos" variant="signal">
            Emergency SOS
          </Button>
          <Link to="/about" className="self-center text-small font-semibold no-underline">
            How routing works
          </Link>
        </div>
      </div>
    </div>
  );
}

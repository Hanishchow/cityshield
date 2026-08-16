import Card, { CardLabel } from '../components/ui/Card.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import { adapterStatus } from '../lib/services/index.js';

const TIERS = [
  {
    tier: 'Tier 1',
    tone: 'ok',
    title: 'Buildable now',
    body: 'Device geolocation, maps and reverse geocoding, nearby facilities, SMS fallback, structured handoff to 112, and BBMP civic submission. No partnership required.',
  },
  {
    tier: 'Tier 2',
    tone: 'warn',
    title: 'Requires a government MoU',
    body: 'Direct dispatch into agency CAD systems, live responder telemetry, dispatcher console accounts, hospital bed availability, official incident IDs.',
  },
  {
    tier: 'Tier 3',
    tone: 'neutral',
    title: 'Aspirational',
    body: 'True federation, where an incident created here is a first-class record inside each agency’s own system.',
  },
];

const DEGRADE = [
  ['No data, has cellular', 'SMS fallback carrying lat/lng and category; syncs when back online'],
  ['No GPS lock', 'Last-known position plus a manual pin and landmark, all labelled as such'],
  ['Server unreachable', 'Incident held locally, retried with backoff — 112 always surfaced'],
  ['Total failure', 'The dialer is one tap away. The app is never the only path to help.'],
];

export default function About() {
  return (
    <div className="mx-auto max-w-shell px-5 py-14 md:px-8">
      <div className="max-w-2xl">
        <CardLabel>How it works</CardLabel>
        <h1 className="mt-3 text-h1 text-ink">
          What this can honestly do — and what it cannot.
        </h1>
        <p className="mt-4 text-body text-ink-2">
          India&apos;s 112 emergency service is run by state Emergency Response Centres
          and has no open public dispatch API. Any product claiming to dispatch police or
          ambulances without a state agreement is misrepresenting itself. Here is the
          actual split.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <Card key={t.tier} className="p-6">
            <StatusPill tone={t.tone}>{t.tier}</StatusPill>
            <h2 className="mt-3 text-h3 text-ink">{t.title}</h2>
            <p className="mt-2 text-small text-ink-2">{t.body}</p>
          </Card>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="text-h2 text-ink">What happens when things fail</h2>
        <p className="mt-2 max-w-prose text-body text-ink-2">
          Emergency software is defined by its worst day, not its best one.
        </p>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {DEGRADE.map(([when, then]) => (
            <div key={when} className="grid gap-1 py-4 md:grid-cols-[240px_1fr] md:gap-6">
              <dt className="text-small font-semibold text-ink">{when}</dt>
              <dd className="text-small text-ink-2">{then}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16">
        <h2 className="text-h2 text-ink">This build</h2>
        <p className="mt-2 max-w-prose text-body text-ink-2">
          Every external capability sits behind an adapter. Nothing here pretends to be
          live when it is not.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong">
                <th className="pb-3 text-label font-semibold uppercase tracking-wide text-ink-3">
                  Capability
                </th>
                <th className="pb-3 text-label font-semibold uppercase tracking-wide text-ink-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(adapterStatus).map(([name, status]) => (
                <tr key={name} className="border-b border-line">
                  <td className="py-3 pr-4 text-small font-medium capitalize text-ink">
                    {name}
                  </td>
                  <td className="py-3 text-small">
                    <StatusPill tone={status === 'mock' ? 'warn' : 'ok'}>
                      {status === 'browser' ? 'Live (device)' : status === 'mock' ? 'Simulated' : 'Live'}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-prose text-small text-ink-3">
          Guardian SMS stays simulated in this build by design: an SMS provider key
          cannot live in a browser bundle, so that path needs a backend.
        </p>
      </section>

      <section className="mt-16 max-w-prose">
        <h2 className="text-h2 text-ink">Privacy</h2>
        <p className="mt-3 text-body text-ink-2">
          Your location is streamed only while an emergency report is active — never in
          the background, no exceptions. Position history is kept for incident review and
          then deleted. Data is visible only to agencies attached to your incident, and
          only while they are attached.
        </p>
      </section>
    </div>
  );
}

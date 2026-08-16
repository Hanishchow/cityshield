import { Link } from 'react-router-dom';
import ScrollHero from '../components/hero/ScrollHero.jsx';
import Button from '../components/ui/Button.jsx';
import Card, { CardLabel } from '../components/ui/Card.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import { EMERGENCY_CATEGORIES } from '../lib/incident/routing.js';
import { AGENCY_LABEL } from '../lib/incident/model.js';

const STEPS = [
  {
    n: '01',
    t: 'You report once',
    d: 'Hold the SOS button, or pick what is happening. You never have to know which department handles it.',
  },
  {
    n: '02',
    t: 'Your location is sensed, not described',
    d: 'GPS streams continuously with its accuracy shown honestly — responders see a track, not a guess.',
  },
  {
    n: '03',
    t: 'Every agency joins the same record',
    d: 'Ambulance, police and civic attach to one incident. They can see each other, so nobody arrives blind.',
  },
  {
    n: '04',
    t: 'You watch it happen',
    d: 'Each agency shows its real state. Nothing is displayed unless it actually occurred.',
  },
];

const PRINCIPLES = [
  {
    t: 'One incident, many agencies',
    d: 'A road accident needs ambulance, police and civic. Today that is three calls and three blind dispatches. Here it is one record they all share.',
  },
  {
    t: 'Location with its uncertainty attached',
    d: 'We show the accuracy radius, never a falsely precise pin. A 60-metre fix drawn as a 2-metre dot is dangerous.',
  },
  {
    t: 'Degrades to a phone call',
    d: 'No data, no GPS, no server — 112 stays one tap away on every screen. The app must never be the only path to help.',
  },
  {
    t: 'Location only during an emergency',
    d: 'Your position is streamed while a report is active and at no other time. There is no background tracking.',
  },
];

export default function Home() {
  return (
    <>
      <ScrollHero>
        <div className="max-w-xl">
          <StatusPill tone="civic">Bengaluru · Prototype</StatusPill>

          <h1 className="mt-5 text-[2.5rem] leading-[1.05] tracking-tight text-ink md:text-display">
            Six helplines.
            <br />
            <span className="font-serif-display italic">One incident.</span>
          </h1>

          <p className="mt-5 max-w-prose text-body text-ink-2">
            City Shield replaces knowing <em>which number to call</em> with a single
            action — then keeps every responding agency attached to the same record
            instead of six disconnected phone calls.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button to="/sos" variant="signal" size="lg">
              Emergency SOS
            </Button>
            <Button to="/services" variant="outline" size="lg">
              See what it covers
            </Button>
          </div>

          <p className="mt-6 text-small text-ink-3">
            In a real emergency right now, call{' '}
            <a href="tel:112" className="font-semibold text-ink">
              112
            </a>
          </p>
        </div>
      </ScrollHero>

      {/* The problem */}
      <section className="mx-auto max-w-shell px-5 py-20 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1fr_1.1fr]">
          <div>
            <CardLabel>The problem</CardLabel>
            <h2 className="mt-3 text-h2 text-ink">
              Every call starts a separate, blind process.
            </h2>
          </div>
          <div className="space-y-4 text-body text-ink-2">
            <p>
              In an emergency you are expected to know the taxonomy of Indian emergency
              services at the worst possible moment — 112, 100, 101, 108, 1091, 1077,
              1533 — and then describe where you are to each of them in turn.
            </p>
            <p>
              An accident that needs an ambulance, the police and the municipal
              corporation is three calls, three descriptions, three dispatches, and no
              shared awareness between any of them.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-sunken">
        <div className="mx-auto max-w-shell px-5 py-20 md:px-8">
          <CardLabel>How it works</CardLabel>
          <h2 className="mt-3 max-w-xl text-h2 text-ink">
            You state what is happening. Routing is our job.
          </h2>

          <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="bg-surface p-6">
                <span className="text-label font-semibold tabular-nums text-civic">
                  {s.n}
                </span>
                <h3 className="mt-3 text-h3 text-ink">{s.t}</h3>
                <p className="mt-2 text-small text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Routing table, made visible */}
      <section className="mx-auto max-w-shell px-5 py-20 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <CardLabel>Interconnection</CardLabel>
            <h2 className="mt-3 max-w-xl text-h2 text-ink">
              What one report actually reaches.
            </h2>
          </div>
          <Link to="/services" className="text-small font-semibold no-underline">
            All services
          </Link>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong">
                <th className="pb-3 text-label font-semibold uppercase tracking-wide text-ink-3">
                  You report
                </th>
                <th className="pb-3 text-label font-semibold uppercase tracking-wide text-ink-3">
                  Primary
                </th>
                <th className="pb-3 text-label font-semibold uppercase tracking-wide text-ink-3">
                  Also notified
                </th>
              </tr>
            </thead>
            <tbody>
              {EMERGENCY_CATEGORIES.slice(0, 7).map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <td className="py-3.5 pr-4 text-small font-medium text-ink">{c.label}</td>
                  <td className="py-3.5 pr-4 text-small text-ink-2">
                    {AGENCY_LABEL[c.primary]}
                  </td>
                  <td className="py-3.5 text-small text-ink-2">
                    {c.secondary.length
                      ? c.secondary.map((a) => AGENCY_LABEL[a]).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-shell px-5 pb-20 md:px-8">
        <CardLabel>Design commitments</CardLabel>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map(({ t, d }) => (
            <Card key={t} className="p-6">
              <h3 className="text-h3 text-ink">{t}</h3>
              <p className="mt-2 max-w-prose text-small text-ink-2">{d}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

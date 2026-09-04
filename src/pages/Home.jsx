import Button from '../components/ui/Button.jsx';
import Section from '../components/layout/Section.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Readout from '../components/ui/Readout.jsx';
import VideoSlot from '../components/ui/VideoSlot.jsx';
import LocationGate from '../features/location/LocationGate.jsx';
import { EMERGENCY_CATEGORIES } from '../lib/incident/routing.js';
import { AGENCY_LABEL } from '../lib/incident/model.js';
import Seo from '../components/seo/Seo.jsx';

const HELPLINES = [
  { n: '112', service: 'All emergencies (ERSS)', note: 'National; awareness is low' },
  { n: '100', service: 'Police', note: 'Being folded into 112' },
  { n: '101', service: 'Fire & rescue', note: '' },
  { n: '108', service: 'Ambulance', note: 'State EMS operator' },
  { n: '1091', service: "Women's helpline", note: '' },
  { n: '1098', service: 'Childline', note: '' },
  { n: '1077', service: 'District disaster control', note: '' },
  { n: '1533', service: 'BBMP civic', note: 'Non-emergency' },
];

/* No "01 / 02 / 03" labels: this renders as an ordered list, so the sequence is
   already carried semantically and read out that way by a screen reader. A
   printed number on top of that is decoration. */
const STEPS = [
  { t: 'Report once', d: 'One hold, or one category. You never choose a department.' },
  { t: 'Location is sensed', d: 'Continuous GPS with its accuracy shown, not a described address.' },
  { t: 'Agencies attach', d: 'Ambulance, police and civic join one record and can see each other.' },
  { t: 'You watch it', d: 'Every status shown is backed by a real event. Nothing is invented.' },
];

const COMMITMENTS = [
  {
    t: 'One incident, many agencies',
    d: 'A road accident needs ambulance, police and civic. Today that is three calls and three blind dispatches. Here it is one record they all share, and any of them can pull in another without the citizen repeating themselves.',
  },
  {
    t: 'Location carries its uncertainty',
    d: 'Responders see the accuracy radius and the fix source, never a falsely precise pin. A 60-metre fix drawn as a 2-metre dot sends a crew to the wrong side of a flyover.',
  },
  {
    t: 'It degrades to a phone call',
    d: 'No data, no GPS, no server. 112 stays one tap away on every screen, including every error state. The app must never be the only path to help.',
  },
  {
    t: 'Location only during an emergency',
    d: 'Your position is streamed while a report is active and at no other time. There is no background tracking, and the track is deleted after the review window.',
  },
];

const COMPLIANCE = [
  ['WCAG 2.1 AA', 'ok'],
  ['DPDP Act 2023', 'ok'],
  ['Works without data', 'accent'],
  ['No background tracking', 'accent'],
  ['Open routing table', 'neutral'],
];

/**
 * Section heading.
 *
 * No numbered eyebrow above the title. Enumerating sections ("01 / See it
 * work") is a templated tell that adds nothing a reader cannot already see:
 * the section's position on the page is what orders it. The headline alone
 * carries the meaning.
 */
function Head({ title, lead }) {
  return (
    <header className="mb-7">
      <h2 className="text-h2 text-ink">{title}</h2>
      {lead && <p className="mt-3 max-w-prose text-small text-ink-2">{lead}</p>}
    </header>
  );
}

/**
 * The single page.
 *
 * Everything a first-time visitor needs is here in one scroll: what it is, what
 * it covers, how it works, and the control itself. The separate marketing routes
 * still exist for deep links, but nobody should have to navigate to understand
 * the product. In an emergency product, a nav bar is a failure mode.
 */
export default function Home() {
  return (
    <>
      <Seo description="Raise one emergency in Bengaluru and every responding agency - ambulance, police, fire, BBMP civic - attaches to the same record. No choosing which helpline to call." />

      {/* Hero */}
      <Section className="pb-4 pt-6">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h1 className="text-[2.6rem] leading-[1.0] tracking-[-0.035em] md:text-display">
              <span className="block font-light text-ink-3">Six helplines.</span>
              <span className="block font-extrabold text-ink">One incident.</span>
            </h1>

            <p className="mt-6 max-w-prose text-lead text-ink-2">
              A Bengaluru service that replaces knowing <em>which number to call</em> with a
              single action, then keeps every responding agency attached to the same record
              instead of six disconnected phone calls.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button to="/sos" variant="signal" size="lg">
                Emergency SOS
              </Button>
              <Button to="/report" variant="frame" size="lg">
                Report something
              </Button>
            </div>

            <p className="mt-6 text-small text-ink-3">
              Prototype on mock data. In a real emergency, call{' '}
              <a href="tel:112" className="font-semibold text-ink">
                112
              </a>
              .
            </p>
          </div>

        </div>
      </Section>

      {/* Location permission. Placed high, because it is the one thing that
          makes everything below faster, and asked for with a reason attached. */}
      <Section className="py-4">
        <LocationGate />
      </Section>

      {/* Readouts */}
      <Section className="py-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 border-t border-line pt-7 md:grid-cols-4 md:divide-x md:divide-line/60">
          <Readout label="Helplines replaced" value="6" note="One action instead of a taxonomy" />
          <Readout label="Dispatch target" value="90" unit="s" note="Report to acknowledgement" className="md:pl-8" />
          <Readout label="Shared record" value="1" note="Per incident, however many agencies" className="md:pl-8" />
          <Readout label="Fallback" value="112" note="Reachable from every screen" className="md:pl-8" />
        </div>
      </Section>

      {/* Instruction video */}
      <Section className="py-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Head title="See it work" lead="Ninety seconds, start to finish: raising an incident, watching the agencies attach, and following a unit to your door." />
            <p className="text-small text-ink-3">
              If you would rather read it, every step is written out below.
            </p>
          </div>
          <div className="lg:col-span-7">
            <VideoSlot />
          </div>
        </div>
      </Section>

      {/* The problem */}
      <Section className="py-8">
        <div className="border-t border-line pt-8">
          <Head
            title="The number you need is the one you forget"
            lead="Bengaluru runs at least eight public emergency numbers. Under stress, recalling the right one is the first thing that fails, and the wrong one costs a transfer."
          />
          <DataTable
            columns={[
              { key: 'n', header: 'Number', mono: true, strong: true, width: '6.5rem' },
              { key: 'service', header: 'Service', strong: true },
              { key: 'note', header: 'In practice' },
            ]}
            rows={HELPLINES}
            rowKey="n"
            caption="Public emergency numbers serving Bengaluru today"
          />
        </div>
      </Section>

      {/* Coverage */}
      <Section className="py-8">
        <div className="border-t border-line pt-8">
          <Head
            title="What it covers"
            lead="You pick what happened. The routing table decides who owns it and who else attaches. It is published here rather than hidden, because a citizen should be able to check where their report went."
          />
          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {EMERGENCY_CATEGORIES.map((c) => (
              <div key={c.id} className="border-t border-line/70 pt-4">
                <h3 className="text-body font-semibold text-ink">{c.label}</h3>
                <p className="mt-1.5 text-small text-ink-2">{c.blurb}</p>
                <p className="mt-3 font-data text-micro uppercase tracking-[0.09em] text-ink-3">
                  {[c.primary, ...(c.secondary ?? [])].map((a) => AGENCY_LABEL[a] ?? a).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section className="py-8">
        <div className="border-t border-line pt-8">
          <Head title="How it works" />
          <ol className="grid list-none gap-x-10 gap-y-7 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.t} className="border-t border-line/70 pt-4">
                <h3 className="text-body font-semibold text-ink">{s.t}</h3>
                <p className="mt-1.5 text-small text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Commitments */}
      <Section className="py-8">
        <div className="border-t border-line pt-8">
          <Head title="What we commit to" />
          <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
            {COMMITMENTS.map((c) => (
              <div key={c.t} className="surface-alert py-1 pl-5">
                <h3 className="text-body font-semibold text-ink">{c.t}</h3>
                <p className="mt-2 max-w-prose text-small text-ink-2">{c.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-2.5 border-t border-line/70 pt-6">
            {COMPLIANCE.map(([label, tone]) => (
              <StatusPill key={label} tone={tone}>
                {label}
              </StatusPill>
            ))}
          </div>
        </div>
      </Section>

      {/* Close */}
      <Section className="py-10">
        <div className="border-t border-line pt-8">
          <h2 className="max-w-2xl text-h1 text-ink">
            One action. Every agency that needs to know, already knowing.
          </h2>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button to="/sos" variant="signal" size="lg">
              Emergency SOS
            </Button>
            <Button to="/report" variant="outline" size="lg">
              Report something
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

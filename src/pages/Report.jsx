import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import StatusPill from '../components/ui/StatusPill.jsx';
import Panel from '../components/ui/Panel.jsx';
import Section from '../components/layout/Section.jsx';
import MockNotice from '../components/ui/MockNotice.jsx';
import { CIVIC_CATEGORIES } from '../lib/incident/routing.js';
import { MOCK_WARD } from '../lib/services/mockData.js';
import { makeId } from '../lib/incident/model.js';
import Seo from '../components/seo/Seo.jsx';
import Breadcrumbs from '../components/seo/Breadcrumbs.jsx';

/**
 * Civic reporting.
 *
 * Deliberately a different flow from SOS: calmer, slower, no hold-to-commit,
 * no siren language, no urgency colour. A civic queue and an emergency
 * dispatch must not feel like the same act.
 */
const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'Report an issue', path: '/report' },
];

export default function Report() {
  const [category, setCategory] = useState(CIVIC_CATEGORIES[0].id);
  const [details, setDetails] = useState('');
  const [reference, setReference] = useState(null);

  function submit(e) {
    e.preventDefault();
    setReference(makeId('civ').toUpperCase());
  }

  if (reference) {
    return (
      <Section className="pt-6"><Panel read className="p-6 md:p-10">
        <StatusPill tone="ok">Submitted</StatusPill>
        <h1 className="mt-4 text-h1 text-ink">Report submitted</h1>
        <p className="mt-3 max-w-prose text-lead text-ink-2">
          Keep this reference to follow up with the ward office.
        </p>
        <p className="mt-6 rounded-md border border-line bg-sunken px-5 py-4 font-data text-body text-ink">
          {reference}
        </p>
        <MockNotice className="mt-6">
          Simulated. Submitting to BBMP Sahaaya needs a backend integration that is not built
          yet - nothing was actually filed.
        </MockNotice>
        <Button className="mt-8" variant="outline" onClick={() => setReference(null)}>
          Report something else
        </Button>
      </Panel></Section>
    );
  }

  return (
    <>
      <Seo
        title="Report an issue"
        description="Report a civic or non-life-threatening issue in Bengaluru - roads, water, drainage, debris - into the same shared record the emergency services use."
        breadcrumbs={CRUMBS}
      />
      <Section className="pt-6">
        <Breadcrumbs trail={CRUMBS} />
      <div className="grid gap-5 lg:grid-cols-12">
        <Panel read className="p-6 md:p-9 lg:col-span-5">
          <h1 className="text-h1 font-extrabold leading-[1.03] tracking-[-0.03em] text-ink">
            Report a civic issue.
          </h1>
          <p className="mt-4 max-w-prose text-lead text-ink-2">
            Roads, water, garbage, streetlights and drainage. This is a queue, not a
            dispatch - it never shares an alerting path with emergencies.
          </p>
          <p className="mt-4 max-w-prose text-body text-ink-2">
            If someone is at risk, use{' '}
            <Link to="/sos" className="font-semibold">
              Emergency SOS
            </Link>{' '}
            or call 112 instead.
          </p>

          <div className="mt-8 rounded-md border border-line/70 bg-ink/[0.035] p-5">
            <span className="label-caps">Detected ward</span>
            <p className="mt-2 text-body text-ink">
              Ward {MOCK_WARD.number} - {MOCK_WARD.name}
            </p>
            <p className="mt-1 text-small text-ink-3">
              {MOCK_WARD.zone} zone. Derived from your location; correct it before submitting
              if it is wrong.
            </p>
          </div>
        </Panel>

        <Panel read as="form" onSubmit={submit} className="p-6 md:p-9 lg:col-span-7">
          <fieldset className="border-0 p-0">
            <legend className="text-h3 text-ink">What is the issue?</legend>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {CIVIC_CATEGORIES.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-start gap-4 py-4 transition-colors duration-state hover:bg-sunken">
                    <input
                      type="radio"
                      name="category"
                      value={c.id}
                      checked={category === c.id}
                      onChange={() => setCategory(c.id)}
                      className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="block text-body font-medium text-ink">{c.label}</span>
                      <span className="block text-small text-ink-2">{c.blurb}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="mt-8">
            <label htmlFor="details" className="text-small font-semibold text-ink">
              Details <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <textarea
              id="details"
              rows={5}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Where exactly, and how long has it been like this?"
              className="mt-2 w-full rounded-md border border-line-strong bg-surface px-4 py-3 text-body text-ink placeholder:text-ink-3"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="frame" size="lg">
              Submit report
            </Button>
            <span className="text-small text-ink-3">
              You will get a reference to follow up with.
            </span>
          </div>
        </Panel>
      </div>
    </Section>
    </>

  );
}

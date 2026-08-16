import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check } from 'lucide-react';
import Card, { CardLabel } from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import MockNotice from '../components/ui/MockNotice.jsx';
import { CIVIC_CATEGORIES } from '../lib/incident/routing.js';
import { MOCK_WARD } from '../lib/services/mockData.js';
import { makeId } from '../lib/incident/model.js';

/**
 * Civic reporting. Deliberately a DIFFERENT flow from SOS (PRD §9.5): calmer,
 * slower, no siren language, no hold-to-commit. Civic reports are a queue,
 * not a dispatch, and must never share an alerting path with emergencies.
 */
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
      <div className="mx-auto max-w-2xl px-5 py-20 md:px-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-tint">
          <Check size={22} className="text-ok" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-h1 text-ink">Report submitted</h1>
        <p className="mt-3 text-body text-ink-2">
          Keep this reference to follow up with the ward office.
        </p>
        <p className="mt-4 rounded-md border border-line bg-sunken px-4 py-3 font-mono text-small tabular-nums text-ink">
          {reference}
        </p>
        <MockNotice className="mt-6">
          Simulated. Submitting to BBMP Sahaaya requires a backend integration that is
          not built yet — nothing was actually filed.
        </MockNotice>
        <Button className="mt-8" variant="outline" onClick={() => setReference(null)}>
          Report something else
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:px-8">
      <CardLabel>Civic report</CardLabel>
      <h1 className="mt-3 text-h1 text-ink">Report a civic issue</h1>
      <p className="mt-3 text-body text-ink-2">
        Roads, water, garbage, streetlights and drainage. This is not an emergency
        channel — if someone is at risk, use{' '}
        <Link to="/sos" className="font-semibold">
          Emergency SOS
        </Link>{' '}
        or call 112.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <fieldset>
          <legend className="text-small font-semibold text-ink">What is the issue?</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CIVIC_CATEGORIES.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors duration-state ${
                  category === c.id
                    ? 'border-civic bg-civic-tint'
                    : 'border-line bg-surface hover:bg-sunken'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c.id}
                  checked={category === c.id}
                  onChange={() => setCategory(c.id)}
                  className="mt-1 accent-[var(--civic)]"
                />
                <span>
                  <span className="block text-small font-medium text-ink">{c.label}</span>
                  <span className="block text-small text-ink-2">{c.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="details" className="text-small font-semibold text-ink">
            Details <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <textarea
            id="details"
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Where exactly, and how long has it been like this?"
            className="mt-2 w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-small text-ink placeholder:text-ink-3"
          />
        </div>

        <Card className="flex items-center justify-between gap-4 p-4">
          <div>
            <div className="text-small font-medium text-ink">Add a photo</div>
            <div className="text-small text-ink-2">Helps the ward engineer prioritise.</div>
          </div>
          <Button type="button" variant="quiet" size="sm">
            <Camera size={15} aria-hidden="true" /> Attach
          </Button>
        </Card>

        <Card className="p-4">
          <CardLabel>Detected ward</CardLabel>
          <p className="mt-1.5 text-small text-ink">
            Ward {MOCK_WARD.number} — {MOCK_WARD.name}, {MOCK_WARD.zone} zone
          </p>
          <p className="mt-1 text-small text-ink-3">
            Derived from your location. You can correct it before submitting.
          </p>
        </Card>

        <Button type="submit" variant="civic" size="lg" full>
          Submit report
        </Button>
      </form>
    </div>
  );
}

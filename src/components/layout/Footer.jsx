import { Link } from 'react-router-dom';
import ShieldMark from './ShieldMark.jsx';

const HELPLINES = [
  { n: '112', label: 'All emergencies (ERSS)' },
  { n: '108', label: 'Ambulance' },
  { n: '101', label: 'Fire & rescue' },
  { n: '1091', label: "Women's helpline" },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sunken pb-24 md:pb-0">
      <div className="mx-auto max-w-shell px-5 py-12 md:px-8">
        {/* PRD §12.2: City Shield must degrade to being a very good phone dialer. */}
        <div className="mb-10 rounded-lg border border-line bg-surface p-5">
          <p className="text-small font-semibold text-ink">
            City Shield does not replace the emergency services.
          </p>
          <p className="mt-1.5 max-w-prose text-small text-ink-2">
            If the app fails, is loading, or you are unsure — call 112 directly. It works
            without data, without this app, and without an account.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {HELPLINES.map((h) => (
              <a
                key={h.n}
                href={`tel:${h.n}`}
                className="inline-flex items-baseline gap-2 rounded-md border border-line-strong bg-surface px-3 py-2 text-small no-underline hover:bg-sunken"
              >
                <span className="font-semibold tabular-nums text-ink">{h.n}</span>
                <span className="text-ink-3">{h.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldMark className="h-6 w-6 text-civic" />
            <div>
              <div className="text-small font-semibold text-ink">City Shield</div>
              <div className="text-label text-ink-3">Bengaluru · Prototype</div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-small" aria-label="Footer">
            <Link to="/services" className="text-ink-2 no-underline hover:text-ink">
              Services
            </Link>
            <Link to="/report" className="text-ink-2 no-underline hover:text-ink">
              Report an issue
            </Link>
            <Link to="/about" className="text-ink-2 no-underline hover:text-ink">
              How it works
            </Link>
            <Link to="/sos" className="font-semibold text-signal no-underline">
              Emergency SOS
            </Link>
          </nav>
        </div>

        <p className="mt-8 max-w-prose text-label leading-relaxed text-ink-3">
          Your location is used only while an emergency report is active. It is never
          tracked in the background.
        </p>
      </div>
    </footer>
  );
}

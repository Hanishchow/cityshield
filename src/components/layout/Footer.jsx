import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import Panel from '../ui/Panel.jsx';
import Section from './Section.jsx';

const HELPLINES = [
  { n: '112', label: 'All emergencies (ERSS)' },
  { n: '108', label: 'Ambulance' },
  { n: '101', label: 'Fire & rescue' },
  { n: '1091', label: "Women's helpline" },
];

export default function Footer() {
  return (
    <Section as="footer" className="pb-24 pt-6 md:pb-12">
      <Panel read className="p-6 md:p-9">
        {/* City Shield must degrade to being a very good phone dialer. */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-body font-semibold text-ink">
              City Shield does not replace the emergency services.
            </p>
            <p className="mt-2 max-w-prose text-small text-ink-2">
              If the app fails, is loading, or you are unsure - call 112 directly. It works
              without data, without this app, and without an account.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {HELPLINES.map((h) => (
                <a
                  key={h.n}
                  href={`tel:${h.n}`}
                  className="inline-flex items-baseline gap-2 rounded-sm border border-line-strong/70 px-3 py-2 text-small no-underline transition-colors duration-state hover:bg-ink/[0.05]"
                >
                  <span className="font-data font-semibold text-ink">{h.n}</span>
                  <span className="text-ink-3">{h.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 lg:pl-8">
            <div className="flex items-center gap-3">
              <Logo size={32} showWordmark={false} />
              <div>
                <div className="text-small font-bold uppercase tracking-[0.02em] text-ink">
                  City<span className="text-accent">Shield</span>
                </div>
                <div className="text-micro text-ink-3">Bengaluru &middot; Prototype</div>
              </div>
            </div>

            <nav className="mt-5 grid grid-cols-2 gap-y-2 text-small" aria-label="Footer">
              <Link to="/" className="text-ink-2 no-underline hover:text-ink">
                Home
              </Link>
              <Link to="/report" className="text-ink-2 no-underline hover:text-ink">
                Report an issue
              </Link>
              <Link to="/sos" className="font-semibold text-signal no-underline">
                Emergency SOS
              </Link>
              <a href="tel:112" className="text-ink-2 no-underline hover:text-ink">
                Call 112
              </a>
            </nav>

            <p className="mt-5 max-w-prose text-micro leading-relaxed text-ink-3">
              Your location is used only while an emergency report is active. It is never
              tracked in the background.
            </p>
          </div>
        </div>
      </Panel>
    </Section>
  );
}

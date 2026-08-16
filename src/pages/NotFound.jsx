import { PhoneCall } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center md:px-8">
      <p className="text-label font-semibold uppercase tracking-wide text-ink-3">404</p>
      <h1 className="mt-3 text-h1 text-ink">That page doesn&apos;t exist</h1>
      <p className="mt-3 text-body text-ink-2">
        If you came here looking for help, don&apos;t wait on this page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="tel:112" variant="signal" size="lg">
          <PhoneCall size={16} aria-hidden="true" /> Call 112
        </Button>
        <Button to="/sos" variant="outline" size="lg">
          Emergency SOS
        </Button>
        <Button to="/" variant="ghost" size="lg">
          Back to overview
        </Button>
      </div>
    </div>
  );
}

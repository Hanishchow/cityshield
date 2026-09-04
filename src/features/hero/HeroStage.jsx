import { lazy, Suspense } from 'react';

const BASE = import.meta.env.BASE_URL || '/';

/* Lazy: three.js is a large payload and this sits below the fold on mobile.
   It is also why the 3D lives here and nowhere near /sos - the emergency route
   must never wait on a WebGL bundle. */
const Shield3D = lazy(() => import('./Shield3D.jsx'));

const READOUTS = [
  ['Agencies', '3'],
  ['Accuracy', '±8 m'],
  ['Ack', '00:42'],
];

/**
 * The hero visual.
 *
 * The emblem sits in a deep well rather than on the glass panel. Chrome and
 * pale blue over a light translucent surface is light-on-light - the metal had
 * nothing to stand against, so the object read as barely there. Against the
 * deep navy substrate the rim catches and it reads as a solid object.
 */
export default function HeroStage() {
  return (
    <figure className="relative overflow-hidden rounded-lg border border-line bg-surface shadow-md">
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(75% 65% at 50% 10%, var(--accent) 0%, transparent 62%),' +
              'radial-gradient(60% 60% at 88% 94%, var(--metal) 0%, transparent 55%),' +
              'var(--deep)',
          }}
        />
        {/* Survey grid - instrument register, kept faint */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--metal-light) 1px, transparent 1px),' +
              'linear-gradient(to bottom, var(--metal-light) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />

        <div className="relative flex min-h-[420px] items-center justify-center">
          <Suspense
            fallback={
              <img
                src={`${BASE}brand/logo-mark-320.png`}
                alt="CityShield emblem"
                width={240}
                height={261}
                className="select-none"
                draggable="false"
              />
            }
          >
            <Shield3D className="h-[390px] w-full" />
          </Suspense>
        </div>
      </div>

      {/* Readouts sit on the solid surface below, where they stay legible */}
      <figcaption className="border-t border-line bg-surface px-6 py-5">
        <dl className="grid grid-cols-3 gap-4">
          {READOUTS.map(([label, value]) => (
            <div key={label}>
              <dt className="label-caps">{label}</dt>
              <dd className="mt-1 font-data text-h3 leading-none text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-micro text-ink-3">Sample values.</p>
      </figcaption>
    </figure>
  );
}

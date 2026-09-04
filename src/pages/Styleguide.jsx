import { useEffect, useState } from 'react';
import { useTheme, PALETTES } from '../app/providers/themeContext.js';
import { contrastRatio, tokenValue, verdict } from '../lib/utils/contrast.js';

/* Pairs that carry meaning: [foreground, background, usage, kind] */
const PAIRS = [
  ['--ink', '--ground', 'Body text on page', 'normal'],
  ['--ink-2', '--ground', 'Secondary text', 'normal'],
  ['--ink-3', '--ground', 'Meta / labels', 'normal'],
  ['--ink', '--surface', 'Body on card', 'normal'],
  ['--accent', '--ground', 'Links', 'normal'],
  ['--accent-contrast', '--accent', 'Button label', 'normal'],
  ['--signal', '--ground', 'Critical text', 'normal'],
  ['--ok', '--ground', 'Operational', 'normal'],
  ['--warn', '--ground', 'Degraded', 'normal'],
  ['--metal', '--ground', 'Metal fill / edge-light', 'decorative'],
  ['--line', '--ground', 'Ornamental divider', 'decorative'],
  ['--line-strong', '--surface', 'Input border', 'ui'],
];

const SWATCHES = [
  ['--ground', 'ground'],
  ['--surface', 'surface'],
  ['--sunken', 'sunken'],
  ['--ink', 'ink'],
  ['--ink-2', 'ink-2'],
  ['--ink-3', 'ink-3'],
  ['--line', 'line'],
  ['--line-strong', 'line-strong'],
  ['--accent', 'accent'],
  ['--accent-hover', 'accent-hover'],
  ['--accent-tint', 'accent-tint'],
  ['--deep', 'deep'],
  ['--metal', 'metal'],
  ['--metal-light', 'metal-light'],
  ['--signal', 'signal'],
  ['--ok', 'ok'],
  ['--warn', 'warn'],
];

function Section({ n, title, lead, children }) {
  return (
    <section className="mt-16">
      <div className="flex items-baseline gap-4 border-b border-line pb-3">
        <span className="font-data text-micro text-ink-3">{n}</span>
        <h2 className="text-h2 text-ink">{title}</h2>
      </div>
      {lead && <p className="mt-4 max-w-prose text-body text-ink-2">{lead}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}

export default function Styleguide() {
  const { palette, setPalette, theme, setTheme } = useTheme();
  const [rows, setRows] = useState([]);
  const [swatches, setSwatches] = useState([]);

  // Re-measure on every palette/theme change. These are the values the browser
  // actually resolved - an asserted contrast table is worth nothing.
  // Synchronous, not rAF-deferred: rAF is frozen in a backgrounded tab, and the
  // attributes are already applied by the pre-paint bootstrap in index.html.
  useEffect(() => {
    setRows(
      PAIRS.map(([fg, bg, use, kind]) => {
        const ratio = contrastRatio(tokenValue(fg), tokenValue(bg));
        return { fg, bg, use, kind, ratio, v: verdict(ratio, kind) };
      }),
    );
    setSwatches(SWATCHES.map(([tok, name]) => ({ tok, name, value: tokenValue(tok) })));
  }, [palette, theme]);

  const failures = rows.filter((r) => !r.v.pass).length;
  const activePalette = PALETTES.find((p) => p.id === palette);

  return (
    <div className="mx-auto max-w-shell px-6 py-12 md:px-10">
      <p className="label-caps">Chunk 0 - design proof</p>
      <h1 className="mt-3 text-h1 text-ink">Instrument Glass</h1>
      <p className="mt-4 max-w-prose text-lead text-ink-2">
        Trust-anchored editorial structure with an instrument layer: hairline rules,
        measurement ticks, monospaced readouts. Glass is the cover over a dial - which
        is what lets a translucent interface sit credibly beside emergency services.
      </p>

      {/* controls */}
      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-4">
        <span className="label-caps">Palette</span>
        {PALETTES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPalette(p.id)}
            aria-pressed={palette === p.id}
            className={
              palette === p.id
                ? 'rounded-sm border border-accent bg-accent px-3 py-2 text-small font-semibold text-accent-contrast'
                : 'rounded-sm border border-line-strong px-3 py-2 text-small font-semibold text-ink-2 transition-colors duration-state hover:bg-sunken'
            }
          >
            {p.name}
          </button>
        ))}

        <span className="ml-4 label-caps">Theme</span>
        {['light', 'dark'].map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
            className={
              theme === t
                ? 'rounded-sm border border-accent bg-accent px-3 py-2 text-small font-semibold capitalize text-accent-contrast'
                : 'rounded-sm border border-line-strong px-3 py-2 text-small font-semibold capitalize text-ink-2 transition-colors duration-state hover:bg-sunken'
            }
          >
            {t}
          </button>
        ))}
      </div>

      <Section n="01" title="Palette" lead={activePalette ? activePalette.note : ''}>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {swatches.map((s) => (
            <div key={s.tok} className="bg-surface p-3">
              <div
                className="h-14 w-full rounded-xs border border-line"
                style={{ background: 'var(' + s.tok + ')' }}
              />
              <div className="mt-2 text-small font-medium text-ink">{s.name}</div>
              <div className="font-data text-micro lowercase text-ink-3">{s.value}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        n="02"
        title="Contrast, measured"
        lead="Computed live from the rendered tokens on every palette and theme change. Nothing here is asserted."
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className={
              failures
                ? 'rounded-sm border border-signal bg-signal-tint px-2 py-1 text-micro font-bold uppercase tracking-wide text-signal'
                : 'rounded-sm border border-ok bg-ok-tint px-2 py-1 text-micro font-bold uppercase tracking-wide text-ok'
            }
          >
            {failures ? failures + ' failing' : 'All pairs pass'}
          </span>
          <span className="text-small text-ink-3">
            AA needs 4.5:1 for body text, 3:1 for large text and meaningful UI
            boundaries. Purely ornamental fills are exempt under 1.4.11 and are marked
            n/a rather than hidden from this table.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong">
                {['Foreground', 'Background', 'Usage', 'Ratio', 'Result'].map((h) => (
                  <th key={h} className="pb-2 label-caps">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.fg + r.bg} className="border-b border-line">
                  <td className="py-2.5 pr-4 font-data text-small text-ink">{r.fg}</td>
                  <td className="py-2.5 pr-4 font-data text-small text-ink-3">{r.bg}</td>
                  <td className="py-2.5 pr-4 text-small text-ink-2">
                    {r.use}
                    {r.kind !== 'normal' && (
                      <span className="ml-1.5 text-micro uppercase text-ink-3">({r.kind})</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-data text-small text-ink">
                    {r.ratio.toFixed(2)}:1
                  </td>
                  <td className="py-2.5">
                    <span
                      className={
                        r.v.exempt
                          ? 'rounded-hair bg-sunken px-2 py-0.5 text-micro font-bold text-ink-3'
                          : r.v.pass
                            ? 'rounded-hair bg-ok-tint px-2 py-0.5 text-micro font-bold text-ok'
                            : 'rounded-hair bg-signal-tint px-2 py-0.5 text-micro font-bold text-signal'
                      }
                    >
                      {r.v.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        n="03"
        title="Typography"
        lead="Public Sans is the USWDS typeface - genuine government-system alignment, and not Inter."
      >
        <div className="space-y-6">
          <div>
            <span className="label-caps">display / Public Sans 600</span>
            <p className="text-display text-ink">One incident</p>
          </div>
          <div>
            <span className="label-caps">h1 editorial / Source Serif 4</span>
            <p className="font-semibold text-h1 text-ink">Every responding agency</p>
          </div>
          <div>
            <span className="label-caps">h2 / h3</span>
            <p className="text-h2 text-ink">Coordination, not a directory</p>
            <p className="mt-1 text-h3 text-ink-2">Routing is the system&apos;s job</p>
          </div>
          <div>
            <span className="label-caps">lead / body / small</span>
            <p className="mt-1 max-w-prose text-lead text-ink-2">
              A single tap replaces knowing which of six helplines to call.
            </p>
            <p className="mt-2 max-w-prose text-body text-ink-2">
              Body copy sits at 16px with a 1.62 line height and caps at 68 characters.
            </p>
            <p className="mt-2 text-small text-ink-3">Small text for metadata and captions.</p>
          </div>
          <div>
            <span className="label-caps">data / JetBrains Mono, tabular</span>
            <p className="font-data text-body text-ink">
              inc_01J8F2 &middot; 12.97840, 77.64080 &middot; &plusmn;8&thinsp;m &middot; ETA 04:12
            </p>
          </div>
        </div>
      </Section>

      <Section
        n="04"
        title="Glass, and its opt-out"
        lead="Glass is chrome for marketing surfaces. The emergency path uses the solid variant - identical geometry, guaranteed contrast."
      >
        <div className="relative overflow-hidden rounded-lg border border-line p-8">
          {/* A busy substrate, so both variants can be judged honestly */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 80% at 20% 20%, var(--accent) 0%, transparent 60%), radial-gradient(50% 70% at 80% 70%, var(--metal) 0%, transparent 65%), var(--deep)',
            }}
          />
          <div className="relative grid gap-5 md:grid-cols-2">
            <div className="glass rounded-lg p-6">
              <span className="label-caps">.glass</span>
              <h3 className="mt-2 text-h3 text-ink">Marketing surface</h3>
              <p className="mt-2 text-small text-ink-2">
                Translucent, blurred, edge-lit. Sits over imagery and the 3D hero.
              </p>
            </div>
            <div className="glass-solid rounded-lg p-6">
              <span className="label-caps">.glass-solid</span>
              <h3 className="mt-2 text-h3 text-ink">Emergency surface</h3>
              <p className="mt-2 text-small text-ink-2">
                Opaque. Contrast is guaranteed regardless of what sits behind it.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section
        n="05"
        title="Instrument layer"
        lead="The detail that separates this from a generic glass template."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-md border border-line bg-surface p-5">
            <span className="label-caps">Ticked rule</span>
            <div className="rule-ticked mt-3" />
            <div className="rule-hair mt-4" />
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-small text-ink-2">Dispatch latency</span>
              <span className="font-data text-h3 text-ink">
                1.42<span className="text-small text-ink-3">s</span>
              </span>
            </div>
          </div>
          <div className="rounded-md border border-line bg-surface p-5">
            <span className="label-caps">Radius scale (non-uniform)</span>
            <div className="mt-3 flex items-end gap-3">
              {['hair', 'xs', 'sm', 'md', 'lg'].map((r) => (
                <div key={r} className="text-center">
                  <div
                    className="h-12 w-12 border border-line-strong bg-sunken"
                    style={{ borderRadius: 'var(--r-' + r + ')' }}
                  />
                  <span className="mt-1 block font-data text-micro text-ink-3">{r}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-small text-ink-3">
              A single radius everywhere is the clearest AI-template tell.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

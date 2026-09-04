import { useEffect, useMemo, useRef, useState } from 'react';
import { fitViewport } from './geo.js';
import { activeProvider } from './tileProviders.js';
import { INCIDENT, RESPONDERS } from './useResponderSim.js';

/**
 * Real map tiles with a live marker overlay.
 *
 * Tiles are composed directly rather than through MapLibre: the library would
 * add roughly 230KB gzipped next to the emergency path, and this view should
 * stay locked on the incident rather than let someone pan away from it.
 *
 * Falls back to a schematic grid when no maps key is configured, so the page
 * works in full with zero environment variables.
 */

const PROVIDER = activeProvider();

/* Everything the frame has to contain. Derived from the static routes, not
   from the live positions, so the view is fixed for the whole run: a frame
   that re-fitted as units moved would drift under the reader mid-emergency. */
const FRAME_POINTS = [INCIDENT, ...RESPONDERS.flatMap((r) => r.route)];

const AGENCY_COLOR = {
  ambulance: 'var(--signal)',
  police: 'var(--accent)',
  civic: 'var(--metal)',
};

function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || 'light',
  );
  useEffect(() => {
    const mo = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme || 'light'),
    );
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

export default function LiveMap({ units, reduced }) {
  const wrapRef = useRef(null);
  const { width, height } = useSize(wrapRef);
  const theme = useTheme();

  const view = useMemo(() => {
    if (!width || !height) return null;
    return fitViewport({ points: FRAME_POINTS, width, height });
  }, [width, height]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-deep">
      {/* Tiles */}
      {view && PROVIDER && (
        <div className="absolute inset-0" aria-hidden="true">
          {view.tiles().map((t) => (
            <img
              key={`${t.x}-${t.y}`}
              src={PROVIDER.url({ z: view.zoom, x: t.x, y: t.y, theme })}
              alt=""
              width={256}
              height={256}
              loading="eager"
              draggable="false"
              className="absolute select-none"
              style={{ left: t.left, top: t.top }}
            />
          ))}
        </div>
      )}

      {/* Schematic fallback when no key is configured */}
      {view && !PROVIDER && (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--metal) 1px, transparent 1px),' +
              'linear-gradient(to bottom, var(--metal) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />
      )}

      {/* Marker and route overlay */}
      {view && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Responder positions converging on the incident"
        >
          {units.map((u) => {
            const pts = u.route
              .map((p) => {
                const q = view.project(p.lat, p.lng);
                return `${q.x},${q.y}`;
              })
              .join(' ');
            return (
              <polyline
                key={`r${u.id}`}
                points={pts}
                fill="none"
                stroke={AGENCY_COLOR[u.id]}
                strokeOpacity="0.65"
                strokeWidth="3"
                strokeDasharray="7 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Incident: an accuracy ring, never a falsely precise pin */}
          {(() => {
            const p = view.project(INCIDENT.lat, INCIDENT.lng);
            return (
              <g>
                <circle cx={p.x} cy={p.y} r="34" fill="var(--signal)" fillOpacity="0.13" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="34"
                  fill="none"
                  stroke="var(--signal)"
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                />
                <circle cx={p.x} cy={p.y} r="7" fill="var(--signal)" stroke="#fff" strokeWidth="2" />
              </g>
            );
          })()}

          {units.map((u) => {
            const p = view.project(u.pos.lat, u.pos.lng);
            return (
              <g
                key={`m${u.id}`}
                transform={`translate(${p.x} ${p.y})`}
                style={reduced ? undefined : { transition: 'transform 260ms linear' }}
              >
                <circle r="13" fill={AGENCY_COLOR[u.id]} stroke="#fff" strokeWidth="2.5" />
                <text
                  y="4.5"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#fff"
                >
                  {u.agency.charAt(0)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* Attribution is a licence condition of the tile provider, not optional */}
      {PROVIDER && (
        <p className="absolute bottom-1 right-2 text-[10px] text-white/70">
          {PROVIDER.attribution.map((a, i) => (
            <span key={a.href}>
              {i > 0 && ' · '}
              <a
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className="text-white/70 no-underline"
              >
                {a.label}
              </a>
            </span>
          ))}
        </p>
      )}

    </div>
  );
}
